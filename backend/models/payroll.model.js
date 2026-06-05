const { default: mongoose } = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: Number,
    },
    year: {
      type: Number,
    },
    baseSalary: {
      type: Number,
    },
    allowances: {
      type: Number,
    },
    bonus: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    pf: {
      type: Number,
      default: 0,
    },
    leaveDeduction: {
      type: Number,
      default: 0,
    },
    deductions: {
      type: Number,
    },
    netSalary: {
      type: Number,
    },

    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ status: 1 });
payrollSchema.index({ month: 1, year: 1 });

module.exports = mongoose.model("Payroll", payrollSchema);
