/**
 * Employee Activity Insights Service
 * Generates smart insights about employee activity, engagement, and productivity
 * Features:
 * - Activity patterns
 * - Engagement metrics
 * - Productivity scoring
 * - Behavioral insights
 * - Trend analysis
 */

const Attendance = require("../../models/attendance.model");
const Leave = require("../../models/leave.model");
const Employee = require("../../models/employee.model");
const mongoose = require("mongoose");
const logger = require("../../utils/logger");

/**
 * Calculate engagement score based on multiple factors
 */
const calculateEngagementScore = (attendanceData, leaveData) => {
  let score = 100;

  // Deduct for low attendance (up to 20 points)
  if (attendanceData.attendancePercentage < 90) {
    score -= (90 - attendanceData.attendancePercentage) * 0.2;
  }

  // Deduct for excessive leave usage (up to 15 points)
  if (leaveData.totalLeaveUsed > leaveData.leaveAllocation * 0.8) {
    score -= 15;
  }

  // Deduct for frequent late arrivals (up to 10 points)
  if (attendanceData.lateCount > 3) {
    score -= Math.min(attendanceData.lateCount * 2, 10);
  }

  return Math.max(score, 0);
};

/**
 * Analyze employee activity patterns
 * @param {string} employeeId - Employee ID
 * @param {number} days - Number of days to analyze (default: 30)
 */
