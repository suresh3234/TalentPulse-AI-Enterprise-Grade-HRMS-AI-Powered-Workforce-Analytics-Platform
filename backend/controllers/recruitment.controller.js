const JobPosting = require("../models/jobPosting.model");
const Application = require("../models/application.model");
const { validationResult } = require("express-validator");
const aiService = require("../services/ai.service");
const workflowService = require("../services/ai/workflow.service");
const { isValidTransition, getAllowedTransitions, getStageDescription } = require("../modules/candidateWorkflow");
const { parsePDF } = require("../utils/pdfParser");
const { parseResumeWithLLM, analyzeCandidate, autoAdvanceCandidate, checkScoringBias } = require("../services/ai/recruitment.ai");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const VideoInterview = require("../models/videoInterview.model");
const Score = require("../models/score.model");
const logger = require("../utils/logger");


// ============= JOB POSTING ENDPOINTS =============

// Create Job Posting
const createJobPosting = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation errors:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: errors.array(),
        data: errors.array()
      });
    }

    const { title, description, department, position, requiredExperience, skills, salary, location, jobType, numberOfPositions, closingDate, postedBy } = req.body;

    // Use postedBy from body if provided, otherwise use authenticated user
    // If neither, use MongoDB system user or skip (make it optional)
    let jobPostedBy = postedBy || (req.user ? req.user._id : undefined);

    const jobPosting = new JobPosting({
      title,
      description,
      department,
      position,
      requiredExperience,
      skills: skills || [],
      salary: salary || {},
      location,
      jobType: jobType || "Full-time",
      numberOfPositions: numberOfPositions || 1,
      closingDate,
      ...(jobPostedBy && { postedBy: jobPostedBy }), // Only set if we have a valid ID
      status: "Open",
    });

    await jobPosting.save();

    return res.status(201).json({
      success: true,
      message: "Job posting created successfully",
      data: jobPosting,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Job Postings
const getAllJobPostings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = "Open", department } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const jobPostings = await JobPosting.find(filter)
      .populate("postedBy", "fullName email")
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await JobPosting.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Job postings retrieved successfully",
      data: jobPostings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

// Get Job Posting by ID
const getJobPostingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const jobPosting = await JobPosting.findById(id).populate("postedBy", "fullName email");

    if (!jobPosting) {
      return res.status(404).json({ success: false, message: "Job posting not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job posting retrieved successfully",
      data: jobPosting,
    });
  } catch (error) {
    next(error);
  }
};

// Update Job Posting
const updateJobPosting = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { id } = req.params;
    const jobPosting = await JobPosting.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

    if (!jobPosting) {
      return res.status(404).json({ success: false, message: "Job posting not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job posting updated successfully",
      data: jobPosting,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Job Posting
const deleteJobPosting = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { id } = req.params;
    const jobPosting = await JobPosting.findByIdAndDelete(id);

    if (!jobPosting) {
      return res.status(404).json({ success: false, message: "Job posting not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Job posting deleted successfully",
      data: jobPosting,
    });
  } catch (error) {
    next(error);
  }
};

// ============= APPLICATION ENDPOINTS =============

// Submit Application
const submitApplication = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { jobPostingId, candidateName, candidateEmail, candidatePhone, experience, skills, currentCompany, coverLetter, candidateResume } = req.body;

    // Verify job posting exists
    const jobPosting = await JobPosting.findById(jobPostingId);
    if (!jobPosting) {
      return res.status(404).json({ success: false, message: "Job posting not found" });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({ jobPostingId, candidateEmail });
    if (existingApplication) {
      return res.status(409).json({ success: false, message: "You have already applied for this position" });
    }

    const application = new Application({
      jobPostingId,
      candidateName,
      candidateEmail,
      candidatePhone,
      experience,
      skills: skills || [],
      currentCompany: currentCompany || "",
      coverLetter: coverLetter || "",
      candidateResume: candidateResume || "",
      status: "Applied",
    });

    await application.save();

    // Trigger AI Workflow for recruitment screening
    workflowService.queueWorkflow("recruitment", { type: "recruitment", id: application._id });

    // Check auto-screening threshold (e.g. 10+ applicants)
    try {
      const count = await Application.countDocuments({ jobPostingId, status: "Applied" });
      const threshold = parseInt(process.env.AUTO_SCREEN_TRIGGER_COUNT || "10");
      if (count >= threshold) {
        const recruitmentAi = require("../services/ai/recruitment.ai");
        recruitmentAi.autoScreenAllPending(jobPostingId).catch(err => {
          console.error("Background autoScreenAllPending screening failed:", err.message);
        });
      }
    } catch (countErr) {
      console.error("Failed to check auto-screen threshold:", countErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Applications
const getAllApplications = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, jobPostingId } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (jobPostingId) filter.jobPostingId = jobPostingId;

    const applications = await Application.find(filter)
      .populate("jobPostingId", "title position department")
      .populate("reviewedBy", "fullName email")
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Application.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      data: applications,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

// Get Application by ID
const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id)
      .populate("jobPostingId")
      .populate("reviewedBy", "fullName email");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Application retrieved successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// Update Application Status
const updateApplicationStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { id } = req.params;
    const { status, feedback, rating } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // Validate workflow transition
    if (!isValidTransition(application.status, status)) {
      const allowedTransitions = getAllowedTransitions(application.status);
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${application.status} to ${status}`,
        currentStatus: application.status,
        allowedTransitions: allowedTransitions,
        stageDescription: getStageDescription(application.status)
      });
    }

    application.status = status;
    if (req.user) {
      application.reviewedBy = req.user._id;
    }
    application.reviewDate = new Date();
    if (feedback) application.feedback = feedback;
    if (rating) application.rating = rating;

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: application,
      stageDescription: getStageDescription(status)
    });
  } catch (error) {
    next(error);
  }
};

// Delete Application
const deleteApplication = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: "Validation Error", data: errors.array() });
    }

    const { id } = req.params;
    const application = await Application.findByIdAndDelete(id);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Application deleted successfully",
      data: application,
    });
  } catch (error) {
    next(error);
  }
};

// Get Applications for Job Posting
const getJobApplications = async (req, res, next) => {
  try {
    const { jobPostingId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const filter = { jobPostingId };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .lean()
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Application.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      data: applications,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

// ============= AI-POWERED WORKFLOW =============

// Evaluate Candidate with AI
const evaluateCandidateAI = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId).populate("jobPostingId");
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const jobPosting = application.jobPostingId;

    // Get AI evaluation
    const evaluation = await aiService.evaluateCandidate(application, jobPosting);

    // Update application with AI score
    application.rating = evaluation.score / 20; // Convert to 0-5 scale
    application.feedback = evaluation.feedback;

    // Auto-update status based on score (only if valid transition)
    let newStatus = application.status;
    if (evaluation.score >= 75) {
      newStatus = "Shortlisted";
    } else if (evaluation.score >= 50) {
      newStatus = "Under Review";
    } else {
      newStatus = "Rejected";
    }

    // Validate transition before applying
    if (isValidTransition(application.status, newStatus)) {
      application.status = newStatus;
    } else {
      // If transition not allowed, keep current status but still save evaluation
      newStatus = application.status;
    }

    // Only set reviewedBy if user is authenticated
    if (req.user) {
      application.reviewedBy = req.user._id;
    }
    application.reviewDate = new Date();
    application.aiEvaluation = {
      score: evaluation.score,
      match: evaluation.match,
      feedback: evaluation.feedback,
      evaluatedAt: new Date()
    };

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Candidate evaluated successfully",
      data: {
        applicationId,
        evaluation,
        applicationStatus: application.status,
        rating: application.rating,
        statusChanged: application.status !== newStatus ? false : true,
        stageDescription: getStageDescription(application.status)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate Interview Questions
const generateInterviewQuestions = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { count = 5 } = req.query;

    const application = await Application.findById(applicationId).populate("jobPostingId");
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const allowedStatuses = ["Applied", "Under Review", "Shortlisted", "Interview Scheduled"];
    if (!allowedStatuses.includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Interview questions can only be generated for candidates in active screening stages (current: ${application.status})`
      });
    }

    const jobPosting = application.jobPostingId;
    const questions = await aiService.generateInterviewQuestions(application, jobPosting, count);

    return res.status(200).json({
      success: true,
      message: "Interview questions generated successfully",
      data: {
        applicationId,
        candidateName: application.candidateName,
        position: jobPosting.position,
        questions: questions.questions
      }
    });
  } catch (error) {
    next(error);
  }
};

