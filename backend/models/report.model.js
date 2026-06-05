const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["attendance", "performance", "recruitment"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    period: {
      type: String,
      enum: ["weekly", "monthly", "custom"],
      default: "monthly",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    summary: {
      type: String,
    },
    status: {
      type: String,
      enum: ["draft", "completed", "archived"],
      default: "completed",
    },
    metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    insights: [
      {
        title: String,
        description: String,
        severity: {
          type: String,
          enum: ["info", "warning", "critical"],
          default: "info",
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for querying reports
reportSchema.index({ type: 1, period: 1, createdAt: -1 });
reportSchema.index({ startDate: 1, endDate: 1 });
reportSchema.index({ generatedBy: 1 });

module.exports = mongoose.model("Report", reportSchema);
