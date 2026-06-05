const mongoose = require("mongoose");

const screeningSessionSchema = new mongoose.Schema(
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
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    questions: {
      type: [String],
      default: [],
    },
    videoUrls: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

screeningSessionSchema.index({ candidateId: 1 });
screeningSessionSchema.index({ jobId: 1 });
screeningSessionSchema.index({ token: 1 });

module.exports = mongoose.model("ScreeningSession", screeningSessionSchema);