// Schedule Interview
const scheduleInterview = async (req, res, next) => {
  const Interview = require("../models/interview.model");
  const Notification = require("../models/notification.model");
  const logger = require("../utils/logger");

  try {
    const candidateId = req.params.applicationId || req.body.candidateId;
    const jobPostingId = req.body.jobPostingId;
    const slot = req.body.slot || req.body.interviewDate;
    const { interviewerEmail, notes, interviewTime } = req.body;

    if (!candidateId || !slot) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID and slot/date are required"
      });
    }

    const application = await Application.findById(candidateId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application candidate not found" });
    }

    // Save to Interviews Collection
    const newInterview = new Interview({
      candidateId,
      jobPostingId: jobPostingId || application.jobPostingId,
      slot: new Date(slot),
      status: "scheduled"
    });
    await newInterview.save();

    // Update Application status
    application.status = "interview_scheduled";
    if (!application.interview) {
      application.interview = {};
    }
    application.interview.date = new Date(slot);
    application.interview.time = interviewTime || new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    application.interview.scheduledAt = new Date();
    application.interview.interviewerEmail = interviewerEmail || application.interview.interviewerEmail || "";
    application.interview.notes = notes || application.interview.notes || "";
    if (req.user) {
      application.interview.scheduledBy = req.user._id;
    }
    await application.save();

    // Create Notification
    try {
      const notification = new Notification({
        user: application.reviewedBy || null,
        title: "Interview Booked",
        message: `AI Smart-Scheduler: Interview booked for ${application.candidateName} on ${new Date(slot).toLocaleString()}`,
        type: "recruitment",
        isRead: false
      });
      await notification.save();
    } catch (notifErr) {
      logger.warn("Notification booking trigger skipped:", notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Interview scheduled successfully",
      data: newInterview
    });

  } catch (error) {
    logger.error("scheduleInterview exception:", { error: error.message });
    next(error);
  }
};

// Record Interview Result
const recordInterviewResult = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { result, feedback, score, notes } = req.body;

    // Validate result field
    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Result is required",
        errors: { result: "Result must be 'Selected' or 'Rejected'" }
      });
    }

    if (!["Selected", "Rejected"].includes(result)) {
      return res.status(400).json({
        success: false,
        message: "Result must be 'Selected' or 'Rejected'",
        validOptions: ["Selected", "Rejected"]
      });
    }

    // Validate score if provided
    if (score !== undefined && (score < 0 || score > 10)) {
      return res.status(400).json({
        success: false,
        message: "Score must be between 0 and 10",
        errors: { score: "Score must be a number between 0 and 10" }
      });
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
        applicationId
      });
    }

    if (application.status !== "Interview Scheduled") {
      return res.status(400).json({
        success: false,
        message: "Interview result can only be recorded for scheduled interviews",
        currentStatus: application.status,
        expectedStatus: "Interview Scheduled"
      });
    }

    // Validate transition
    if (!isValidTransition(application.status, result)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${application.status} to ${result}`,
        allowedTransitions: getAllowedTransitions(application.status)
      });
    }

    // Update application with interview result
    if (!application.interview) {
      application.interview = {};
    }

    application.interview.result = result;
    application.interview.feedback = feedback || "";
    application.interview.score = score || 0;
    application.interview.notes = notes || "";
    application.interview.resultRecordedAt = new Date();
    if (req.user) {
      application.interview.recordedBy = req.user._id;
    }

    // Update main status
    application.status = result;
    application.rating = score || application.rating;
    if (feedback) application.feedback = feedback;

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Interview result recorded: Candidate ${result}`,
      data: {
        applicationId,
        candidateName: application.candidateName,
        result,
        feedback,
        score
      },
      stageDescription: getStageDescription(result)
    });
  } catch (error) {
    console.error("Record Interview Result Error:", error.message, error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message
        })),
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
};

// Get Candidate Workflow Status
const getCandidateWorkflow = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId)
      .populate("jobPostingId", "title position")
      .populate("reviewedBy", "fullName email");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    const workflow = {
      applicationId,
      candidateName: application.candidateName,
      position: application.jobPostingId.title,
      currentStatus: application.status,
      timeline: [
        { status: "Applied", date: application.createdAt },
        application.reviewDate ? { status: "Under Review", date: application.reviewDate } : null,
        application.status === "Shortlisted" ? { status: "Shortlisted", date: new Date() } : null,
        application.interview?.date ? { status: "Interview Scheduled", date: application.interview.scheduledAt } : null,
        application.interview?.resultRecordedAt ? { status: application.interview.result, date: application.interview.resultRecordedAt } : null
      ].filter(Boolean),
      rating: application.rating,
      feedback: application.feedback,
      interviewDetails: application.interview || null,
      reviewedBy: application.reviewedBy,
      stageDescription: getStageDescription(application.status)
    };

    return res.status(200).json({
      success: true,
      message: "Candidate workflow retrieved successfully",
      data: workflow
    });
  } catch (error) {
    next(error);
  }
};

