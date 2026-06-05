import time
import os
import psutil
import uuid
from typing import Any, Callable

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from config import config
from groq_client import GroqClientError, groq_client
from logger import log_event, logger
from rate_limiter import DEFAULT_AI_RATE_LIMIT, limiter
from resume_parser import match_resume_to_jd
from voice_analysis import evaluate_voice_response
from video_analysis import process_interview_telemetry
import json

SERVICE_NAME = "ai-service"
FALLBACK_ERROR = "AI service temporarily unavailable"

app = FastAPI(title=SERVICE_NAME, version="1.0.0")
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PromptRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=8000)
    model: str | None = Field(default=None, max_length=128)


class PromptResponse(BaseModel):
    response: str


class JDRequest(BaseModel):
    description: str


class ResumeMatchRequest(BaseModel):
    resume: str
    skills: list[str]
    experience: int


class VoiceAnalysisRequest(BaseModel):
    transcript: str
    question: str


class VideoAnalysisRequest(BaseModel):
    applicationId: str
    telemetry: dict | None = None


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id

    start_time = time.perf_counter()
    endpoint_name = request.url.path
    status = "failure"

    try:
        response = await call_next(request)
        status = "success" if response.status_code < 400 else "failure"
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        log_event(
            "Request handled",
            request_id=request_id,
            endpoint=endpoint_name,
            latency_ms=latency_ms,
            status=status,
        )


@app.on_event("startup")
async def startup_event() -> None:
    logger.info(
        "AI service started",
        extra={
            "endpoint": "startup",
            "status": "success",
            "request_id": "system",
            "latency_ms": 0,
        },
    )


@app.get("/health")
async def health_check() -> dict[str, Any]:
    ai_provider_status = "connected" if groq_client.is_ready() else "disconnected"
    
    # Get resource metrics
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    cpu_percent = psutil.cpu_percent(interval=None)
    load_avg = os.getloadavg() if hasattr(os, 'getloadavg') else [0, 0, 0]
    disk_usage = psutil.disk_usage('/')
    
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "version": "1.0.0",
        "environment": config.environment,
        "ai_provider": ai_provider_status,
        "resources": {
            "cpu_usage_percent": cpu_percent,
            "load_avg": load_avg,
            "memory_usage_mb": round(memory_info.rss / 1024 / 1024, 2),
            "disk_free_gb": round(disk_usage.free / (1024**3), 2),
            "uptime_seconds": round(time.time() - psutil.boot_time(), 2),
        },
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/prompt", response_model=PromptResponse)
@limiter.limit(DEFAULT_AI_RATE_LIMIT)
async def prompt_ai(request: Request, payload: PromptRequest) -> PromptResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    endpoint_name = "/prompt"

    if not groq_client.is_ready():
        log_event(
            "AI provider is not configured",
            request_id=request_id,
            endpoint=endpoint_name,
            status="failure",
        )
        raise HTTPException(status_code=503, detail=FALLBACK_ERROR)

    try:
        response_text = groq_client.send_prompt(
            prompt=payload.prompt,
            model=payload.model or "llama-3.1-8b-instant",
        )
        log_event(
            "AI prompt completed",
            request_id=request_id,
            endpoint=endpoint_name,
            status="success",
        )
        return PromptResponse(response=response_text)
    except GroqClientError:
        log_event(
            "AI prompt failed",
            request_id=request_id,
            endpoint=endpoint_name,
            status="failure",
        )
        raise HTTPException(status_code=503, detail=FALLBACK_ERROR)


@app.post("/analyze-jd")
async def analyze_jd(payload: JDRequest):
    try:
        # Use Groq to extract required skills and details from job description
        prompt = f"""
        You are an expert HR recruitment parser. Analyze the following job description and extract required metrics.
        
        Job Description:
        {payload.description}
        
        Provide the output as a valid JSON object. Extract:
        1. requiredSkills: list of strings (e.g. ["Node.js", "React", "SQL"])
        2. preferredSkills: list of strings (e.g. ["Docker", "Kubernetes"])
        3. requiredExperience: integer representing years of experience (e.g. 3)
        4. responsibilities: list of key job duties (e.g. ["Design web applications", "Optimize databases"])
        5. technologies: list of tools/libraries mentioned (e.g. ["Redux", "PostgreSQL", "Git"])
        6. softSkills: list of communication/culture skills (e.g. ["Teamwork", "Problem-solving"])
        
        JSON schema:
        {{
          "requiredSkills": ["string"],
          "preferredSkills": ["string"],
          "requiredExperience": number,
          "responsibilities": ["string"],
          "technologies": ["string"],
          "softSkills": ["string"]
        }}
        Return ONLY valid JSON. No preambles, no explanations, no markdown blocks.
        """
        
        response_text = groq_client.send_prompt(
            prompt=prompt,
            model="llama-3.1-8b-instant"
        )
        # Parse output safely
        clean_json = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_json)
        return data
    except Exception as err:
        logger.error(f"analyze-jd failed: {err}")
        # Return fallback heuristic structure
        clean_desc = payload.description.lower()
        skills = []
        keywords = ["react", "node", "javascript", "python", "mongodb", "sql", "aws", "docker", "typescript", "git", "communication", "agile"]
        for kw in keywords:
            if kw in clean_desc:
                skills.append(kw.capitalize())
        return {
            "requiredSkills": skills[:4] if skills else ["JavaScript", "React"],
            "preferredSkills": skills[4:6] if len(skills) > 4 else ["TypeScript"],
            "requiredExperience": 2,
            "responsibilities": ["Develop UI features", "Maintain Express APIs"],
            "technologies": skills if skills else ["React", "Node.js"],
            "softSkills": ["Communication", "Problem-solving"]
        }


@app.post("/match-resume")
async def match_resume(payload: ResumeMatchRequest):
    return match_resume_to_jd(payload.resume, payload.skills, payload.experience)


@app.post("/analyze-voice")
async def analyze_voice(payload: VoiceAnalysisRequest):
    return evaluate_voice_response(payload.transcript, payload.question)


@app.post("/analyze-video")
async def analyze_video(payload: VideoAnalysisRequest):
    return process_interview_telemetry(payload.applicationId, payload.telemetry)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail if isinstance(exc.detail, str) else FALLBACK_ERROR,
            "request_id": request_id,
        },
    )


@app.get("/")
async def root() -> dict[str, Any]:
    return {
        "service": SERVICE_NAME,
        "status": "running",
        "environment": config.environment,
    }
