const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  title: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ["performance", "development", "project", "personal"],
    default: "performance",
  },
  targetDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed", "cancelled"],
    default: "not_started",
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
}, { timestamps: true });

goalSchema.index({ employee: 1, status: 1 });
goalSchema.index({ targetDate: 1 });

module.exports = mongoose.model("Goal", goalSchema);
