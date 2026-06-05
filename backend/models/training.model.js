const mongoose = require("mongoose");

const trainingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ["technical", "soft_skills", "compliance", "leadership", "onboarding", "certification"],
    default: "technical",
  },
  duration: { type: String }, // e.g. "2 hours", "5 days"
  enrolledEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
  }],
  completedBy: [{
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    completedAt: { type: Date, default: Date.now },
    score: { type: Number }, // optional completion score
  }],
  dueDate: { type: Date },
  status: {
    type: String,
    enum: ["draft", "active", "completed", "archived"],
    default: "active",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  maxEnrollment: { type: Number, default: 100 },
  tags: [{ type: String }],
}, { timestamps: true });

trainingSchema.index({ status: 1 });
trainingSchema.index({ category: 1 });
trainingSchema.index({ "enrolledEmployees": 1 });

module.exports = mongoose.model("Training", trainingSchema);
