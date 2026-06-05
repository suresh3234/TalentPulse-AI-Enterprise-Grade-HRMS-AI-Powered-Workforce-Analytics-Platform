const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  userName: { type: String },
  action: {
    type: String,
    required: true,
    enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "ACCESS"],
  },
  resource: {
    type: String,
    required: true,
  },
  resourceId: {
    type: String,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  statusCode: { type: Number },
  timestamp: {
    type: Date,
    default: Date.now,
    index: { expires: "90d" }, // Auto-delete after 90 days
  },
});

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resource: 1, action: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
