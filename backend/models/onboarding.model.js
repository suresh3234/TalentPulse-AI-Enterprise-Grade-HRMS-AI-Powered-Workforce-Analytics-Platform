const mongoose = require("mongoose");

const onboardingTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed"],
    default: "pending",
  },
  dueDate: { type: Date },
  completedAt: { type: Date },
});

const onboardingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    unique: true,
  },
  tasks: [onboardingTaskSchema],
  completionPercent: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  targetCompletionDate: { type: Date },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

onboardingSchema.index({ employee: 1 });
onboardingSchema.index({ status: 1 });

module.exports = mongoose.model("Onboarding", onboardingSchema);