// Quick AI Screening Endpoint (without saving to DB)
const quickAIScreening = async (req, res, next) => {
  try {
    const { candidateName, experience, skills, currentCompany } = req.body;
    const { jobPostingId } = req.params;

    if (!jobPostingId) {
      return res.status(400).json({
        success: false,
        message: "Job posting ID is required"
      });
    }

    if (!candidateName || !experience || !skills || !Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: "Candidate name, experience, and skills array are required"
      });
    }

    // Fetch job posting
    const jobPosting = await JobPosting.findById(jobPostingId);
    if (!jobPosting) {
      return res.status(404).json({
        success: false,
        message: "Job posting not found"
      });
    }

    // Create temporary candidate object for AI evaluation
    const tempCandidate = {
      candidateName,
      experience: parseInt(experience),
      skills: Array.isArray(skills) ? skills : [skills],
      currentCompany: currentCompany || ""
    };

    // Get AI screening
    const screening = await aiService.evaluateCandidate(tempCandidate, jobPosting);

    return res.status(200).json({
      success: true,
      message: "AI screening completed successfully",
      data: {
        candidateName,
        jobPosition: jobPosting.title,
        screening: {
          score: screening.score,
          match: screening.match,
          feedback: screening.feedback,
          recommendation: screening.score >= 70 ? "Recommended" : screening.score >= 50 ? "Consider" : "Not Recommended"
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Evaluate and score candidate's voice response to a question
const scoreVoiceResponse = async (req, res, next) => {
  const logger = require("../utils/logger");
  try {
    const candidateId = req.body.candidateId || req.body.applicationId;
    const jobPostingId = req.body.jobPostingId;
    const sessionId = req.body.sessionId || "default_session";
    const questionIndex = req.body.questionIndex !== undefined ? req.body.questionIndex : 0;
    const questionText = req.body.questionText || req.body.question;
    const answerTranscript = req.body.answerTranscript || req.body.response;
    const questionCategory = req.body.questionCategory || "general";
    const allAnswersSoFar = req.body.allAnswersSoFar || [];
    const isFinalQuestion = req.body.isFinalQuestion === true;

    if (!candidateId || !questionText || !answerTranscript) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID, question text, and answer transcript are required."
      });
    }

    // Winston Log (Privacy-safe: no transcript text)
    logger.info("Voice scoring attempt initialized", {
      candidateId,
      questionIndex,
      sessionId,
      isFinalQuestion
    });

    // Parallel fetch from DB
    const [application, jobPosting] = await Promise.all([
      Application.findById(candidateId),
      JobPosting.findById(jobPostingId || application?.jobPostingId)
    ]);

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }
    if (!jobPosting) {
      return res.status(404).json({ success: false, message: "Job posting not found" });
    }

    let resultJson;
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") {
      try {
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const model = process.env.VOICE_INTERVIEW_SCORING_MODEL || "llama-3.3-70b-versatile";

        const prompt = `
          You are an expert HR recruitment system evaluating a candidate's verbal response to an interview question.
          
          Job Description Context:
          - Role Title: ${jobPosting.title}
          - Target Position: ${jobPosting.position}
          - Core Skills Required: ${jobPosting.skills?.join(", ") || "General"}
          - Required Experience Level: ${jobPosting.requiredExperience} years
          
          Candidate Profile:
          - Candidate Name: ${application.candidateName}
          - Stated Experience: ${application.experience} years
          - Core Skills Listed: ${application.skills?.join(", ") || "General"}
          
          Interview Details:
          - Question Index: ${questionIndex}
          - Category: ${questionCategory}
          - Conversation History (Preceding Q&As): ${JSON.stringify(allAnswersSoFar)}
          
          CURRENT ANSWER FOR EVALUATION:
          - Question: ${questionText}
          - Transcribed Answer: ${answerTranscript}
          
          Scoring Directions (Score 1 to 10 for each criteria):
          1. Relevance: Does the response directly address the interviewer's question?
          2. Depth: Does it show sufficient technical or conceptual understanding?
          3. Communication: Clarity, structure, articulation, and coherence.
          4. Experience Fit: Alignment with the target seniority or experience levels.
          5. Culture Signal: Indicators of growth mindset, enthusiasm, collaboration.
          
          Voice and speech characteristics directions (evaluate verbal indicators from transcript):
          - confidenceScore: (1.0 to 10.0) How assured and authoritative is the verbal delivery?
          - communicationScore: (1.0 to 10.0) Clarity, vocabulary, structured arguments.
          - professionalismScore: (1.0 to 10.0) Business decorum, positive phrasing.
          - fluencyScore: (0 to 100) Sentence coherence, smooth pacing.
          - hesitationCount: (integer) Estimate filler word count (um, uh, like, etc.).
          - speedWpm: (integer) Estimate speaking speed (words-per-minute, typical conversational speed is 110-150 WPM).
          - emotion: (string) Sentiment/emotion e.g., "Confident", "Enthusiastic", "Hesitant", "Analytical".
          - tone: (string) Description of verbal style e.g., "Articulate & Direct", "Structured & Technical".

          Grade thresholds based on overall Composite Score:
          Composite >= 8.5 -> "A+"
          Composite >= 7.5 -> "A"
          Composite >= 6.5 -> "B"
          Composite >= 5.5 -> "C"
          Composite < 5.5  -> "D"
          
          Provide specific "strengths", "concerns", an active "followUpQuestion" for the next turn, and any safety "redFlags" if applicable.
          
          Return ONLY a valid JSON object. No markdown syntax, no formatting wrappers, and no preambles:
          {
            "scores": {
              "relevance": 8,
              "depth": 7,
              "communication": 9,
              "experienceFit": 7,
              "cultureSignal": 8
            },
            "voiceAnalysis": {
              "confidenceScore": 8.5,
              "communicationScore": 9.0,
              "professionalismScore": 8.2,
              "speedWpm": 125,
              "hesitationCount": 2,
              "fluencyScore": 88,
              "emotion": "Enthusiastic",
              "tone": "Articulate & Direct"
            },
            "compositeScore": 7.8,
            "grade": "A",
            "strengths": ["Clear explanation"],
            "concerns": ["Missing testing principles"],
            "followUpQuestion": "How do you handle side effects?",
            "redFlags": []
          }
        `;

        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: model,
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        const rawContent = chatCompletion.choices[0]?.message?.content;
        resultJson = JSON.parse(rawContent.trim());
      } catch (aiErr) {
        logger.error("Groq AI Voice evaluation failed. Using fallback criteria.", { error: aiErr.message });
        resultJson = localVoiceResponseScore(answerTranscript, questionText);
      }
    } else {
      resultJson = localVoiceResponseScore(answerTranscript, questionText);
    }

    // Save response to Candidate (Application) voiceInterview structure
    if (!application.voiceInterview) {
      application.voiceInterview = { answers: [] };
    }
    
    // Ensure answers array is initialized
    if (!application.voiceInterview.answers) {
      application.voiceInterview.answers = [];
    }

    application.voiceInterview.answers[questionIndex] = {
      questionText,
      transcript: answerTranscript,
      scores: resultJson.scores,
      grade: resultJson.grade,
      followUpQuestion: resultJson.followUpQuestion,
      evaluatedAt: new Date()
    };
    application.voiceInterview.sessionId = sessionId;
    application.voiceInterview.lastUpdated = new Date();

    // Store voice characteristics analysis in Candidate schema
    const freshAnalysis = resultJson.voiceAnalysis || {
      confidenceScore: resultJson.scores?.cultureSignal || 7,
      communicationScore: resultJson.scores?.communication || 7,
      professionalismScore: resultJson.scores?.experienceFit || 7,
      speedWpm: 120,
      hesitationCount: 1,
      fluencyScore: 80,
      emotion: "Analytical",
      tone: "Structured & Technical"
    };

    application.voiceInterview.voiceAnalysis = {
      confidenceScore: parseFloat(freshAnalysis.confidenceScore.toFixed(1)),
      communicationScore: parseFloat(freshAnalysis.communicationScore.toFixed(1)),
      professionalismScore: parseFloat(freshAnalysis.professionalismScore.toFixed(1)),
      speedWpm: freshAnalysis.speedWpm,
      hesitationCount: freshAnalysis.hesitationCount,
      fluencyScore: freshAnalysis.fluencyScore,
      emotion: freshAnalysis.emotion,
      tone: freshAnalysis.tone
    };

    let isComplete = false;
    let currentCompositeScore = resultJson.compositeScore;

    // Handle last question calculation
    if (isFinalQuestion) {
      isComplete = true;
      const validAnswers = application.voiceInterview.answers.filter(a => a && a.scores);
      const totalScore = validAnswers.reduce((sum, current) => sum + (current.scores?.relevance || 0) + (current.scores?.depth || 0) + (current.scores?.communication || 0) + (current.scores?.experienceFit || 0) + (current.scores?.cultureSignal || 0), 0);
      const compositeAvg = parseFloat((totalScore / (validAnswers.length * 5)).toFixed(1));
      
      let overallGrade = "D";
      if (compositeAvg >= 8.5) overallGrade = "A+";
      else if (compositeAvg >= 7.5) overallGrade = "A";
      else if (compositeAvg >= 6.5) overallGrade = "B";
      else if (compositeAvg >= 5.5) overallGrade = "C";

      application.voiceInterview.status = "completed";
      application.voiceInterview.compositeScore = compositeAvg;
      application.voiceInterview.overallGrade = overallGrade;
      
      // Update application rating scale 0-5 (from 0-10 voice screening)
      application.rating = compositeAvg / 2;

      // Trigger automatic pipeline re-evaluation
      try {
        const recruitmentAi = require("../services/ai/recruitment.ai");
        const analysis = await recruitmentAi.analyzeCandidate(candidateId);
        
        application.aiEvaluation = {
          score: analysis.matchScore,
          match: analysis.ranking === "A+" || analysis.ranking === "A" ? "High" : analysis.ranking === "B" || analysis.ranking === "C" ? "Medium" : "Low",
          feedback: Array.isArray(analysis.feedback) ? analysis.feedback.join(" ") : (analysis.feedback || ""),
          evaluatedAt: new Date()
        };
        application.aiScore = analysis.matchScore;
        application.aiGrade = analysis.ranking;
        application.aiScreenedAt = new Date();
        application.confidenceScore = analysis.confidenceScore || 0.85;

        // Auto pipeline triggers
        if (typeof recruitmentAi.autoAdvanceCandidate === "function") {
          await recruitmentAi.autoAdvanceCandidate(candidateId, jobPostingId || application.jobPostingId);
        }
      } catch (aiEvaluationError) {
        logger.error("Auto AI re-evaluation failed on voice screening complete:", { error: aiEvaluationError.message });
      }
      
      currentCompositeScore = compositeAvg;
    }

    await application.save();

    return res.status(200).json({
      success: true,
      scoring: resultJson,
      sessionProgress: {
        questionsAnswered: application.voiceInterview.answers.filter(a => a).length,
        totalQuestions: isComplete ? application.voiceInterview.answers.filter(a => a).length : 5,
        currentCompositeScore,
        isComplete
      },
      nextQuestion: resultJson.followUpQuestion
    });

  } catch (error) {
    logger.error("scoreVoiceResponse execution exception:", { error: error.message });
    return res.status(500).json({
      success: false,
      error: "AI_SCORING_UNAVAILABLE",
      rawTranscript: req.body.answerTranscript || req.body.response
    });
  }
};

