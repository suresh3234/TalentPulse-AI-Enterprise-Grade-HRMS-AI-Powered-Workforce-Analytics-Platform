import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Filter,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Calendar,
  Mic,
  MessageSquare,
  Award,
  AlertTriangle,
  UserCheck,
  UploadCloud,
  FileText,
  Download,
  Loader2,
  Activity
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/Card";
import SmartScheduler from "../components/SmartScheduler";
import { getAiRecommendations, postRecruitmentChat } from "../api/aiService";
import { 
  getJobApplications, 
  getJobPostings, 
  getInterviewQuestions, 
  submitVoiceAnswerScore,
  uploadResumeAndApply,
  downloadCandidateReport
} from "../api/recruitmentService";
import API from "../api/axiosInstance";

const emptyRecruitmentState = {
  smartSummary: [],
  recruitment: {
    rankedCandidates: [],
    jobs: [],
    recommendations: [],
    summary: {},
    openJobs: [],
  },
};

const statusPalette = {
  Applied: "bg-slate-100 text-slate-700",
  "Under Review": "bg-blue-100 text-blue-700",
  Shortlisted: "bg-emerald-100 text-emerald-700",
  Selected: "bg-violet-100 text-violet-700",
  Offered: "bg-amber-100 text-amber-700",
  Rejected: "bg-rose-100 text-rose-700",
  Joined: "bg-teal-100 text-teal-700",
  interview_scheduled: "bg-indigo-100 text-indigo-700",
  "Interview Scheduled": "bg-indigo-100 text-indigo-700",
};

const filterOptions = {
  status: ["All", "Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Selected", "Offered"],
  match: ["All", "90%+", "75%+", "Below 75%"],
  skills: ["All", "No gaps", "Has gaps"],
};

const initialChatMessage = {
  role: "ai",
  text: "Ask RecruitAI about candidate fit, hiring priority, missing skills, or the selected role.",
};

function today() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getMatchBucket(matchPercentage) {
  if (matchPercentage >= 90) return "90%+";
  if (matchPercentage >= 75) return "75%+";
  return "Below 75%";
}

function highlightText(text, query) {
  if (!query) return text;
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${safeQuery})`, "gi"));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={`${text}-${index}`} className="rounded bg-amber-100 px-1 text-slate-900">
        {part}
      </mark>
    ) : (
      <span key={`${text}-${index}`}>{part}</span>
    )
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 py-1">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400"
          style={{ animationDelay: `${index * 0.2}s` }}
        />
      ))}
    </div>
  );
}

function LoadingPulse({ className }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${className}`} />;
}

