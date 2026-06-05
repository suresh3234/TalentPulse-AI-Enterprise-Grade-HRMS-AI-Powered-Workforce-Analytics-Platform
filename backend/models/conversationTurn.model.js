const mongoose = require("mongoose");

const conversationTurnSchema = new mongoose.Schema(
  {
    interviewSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
    },
    speaker: {
      type: String,
      enum: ["HR", "AI", "CANDIDATE"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    timestampMs: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

conversationTurnSchema.index({ interviewSessionId: 1 });
conversationTurnSchema.index({ createdAt: 1 });

module.exports = mongoose.model("ConversationTurn", conversationTurnSchema);
