const mongoose = require("mongoose");

const videoInterviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    jobPostingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    emotionsTimeline: [
      {
        timestamp: { type: Date, default: Date.now },
        happy: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
        surprised: { type: Number, default: 0 },
        angry: { type: Number, default: 0 },
        fearful: { type: Number, default: 0 },
      },
    ],
    metrics: {
      eyeContactPercentage: { type: Number, default: 100 },
      blinkCount: { type: Number, default: 0 },
      attentionScore: { type: Number, default: 100 },
      lipMovementScore: { type: Number, default: 100 },
      stressIndicator: { type: Number, default: 0 },
    },
    answers: [
      {
        questionText: { type: String, required: true },
        transcript: { type: String, default: "" },
        relevanceScore: { type: Number, min: 0, max: 10, default: 0 },
        depthScore: { type: Number, min: 0, max: 10, default: 0 },
        communicationScore: { type: Number, min: 0, max: 10, default: 0 },
        confidenceScore: { type: Number, min: 0, max: 10, default: 0 },
        feedback: { type: String, default: "" },
        evaluatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

videoInterviewSchema.index({ applicationId: 1 });
videoInterviewSchema.index({ jobPostingId: 1 });
videoInterviewSchema.index({ status: 1 });

module.exports = mongoose.model("VideoInterview", videoInterviewSchema);
