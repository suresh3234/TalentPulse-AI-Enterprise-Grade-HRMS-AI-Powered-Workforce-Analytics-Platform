const mongoose = require("mongoose");

const benefitSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    unique: true,
  },
  healthInsurance: { type: Boolean, default: false },
  lifeInsurance: { type: Boolean, default: false },
  providentFund: { type: Boolean, default: true },
  gratuity: { type: Boolean, default: false },
  stockOptions: { type: Boolean, default: false },
  transportAllowance: { type: Number, default: 0 },
  mealAllowance: { type: Number, default: 0 },
  housingAllowance: { type: Number, default: 0 },
  customPerks: [{
    name: { type: String },
    value: { type: String },
  }],
  plan: {
    type: String,
    enum: ["basic", "standard", "premium", "executive"],
    default: "basic",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
}, { timestamps: true });

benefitSchema.index({ employee: 1 });

module.exports = mongoose.model("Benefit", benefitSchema);
