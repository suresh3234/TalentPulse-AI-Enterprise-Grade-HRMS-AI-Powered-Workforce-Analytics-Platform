const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, required: true, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  durationMs: { type: Number, default: 0 },
  result: { type: mongoose.Schema.Types.Mixed },
  error: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const workflowRunSchema = new mongoose.Schema(
  {
    workflowId: {
      type: String,
      required: true,
      unique: true,
      default: () => "wf_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now()
    },
    type: {
      type: String,
      required: true,
      enum: ["attendance", "performance", "recruitment"]
    },
    targetId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued"
    },
    steps: [stepSchema],
    error: {
      type: String
    },
    durationMs: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

workflowRunSchema.index({ type: 1 });
workflowRunSchema.index({ status: 1 });
workflowRunSchema.index({ targetId: 1 });
workflowRunSchema.index({ createdAt: -1 });

module.exports = mongoose.model("WorkflowRun", workflowRunSchema);
