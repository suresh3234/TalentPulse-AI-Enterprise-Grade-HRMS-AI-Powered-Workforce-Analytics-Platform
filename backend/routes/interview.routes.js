const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const InterviewSession = require("../models/interviewSession.model");
const Application = require("../models/application.model");
const JobPosting = require("../models/jobPosting.model");
const SkillScore = require("../models/skillScore.model");
const VideoAnalysis = require("../models/videoAnalysis.model");
const Score = require("../models/score.model");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const emailNotificationService = require("../services/emailNotification.service");
const videoAnalysisService = require("../services/videoAnalysis.service");
const logger = require("../utils/logger");

// Multer for upload of recorded chunks
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const upload = multer({ dest: "uploads/" });

// ================= PUBLIC ROUTES =================

/**
 * GET /api/interview/token/:token
 * Public endpoint to fetch session details for a token-secured candidate invite
 */
router.get("/token/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    
    // We can assume the token is the InterviewSession ID or a query parameter
    // If it's a valid 24-char Mongoose ObjectId or UUID
    const session = await InterviewSession.findById(token)
      .populate("candidateId")
      .populate("jobId")
      .populate("hrUserId", "fullName email");

    if (!session) {
      return res.status(404).json({ success: false, message: "Interview session link is invalid or expired." });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        scheduledAt: session.scheduledAt,
        candidateName: session.candidateId?.candidateName,
        candidateEmail: session.candidateId?.candidateEmail,
        jobTitle: session.jobId?.title,
        hrName: session.hrUserId?.fullName,
      }
    });
  } catch (error) {
    next(error);
  }
});

// ================= PROTECTED ENDPOINTS =================

/**
 * GET /api/interview
 * List all live WebRTC interview sessions
 */
router.get("/", authMiddleware, authorizeRole("admin", "hr", "recruiter", "manager"), async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find()
      .populate("candidateId", "candidateName candidateEmail status")
      .populate("jobId", "title department")
      .populate("hrUserId", "fullName email")
      .sort({ scheduledAt: -1 });

    return res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/interview/schedule
 * Schedule a new Live WebRTC interview session and email invitation to candidate
 */
router.post("/schedule", authMiddleware, authorizeRole("admin", "hr", "recruiter"), async (req, res, next) => {
  try {
    const { candidateId, jobId, scheduledAt } = req.body;

    if (!candidateId || !jobId || !scheduledAt) {
      return res.status(400).json({ success: false, message: "candidateId, jobId, and scheduledAt are required." });
    }

    const application = await Application.findById(candidateId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Candidate application not found." });
    }

    const job = await JobPosting.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job posting not found." });
    }

    const session = new InterviewSession({
      candidateId,
      jobId,
      hrUserId: req.user._id,
      scheduledAt: new Date(scheduledAt),
      status: "scheduled",
    });

    await session.save();

    // Update application status
    application.status = "Interview Scheduled";
    await application.save();

    // Invite link: absolute frontend URL with token parameter (we use the session ID as token)
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendBaseUrl}/candidate/interview/live?token=${session._id}`;

    // Send email invitation
    await emailNotificationService.sendInterviewScheduledEmail({
      candidateEmail: application.candidateEmail,
      candidateName: application.candidateName,
      jobTitle: job.title,
      inviteLink,
      scheduledAt: session.scheduledAt,
    });

    return res.status(201).json({
      success: true,
      message: "Interview session scheduled and candidate notified.",
      data: session,
      inviteLink,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/interview/:id/start
 * Mark interview session status as in-progress
 */
router.post("/:id/start", async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await InterviewSession.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Interview session not found." });
    }

    session.status = "in-progress";
    session.startedAt = new Date();
    await session.save();

    return res.status(200).json({ success: true, message: "Interview session started.", data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/interview/:id/end
 * End live interview session, upload recorded video chunk, and trigger automated analysis pipeline
 */
router.post("/:id/end", upload.single("video"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { clientTelemetry = "{}" } = req.body;

    const session = await InterviewSession.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Interview session not found." });
    }

    let parsedTelemetry = {};
    try {
      parsedTelemetry = typeof clientTelemetry === "string" ? JSON.parse(clientTelemetry) : clientTelemetry;
    } catch (e) {
      logger.warn("Failed to parse client telemetry string inside end interview endpoint:", { error: e.message });
    }

    let recordingPath = "";
    if (req.file) {
      const targetDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filename = `recording_${id}_${Date.now()}.webm`;
      recordingPath = path.join(targetDir, filename);
      fs.renameSync(req.file.path, recordingPath);
      // Map to relative/web path
      recordingPath = `/uploads/${filename}`;
    }

    // Trigger async processing pipeline so endpoint completes fast, 
    // or run synchronously for simplicity in feedback loops.
    // We execute it and respond.
    const result = await videoAnalysisService.runVideoAnalysisPipeline(id, recordingPath, parsedTelemetry);

    return res.status(200).json({
      success: true,
      message: "Interview ended successfully and analysis pipeline completed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/interview/:id
 * Retrieve completed interview report metrics, scores, transcript, and emotion timelines
 */
router.get("/:id", authMiddleware, authorizeRole("admin", "hr", "recruiter", "manager"), async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await InterviewSession.findById(id)
      .populate("candidateId")
      .populate("jobId")
      .populate("hrUserId", "fullName email");

    if (!session) {
      return res.status(404).json({ success: false, message: "Interview session not found." });
    }

    const skillScores = await SkillScore.find({ interviewSessionId: id });
    const videoAnalysis = await VideoAnalysis.findOne({ interviewSessionId: id });
    const overallScorecard = await Score.findOne({ applicationId: session.candidateId?._id });

    return res.status(200).json({
      success: true,
      data: {
        session,
        skillScores,
        videoAnalysis,
        overallScorecard,
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/interview/:id/notes
 * Update HR recruiter notes for candidates application
 */
router.put("/:id/notes", authMiddleware, authorizeRole("admin", "hr", "recruiter"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const session = await InterviewSession.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Interview session not found." });
    }

    const application = await Application.findById(session.candidateId);
    if (application) {
      application.feedback = notes;
      await application.save();
    }

    return res.status(200).json({ success: true, message: "HR Notes updated successfully." });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/interview/:id/decision
 * Trigger hiring pipeline decision (Advance / Reject / Hold)
 */
router.post("/:id/decision", authMiddleware, authorizeRole("admin", "hr", "recruiter"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // "Shortlisted" | "Rejected" | "Selected"

    if (!decision) {
      return res.status(400).json({ success: false, message: "Hiring decision is required." });
    }

    const session = await InterviewSession.findById(id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Interview session not found." });
    }

    const application = await Application.findById(session.candidateId).populate("jobPostingId");
    if (!application) {
      return res.status(404).json({ success: false, message: "Candidate application not found." });
    }

    application.status = decision;
    await application.save();

    // Notify candidate
    await emailNotificationService.sendDecisionEmail({
      candidateEmail: application.candidateEmail,
      candidateName: application.candidateName,
      jobTitle: application.jobPostingId?.title || "Target Position",
      decision,
    });

    return res.status(200).json({
      success: true,
      message: `Hiring decision logged. Candidate status updated to: ${decision}`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
