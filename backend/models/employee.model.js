const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows null/empty for employees that don't have user yet (or custom accounts)
    },
    role: {
      type: String,
    },
    position: {
      type: String,
      required: true,
    },
    baseSalary: {
      type: Number,
    },
    allowances: {
      type: Number,
    },
    department: {
      type: String,
      required: true,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "On Leave", "Onboarding"],
      default: "Active",
    },
    reportsTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true },
);

// Standard indexes
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ role: 1 });
employeeSchema.index({ user: 1 });

// Hardening D: Production indexes
employeeSchema.index({ department: 1, status: 1 });
employeeSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Employee", employeeSchema);
