const mongoose = require("mongoose");

const jobPostingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    position: {
      type: String,
      required: true,
    },
    requiredExperience: {
      type: Number,
      required: true,
    },
    skills: [
      {
        type: String,
      },
    ],
    salary: {
      min: { type: Number },
      max: { type: Number },
    },
    location: {
      type: String,
      required: true,
    },
    jobType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Temporary"],
      default: "Full-time",
    },
    status: {
      type: String,
      enum: ["Open", "Closed", "On Hold"],
      default: "Open",
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    closingDate: {
      type: Date,
    },
    numberOfPositions: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

jobPostingSchema.index({ status: 1 });
jobPostingSchema.index({ department: 1 });
jobPostingSchema.index({ position: 1 });
jobPostingSchema.index({ createdAt: -1 });

module.exports = mongoose.model("JobPosting", jobPostingSchema);
