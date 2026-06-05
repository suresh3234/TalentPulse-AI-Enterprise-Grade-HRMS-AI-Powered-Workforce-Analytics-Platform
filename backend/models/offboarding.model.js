const mongoose = require("mongoose");

const offboardingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    unique: true,
  },
  reason: {
    type: String,
    enum: ["resignation", "termination", "retirement", "contract_end", "other"],
    required: true,
  },
  lastWorkingDate: { type: Date, required: true },
  tasks: [{
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    completedAt: { type: Date },
  }],
  exitInterviewDone: { type: Boolean, default: false },
  exitInterviewNotes: { type: String },
  assetReturned: { type: Boolean, default: false },
  accountDeactivated: { type: Boolean, default: false },
  knowledgeTransferDone: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["initiated", "in_progress", "completed"],
    default: "initiated",
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

offboardingSchema.index({ employee: 1 });
offboardingSchema.index({ status: 1 });

module.exports = mongoose.model("Offboarding", offboardingSchema);
