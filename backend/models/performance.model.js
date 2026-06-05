const mongoose = require("mongoose");

const kpiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  target: { type: Number, required: true },
  actual: { type: Number, default: 0 },
  weight: { type: Number, default: 1 }, // weight for score calculation
  unit: { type: String, default: "%" },
});

const performanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  period: {
    type: String,
    required: true, // e.g. "Q1-2026", "2025-2026"
  },
  kpis: [kpiSchema],
  goals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Goal",
  }],
  selfRating: {
    score: { type: Number, min: 1, max: 5 },
    comments: { type: String },
    submittedAt: { type: Date },
  },
  managerRating: {
    score: { type: Number, min: 1, max: 5 },
    comments: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
  },
  overallScore: { type: Number, min: 0, max: 100 },
  band: {
    type: String,
    enum: ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Needs Improvement", "Unsatisfactory"],
  },
  aiNarrative: { type: String }, // AI-generated performance summary
  status: {
    type: String,
    enum: ["draft", "self_review", "manager_review", "completed", "closed"],
    default: "draft",
  },
  appraisalCycle: { type: String }, // e.g. "Annual-2026"
}, { timestamps: true });

performanceSchema.index({ employee: 1, period: 1 }, { unique: true });
performanceSchema.index({ status: 1 });

module.exports = mongoose.model("Performance", performanceSchema);