/**
 * Fallback static scoring rules
 */
const localVoiceResponseScore = (answer, question) => {
  const text = String(answer || "");
  const words = text.split(/\s+/).filter(Boolean);
  const len = words.length;
  
  // Count standard hesitation cues
  const fillers = text.match(/\b(um|uh|like|you know|so|actually)\b/gi) || [];
  const hesitationCount = fillers.length;
  
  // Simulated speech dynamics
  const speedWpm = len > 0 ? Math.min(160, Math.max(90, Math.round((len / 15) * 60))) : 120;
  const fluencyScore = Math.max(50, Math.min(100, Math.round(100 - (hesitationCount * 4))));

  let relevance = 6;
  let depth = 5;
  let communication = 6;
  let experienceFit = 5;
  let cultureSignal = 6;

  if (len > 80) {
    relevance = 8;
    depth = 8;
    communication = 8;
    experienceFit = 8;
    cultureSignal = 8;
  } else if (len > 30) {
    relevance = 7;
    depth = 6;
    communication = 7;
    experienceFit = 7;
    cultureSignal = 7;
  }

  const compositeScore = parseFloat(((relevance + depth + communication + experienceFit + cultureSignal) / 5).toFixed(1));
  let grade = "C";
  if (compositeScore >= 8.5) grade = "A+";
  else if (compositeScore >= 7.5) grade = "A";
  else if (compositeScore >= 6.5) grade = "B";
  else if (compositeScore >= 5.5) grade = "C";

  return {
    scores: { relevance, depth, communication, experienceFit, cultureSignal },
    voiceAnalysis: {
      confidenceScore: parseFloat((cultureSignal + 0.5).toFixed(1)),
      communicationScore: parseFloat((communication + 0.2).toFixed(1)),
      professionalismScore: parseFloat((experienceFit + 0.3).toFixed(1)),
      speedWpm,
      hesitationCount,
      fluencyScore,
      emotion: len > 80 ? "Enthusiastic" : "Analytical",
      tone: "Structured & Technical"
    },
    compositeScore,
    grade,
    strengths: ["Provided legible answers with positive vocabulary.", "Clear phrasing structure."],
    concerns: ["Could give more specific code examples or edge cases."],
    followUpQuestion: `Can you elaborate further on how you would address edge cases?`,
    redFlags: []
  };
};

