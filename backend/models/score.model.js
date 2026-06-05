const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    candidateName: {
      type: String,
      required: true,
    },
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    resumeScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    voiceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    videoScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    technicalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    communicationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    finalRecommendation: {
      type: String,
      enum: ["Highly Recommended", "Recommended", "Consider", "Rejected"],
      default: "Consider",
    },
    hiringDecisionJustification: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

scoreSchema.index({ applicationId: 1 });
scoreSchema.index({ finalRecommendation: 1 });

module.exports = mongoose.model("Score", scoreSchema);