const getActivityInsights = async (employeeId, days = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const employeeObjectId = new mongoose.Types.ObjectId(employeeId);

    // Fetch attendance data
    const attendanceRecords = await Attendance.find({
      employeeId: employeeObjectId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .lean();

    // Fetch leave data
    const leaveRecords = await Leave.find({
      employeeId: employeeObjectId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    })
      .lean();

    // Fetch employee details
    const employee = await Employee.findById(employeeObjectId)
      .select("firstName lastName department role")
      .lean();

    if (!employee) {
      return { success: false, message: "Employee not found" };
    }

    // Calculate attendance metrics
    const presentCount = attendanceRecords.filter(r => r.status === "Present").length;
    const absentCount = attendanceRecords.filter(r => r.status === "Absent").length;
    const lateCount = attendanceRecords.filter(r => r.status === "Late").length;
    const leaveCount = attendanceRecords.filter(r => r.status === "Leave").length;
    const totalDays = attendanceRecords.length || 1;
    const attendancePercentage = ((presentCount + lateCount) / totalDays) * 100;

    // Calculate working hours pattern
    const workingHoursPerDay = [];
    let totalWorkingMinutes = 0;
    let daysWorked = 0;

    attendanceRecords.forEach(record => {
      if (record.status === "Present" && record.checkIn && record.checkOut) {
        const [inH, inM] = record.checkIn.split(":").map(Number);
        const [outH, outM] = record.checkOut.split(":").map(Number);
        const minutes = (outH - inH) * 60 + (outM - inM);
        if (minutes > 0) {
          workingHoursPerDay.push(minutes / 60);
          totalWorkingMinutes += minutes;
          daysWorked++;
        }
      }
    });

    const averageWorkingHours = daysWorked > 0 ? totalWorkingMinutes / (daysWorked * 60) : 0;
    const consistencyScore = calculateHourConsistency(workingHoursPerDay);

    // Calculate leave metrics
    const approvedLeaves = leaveRecords.filter(l => l.status === "Approved").length;
    const pendingLeaves = leaveRecords.filter(l => l.status === "Pending").length;

    // Engagement score
    const engagementScore = calculateEngagementScore(
      { attendancePercentage, lateCount },
      { totalLeaveUsed: approvedLeaves, leaveAllocation: 20 }
    );

    // Generate activity insights
    const insights = generateActivityInsights(
      attendancePercentage,
      lateCount,
      averageWorkingHours,
      engagementScore
    );

    // Activity trend
    const trend = analyzeActivityTrend(attendanceRecords, 7);

    // Productivity score
    const productivityScore = calculateProductivityScore(
      attendancePercentage,
      consistencyScore,
      averageWorkingHours
    );

    return {
      success: true,
      employee: {
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        role: employee.role,
      },
      period: {
        days,
        startDate,
        endDate,
      },
      metrics: {
        attendance: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          leave: leaveCount,
          percentage: attendancePercentage.toFixed(2),
        },
        engagement: {
          score: engagementScore.toFixed(2),
          level: getEngagementLevel(engagementScore),
          factors: {
            attendance: attendancePercentage > 90 ? "Good" : "Needs Improvement",
            punctuality: lateCount < 2 ? "Excellent" : "Needs Attention",
            consistency: consistencyScore > 80 ? "High" : "Variable",
          },
        },
        workingHours: {
          average: averageWorkingHours.toFixed(2),
          consistency: consistencyScore.toFixed(2),
          daysWorked,
        },
        productivity: {
          score: productivityScore.toFixed(2),
          level: getProductivityLevel(productivityScore),
          factors: {
            regularity: presentCount / totalDays > 0.9 ? "Excellent" : "Fair",
            punctuality: lateCount === 0 ? "Perfect" : "Good",
            workHours: averageWorkingHours >= 8 ? "Standard" : "Below Standard",
          },
        },
        leaves: {
          approved: approvedLeaves,
          pending: pendingLeaves,
        },
      },
      insights,
      trend,
      recommendations: generateActivityRecommendations(engagementScore, productivityScore, attendancePercentage),
    };
  } catch (error) {
    logger.error("Error generating activity insights:", { error: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Calculate consistency of working hours
 */
const calculateHourConsistency = (hours) => {
  if (hours.length < 2) return 100;

  const mean = hours.reduce((a, b) => a + b) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / mean) * 100;

  // Convert to consistency score (0-100)
  // Lower variation = higher consistency
  return Math.max(100 - coefficientOfVariation * 5, 0);
};

/**
 * Calculate productivity score
 */
const calculateProductivityScore = (attendance, consistency, workingHours) => {
  let score = 0;

  // Attendance component (40%)
  score += (Math.min(attendance, 100) / 100) * 40;

  // Consistency component (30%)
  score += (consistency / 100) * 30;

  // Working hours component (30%)
  const hoursScore = Math.min((workingHours / 8) * 100, 100);
  score += (hoursScore / 100) * 30;

  return score;
};

/**
 * Generate activity insights based on metrics
 */
const generateActivityInsights = (attendance, lateCount, workingHours, engagement) => {
  const insights = [];

  if (attendance >= 95) {
    insights.push({
      title: "Excellent Attendance",
      description: "Employee maintains outstanding attendance record",
      type: "POSITIVE",
      priority: "HIGH",
    });
  } else if (attendance < 75) {
    insights.push({
      title: "Attendance Concern",
      description: "Attendance is below acceptable levels",
      type: "WARNING",
      priority: "HIGH",
    });
  }

  if (lateCount === 0) {
    insights.push({
      title: "Perfect Punctuality",
      description: "Employee has never been late",
      type: "POSITIVE",
      priority: "MEDIUM",
    });
  } else if (lateCount >= 3) {
    insights.push({
      title: "Punctuality Issues",
      description: `${lateCount} late arrivals detected`,
      type: "WARNING",
      priority: "MEDIUM",
    });
  }

  if (workingHours >= 8.5) {
    insights.push({
      title: "Strong Work Commitment",
      description: `Average ${workingHours.toFixed(1)} hours per day`,
      type: "POSITIVE",
      priority: "LOW",
    });
  } else if (workingHours < 7) {
    insights.push({
      title: "Low Working Hours",
      description: `Average ${workingHours.toFixed(1)} hours per day`,
      type: "INFO",
      priority: "MEDIUM",
    });
  }

  if (engagement >= 85) {
    insights.push({
      title: "Highly Engaged",
      description: "Employee shows strong engagement indicators",
      type: "POSITIVE",
      priority: "HIGH",
    });
  } else if (engagement < 60) {
    insights.push({
      title: "Engagement Declining",
      description: "Multiple engagement factors need attention",
      type: "WARNING",
      priority: "HIGH",
    });
  }

  return insights;
};

/**
 * Analyze activity trend over period
 */
const analyzeActivityTrend = (records, weekLength) => {
  if (records.length === 0) return { trend: "NO_DATA", direction: "STABLE" };

  const presentCount = records.filter(r => r.status === "Present").length;
  const recentRecords = records.slice(-weekLength);
  const recentPresent = recentRecords.filter(r => r.status === "Present").length;

  const overallRate = (presentCount / records.length) * 100;
  const recentRate = (recentPresent / recentRecords.length) * 100;

  let direction = "STABLE";
  if (recentRate > overallRate + 5) {
    direction = "IMPROVING";
  } else if (recentRate < overallRate - 5) {
    direction = "DECLINING";
  }

  return {
    overallAttendanceRate: overallRate.toFixed(2),
    recentAttendanceRate: recentRate.toFixed(2),
    direction,
    recommendation: direction === "DECLINING" ? "Monitor closely" : "Maintain current performance",
  };
};

/**
 * Get engagement level label
 */
const getEngagementLevel = (score) => {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "GOOD";
  if (score >= 60) return "FAIR";
  return "POOR";
};

/**
 * Get productivity level label
 */
const getProductivityLevel = (score) => {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "GOOD";
  if (score >= 60) return "AVERAGE";
  return "LOW";
};

/**
 * Generate activity recommendations
 */
const generateActivityRecommendations = (engagement, productivity, attendance) => {
  const recommendations = [];

  if (engagement < 70) {
    recommendations.push({
      action: "ENGAGEMENT_IMPROVEMENT",
      description: "Schedule one-on-one meeting to understand concerns",
      priority: "HIGH",
    });
  }

  if (productivity < 60) {
    recommendations.push({
      action: "PRODUCTIVITY_SUPPORT",
      description: "Assess workload and provide necessary support",
      priority: "HIGH",
    });
  }

  if (attendance < 85) {
    recommendations.push({
      action: "ATTENDANCE_PLAN",
      description: "Create attendance improvement action plan",
      priority: "HIGH",
    });
  }

  if (productivity >= 80 && engagement >= 80) {
    recommendations.push({
      action: "RECOGNITION",
      description: "Recognize outstanding performance and engagement",
      priority: "MEDIUM",
    });
  }

  return recommendations;
};

module.exports = {
  getActivityInsights,
  calculateEngagementScore,
  calculateProductivityScore,
  calculateHourConsistency,
};
