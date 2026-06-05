const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
    },
    hrUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    recordingUrl: {
      type: String,
    },
    transcriptRaw: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    aiSummary: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

interviewSessionSchema.index({ candidateId: 1 });
interviewSessionSchema.index({ jobId: 1 });
interviewSessionSchema.index({ hrUserId: 1 });
interviewSessionSchema.index({ status: 1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
