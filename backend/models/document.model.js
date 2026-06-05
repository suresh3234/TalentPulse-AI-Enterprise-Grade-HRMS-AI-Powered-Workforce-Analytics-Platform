const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  fileType: { type: String },
  fileSize: { type: Number },
  filePath: { type: String, required: true },
  category: {
    type: String,
    enum: ["resume", "id_proof", "certificate", "contract", "payslip", "other"],
    default: "other",
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

documentSchema.index({ employee: 1, category: 1 });

module.exports = mongoose.model("Document", documentSchema);
