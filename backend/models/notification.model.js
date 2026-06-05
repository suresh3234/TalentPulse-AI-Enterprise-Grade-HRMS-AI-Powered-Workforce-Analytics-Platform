const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "leave_approved", "leave_rejected", "leave_request",
      "payroll_generated", "payslip_ready",
      "interview_scheduled", "candidate_evaluated",
      "goal_assigned", "appraisal_due", "appraisal_completed",
      "training_assigned", "training_completed",
      "onboarding_task", "offboarding_initiated",
      "document_uploaded", "system_alert", "general",
    ],
    default: "general",
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: { type: String }, // frontend route to navigate to
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 }); // 60 days TTL

module.exports = mongoose.model("Notification", notificationSchema);
