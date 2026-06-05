const mongoose = require("mongoose");

const videoAnalysisSchema = new mongoose.Schema(
  {
    interviewSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewSession",
      required: true,
    },
    eyeContactRatio: {
      type: Number,
      default: 0,
    },
    expressionTimeline: [
      {
        timestamp: { type: Date, default: Date.now },
        happy: { type: Number, default: 0 },
        neutral: { type: Number, default: 0 },
        sad: { type: Number, default: 0 },
        surprised: { type: Number, default: 0 },
        angry: { type: Number, default: 0 },
        fearful: { type: Number, default: 0 },
      },
    ],
    avgWordsPerMinute: {
      type: Number,
      default: 0,
    },
    facialConfidenceScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

videoAnalysisSchema.index({ interviewSessionId: 1 });

module.exports = mongoose.model("VideoAnalysis", videoAnalysisSchema);