// Transcribe uploaded audio file or base64 streams
const transcribeAudio = async (req, res, next) => {
  const logger = require("../utils/logger");
  try {
    const { transcript, audioBase64, questionIndex, questionText, candidateId, sessionId } = req.body;

    logger.info("Transcription request received", { candidateId, questionIndex });

    // Case 1: Browser speech recognition succeeded
    if (transcript && String(transcript).trim()) {
      let cleanedText = String(transcript).trim();
      const fillers = [/\bum\b/gi, /\buh\b/gi, /\blike\b/gi, /\byou know\b/gi];
      let fillersRemoved = 0;
      
      fillers.forEach(filler => {
        const matches = cleanedText.match(filler);
        if (matches) {
          fillersRemoved += matches.length;
        }
        cleanedText = cleanedText.replace(filler, "");
      });
      cleanedText = cleanedText.replace(/\s+/g, " ").trim();

      const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
      const estimatedDurationSeconds = Math.round((wordCount / 130) * 60) || 1;

      return res.status(200).json({
        success: true,
        sessionId: sessionId || "manual_session",
        questionIndex: questionIndex || 0,
        transcription: {
          text: cleanedText,
          wordCount,
          fillerWordsRemoved: fillersRemoved,
          estimatedDurationSeconds,
          confidence: 0.96,
          source: "browser_stt"
        }
      });
    }

    // Case 2: Multi-part file upload fallback
    if (req.file) {
      const fs = require("fs");
      let fileText = "";

      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-openai-key-here") {
        const OpenAI = require("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(req.file.path),
          model: "whisper-1",
        });
        fileText = transcription.text;
      } else if (process.env.GROQ_API_KEY) {
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const transcription = await groq.audio.transcriptions.create({
          file: fs.createReadStream(req.file.path),
          model: "whisper-large-v3-turbo",
          response_format: "json",
        });
        fileText = transcription.text;
      } else {
        fileText = "This is a fallback transcript because no active API keys are loaded on the system.";
      }

      // Cleanup local temp file
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      const wordCount = fileText.split(/\s+/).filter(Boolean).length;
      const estimatedDurationSeconds = Math.round((wordCount / 130) * 60) || 1;

      return res.status(200).json({
        success: true,
        sessionId: sessionId || "file_session",
        questionIndex: questionIndex || 0,
        transcription: {
          text: fileText,
          wordCount,
          fillerWordsRemoved: 0,
          estimatedDurationSeconds,
          confidence: 0.92,
          source: "whisper_api"
        }
      });
    }

    // Case 3: Base64 audio block
    if (audioBase64) {
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-key-here") {
        return res.status(200).json({
          success: false,
          error: "STT_UNAVAILABLE",
          fallback: true
        });
      }

      const fs = require("fs");
      const path = require("path");
      const OpenAI = require("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const tempFilename = `temp_${Date.now()}_${candidateId || "voice"}.webm`;
      const tempPath = path.join(__dirname, "../uploads", tempFilename);
      const audioBuffer = Buffer.from(audioBase64.replace(/^data:audio\/\w+;base64,/, ""), "base64");

      if (!fs.existsSync(path.join(__dirname, "../uploads"))) {
        fs.mkdirSync(path.join(__dirname, "../uploads"));
      }
      fs.writeFileSync(tempPath, audioBuffer);

      try {
        const response = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempPath),
          model: "whisper-1",
        });

        try { fs.unlinkSync(tempPath); } catch (e) {}

        const cleanedText = response.text.trim();
        const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
        const estimatedDurationSeconds = Math.round((wordCount / 130) * 60) || 1;

        return res.status(200).json({
          success: true,
          sessionId: sessionId || "uuid_session",
          questionIndex: questionIndex || 0,
          transcription: {
            text: cleanedText,
            wordCount,
            fillerWordsRemoved: 0,
            estimatedDurationSeconds,
            confidence: 0.94,
            source: "whisper_api"
          }
        });
      } catch (err) {
        try { fs.unlinkSync(tempPath); } catch (e) {}
        throw err;
      }
    }

    return res.status(400).json({
      success: false,
      message: "No transcript base64 streams or audio files found."
    });

  } catch (error) {
    logger.error("transcribeAudio error:", { error: error.message });
    next(error);
  }
};

/**
 * Return summary details of the voice interview for rendering in React Modals
 */
const getVoiceInterviewSummary = async (req, res, next) => {
  try {
    const { candidateId } = req.params;
    const application = await Application.findById(candidateId).lean();
    if (!application) {
      return res.status(404).json({ success: false, message: "Application candidate not found" });
    }

    return res.status(200).json({
      success: true,
      voiceInterview: application.voiceInterview || {
        sessionId: "",
        status: "pending",
        overallGrade: "D",
        compositeScore: 0,
        answers: []
      }
    });
  } catch (error) {
    next(error);
  }
};


