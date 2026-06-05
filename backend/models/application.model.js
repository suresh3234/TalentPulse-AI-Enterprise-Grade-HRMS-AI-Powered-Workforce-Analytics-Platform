const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    jobPostingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
    },
    candidateName: {
      type: String,
      required: true,
    },
    candidateEmail: {
      type: String,
      required: true,
    },
    candidatePhone: {
      type: String,
      required: true,
    },
    candidateResume: {
      type: String, // URL or plain text resume content
    },
    coverLetter: {
      type: String,
    },
    experience: {
      type: Number,
      required: true,
    },
    skills: [
      {
        type: String,
      },
    ],
    currentCompany: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Rejected", "Selected", "Offered", "Joined", "interview_scheduled"],
      default: "Applied",
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
    },
    feedback: {
      type: String,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewDate: {
      type: Date,
    },
    
    // Smart Scheduler / Interviews link
    interview: {
      date: { type: Date },
      time: { type: String },
      interviewerEmail: { type: String },
      notes: { type: String },
      scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      scheduledAt: { type: Date },
      result: { type: String, enum: ["Selected", "Rejected"] },
      feedback: { type: String },
      score: { type: Number, min: 0, max: 10 },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      resultRecordedAt: { type: Date },
    },

    // AI Evaluation standard metrics
    aiEvaluation: {
      score: { type: Number, min: 0, max: 100 },
      match: { type: String, enum: ["High", "Medium", "Low"] },
      feedback: { type: String },
      evaluatedAt: { type: Date },
    },

    // Task 2: Hardened Resume Evaluation metrics
    aiScore: {
      type: Number,
      min: 0,
      max: 100
    },
    aiGrade: {
      type: String,
      enum: ["A+", "A", "B", "C", "D"]
    },
    aiScreenedAt: {
      type: Date
    },
    aiFlags: {
      type: [String],
      default: []
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1
    },
    dataQuality: {
      type: String,
      enum: ["high", "medium", "low"]
    },
    scoringBasis: {
      type: [String],
      default: []
    },
    parsedResume: {
      skills: { type: [String], default: [] },
      yearsOfExperience: { type: Number },
      educationLevel: { type: String },
      previousRoles: { type: [String], default: [] },
      achievements: { type: [String], default: [] },
      redFlags: { type: [String], default: [] },
      overallImpression: { type: String }
    },

    // Task 3: Hardened Chatbot Screening flow
    chatbotScreening: {
      answers: [
        {
          questionText: { type: String },
          answerTranscript: { type: String },
          evaluatedAt: { type: Date, default: Date.now }
        }
      ],
      sentimentHistory: [
        {
          messageIndex: { type: Number },
          sentiment: { type: String },
          intent: { type: String },
          keyEntitiesExtracted: { type: [String], default: [] },
          concernFlag: { type: Boolean, default: false },
          evaluatedAt: { type: Date, default: Date.now }
        }
      ],
      summary: {
        overallImpressionScore: { type: Number },
        communicationScore: { type: Number },
        enthusiasmScore: { type: Number },
        keyStrengths: { type: [String], default: [] },
        concerns: { type: [String], default: [] },
        recommendedNextStep: { type: String },
        chatbotGrade: { type: String },
        summaryText: { type: String },
        evaluatedAt: { type: Date }
      }
    },

    // Task 1: Complete Voice Screening details
    voiceInterview: {
      sessionId: { type: String },
      status: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending"
      },
      overallGrade: { type: String },
      compositeScore: { type: Number },
      lastUpdated: { type: Date, default: Date.now },
      voiceAnalysis: {
        confidenceScore: { type: Number },
        communicationScore: { type: Number },
        professionalismScore: { type: Number },
        speedWpm: { type: Number },
        hesitationCount: { type: Number },
        fluencyScore: { type: Number },
        emotion: { type: String },
        tone: { type: String }
      },
      answers: [
        {
          questionText: { type: String },
          transcript: { type: String },
          scores: {
            relevance: { type: Number },
            depth: { type: Number },
            communication: { type: Number },
            experienceFit: { type: Number },
            cultureSignal: { type: Number }
          },
          grade: { type: String },
          followUpQuestion: { type: String },
          evaluatedAt: { type: Date, default: Date.now }
        }
      ]
    }
  },
  { timestamps: true }
);

// Optimize database search and sort queries
applicationSchema.index({ jobPostingId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ candidateEmail: 1 });
applicationSchema.index({ createdAt: -1 });

// Hardening D: Production indexes
applicationSchema.index({ jobPostingId: 1, aiGrade: 1 });
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ "voiceInterview.status": 1 });

module.exports = mongoose.model("Application", applicationSchema);
