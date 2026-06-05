const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "employee", "hr", "recruiter", "interviewer", "manager"],
      default: "employee",
    },
    department: { type: String },
    permissions: [{ type: String }], // Fine-grained permissions
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Cascade delete employees when user is deleted
userSchema.post("findByIdAndDelete", async function (doc) {
  if (doc) {
    const Employee = mongoose.model("Employee");
    await Employee.deleteMany({ user: doc._id });
  }
});

// Create index on email for faster queries
userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);