// ============= RESUME PDF UPLOAD & AUTO-SCREENING CONTROLLER =============
async function uploadResumeAndApply(req, res, next) {
  try {
    const { jobPostingId } = req.body;
    if (!jobPostingId) {
      return res.status(400).json({ success: false, message: "Job Posting ID is required" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume PDF file is required" });
    }

    // Verify job posting exists
    const jobPosting = await JobPosting.findById(jobPostingId);
    if (!jobPosting) {
      return res.status(404).json({ success: false, message: "Job posting not found" });
    }

    // Parse the PDF text contents
    let extractedText = "";
    try {
      extractedText = await parsePDF(req.file.path);
    } catch (parseErr) {
      // Cleanup file if parsing fails
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(422).json({ success: false, message: `Failed to extract text from PDF: ${parseErr.message}` });
    }

    let candidateName = "Unknown Candidate";
    let candidateEmail = `temp_${Date.now()}@hrms.com`;
    let candidatePhone = "0000000000";
    let experience = 0;
    let skills = [];
    let currentCompany = "";
    
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") {
      try {
        const Groq = require("groq-sdk");
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const prompt = `
          Extract candidate's basic contact and background details from the following resume text.
          Resume Text:
          ${extractedText}
          
          Provide the output as a valid JSON object. Extract:
          1. candidateName (string, e.g. "Jane Doe")
          2. candidateEmail (string, e.g. "jane.doe@example.com")
          3. candidatePhone (string, e.g. "+1 (555) 019-2834")
          4. experience (number of years, integer, e.g. 5)
          5. skills (array of strings, e.g. ["React", "JavaScript", "SQL"])
          6. currentCompany (string, e.g. "Acme Corp")
          
          JSON structure:
          {
            "candidateName": "John Doe",
            "candidateEmail": "john.doe@example.com",
            "candidatePhone": "+1234567890",
            "experience": 5,
            "skills": ["JavaScript", "React", "Node.js"],
            "currentCompany": "Google"
          }
          Return ONLY valid JSON. No preambles, no explanations, no markdown blocks.
        `;
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.1-8b-instant",
          temperature: 0.1,
          response_format: { type: "json_object" }
        });
        const extractedJson = JSON.parse(completion.choices[0]?.message?.content.trim());
        candidateName = extractedJson.candidateName || candidateName;
        candidateEmail = extractedJson.candidateEmail || candidateEmail;
        candidatePhone = extractedJson.candidatePhone || candidatePhone;
        experience = extractedJson.experience || experience;
        skills = extractedJson.skills || skills;
        currentCompany = extractedJson.currentCompany || currentCompany;
      } catch (groqErr) {
        logger.warn("Groq contact extraction failed, using regex fallback:", { error: groqErr.message });
        const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) candidateEmail = emailMatch[0];
        
        const phoneMatch = extractedText.match(/[\+]?[0-9\s-]{10,15}/);
        if (phoneMatch) candidatePhone = phoneMatch[0].trim();

        const lines = extractedText.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) candidateName = lines[0].substring(0, 50);
      }
    } else {
      const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) candidateEmail = emailMatch[0];
      
      const phoneMatch = extractedText.match(/[\+]?[0-9\s-]{10,15}/);
      if (phoneMatch) candidatePhone = phoneMatch[0].trim();

      const lines = extractedText.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) candidateName = lines[0].substring(0, 50);
    }

    // Check if candidate already applied for this job posting
    let application = await Application.findOne({ jobPostingId, candidateEmail });
    let isNew = false;

    if (application) {
      // Update existing application fields
      application.candidateName = candidateName;
      application.candidatePhone = candidatePhone;
      application.experience = experience;
      application.skills = skills;
      application.currentCompany = currentCompany;
      application.candidateResume = extractedText;
      application.status = "Applied"; // Reset status to Applied for re-screening
    } else {
      isNew = true;
      // Create new application
      application = new Application({
        jobPostingId,
        candidateName,
        candidateEmail,
        candidatePhone,
        experience,
        skills,
        currentCompany,
        candidateResume: extractedText,
        status: "Applied"
      });
    }

    await application.save();

    // Trigger standard AI resume parsing
    try {
      await parseResumeWithLLM(extractedText, application._id);
    } catch (parseLlmErr) {
      logger.warn("parseResumeWithLLM failed inside uploadResumeAndApply:", { error: parseLlmErr.message });
    }

    // Reload candidate state
    const freshCandidate = await Application.findById(application._id);
    
    // Perform full ATS/AI evaluation matching with Job Posting
    const analysis = await analyzeCandidate(freshCandidate._id);
    
    freshCandidate.aiScore = analysis.matchScore;
    freshCandidate.aiGrade = analysis.ranking;
    freshCandidate.aiScreenedAt = new Date();
    freshCandidate.confidenceScore = 0.72;
    freshCandidate.dataQuality = "medium";
    freshCandidate.scoringBasis = ["resume_skills", "experience_years"];
    
    freshCandidate.aiEvaluation = {
      score: analysis.matchScore,
      match: analysis.ranking === "A+" || analysis.ranking === "A" ? "High" : analysis.ranking === "B" || analysis.ranking === "C" ? "Medium" : "Low",
      feedback: Array.isArray(analysis.feedback) ? analysis.feedback.join(" ") : (analysis.feedback || ""),
      evaluatedAt: new Date()
    };

    // Check scoring bias
    try {
      const biasRisk = await checkScoringBias(
        { skills: analysis.scoreBreakdown.skills, experience: analysis.scoreBreakdown.experience, interview: 0 },
        { candidateName: freshCandidate.candidateName, currentCompany: freshCandidate.currentCompany, experience: freshCandidate.experience, skills: freshCandidate.skills }
      );
      if (biasRisk > 0.3) {
        freshCandidate.aiFlags = ["BIAS_REVIEW_RECOMMENDED"];
      } else {
        freshCandidate.aiFlags = [];
      }
    } catch (biasErr) {
      freshCandidate.aiFlags = [];
    }

    await freshCandidate.save();

    // Trigger automatic pipeline routing (advancement or rejection)
    await autoAdvanceCandidate(freshCandidate._id, jobPostingId);

    // Clean up local temporary file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    // Get updated application state
    const finalizedCandidate = await Application.findById(freshCandidate._id).populate("jobPostingId");

    return res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? "Resume uploaded and screened successfully!" : "Resume re-uploaded and re-screened successfully!",
      data: finalizedCandidate,
      screeningResults: {
        score: analysis.matchScore,
        ranking: analysis.ranking,
        feedback: analysis.feedback,
        matchedSkills: analysis.skillAnalysis.matched,
        missingSkills: analysis.skillAnalysis.missing,
        hiringRecommendation: analysis.recommendation
      }
    });

  } catch (error) {
    try { if (req.file) fs.unlinkSync(req.file.path); } catch (e) {}
    logger.error("uploadResumeAndApply failed:", { error: error.message });
    next(error);
  }
};

