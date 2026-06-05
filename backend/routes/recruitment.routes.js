const express = require("express");
const multer = require("multer");
const {
  createJobPosting,
  getAllJobPostings,
  getJobPostingById,
  updateJobPosting,
  deleteJobPosting,
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getJobApplications,
  evaluateCandidateAI,
  generateInterviewQuestions,
  scheduleInterview,
  recordInterviewResult,
  getCandidateWorkflow,
  quickAIScreening,
  scoreVoiceResponse,
  transcribeAudio,
  getVoiceInterviewSummary,
  uploadResumeAndApply,
  downloadCandidateReportPDF,
  downloadCandidateReportCSV,
  analyzeJobDescription,
  saveVideoInterviewResult,
  getVideoInterviewSummary,
} = require("../controllers/recruitment.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const {
  validate,
  chatbotValidator,
  voiceScoreValidator,
  evaluateAiValidator
} = require("../middlewares/validate");
const {
  createJobPostingValidator,
  updateJobPostingValidator,
  deleteJobPostingValidator,
  createApplicationValidator,
  updateApplicationStatusValidator,
  deleteApplicationValidator,
} = require("../validators/recruitmentValidator");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ============= JOB POSTING ROUTES =============

// Create job posting (Auth Required)
router.post(
  "/job/create",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter"),
  createJobPostingValidator,
  validate,
  createJobPosting
);

// Get all job postings (Public)
router.get("/job", getAllJobPostings);

// Get applications for a job posting (Auth Required)
router.get(
  "/job/:jobPostingId/applications",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter", "manager"),
  getJobApplications
);

// Get job posting by ID - generic wildcard (Public)
router.get("/job/:id", getJobPostingById);

// Update job posting (Auth Required)
router.put(
  "/job/:id",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter"),
  updateJobPostingValidator,
  validate,
  updateJobPosting
);

// Delete job posting (Auth Required)
router.delete(
  "/job/:id",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter"),
  deleteJobPostingValidator,
  validate,
  deleteJobPosting
);

// ============= APPLICATION ROUTES =============

// Submit application (Public - Candidates can apply)
router.post("/application/submit", createApplicationValidator, validate, submitApplication);

// Get all applications (Auth Required)
router.get(
  "/application",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter", "manager"),
  getAllApplications
);

// Get application by ID (Auth Required)
router.get(
  "/application/:id",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter", "manager"),
  getApplicationById
);

// Update application status (Auth Required)
router.put(
  "/application/:id",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter"),
  updateApplicationStatusValidator,
  validate,
  updateApplicationStatus
);

// Delete application (Auth Required)
router.delete(
  "/application/:id",
  authMiddleware,
  authorizeRole("admin", "hr", "recruiter"),
  deleteApplicationValidator,
  validate,
  deleteApplication
);

// ============= AI WORKFLOW ROUTES =============

// Quick AI Screening (without application) (Auth Required)
router.post("/ai/quick-screen/:jobPostingId", authMiddleware, quickAIScreening);

// Evaluate candidate with AI (Auth Required)
router.post("/application/:applicationId/evaluate-ai", authMiddleware, evaluateAiValidator, validate, evaluateCandidateAI);

// Generate interview questions (Auth Required)
router.get("/application/:applicationId/interview-questions", authMiddleware, generateInterviewQuestions);

// Schedule interview (Auth Required)
router.post("/application/:applicationId/schedule-interview", authMiddleware, scheduleInterview);

// Record interview result (Auth Required)
router.post("/application/:applicationId/interview-result", authMiddleware, recordInterviewResult);

// Get candidate workflow status (Auth Required)
router.get("/application/:applicationId/workflow", authMiddleware, getCandidateWorkflow);

// Score voice interview response (Auth Required)
router.post("/voice-interview/score", authMiddleware, voiceScoreValidator, validate, scoreVoiceResponse);

// Transcribe voice interview audio (Auth Required)
router.post("/voice-interview/transcribe", authMiddleware, upload.single("audio"), transcribeAudio);

// Get voice interview summary session (Auth Required)
router.get("/voice-interview/:candidateId/summary", authMiddleware, getVoiceInterviewSummary);

// ============= CHATBOT (LangChain-style) ROUTES =============
const chatbotService = require("../services/chatbot.service");

// Send a chat message (multi-turn with session memory)
router.post("/chatbot", authMiddleware, chatbotValidator, validate, async (req, res, next) => {
  try {
    const { message, sessionId, applicationId } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "message is required" });
    }
    const sid = sessionId || `session_${req.user.id}_${Date.now()}`;
    const result = await chatbotService.chat({ sessionId: sid, message, applicationId, ip: req.ip });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Clear chat session
router.delete("/chatbot/:sessionId", authMiddleware, (req, res) => {
  chatbotService.clearSession(req.params.sessionId);
  res.json({ success: true, message: "Session cleared" });
});

// ============= SMART INTERVIEW SCHEDULING ROUTES =============
const schedulerService = require("../services/interviewScheduler.service");

// Get smart schedule suggestions for a job posting
router.get("/job/:jobPostingId/smart-schedule", authMiddleware, async (req, res, next) => {
  try {
    const { daysAhead = 7, maxSlots = 5 } = req.query;
    const result = await schedulerService.suggestInterviewSlots({
      jobPostingId: req.params.jobPostingId,
      daysAhead: parseInt(daysAhead),
      maxSlots: parseInt(maxSlots),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Get AI insight for a specific candidate's scheduling
router.post("/smart-schedule/insight", authMiddleware, async (req, res, next) => {
  try {
    const { candidateName, experience, skills, suggestedSlots } = req.body;
    const insight = await schedulerService.getAISchedulingInsight(
      candidateName, experience, skills, suggestedSlots
    );
    res.json({ success: true, data: { insight } });
  } catch (error) {
    next(error);
  }
});

// Book scheduled slot (Auth Required)
router.post("/schedule", authMiddleware, scheduleInterview);

// Upload PDF resume and automatically screen candidate (Auth Required)
router.post(
  "/application/upload-resume",
  authMiddleware,
  upload.single("resume"),
  uploadResumeAndApply
);

// Download candidate PDF evaluation report (Auth Required)
router.get(
  "/application/:id/report/pdf",
  authMiddleware,
  downloadCandidateReportPDF
);

// Download candidate CSV evaluation report (Auth Required)
router.get(
  "/application/:id/report/csv",
  authMiddleware,
  downloadCandidateReportCSV
);

// JD AI Analyzer (Auth Required)
router.post(
  "/job/analyze-jd",
  authMiddleware,
  analyzeJobDescription
);

// Video Interview Scorecard & Telemetry API (Candidates can save, authenticated or public interview session)
router.post(
  "/video-interview/result",
  saveVideoInterviewResult
);

// Get Video Interview summary session (Auth Required)
router.get(
  "/video-interview/:applicationId/summary",
  authMiddleware,
  getVideoInterviewSummary
);

module.exports = router;

