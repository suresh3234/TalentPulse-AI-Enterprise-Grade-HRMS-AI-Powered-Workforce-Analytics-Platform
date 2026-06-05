const Attendance = require("../../models/attendance.model");
const mongoose = require("mongoose");
const {
  parseTimeToMinutes,
  calculateAttendancePercentage,
  getAttendanceStatus,
  generateAttendanceAlert,
  ALERT_SEVERITY,
} = require("./ai.validator");

/**
 * Improved attendance analysis with validation and advanced metrics
 * @param {string} employeeId - The employee ID
 * @param {Date} startDate - Optional start date
 * @param {Date} endDate - Optional end date
 */
const analyzeAttendance = async (employeeId, startDate = null, endDate = null) => {
  try {
    const currentDate = new Date();
    const start = startDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = endDate || new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const query = {
      date: { $gte: start, $lte: end },
    };

    if (employeeId) {
      query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    const records = await Attendance.find(query)
      .populate("employeeId", "firstName lastName email")
      .sort({ date: 1 })
      .lean();

    // Initialize metrics
    let lateCount = 0;
    let absentCount = 0;
    let presentCount = 0;
    let leaveCount = 0;
    let workingHoursTotal = 0;
    let workingDaysCount = 0;
    let currentConsecutiveAbsences = 0;
    let maxConsecutiveAbsences = 0;
    let totalScore = 0;
    const absencePatterns = [];

    // Process each record
    records.forEach((record, index) => {
      let isLate = false;
      let isAbsent = false;
      let workingHours = 0;

      // Determine status
      if (record.status === "Absent") {
        isAbsent = true;
        absentCount++;
        currentConsecutiveAbsences++;
      } else if (record.status === "Leave") {
        leaveCount++;
        currentConsecutiveAbsences = 0;
      } else if (record.status === "Late") {
        isLate = true;
        lateCount++;
        currentConsecutiveAbsences = 0;
        presentCount++;
      } else if (record.status === "Present") {
        presentCount++;
        currentConsecutiveAbsences = 0;
      }

      // Track max consecutive absences
      if (currentConsecutiveAbsences > maxConsecutiveAbsences) {
        maxConsecutiveAbsences = currentConsecutiveAbsences;
      }

      // Calculate working hours if checkIn/checkOut present
      if (record.checkIn && record.checkOut && !isAbsent) {
        const checkInMin = parseTimeToMinutes(record.checkIn);
        const checkOutMin = parseTimeToMinutes(record.checkOut);
        if (checkInMin !== null && checkOutMin !== null) {
          workingHours = (checkOutMin - checkInMin) / 60; // Convert to hours
          if (workingHours < 0) workingHours += 24; // Handle day wrap-around
          workingHoursTotal += workingHours;
        }
      }

      // Track late check-in even if marked as Present
      if (!isAbsent && !isLate && record.checkIn) {
        const checkInMin = parseTimeToMinutes(record.checkIn);
        const lateThreshold = 9 * 60 + 30; // 9:30 AM
        if (checkInMin !== null && checkInMin > lateThreshold) {
          isLate = true;
          lateCount++;
        }
      }

      // Calculate score for this day
      if (isAbsent) {
        totalScore += 0;
      } else if (isLate) {
        totalScore += 0.7; // Late gets 70% score
      } else {
        totalScore += 1; // Present gets 100% score
        workingDaysCount++;
      }

      // Track patterns
      if (currentConsecutiveAbsences > 0) {
        absencePatterns.push({
          date: record.date,
          consecutive: currentConsecutiveAbsences,
        });
      }
    });

    const totalRecords = records.length || 1;
    const attendancePercentage = calculateAttendancePercentage(presentCount, totalRecords);
    const attendanceStatus = getAttendanceStatus(attendancePercentage);
    const averageWorkingHours = workingDaysCount > 0 ? (workingHoursTotal / workingDaysCount).toFixed(2) : 0;

    // Generate alerts
    const alerts = generateAttendanceAlert(absentCount, lateCount, maxConsecutiveAbsences, totalRecords, attendancePercentage);

    // Generate insights
    const insights = [];
    if (attendancePercentage < 75) {
      insights.push({
        title: "Attendance Below Target",
        description: `Current attendance of ${attendancePercentage}% is below the 85% company target.`,
        severity: "warning",
        recommendation: "Review reasons for absences and create improvement plan.",
      });
    }

    if (lateCount > totalRecords * 0.2) {
      insights.push({
        title: "Frequent Late Arrivals",
        description: `${lateCount} late arrivals detected (${((lateCount / totalRecords) * 100).toFixed(1)}% of days).`,
        severity: "warning",
        recommendation: "Discuss punctuality with employee.",
      });
    }

    if (averageWorkingHours < 7) {
      insights.push({
        title: "Low Working Hours",
        description: `Average working hours per day: ${averageWorkingHours} hours (below 8-hour standard).`,
        severity: "info",
        recommendation: "Monitor working hours and ensure adequate work time.",
      });
    }

    return {
      attendanceScore: parseFloat((totalScore / totalRecords * 100).toFixed(2)),
      attendancePercentage,
      attendanceStatus,
      metrics: {
        presentCount,
        absentCount,
        lateCount,
        leaveCount,
        totalDays: totalRecords,
        maxConsecutiveAbsences,
      },
      workingHours: {
        totalHours: parseFloat(workingHoursTotal.toFixed(2)),
        averagePerDay: parseFloat(averageWorkingHours),
      },
      alerts,
      insights,
      dateRange: {
        start,
        end,
      },
    };
  } catch (error) {
    throw new Error(`Attendance analysis failed: ${error.message}`);
  }
};

module.exports = { analyzeAttendance };