// ============= DOWNLOAD CANDIDATE REPORT (PDF) =============
async function downloadCandidateReportPDF(req, res, next) {
  const PDFDocument = require("pdfkit");
  try {
    const { id } = req.params;
    const application = await Application.findById(id).populate("jobPostingId");
    
    if (!application) {
      return res.status(404).json({ success: false, message: "Application candidate not found" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Candidate_Report_${application.candidateName.replace(/\s+/g, "_")}.pdf`);
    
    doc.pipe(res);

    // Styling colors
    const primaryColor = "#0f172a";
    const secondaryColor = "#2563eb";
    const successColor = "#16a34a";
    const textColor = "#334155";
    const lightBg = "#f8fafc";

    // Header Title
    doc.fillColor(primaryColor).fontSize(24).font("Helvetica-Bold").text("HireMind AI", { inline: true });
    doc.fillColor(secondaryColor).fontSize(14).font("Helvetica").text(" — Enterprise Candidate Assessment Report", { inline: true });
    doc.moveDown(0.5);
    
    // Horizontal divider
    doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1.5);

    // Section 1: Profile
    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text("1. Candidate Executive Profile");
    doc.moveDown(0.5);

    const gridY = doc.y;
    doc.fillColor(textColor).fontSize(10).font("Helvetica-Bold");
    doc.text("Candidate Name:", 50, gridY);
    doc.font("Helvetica").text(application.candidateName, 170, gridY);

    doc.font("Helvetica-Bold").text("Email Address:", 50, gridY + 18);
    doc.font("Helvetica").text(application.candidateEmail, 170, gridY + 18);

    doc.font("Helvetica-Bold").text("Phone Number:", 50, gridY + 36);
    doc.font("Helvetica").text(application.candidatePhone, 170, gridY + 36);

    doc.font("Helvetica-Bold").text("Target Position:", 320, gridY);
    doc.font("Helvetica").text(application.jobPostingId?.title || "N/A", 430, gridY);

    doc.font("Helvetica-Bold").text("Experience:", 320, gridY + 18);
    doc.font("Helvetica").text(`${application.experience || 0} Years`, 430, gridY + 18);

    doc.font("Helvetica-Bold").text("Current Company:", 320, gridY + 36);
    doc.font("Helvetica").text(application.currentCompany || "N/A", 430, gridY + 36);
    
    doc.moveDown(3.5);

    // Section 2: Screening Scores
    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text("2. AI Matching & ATS Screening");
    doc.moveDown(0.5);

    const scoreY = doc.y;
    doc.rect(50, scoreY, 150, 60).fill(lightBg);
    doc.fillColor(textColor).fontSize(10).font("Helvetica").text("ATS MATCH SCORE", 60, scoreY + 12);
    const scoreVal = application.aiScore || application.aiEvaluation?.score || 0;
    doc.fillColor(secondaryColor).fontSize(20).font("Helvetica-Bold").text(`${scoreVal}%`, 60, scoreY + 28);

    doc.rect(210, scoreY, 150, 60).fill(lightBg);
    doc.fillColor(textColor).fontSize(10).font("Helvetica").text("PIPELINE RANK", 220, scoreY + 12);
    const rankVal = application.aiGrade || "C";
    doc.fillColor(successColor).fontSize(20).font("Helvetica-Bold").text(rankVal, 220, scoreY + 28);

    doc.rect(370, scoreY, 192, 60).fill(lightBg);
    doc.fillColor(textColor).fontSize(10).font("Helvetica").text("HIRING DECISION", 380, scoreY + 12);
    let decision = "Consider";
    if (scoreVal >= 85) decision = "Highly Recommended";
    else if (scoreVal >= 70) decision = "Recommended";
    else if (scoreVal < 50) decision = "Rejected";
    doc.fillColor("#b45309").fontSize(14).font("Helvetica-Bold").text(decision, 380, scoreY + 28);

    doc.moveDown(4.5);

    // Skills Grid
    const skillsY = doc.y;
    doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("Detected Resume Skills", 50, skillsY);
    const matched = application.parsedResume?.skills || application.skills || [];
    doc.fillColor(textColor).fontSize(9).font("Helvetica");
    doc.text(matched.length > 0 ? matched.join(", ") : "None detected", 50, skillsY + 15, { width: 240 });

    doc.fillColor(primaryColor).fontSize(11).font("Helvetica-Bold").text("Missing Skills (JD Gaps)", 310, skillsY);
    const requiredSkills = application.jobPostingId?.skills || [];
    const missingSkills = requiredSkills.filter(s => !matched.some(m => m.toLowerCase().includes(s.toLowerCase())));
    doc.fillColor(textColor).fontSize(9).font("Helvetica");
    doc.text(missingSkills.length > 0 ? missingSkills.join(", ") : "No significant gaps identified", 310, skillsY + 15, { width: 250 });

    doc.moveDown(4.5);

    // Section 3: Voice screening
    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text("3. Voice Interview Analytics");
    doc.moveDown(0.5);

    const voice = application.voiceInterview || {};
    const hasVoice = voice.status === "completed";

    if (!hasVoice) {
      doc.fillColor(textColor).fontSize(10).font("Helvetica-Oblique").text("Voice screening interview is currently pending. The candidate has not yet initiated the microphone screening process.");
      doc.moveDown(1.5);
    } else {
      const voiceAnalysis = voice.voiceAnalysis || {};
      const voiceY = doc.y;
      
      doc.fillColor(textColor).fontSize(10).font("Helvetica-Bold").text("Confidence Score:", 50, voiceY);
      doc.font("Helvetica").text(`${voiceAnalysis.confidenceScore || 0}/10`, 170, voiceY);

      doc.font("Helvetica-Bold").text("Fluency Score:", 50, voiceY + 15);
      doc.font("Helvetica").text(`${voiceAnalysis.fluencyScore || 0}%`, 170, voiceY + 15);

      doc.font("Helvetica-Bold").text("Speaking Speed:", 300, voiceY);
      doc.font("Helvetica").text(`${voiceAnalysis.speedWpm || 120} Words/Min`, 420, voiceY);

      doc.font("Helvetica-Bold").text("Hesitation Fillers:", 300, voiceY + 15);
      doc.font("Helvetica").text(`${voiceAnalysis.hesitationCount || 0} times`, 420, voiceY + 15);

      doc.font("Helvetica-Bold").text("Detected Emotion:", 50, voiceY + 30);
      doc.font("Helvetica").text(voiceAnalysis.emotion || "Analytical", 170, voiceY + 30);

      doc.font("Helvetica-Bold").text("Verbal Style & Tone:", 300, voiceY + 30);
      doc.font("Helvetica").text(voiceAnalysis.tone || "Structured", 420, voiceY + 30);

      doc.moveDown(3.5);

      doc.fillColor(primaryColor).fontSize(13).font("Helvetica-Bold").text("Voice Interview Q&A Transcript");
      doc.moveDown(0.5);

      const answers = voice.answers || [];
      answers.forEach((ans, index) => {
        if (doc.y > 650) {
          doc.addPage();
        }
        
        doc.fillColor(secondaryColor).fontSize(10).font("Helvetica-Bold").text(`Question #${index + 1}: ${ans.questionText}`);
        doc.fillColor(textColor).fontSize(9).font("Helvetica").text(`Answer: "${ans.transcript}"`);
        doc.fillColor("#555").fontSize(8).font("Helvetica-Oblique").text(`Scores — Relevance: ${ans.scores?.relevance || 0}/10, Depth: ${ans.scores?.depth || 0}/10, Clarity: ${ans.scores?.communication || 0}/10`);
        doc.moveDown(1);
      });
    }

    if (doc.y > 600) {
      doc.addPage();
    }

    // Section 4: Recommendation
    doc.fillColor(primaryColor).fontSize(16).font("Helvetica-Bold").text("4. AI Cognitive Evaluation & Next Steps");
    doc.moveDown(0.5);

    const feedbackVal = application.feedback || application.aiEvaluation?.feedback || "Evaluation comments not provided.";
    doc.fillColor(textColor).fontSize(10).font("Helvetica").text(feedbackVal, { width: 512, align: "justify" });
    doc.moveDown(1.5);

    // Footer signature
    doc.strokeColor("#e2e8f0").lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
    doc.fillColor("#94a3b8").fontSize(8).font("Helvetica").text(`Report automatically compiled by HireMind AI on ${new Date().toLocaleString()}. All scores are generated based on mathematical semantic analysis.`, { align: "center" });

    doc.end();

  } catch (error) {
    logger.error("downloadCandidateReportPDF failed:", { error: error.message });
    next(error);
  }
};

