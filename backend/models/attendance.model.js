const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      set: (val) => {
        const d = new Date(val);
        d.setHours(0, 0, 0, 0);
        return d;
      },
    },
    month: {
      type: Number,
      default: function () {
        return this.date ? this.date.getMonth() + 1 : undefined;
      }
    },
    year: {
      type: Number,
      default: function () {
        return this.date ? this.date.getFullYear() : undefined;
      }
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Leave", "Late"],
      required: true,
      default: "Present",
    },
    checkIn: String,
    checkOut: String,
  },
  { timestamps: true },
);

// prevent duplicate entries
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ createdAt: 1 });

// Hardening D: Production optimization indexes
attendanceSchema.index({ employeeId: 1, date: -1 });
attendanceSchema.index({ employeeId: 1, month: 1, year: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