function HiringSuggestion({ suggestion }) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/80 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <Sparkles size={15} />
        AI hiring suggestion
      </div>
      <p className="mt-2 text-sm leading-relaxed text-blue-800">{suggestion}</p>
    </div>
  );
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "bg-white text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function ChatPanel({
  messages,
  input,
  isTyping,
  onInputChange,
  onSend,
  onClose,
  mobile = false,
}) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-xl ${
        mobile ? "w-full" : "w-full"
      }`}
      style={{ maxHeight: "420px" }}
    >
      <div className="flex items-center gap-3 bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_65%,#0f766e_100%)] px-4 py-4 text-white">
        <div className="rounded-2xl bg-white/15 p-2">
          <Sparkles size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">RecruitAI Chat</div>
          <div className="text-xs text-white/75">Live candidate guidance</div>
        </div>
        <button
          onClick={onClose}
          className="rounded-xl p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  message.role === "user"
                    ? "rounded-tr-sm bg-slate-900 text-white"
                    : "rounded-tl-sm border border-slate-100 bg-white text-slate-700 shadow-sm"
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3 py-2 shadow-sm">
                <TypingDots />
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask RecruitAI..."
            className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-300"
          />
          <button
            onClick={onSend}
            disabled={!input.trim()}
            className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({ candidate, query, highlighted, activeSelection, onSelect, onStartVoice }) {
  const matchBucket = getMatchBucket(candidate.matchPercentage);
  const skillOverlap = candidate.overlappingSkills || [];
  const missingSkills = candidate.missingSkills || [];
  const reasons = candidate.reasons || [];

  const confidenceLevel = candidate.confidenceScore || 0.85;
  const isLimitedData = confidenceLevel < 0.6;
  const hasBiasFlag = candidate.aiFlags && candidate.aiFlags.includes("BIAS_REVIEW_RECOMMENDED");

  return (
    <div
      onClick={onSelect}
      className={`rounded-3xl border p-4 shadow-sm transition-all duration-200 cursor-pointer ${
        activeSelection
          ? "border-indigo-400 bg-indigo-50/20 shadow-md ring-2 ring-indigo-600/10"
          : highlighted
          ? "border-violet-200 bg-white hover:bg-slate-50/50"
          : "border-gray-150 bg-white hover:bg-slate-50/30"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Rank #{candidate.rank}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusPalette[candidate.status] || "bg-gray-100 text-gray-600"}`}>
              {candidate.status === "interview_scheduled" ? "Scheduled" : candidate.status}
            </span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {matchBucket}
            </span>
            
            {/* Hardened badges */}
            {isLimitedData && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 flex items-center gap-0.5 animate-pulse">
                ⚠️ Limited Data
              </span>
            )}
            {hasBiasFlag && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 flex items-center gap-0.5">
                ⚖️ Bias Audit Flag
              </span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-bold text-gray-900">
            {highlightText(candidate.candidateName, query)}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {candidate.currentCompany || "Independent"} | {candidate.experience} years experience
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50/80 p-3">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Why AI ranked this candidate</div>
              <div className="mt-2 space-y-1.5 text-xs text-slate-700">
                {reasons.slice(0, 3).map((reason, index) => (
                  <div key={`${candidate.applicationId}-reason-${index}`} className="flex gap-1.5">
                    <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>{highlightText(reason, query)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-3">
              <div className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Recommendation clarity</div>
              <div className="mt-1.5 text-xs font-bold text-slate-900 line-clamp-2">
                {candidate.hiringSuggestion}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#8b5cf6_0%,#2563eb_55%,#22c55e_100%)]"
                  style={{ width: `${Math.max(candidate.matchPercentage, 8)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {skillOverlap.slice(0, 4).map((skill) => (
              <span key={`${candidate.applicationId}-${skill}`} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {highlightText(skill, query)}
              </span>
            ))}
            {missingSkills.slice(0, 2).map((skill) => (
              <span key={`${candidate.applicationId}-missing-${skill}`} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                Missing: {highlightText(skill, query)}
              </span>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-44 md:self-stretch justify-between">
          <div className="rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#2563eb_60%,#22c55e_100%)] p-3 text-white text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/75">Match Fit</div>
            <div className="mt-1 text-2xl font-black">{candidate.matchPercentage}%</div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartVoice(candidate);
            }}
            className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 hover:bg-slate-800 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
          >
            🎙️ Screening
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecruitmentAi() {
  const [dashboardMode, setDashboardMode] = useState("resume"); // "resume" or "voice"
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [recruitmentData, setRecruitmentData] = useState(emptyRecruitmentState);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [matchFilter, setMatchFilter] = useState("All");
  const [skillGapFilter, setSkillGapFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([initialChatMessage]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPending, startJobTransition] = useTransition();
  const deferredSearch = useDeferredValue(search);

  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Resume Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadState, setUploadState] = useState("idle"); // "idle" | "uploading" | "parsing" | "analyzing" | "completed" | "error"
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [uploadError, setUploadError] = useState("");

  const handleUploadResume = async (e) => {
    e?.preventDefault();
    if (!uploadFile) return;
    if (!selectedJobId) {
      setUploadError("Please select a job opening before uploading a resume.");
      return;
    }

    setUploadState("uploading");
    setUploadProgressText("Uploading resume to secure container...");
    setUploadError("");

    try {
      // visual progress sequence for premium feel
      const t1 = setTimeout(() => {
        setUploadState("parsing");
        setUploadProgressText("Extracting resume PDF metadata & reading characters...");
      }, 800);

      const t2 = setTimeout(() => {
        setUploadState("analyzing");
        setUploadProgressText("Calculating ATS match percentage & semantic alignment...");
      }, 2000);

      const response = await uploadResumeAndApply(selectedJobId, uploadFile);

      clearTimeout(t1);
      clearTimeout(t2);
      
      setUploadState("completed");
      setUploadProgressText("Candidate successfully created and routed inside pipeline!");
      toast.success("Resume parsed and screened successfully!");

      // Refresh applications & insights
      const [jobApplications, aiRecommendations] = await Promise.all([
        getJobApplications(selectedJobId, { limit: 100 }),
        getAiRecommendations({
          scope: "recruitment",
          jobPostingId: selectedJobId,
          limit: 25,
        }),
      ]);
      setApplications(jobApplications);
      setRecruitmentData({
        ...emptyRecruitmentState,
        ...aiRecommendations,
      });

      // Clear states
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadState("idle");
      }, 1500);

    } catch (err) {
      setUploadState("error");
      setUploadError(err.message || "Failed to screen resume.");
    }
  };

  // Voice Screening Interactive State
  const [activeVoiceCandidate, setActiveVoiceCandidate] = useState(null);
  const [voiceQuestions, setVoiceQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSpeakingQuestion, setIsSpeakingQuestion] = useState(false);
  const [isListeningResponse, setIsListeningResponse] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [voiceHistory, setVoiceHistory] = useState([]);
  const [scoringInProgress, setScoringInProgress] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewError, setInterviewError] = useState("");

  const recognitionRef = useRef(null);

  const speakQuestion = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang.includes("en-US") && voice.name.includes("Google")) || 
                          voices.find(voice => voice.lang.includes("en")) || 
                          voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.onstart = () => setIsSpeakingQuestion(true);
    utterance.onend = () => {
      setIsSpeakingQuestion(false);
      startListening();
    };
    utterance.onerror = () => setIsSpeakingQuestion(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInterviewError("Web Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeakingQuestion(false);

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let finalTranscript = "";
    rec.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscription(finalTranscript + interimTranscript);
    };

    rec.onstart = () => {
      setIsListeningResponse(true);
      setTranscription("");
    };

    rec.onend = () => {
      setIsListeningResponse(false);
    };

    rec.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListeningResponse(false);
      if (event.error !== "no-speech") {
        setInterviewError(`Speech recognition error: ${event.error}`);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListeningResponse(false);
  };

  const handleStartVoiceInterview = async (candidateApplication) => {
    setActiveVoiceCandidate(candidateApplication);
    setVoiceQuestions([]);
    setCurrentQuestionIndex(0);
    setVoiceHistory([]);
    setInterviewLoading(true);
    setInterviewError("");
    try {
      const dbId = candidateApplication.applicationId || candidateApplication._id;
      const data = await getInterviewQuestions(dbId, 5); // Default to 5 questions
      if (data && data.questions && data.questions.length > 0) {
        setVoiceQuestions(data.questions);
      } else {
        throw new Error("No questions returned by AI");
      }
    } catch (err) {
      setInterviewError(err.message || "Failed to generate interview questions");
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    stopListening();
    if (!transcription.trim()) {
      setInterviewError("Please speak or write an answer before submitting.");
      return;
    }

    setScoringInProgress(true);
    setInterviewError("");
    const questionText = voiceQuestions[currentQuestionIndex];
    const answerTranscript = transcription;
    const dbId = activeVoiceCandidate.applicationId || activeVoiceCandidate._id;
    const isFinal = currentQuestionIndex === voiceQuestions.length - 1;

    try {
      const res = await API.post("/recruitment/voice-interview/score", {
        candidateId: dbId,
        jobPostingId: selectedJobId,
        sessionId: `voice_${dbId}_${Date.now()}`,
        questionIndex: currentQuestionIndex,
        questionText,
        answerTranscript,
        questionCategory: currentQuestionIndex === 0 ? "behavioral" : "technical",
        isFinalQuestion: isFinal,
        allAnswersSoFar: voiceHistory.map((h, i) => ({
          questionIndex: i,
          questionText: h.question,
          answerTranscript: h.response
        }))
      });

      const evaluation = res.data?.scoring;

      setVoiceHistory(prev => [...prev, {
        question: questionText,
        response: answerTranscript,
        score: evaluation?.scores?.relevance || 7,
        remarks: evaluation?.strengths?.join(", ") || "Good response"
      }]);

      setTranscription("");

      if (currentQuestionIndex < voiceQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        toast.success("Voice screening session completed!");
        // Refresh lists
        if (selectedJobId) {
          const [jobApplications, aiRecommendations] = await Promise.all([
            getJobApplications(selectedJobId, { limit: 100 }),
            getAiRecommendations({
              scope: "recruitment",
              jobPostingId: selectedJobId,
              limit: 25,
            })
          ]);
          setApplications(jobApplications);
          setRecruitmentData({
            ...emptyRecruitmentState,
            ...aiRecommendations,
          });
        }
      }
    } catch (err) {
      setInterviewError(err.message || "Failed to score answer.");
    } finally {
      setScoringInProgress(false);
    }
  };

  useEffect(() => {
    if (voiceQuestions.length > 0 && activeVoiceCandidate) {
      speakQuestion(voiceQuestions[currentQuestionIndex]);
    }
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    };
  }, [voiceQuestions, currentQuestionIndex, activeVoiceCandidate]);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setError("");
        const listings = await getJobPostings({ status: "Open", limit: 50 });
        setJobs(listings);
        if (listings[0]?._id) {
          setSelectedJobId(listings[0]._id);
        } else {
          setLoading(false);
        }
      } catch (loadError) {
        setLoading(false);
        setError(loadError.message || "Failed to load recruitment jobs.");
      }
    };

    loadJobs();
  }, []);

  useEffect(() => {
    if (!selectedJobId) return;

    const loadRecruitmentInsights = async () => {
      try {
        setLoading(true);
        setError("");

        const [jobApplications, aiRecommendations] = await Promise.all([
          getJobApplications(selectedJobId, { limit: 100 }),
          getAiRecommendations({
            scope: "recruitment",
            jobPostingId: selectedJobId,
            limit: 25,
          }),
        ]);

        setApplications(jobApplications);
        setRecruitmentData({
          ...emptyRecruitmentState,
          ...aiRecommendations,
        });
        setSelectedCandidate(null); // Reset selection
      } catch (loadError) {
        setError(loadError.message || "Failed to load AI-powered recruitment insights.");
      } finally {
        setLoading(false);
      }
    };

    loadRecruitmentInsights();
  }, [selectedJobId]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const rankedCandidates = useMemo(
    () => recruitmentData.recruitment?.rankedCandidates || [],
    [recruitmentData.recruitment?.rankedCandidates],
  );

  const filteredCandidates = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return rankedCandidates.filter((candidate) => {
      if (!candidate) return false;
      const candidateNameSafe = candidate.candidateName || "";
      const jobTitleSafe = candidate.jobTitle || "";
      const reasonText = (candidate.reasons || []).join(" ").toLowerCase();
      const skillText = (candidate.overlappingSkills || []).join(" ").toLowerCase();
      const gapText = (candidate.missingSkills || []).join(" ").toLowerCase();
      
      const matchesSearch =
        !query ||
        candidateNameSafe.toLowerCase().includes(query) ||
        jobTitleSafe.toLowerCase().includes(query) ||
        reasonText.includes(query) ||
        skillText.includes(query) ||
        gapText.includes(query);

      const matchesStatus =
        statusFilter === "All" || candidate.status === statusFilter;

      const matchesBucket =
        matchFilter === "All" || getMatchBucket(candidate.matchPercentage) === matchFilter;

      const hasGaps = (candidate.missingSkills || []).length > 0;
      const matchesSkillGap =
        skillGapFilter === "All" ||
        (skillGapFilter === "No gaps" && !hasGaps) ||
        (skillGapFilter === "Has gaps" && hasGaps);

      return matchesSearch && matchesStatus && matchesBucket && matchesSkillGap;
    });
  }, [deferredSearch, matchFilter, rankedCandidates, skillGapFilter, statusFilter]);

  const pipelineSummary = useMemo(() => {
    return applications.reduce(
      (accumulator, application) => {
        accumulator.total += 1;
        accumulator[application.status] = (accumulator[application.status] || 0) + 1;
        return accumulator;
      },
      { total: 0 },
    );
  }, [applications]);

  const highlightedJob = recruitmentData.recruitment?.jobs?.find(
    (job) => job.jobPostingId === selectedJobId,
  );

  const topCandidate = filteredCandidates[0] || rankedCandidates[0] || null;
  const activeCandidate = selectedCandidate || topCandidate;
  
  const searchQuery = deferredSearch.trim();
  const gapFreeCount = rankedCandidates.filter(
    (candidate) => (candidate.missingSkills || []).length === 0,
  ).length;

  // Active candidates list representing voice summaries
  const voiceDashboardCandidates = useMemo(() => {
    return applications.map(app => {
      // Find matching ranked candidate details
      const rc = rankedCandidates.find(c => c.applicationId === String(app._id));
      return {
        ...app,
        matchPercentage: rc?.matchPercentage || 70,
        rank: rc?.rank || "--",
        reasons: rc?.reasons || [],
        missingSkills: rc?.missingSkills || [],
        jobTitle: selectedJob?.title || "Target Position",
        hiringSuggestion: rc?.hiringSuggestion || "Launch audio voice screening session."
      };
    });
  }, [applications, rankedCandidates, selectedJob]);

  const [activeVoiceSummaryCandidate, setActiveVoiceSummaryCandidate] = useState(null);
  const activeVoiceSummaryData = useMemo(() => {
    return voiceDashboardCandidates.find(c => String(c._id) === String(activeVoiceSummaryCandidate?._id)) || voiceDashboardCandidates[0] || null;
  }, [voiceDashboardCandidates, activeVoiceSummaryCandidate]);

  useEffect(() => {
    setMessages([
      initialChatMessage,
      ...(activeCandidate
        ? [
            {
              role: "ai",
              text: `${activeCandidate.candidateName} is selected for ${activeCandidate.jobTitle}. Stated experience is ${activeCandidate.experience} years. Ask for custom fit advice.`,
            },
          ]
        : selectedJob
          ? [
              {
                role: "ai",
                text: `${selectedJob.title} is selected. Ask for shortlist advice, role requirements, or candidate skill gaps.`,
              },
            ]
          : []),
    ]);
  }, [activeCandidate, selectedJob]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question) return;

    setMessages((current) => [...current, { role: "user", text: question }]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await postRecruitmentChat({
        message: question,
        jobPostingId: selectedJobId,
        applicationId: activeCandidate?.applicationId || activeCandidate?._id,
        limit: 25,
      });

      setMessages((current) => [...current, { role: "ai", text: response.reply }]);
    } catch (chatError) {
      setMessages((current) => [
        ...current,
        {
          role: "ai",
          text: chatError.message || "RecruitAI could not load a live answer right now. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSlotBooked = (slot) => {
    // Reload candidate list from DB
    getJobApplications(selectedJobId, { limit: 100 }).then(setApplications);
    toast.success("AI Booking fully processed & registered!");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_30%),linear-gradient(135deg,#0f172a_0%,#1e3a8a_45%,#0f766e_100%)] p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
              <Sparkles size={14} />
              AI Recruitment Flow
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              Rank candidates by live fit, not by manual guesswork.
            </h1>
            
            {/* Separate Dashboards Tab Controller */}
            <div className="mt-6 flex border-b border-white/10 pb-1 gap-6">
              <button
                onClick={() => setDashboardMode("resume")}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  dashboardMode === "resume"
                    ? "border-indigo-400 text-white"
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                📋 Resume Screening Dashboard
              </button>
              <button
                onClick={() => setDashboardMode("voice")}
                className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  dashboardMode === "voice"
                    ? "border-indigo-400 text-white"
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                🎙️ Voice Screening Dashboard
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl bg-white px-4 py-3 text-slate-900">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Open jobs</div>
              <div className="mt-1 text-2xl font-bold">{jobs.length}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 text-slate-900">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Strong matches</div>
              <div className="mt-1 text-2xl font-bold">
                {recruitmentData.recruitment?.summary?.strongMatches || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {error}
        </div>
      ) : null}

      {/* ================= RESUME SCREENING DASHBOARD ================= */}
      {dashboardMode === "resume" && (
        <div className="space-y-5 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <Users size={18} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">Applications</div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">{pipelineSummary.total || 0}</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <Target size={18} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">Shortlist ready</div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">
                    {recruitmentData.recruitment?.summary?.shortlistedReady || 0}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-600">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">Top match</div>
                  <div className="mt-1 text-2xl font-bold text-gray-900">{highlightedJob?.topMatch || 0}%</div>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
                  <BriefcaseBusiness size={18} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400">Hiring focus</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {selectedJob?.title || "No open job selected"}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Job Postings Selection */}
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Open recruitment pipeline</h2>
                <p className="mt-0.5 text-xs text-gray-400">Switch roles to refresh candidate ranking and AI recommendations</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search candidate, skill, or role"
                  className="w-56 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
                <Filter size={14} className="text-gray-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              {jobs.map((job) => {
                const active = job._id === selectedJobId;
                return (
                  <button
                    key={job._id}
                    onClick={() =>
                      startJobTransition(() => {
                        setSelectedJobId(job._id);
                      })
                    }
                    className={`rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                        : "border-gray-100 bg-slate-50 text-gray-900 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-current/70">{job.department}</div>
                    <div className="mt-2 text-base font-bold">{job.title}</div>
                    <div className="mt-1 text-sm text-current/70">{job.position}</div>
                    <div className="mt-4 text-xs text-current/70">
                      {job.skills?.slice(0, 3).join(" | ") || "No skill tags added"}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Main Pipeline layout */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            {/* Left side list of candidates */}
            <div className="space-y-4 xl:col-span-3">
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Smart candidate filters</h2>
                      <p className="mt-0.5 text-xs text-gray-400">Narrow the ranking by status, match strength, and skill readiness</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95"
                      >
                        <UploadCloud size={13} />
                        Submit PDF Resume
                      </button>
                      {searchQuery && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                          Search highlight active
                          <ArrowUpRight size={13} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {filterOptions.status.map((option) => (
                        <FilterChip key={option} active={statusFilter === option} onClick={() => setStatusFilter(option)}>
                          {option}
                        </FilterChip>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {filterOptions.match.map((option) => (
                        <FilterChip key={option} active={matchFilter === option} onClick={() => setMatchFilter(option)}>
                          {option}
                        </FilterChip>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {filterOptions.skills.map((option) => (
                        <FilterChip key={option} active={skillGapFilter === option} onClick={() => setSkillGapFilter(option)}>
                          {option}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {isPending && (
                <div className="rounded-3xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-750">
                  Updating candidate ranking for the selected role...
                </div>
              )}

              {loading ? (
                <Card className="p-5">
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <LoadingPulse key={idx} className="h-36 w-full" />
                    ))}
                  </div>
                </Card>
              ) : filteredCandidates.length > 0 ? (
                filteredCandidates.map((candidate, idx) => (
                  <CandidateCard
                    key={candidate.applicationId}
                    candidate={candidate}
                    query={searchQuery}
                    activeSelection={activeCandidate?.applicationId === candidate.applicationId}
                    highlighted={idx === 0 || (!!searchQuery && (candidate.candidateName || "").toLowerCase().includes(searchQuery.toLowerCase()))}
                    onSelect={() => setSelectedCandidate(candidate)}
                    onStartVoice={handleStartVoiceInterview}
                  />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <div className="text-lg font-semibold text-gray-900">No ranked candidates found</div>
                  <p className="mt-2 text-sm text-gray-500">Try a different job opening or filter combination.</p>
                </Card>
              )}
            </div>

            {/* Right side Detail panel */}
            <div className="space-y-4 xl:col-span-2">
              <Card className="overflow-hidden p-0 border border-slate-100">
                <div className="bg-[linear-gradient(135deg,#faf5ff_0%,#eef2ff_55%,#ecfeff_100%)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-500">AI Evaluation Detail</div>
                      <h2 className="mt-2 text-lg font-bold text-slate-900">{activeCandidate?.candidateName || "No candidate selected"}</h2>
                      <p className="mt-1 text-xs text-slate-600">
                        {activeCandidate
                          ? `${activeCandidate.jobTitle} with ${activeCandidate.matchPercentage}% fit confidence`
                          : "Select a candidate to view detailed AI support."}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Rank</div>
                      <div className="mt-1 text-xl font-black text-slate-900">{activeCandidate ? `#${activeCandidate.rank}` : "--"}</div>
                    </div>
                  </div>

                  {activeCandidate && (
                    <div className="mt-4 rounded-2xl bg-white/80 p-4 border border-indigo-50/50">
                      <div className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Decision support</div>
                      <div className="mt-2 text-sm font-bold text-slate-900">{activeCandidate.hiringSuggestion}</div>
                      <div className="mt-3 text-xs leading-relaxed text-slate-600">
                        {(activeCandidate.reasons || []).slice(0, 2).join(" | ")}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Recruitment AI Chatbot */}
              <div className="hidden xl:block">
                {chatOpen ? (
                  <ChatPanel
                    messages={messages}
                    input={input}
                    isTyping={isTyping}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onClose={() => setChatOpen(false)}
                  />
                ) : (
                  <button
                    onClick={() => setChatOpen(true)}
                    className="w-full rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 hover:bg-blue-100 py-3 text-xs font-bold text-blue-700 transition"
                  >
                    💬 Ask RecruitAI Chat
                  </button>
                )}
              </div>

              {/* TASK 4: Smart Scheduler UI Placement (Below ChatPanel and Above Voice Screening button) */}
              {activeCandidate && selectedJobId && (
                <div className="animate-fade-in">
                  <SmartScheduler
                    candidate={activeCandidate}
                    jobPostingId={selectedJobId}
                    onSlotBooked={handleSlotBooked}
                  />
                </div>
              )}

              {/* Dedicated Voice Screening Button inside Candidate Detail Panel */}
              {activeCandidate && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleStartVoiceInterview(activeCandidate)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_55%,#0f766e_100%)] hover:opacity-90 py-3 text-xs font-bold text-white shadow-md transition active:scale-95 animate-pulse-subtle"
                  >
                    🎙️ Launch AI Voice Screening
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={async () => {
                        const appDbId = activeCandidate.applicationId || activeCandidate._id;
                        toast.promise(
                          downloadCandidateReport(appDbId, "pdf", activeCandidate.candidateName),
                          {
                            loading: "Generating PDF assessment report...",
                            success: "PDF report downloaded!",
                            error: "Failed to download PDF report"
                          }
                        );
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition active:scale-95"
                    >
                      <Download size={13} className="text-indigo-600" />
                      Export PDF
                    </button>
                    <button
                      onClick={async () => {
                        const appDbId = activeCandidate.applicationId || activeCandidate._id;
                        toast.promise(
                          downloadCandidateReport(appDbId, "csv", activeCandidate.candidateName),
                          {
                            loading: "Compiling CSV report...",
                            success: "CSV report downloaded!",
                            error: "Failed to download CSV report"
                          }
                        );
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition active:scale-95"
                    >
                      <FileText size={13} className="text-emerald-600" />
                      Export CSV
                    </button>
                  </div>
                </div>
              )}

              {highlightedJob?.hiringSuggestion && <HiringSuggestion suggestion={highlightedJob.hiringSuggestion} />}

              {/* Role Summary */}
              <Card className="p-4 sm:p-5">
                <h2 className="text-base font-bold text-gray-900">Role summary</h2>
                {selectedJob ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-slate-50/80 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Position</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{selectedJob.title}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50/80 p-3">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Required experience</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{selectedJob.requiredExperience} years</div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">No open role available right now.</p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ================= VOICE SCREENING DASHBOARD ================= */}
      {dashboardMode === "voice" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5 animate-fade-in">
          {/* Left Column: Voice candidates */}
          <div className="space-y-4 xl:col-span-2">
            <Card className="p-4 sm:p-5">
              <h3 className="text-base font-bold text-gray-900">Screening Pipeline</h3>
              <p className="text-xs text-gray-400 mt-0.5">Select a candidate to view their complete voice interview summary report.</p>
              
              <div className="mt-4 space-y-2 max-h-[640px] overflow-y-auto pr-1">
                {voiceDashboardCandidates.map((cand) => {
                  const isSelected = activeVoiceSummaryData?._id === cand._id;
                  const hasInterview = cand.voiceInterview && cand.voiceInterview.status === "completed";
                  const score = cand.voiceInterview?.compositeScore || null;

                  return (
                    <div
                      key={cand._id}
                      onClick={() => setActiveVoiceSummaryCandidate(cand)}
                      className={`rounded-2xl border p-3.5 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                        isSelected
                          ? "border-indigo-400 bg-indigo-50/30 ring-2 ring-indigo-600/10 shadow-sm"
                          : "border-slate-100 bg-slate-50/20 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{cand.candidateName}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{cand.experience} years experience · Match: {cand.matchPercentage}%</p>
                      </div>

                      {hasInterview ? (
                        <div className="text-right">
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800 uppercase">
                            Grade {cand.voiceInterview.overallGrade || "A"}
                          </span>
                          <div className="text-[11px] font-bold text-emerald-700 mt-1">{score}/10 Avg</div>
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
                
                {voiceDashboardCandidates.length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    No candidates found for the selected job pipeline.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Voice control room and scorecard detail */}
          <div className="space-y-4 xl:col-span-3">
            {activeVoiceSummaryData ? (
              <div className="space-y-4">
                {/* Visual scorecard report */}
                <Card className="p-5 space-y-5 border border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 uppercase tracking-wide">
                        🎙️ Voice screening scorecard
                      </span>
                      <h2 className="mt-3 text-xl font-bold text-slate-900">{activeVoiceSummaryData.candidateName}</h2>
                      <p className="text-xs text-slate-400">Position: {activeVoiceSummaryData.jobTitle}</p>
                    </div>

                    <div className="flex gap-2">
                      {activeVoiceSummaryData.voiceInterview && activeVoiceSummaryData.voiceInterview.status === "completed" ? (
                        <div className="rounded-2xl bg-[linear-gradient(135deg,#047857_0%,#10b981_100%)] p-3 text-white text-center shadow-md">
                          <div className="text-[9px] uppercase tracking-wider font-bold">Voice Grade</div>
                          <div className="text-2xl font-black mt-0.5">{activeVoiceSummaryData.voiceInterview.overallGrade}</div>
                          <div className="text-[10px] text-white/80 mt-0.5">{activeVoiceSummaryData.voiceInterview.compositeScore}/10 composite</div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartVoiceInterview(activeVoiceSummaryData)}
                          className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-5 py-3 text-xs font-bold text-white shadow transition flex items-center gap-1"
                        >
                          🎙️ Start Voice Interview
                        </button>
                      )}
                    </div>
                  </div>

                  {activeVoiceSummaryData.voiceInterview && activeVoiceSummaryData.voiceInterview.status === "completed" ? (
                    <div className="space-y-5">
                      {/* Overview summary */}
                      <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">AI Scoring Metrics</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                          {activeVoiceSummaryData.voiceInterview.answers && activeVoiceSummaryData.voiceInterview.answers[0]?.scores ? (
                            Object.entries(activeVoiceSummaryData.voiceInterview.answers[0].scores).map(([dimension, value]) => (
                              <div key={dimension} className="rounded-xl bg-white p-2.5 border border-slate-100 text-center shadow-sm">
                                <div className="text-[9px] font-bold text-slate-400 capitalize">{dimension}</div>
                                <div className="text-lg font-black text-slate-800 mt-0.5">{value}/10</div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-5 text-center text-xs text-slate-400">Scoring metrics calculated.</div>
                          )}
                        </div>
                      </div>

                      {/* Voice Characteristics Metrics */}
                      <div className="rounded-2xl bg-indigo-50/30 p-4 border border-indigo-100/50">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-indigo-900/60 flex items-center gap-1.5">
                          <Activity size={14} className="text-indigo-600 animate-pulse" />
                          Speech Dynamics & Emotional Tone (Acoustic AI)
                        </h4>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div className="rounded-xl bg-white p-2.5 border border-slate-100 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400">Fluency Score</div>
                            <div className="text-lg font-black text-slate-800 mt-0.5">
                              {activeVoiceSummaryData.voiceInterview.voiceAnalysis?.fluencyScore || 85}%
                            </div>
                          </div>
                          
                          <div className="rounded-xl bg-white p-2.5 border border-slate-100 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400">Speaking Rate</div>
                            <div className="text-lg font-black text-slate-800 mt-0.5">
                              {activeVoiceSummaryData.voiceInterview.voiceAnalysis?.speedWpm || 120} WPM
                            </div>
                          </div>

                          <div className="rounded-xl bg-white p-2.5 border border-slate-100 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400">Linguistic Fillers</div>
                            <div className="text-lg font-black text-slate-800 mt-0.5 text-amber-600">
                              {activeVoiceSummaryData.voiceInterview.voiceAnalysis?.hesitationCount || 0} times
                            </div>
                          </div>

                          <div className="rounded-xl bg-white p-2.5 border border-slate-100 text-center shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400">Detected Mood</div>
                            <div className="text-sm font-black text-indigo-700 mt-1 truncate">
                              {activeVoiceSummaryData.voiceInterview.voiceAnalysis?.emotion || "Confident"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white px-3.5 py-2.5 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700">Verbal Tone Profile:</span>
                          <span className="text-slate-600 italic mt-0.5 sm:mt-0">
                            {activeVoiceSummaryData.voiceInterview.voiceAnalysis?.tone || "Structured, Professional & Technical"}
                          </span>
                        </div>
                      </div>

                      {/* Timeline of answers */}
                      <div className="space-y-4 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Transcript and scoring history</h4>
                        
                        <div className="space-y-3">
                          {activeVoiceSummaryData.voiceInterview.answers && activeVoiceSummaryData.voiceInterview.answers.filter(Boolean).map((answer, index) => (
                            <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-xs font-bold text-indigo-700">Q{index + 1}: {answer.questionText}</span>
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-black text-emerald-700">{answer.scores?.relevance || 7}/10 Relevance</span>
                              </div>
                              <p className="text-xs italic text-slate-700 font-medium bg-white/70 rounded-xl p-3 border border-slate-100">" {answer.transcript} "</p>
                              {answer.followUpQuestion && (
                                <p className="text-[11px] text-indigo-900 bg-indigo-50/50 rounded-xl px-3 py-1.5 font-medium">
                                  <strong>Follow-up:</strong> {answer.followUpQuestion}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Voice screening pending view
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                      <div className="rounded-full bg-indigo-50 p-6 text-indigo-500 animate-pulse">
                        <Mic size={42} />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">Voice Screening Pending</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">This candidate has not undergone verbal screening. Kickstart a tailored voice-screening session with active TTS spoken prompts and STT text cleanups.</p>
                      </div>
                      <button
                        onClick={() => handleStartVoiceInterview(activeVoiceSummaryData)}
                        className="rounded-2xl bg-slate-900 hover:bg-slate-800 px-6 py-2.5 text-xs font-bold text-white shadow"
                      >
                        🎙️ Launch Screening Dialog
                      </button>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center text-slate-400">
                Select a candidate from the left list to review their Voice Screening Room.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Interactive voice screening modal */}
      {activeVoiceCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-[32px] bg-white border border-slate-100 shadow-2xl overflow-hidden flex flex-col my-8 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white">
              <div>
                <span className="rounded-full bg-indigo-500/25 border border-indigo-400/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-200">
                  🎙️ AI Voice Screening
                </span>
                <h3 className="mt-2 text-xl font-bold text-white">
                  Interviewing {activeVoiceCandidate.candidateName}
                </h3>
                <p className="text-xs text-white/70 mt-1">
                  Role: {activeVoiceCandidate.jobTitle || selectedJob?.title}
                </p>
              </div>
              <button
                onClick={() => {
                  window.speechSynthesis.cancel();
                  if (recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch(e) {}
                  }
                  setActiveVoiceCandidate(null);
                }}
                className="rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 space-y-6">
              {interviewLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                  <p className="text-sm font-medium text-slate-600 animate-pulse">Generating interview questions tailored to profile...</p>
                </div>
              ) : interviewError ? (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                  <p className="font-semibold">Error Occurred</p>
                  <p className="mt-1">{interviewError}</p>
                  <button
                    onClick={() => handleStartVoiceInterview(activeVoiceCandidate)}
                    className="mt-3 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 transition"
                  >
                    Try Again
                  </button>
                </div>
              ) : voiceQuestions.length > 0 ? (
                <div className="space-y-6">
                  {/* Progress & Question Box */}
                  <div className="rounded-3xl border border-indigo-50 bg-indigo-50/30 p-5 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Question {currentQuestionIndex + 1} of {voiceQuestions.length}
                      </span>
                      <button
                        onClick={() => speakQuestion(voiceQuestions[currentQuestionIndex])}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border transition ${
                          isSpeakingQuestion 
                            ? "bg-indigo-600 text-white border-indigo-600 animate-pulse" 
                            : "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        }`}
                      >
                        🔊 {isSpeakingQuestion ? "Speaking..." : "Read Question"}
                      </button>
                    </div>

                    <p className="text-lg font-bold text-slate-800 leading-relaxed">
                      {voiceQuestions[currentQuestionIndex]}
                    </p>
                  </div>

                  {/* Audio transcription box */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Candidate Response (Speech to Text)
                      </label>
                      {isListeningResponse && (
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                          Listening...
                        </span>
                      )}
                    </div>

                    <div className="relative rounded-3xl border border-slate-200 bg-slate-50 p-4 min-h-[140px] focus-within:border-indigo-300 transition flex flex-col">
                      <textarea
                        value={transcription}
                        onChange={(e) => setTranscription(e.target.value)}
                        placeholder="Click 'Start Speaking' or type response here..."
                        className="w-full flex-1 bg-transparent text-sm text-slate-700 outline-none resize-none min-h-[100px]"
                      />
                      
                      {isListeningResponse && (
                        <div className="flex items-center justify-center gap-1 h-6 mt-2 self-center">
                          {[0.4, 0.8, 0.6, 0.9, 0.5, 0.7, 0.3].map((val, idx) => (
                            <span 
                              key={idx}
                              className="w-1 rounded-full bg-indigo-500 animate-bounce"
                              style={{ 
                                height: `${val * 100}%`, 
                                animationDuration: `${0.6 + idx * 0.1}s`,
                                transformOrigin: 'bottom'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        {isListeningResponse ? (
                          <button
                            onClick={stopListening}
                            className="rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 text-xs font-semibold text-rose-700 transition"
                          >
                            ⏹️ Stop Listening
                          </button>
                        ) : (
                          <button
                            onClick={startListening}
                            className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
                          >
                            🎙️ Start Speaking
                          </button>
                        )}
                        <button
                          onClick={() => setTranscription("")}
                          disabled={!transcription}
                          className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 transition disabled:opacity-50"
                        >
                          Clear
                        </button>
                      </div>

                      <button
                        onClick={handleSubmitAnswer}
                        disabled={scoringInProgress || !transcription.trim()}
                        className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                      >
                        {scoringInProgress ? "Evaluating..." : "Submit Answer"}
                      </button>
                    </div>
                  </div>

                  {/* Voice Interview History */}
                  {voiceHistory.length > 0 && (
                    <div className="border-t border-slate-100 pt-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Interview History & AI Ratings
                      </h4>
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                        {voiceHistory.map((item, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-xs font-bold text-slate-700">Q{idx + 1}: {item.question}</p>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold flex-shrink-0 bg-emerald-50 text-emerald-700`}>
                                {item.score}/10
                              </span>
                            </div>
                            <p className="text-xs italic text-slate-700 font-medium">" {item.response} "</p>
                            <p className="text-[11px] text-indigo-900 bg-indigo-50/50 rounded-xl px-3 py-1.5 font-semibold">
                              <strong>AI Feedback:</strong> {item.remarks}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <p>Questions could not be generated. Please make sure the candidate status allows it.</p>
                </div>
              )}
            </div>

            {/* Footer summary */}
            {voiceHistory.length === voiceQuestions.length && voiceQuestions.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">Voice screening session completed!</p>
                  <p className="text-xs text-slate-500 mt-0.5">Average score: {(voiceHistory.reduce((sum, h) => sum + h.score, 0) / voiceHistory.length).toFixed(1)}/10. Overall rating updated.</p>
                </div>
                <button
                  onClick={() => {
                    window.speechSynthesis.cancel();
                    if (recognitionRef.current) {
                      try { recognitionRef.current.stop(); } catch(e) {}
                    }
                    setActiveVoiceCandidate(null);
                  }}
                  className="w-full sm:w-auto rounded-2xl bg-slate-900 hover:bg-slate-800 px-6 py-2.5 text-xs font-bold text-white transition shadow"
                >
                  Finish & Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ================= DRAG & DROP PDF UPLOAD MODAL ================= */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-[32px] bg-white border border-slate-100 shadow-2xl p-6 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Candidate Resume</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload a PDF resume to instantly screen the profile</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setUploadState("idle");
                  setUploadError("");
                }}
                className="rounded-full bg-slate-100 hover:bg-slate-200 p-2 text-slate-500 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadResume} className="mt-5 space-y-4">
              {uploadState === "idle" ? (
                <div 
                  className="border-2 border-dashed border-slate-200 rounded-[24px] bg-slate-50/50 hover:bg-slate-50 p-8 flex flex-col items-center justify-center cursor-pointer transition focus-within:border-indigo-450 focus-within:ring-4 focus-within:ring-indigo-100/50"
                  onClick={() => document.getElementById("resume-input-file").click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      if (file.type !== "application/pdf") {
                        setUploadError("Only PDF files are supported.");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setUploadError("File size must not exceed 5MB.");
                        return;
                      }
                      setUploadFile(file);
                      setUploadError("");
                    }
                  }}
                >
                  <input 
                    id="resume-input-file"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.size > 5 * 1024 * 1024) {
                          setUploadError("File size must not exceed 5MB.");
                          return;
                        }
                        setUploadFile(file);
                        setUploadError("");
                      }
                    }}
                  />
                  <div className="rounded-full bg-indigo-50 p-4 text-indigo-500 mb-3">
                    <UploadCloud size={32} />
                  </div>
                  {uploadFile ? (
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800">{uploadFile.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB · Ready to parse</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800">Drag & drop resume PDF here</p>
                      <p className="text-xs text-slate-400 mt-1">or click to browse from device (Max 5MB)</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Parsing Progress States */
                <div className="border border-slate-100 rounded-[24px] bg-slate-50/50 p-8 flex flex-col items-center justify-center text-center space-y-4">
                  {uploadState === "completed" ? (
                    <div className="rounded-full bg-emerald-50 p-4 text-emerald-500 mb-1">
                      <CheckCircle2 size={32} className="animate-bounce" />
                    </div>
                  ) : uploadState === "error" ? (
                    <div className="rounded-full bg-rose-50 p-4 text-rose-500 mb-1">
                      <AlertTriangle size={32} />
                    </div>
                  ) : (
                    <div className="rounded-full bg-indigo-50 p-4 text-indigo-500 mb-1 animate-spin">
                      <Loader2 size={32} />
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      {uploadState === "uploading" && "Uploading to Secure Hub..."}
                      {uploadState === "parsing" && "Extracting Resume Content..."}
                      {uploadState === "analyzing" && "AI ATS Match Scoring..."}
                      {uploadState === "completed" && "Screening Complete!"}
                      {uploadState === "error" && "Screening Failed"}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">{uploadProgressText || uploadError}</p>
                  </div>
                  
                  {uploadState !== "completed" && uploadState !== "error" && (
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ 
                          width: uploadState === "uploading" ? "25%" : uploadState === "parsing" ? "60%" : "95%" 
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadState === "idle" && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadFile(null);
                      setUploadError("");
                    }}
                    className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!uploadFile}
                    className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                  >
                    Run AI Screening
                  </button>
                </div>
              )}

              {uploadState === "error" && (
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadState("idle");
                      setUploadFile(null);
                      setUploadError("");
                    }}
                    className="rounded-2xl bg-slate-900 hover:bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow transition"
                  >
                    Retry Upload
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