// ============= DOWNLOAD CANDIDATE REPORT (CSV) =============
async function downloadCandidateReportCSV(req, res, next) {
  try {
    const { id } = req.params;
    const application = await Application.findById(id).populate("jobPostingId");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application candidate not found" });
    }

    const scoreVal = application.aiScore || application.aiEvaluation?.score || 0;
    const rankVal = application.aiGrade || "C";
    let decision = "Consider";
    if (scoreVal >= 85) decision = "Highly Recommended";
    else if (scoreVal >= 70) decision = "Recommended";
    else if (scoreVal < 50) decision = "Rejected";

    const voice = application.voiceInterview || {};
    const voiceAnalysis = voice.voiceAnalysis || {};

    const csvRows = [
      ["Parameter", "Candidate Value"],
      ["Candidate Name", application.candidateName],
      ["Candidate Email", application.candidateEmail],
      ["Candidate Phone", application.candidatePhone],
      ["Job Posting Target", application.jobPostingId?.title || "N/A"],
      ["Experience (Years)", application.experience || 0],
      ["Current Company", application.currentCompany || "N/A"],
      ["ATS Match Score", `${scoreVal}%`],
      ["AI Grade", rankVal],
      ["Hiring Decision", decision],
      ["Voice Confidence Score", `${voiceAnalysis.confidenceScore || 0}/10`],
      ["Voice Fluency Score", `${voiceAnalysis.fluencyScore || 0}%`],
      ["Speaking Speed (WPM)", `${voiceAnalysis.speedWpm || 120} words/min`],
      ["Hesitation Fillers Count", `${voiceAnalysis.hesitationCount || 0} times`],
      ["Detected Voice Emotion", voiceAnalysis.emotion || "Analytical"],
      ["Voice Tone & Style", voiceAnalysis.tone || "Structured"],
      ["Evaluated Date", application.createdAt.toISOString()]
    ];

    const csvContent = csvRows
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=Candidate_Report_${application.candidateName.replace(/\s+/g, "_")}.csv`);
    
    return res.status(200).send(csvContent);

  } catch (error) {
    logger.error("downloadCandidateReportCSV failed:", { error: error.message });
    next(error);
  }
};

// ============= NEW ENHANCED MODULES =============

// AI Job Description Analyzer
const analyzeJobDescription = async (req, res, next) => {
  try {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ success: false, message: "Job description is required." });
    }

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";
    let analysisResult;

    try {
      const response = await axios.post(`${AI_SERVICE_URL}/analyze-jd`, { description }, { timeout: 15000 });
      analysisResult = response.data;
    } catch (err) {
      console.warn("FastAPI JD analyzer unavailable, falling back to local heuristic extraction:", err.message);
      // Fallback local extraction using regex heuristics
      const cleanDesc = description.toLowerCase();
      const skills = [];
      const keywords = ["react", "node", "javascript", "python", "mongodb", "sql", "aws", "docker", "typescript", "git", "communication", "agile"];
      keywords.forEach(kw => {
        if (cleanDesc.includes(kw)) {
          skills.push(kw.charAt(0).toUpperCase() + kw.slice(1));
        }
      });

      analysisResult = {
        requiredSkills: skills.slice(0, 5),
        preferredSkills: skills.slice(5, 8),
        requiredExperience: cleanDesc.match(/(\d+)\+?\s*years?/)?.[1] ? parseInt(cleanDesc.match(/(\d+)\+?\s*years?/)[1]) : 2,
        responsibilities: ["Develop features", "Collaborate with team", "Write unit tests"],
        technologies: skills,
        softSkills: ["Teamwork", "Problem-solving"],
      };
    }

    return res.status(200).json({
      success: true,
      message: "Job description analyzed successfully",
      data: analysisResult,
    });
  } catch (error) {
    next(error);
  }
};

// Save Video Interview Results
const saveVideoInterviewResult = async (req, res, next) => {
  try {
    const { applicationId, jobPostingId, answers, metrics, emotionsTimeline } = req.body;

    if (!applicationId || !jobPostingId) {
      return res.status(400).json({ success: false, message: "applicationId and jobPostingId are required." });
    }

    // Save/Update Video Interview record
    let videoRecord = await VideoInterview.findOne({ applicationId });
    if (!videoRecord) {
      videoRecord = new VideoInterview({ applicationId, jobPostingId });
    }

    videoRecord.answers = answers || [];
    videoRecord.metrics = metrics || {};
    videoRecord.emotionsTimeline = emotionsTimeline || [];
    videoRecord.status = "completed";

    // Calculate overall score (average of relevance, depth, communication, confidence * 10)
    let scoreSum = 0;
    let answerCount = 0;
    if (answers && answers.length > 0) {
      answers.forEach(ans => {
        const relevance = ans.relevanceScore || 5;
        const depth = ans.depthScore || 5;
        const comm = ans.communicationScore || 5;
        const conf = ans.confidenceScore || 5;
        scoreSum += (relevance + depth + comm + conf) * 2.5; // (Relevance + Depth + Comm + Conf) / 4 * 10 = * 2.5
        answerCount++;
      });
      videoRecord.overallScore = Math.round(scoreSum / answerCount);
    } else {
      videoRecord.overallScore = 60; // Base score
    }

    await videoRecord.save();

    // Update Application video interview status and link
    const application = await Application.findById(applicationId);
    if (application) {
      application.status = "Under Review";
      await application.save();
    }

    // Trigger Final Hiring Recommendation
    const atsScore = application ? (application.aiScore || application.aiEvaluation?.score || 50) : 50;
    const voiceScore = application && application.voiceInterview?.compositeScore ? Math.round(application.voiceInterview.compositeScore * 10) : 60;
    const videoScore = videoRecord.overallScore;

    // Combine: ATS (40%), Voice (30%), Video (30%)
    const finalScore = Math.round(atsScore * 0.4 + voiceScore * 0.3 + videoScore * 0.3);

    let finalRecommendation = "Consider";
    if (finalScore >= 85) finalRecommendation = "Highly Recommended";
    else if (finalScore >= 70) finalRecommendation = "Recommended";
    else if (finalScore < 50) finalRecommendation = "Rejected";

    const techScore = Math.round((atsScore * 0.5) + (videoScore * 0.5));
    const commScore = Math.round((voiceScore * 0.5) + (videoScore * 0.5));

    // Save final scorecard to Score model
    let finalScorecard = await Score.findOne({ applicationId });
    if (!finalScorecard) {
      finalScorecard = new Score({
        applicationId,
        candidateName: application ? application.candidateName : "Unknown Candidate"
      });
    }

    finalScorecard.atsScore = atsScore;
    finalScorecard.resumeScore = atsScore;
    finalScorecard.voiceScore = voiceScore;
    finalScorecard.videoScore = videoScore;
    finalScorecard.confidenceScore = Math.round(metrics?.attentionScore || 75);
    finalScorecard.technicalScore = techScore;
    finalScorecard.communicationScore = commScore;
    finalScorecard.finalRecommendation = finalRecommendation;
    finalScorecard.hiringDecisionJustification = `Evaluated candidate with overall score of ${finalScore}%. ATS Resume Match: ${atsScore}%, Voice Screening: ${voiceScore}%, Video Telemetry: ${videoScore}%. Recommendation: ${finalRecommendation}.`;

    await finalScorecard.save();

    // Update application AI feedback
    if (application) {
      application.rating = finalScore / 20; // 0-5 scale
      application.aiEvaluation = {
        score: finalScore,
        match: finalScore >= 75 ? "High" : finalScore >= 50 ? "Medium" : "Low",
        feedback: finalScorecard.hiringDecisionJustification,
        evaluatedAt: new Date()
      };
      await application.save();
    }

    return res.status(200).json({
      success: true,
      message: "Video interview results saved and final evaluations calculated.",
      data: {
        videoRecord,
        finalScorecard
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Video Interview Summary
const getVideoInterviewSummary = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const summary = await VideoInterview.findOne({ applicationId }).lean();
    if (!summary) {
      return res.status(404).json({ success: false, message: "Video interview summary not found." });
    }

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Job Posting
  createJobPosting,
  getAllJobPostings,
  getJobPostingById,
  updateJobPosting,
  deleteJobPosting,
  // Applications
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplicationStatus,
  deleteApplication,
  getJobApplications,
  // AI Workflow
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
  // New Enhanced Modules
  analyzeJobDescription,
  saveVideoInterviewResult,
  getVideoInterviewSummary,
};
