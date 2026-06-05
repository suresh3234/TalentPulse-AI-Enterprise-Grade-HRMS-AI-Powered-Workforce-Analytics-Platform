const { analyzeAttendance } = require("./attendance.ai");
const {
  PERFORMANCE_THRESHOLDS,
  generatePerformanceRecommendation,
  getAttendanceStatus,
} = require("./ai.validator");

/**
 * Improved performance analysis with multi-factor scoring
 * @param {string} employeeId - The employee ID
 * @param {Date} startDate - Optional start date
 * @param {Date} endDate - Optional end date
 */
const analyzePerformance = async (employeeId, startDate = null, endDate = null) => {
  try {
    // Get attendance data
    const attendanceData = await analyzeAttendance(employeeId, startDate, endDate);

    // Calculate attendance score (weight: 40%)
    const attendanceScore = attendanceData.attendanceScore;
    const attendanceWeight = 0.4;

    // Calculate working hours score (weight: 30%)
    // Average working hours should be 8 hours/day
    const targetHours = 8;
    const avgHours = parseFloat(attendanceData.workingHours.averagePerDay);
    const workingHoursScore = avgHours > 0 ? Math.min((avgHours / targetHours) * 100, 100) : 0;
    const workingHoursWeight = 0.3;

    // Calculate consistency score (weight: 30%)
    // Based on late arrivals and absence patterns
    const latePercentage = (attendanceData.metrics.lateCount / attendanceData.metrics.totalDays) * 100;
    const consistencyScore = Math.max(100 - latePercentage * 2 - (attendanceData.metrics.maxConsecutiveAbsences * 5), 0);
    const consistencyWeight = 0.3;

    // Calculate composite performance score
    const performanceScore = Math.round(
      attendanceScore * attendanceWeight +
      workingHoursScore * workingHoursWeight +
      consistencyScore * consistencyWeight
    );

    // Determine performance status
    let performanceStatus = "Needs Improvement";
    if (performanceScore >= PERFORMANCE_THRESHOLDS.topPerformer) {
      performanceStatus = "Top Performer";
    } else if (performanceScore >= PERFORMANCE_THRESHOLDS.excellent) {
      performanceStatus = "Excellent";
    } else if (performanceScore >= PERFORMANCE_THRESHOLDS.good) {
      performanceStatus = "Good";
    } else if (performanceScore >= PERFORMANCE_THRESHOLDS.satisfactory) {
      performanceStatus = "Satisfactory";
    }

    // Get detailed recommendation
    const { recommendation, actionItems } = generatePerformanceRecommendation(performanceScore, performanceStatus);

    // Generate insights
    const insights = [];

    if (performanceScore >= 90) {
      insights.push({
        title: "Top Performer",
        description: "Exceptional performance across all metrics.",
        severity: "info",
      });
    }

    if (attendanceScore < 70) {
      insights.push({
        title: "Attendance Concerns",
        description: `Attendance score of ${attendanceScore}% is affecting overall performance.`,
        severity: "warning",
      });
    }

    if (avgHours < 7) {
      insights.push({
        title: "Low Working Hours",
        description: `Average ${avgHours} hours/day is below 8-hour standard.`,
        severity: "warning",
      });
    }

    if (attendanceData.metrics.maxConsecutiveAbsences >= 3) {
      insights.push({
        title: "Absence Pattern",
        description: `${attendanceData.metrics.maxConsecutiveAbsences} consecutive absences detected.`,
        severity: "warning",
      });
    }

    return {
      performanceScore,
      performanceStatus,
      recommendation,
      actionItems,
      scoreBreakdown: {
        attendance: parseFloat(attendanceScore.toFixed(2)),
        workingHours: parseFloat(workingHoursScore.toFixed(2)),
        consistency: parseFloat(consistencyScore.toFixed(2)),
        weights: {
          attendance: attendanceWeight,
          workingHours: workingHoursWeight,
          consistency: consistencyWeight,
        },
      },
      attendanceStatus: attendanceData.attendanceStatus,
      metrics: {
        presentCount: attendanceData.metrics.presentCount,
        absentCount: attendanceData.metrics.absentCount,
        lateCount: attendanceData.metrics.lateCount,
        totalDays: attendanceData.metrics.totalDays,
        averageWorkingHours: avgHours,
      },
      insights,
      alerts: attendanceData.alerts,
      dateRange: attendanceData.dateRange,
    };
  } catch (error) {
    throw new Error(`Performance analysis failed: ${error.message}`);
  }
};

module.exports = { analyzePerformance };
