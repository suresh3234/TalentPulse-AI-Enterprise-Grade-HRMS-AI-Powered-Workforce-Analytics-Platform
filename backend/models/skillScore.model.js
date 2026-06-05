const mongoose = require("mongoose");

const skillScoreSchema = new mongoose.Schema(
  {
    interviewSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
    },
    skillName: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 10,
      required: true,
    },
    evidence: {
      type: String,
      default: "",
    },
    gaps: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

skillScoreSchema.index({ interviewSessionId: 1 });
skillScoreSchema.index({ skillName: 1 });

module.exports = mongoose.model("SkillScore", skillScoreSchema);
