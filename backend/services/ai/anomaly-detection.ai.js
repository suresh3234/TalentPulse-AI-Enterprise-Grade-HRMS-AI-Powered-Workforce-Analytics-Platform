/**
 * Attendance Anomaly Detection Service
 * Identifies unusual attendance patterns using statistical analysis
 * Features:
 * - Deviation detection
 * - Pattern recognition
 * - Trend analysis
 * - Anomaly scoring
 * - Predictive alerts
 */

const Attendance = require("../../models/attendance.model");
const Employee = require("../../models/employee.model");
const mongoose = require("mongoose");

/**
 * Calculate statistical measures for attendance data
 */
const calculateStatistics = (values) => {
  if (!values || values.length === 0) return { mean: 0, stdDev: 0, median: 0, q1: 0, q3: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  const median = sorted[Math.floor(sorted.length / 2)];
  const q1 = sorted[Math.floor(sorted.length / 4)];
  const q3 = sorted[Math.floor((3 * sorted.length) / 4)];
  
  return { mean, stdDev, median, q1, q3 };
};

/**
 * Detect anomalies in attendance patterns
 * @param {string} employeeId - Employee ID
 * @param {number} lookbackDays - Number of days to analyze (default: 90)
 */
const detectAnomalies = async (employeeId, lookbackDays = 90) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    const records = await Attendance.find({
      employeeId: new mongoose.Types.ObjectId(employeeId),
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .lean();

    if (!records || records.length === 0) {
      return {
        success: false,
        anomalies: [],
        summary: "Insufficient data for anomaly detection",
      };
    }

    const anomalies = [];
    const statusCounts = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Leave: 0,
    };
    const workingHours = [];
    let consecutiveAbsences = 0;
    let maxConsecutiveAbsences = 0;

    // Analyze each record
    records.forEach((record, index) => {
      statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;

      // Detect consecutive absence anomaly
      if (record.status === "Absent") {
        consecutiveAbsences++;
        if (consecutiveAbsences > maxConsecutiveAbsences) {
          maxConsecutiveAbsences = consecutiveAbsences;
        }
      } else {
        if (consecutiveAbsences >= 3) {
          anomalies.push({
            type: "CONSECUTIVE_ABSENCES",
            severity: "HIGH",
            date: record.date,
            description: `${consecutiveAbsences} consecutive absences detected`,
            anomalyScore: Math.min(consecutiveAbsences * 15, 100),
            recommendation: "Investigate reason for consecutive absences",
          });
        }
        consecutiveAbsences = 0;
      }

      // Track working hours for pattern analysis
      if (record.checkIn && record.checkOut && record.status === "Present") {
        const [inHour, inMin] = record.checkIn.split(":").map(Number);
        const [outHour, outMin] = record.checkOut.split(":").map(Number);
        const hours = (outHour - inHour) + (outMin - inMin) / 60;
        if (hours > 0) workingHours.push(hours);
      }

      // Detect irregular late arrivals
      if (record.status === "Late" || (record.checkIn && record.checkIn > "09:30")) {
        if (index > 0 && records[index - 1].status !== "Late") {
          anomalies.push({
            type: "LATE_ARRIVAL",
            severity: "MEDIUM",
            date: record.date,
            description: `Late arrival on ${record.date.toDateString()}`,
            anomalyScore: 25,
            recommendation: "Monitor punctuality trend",
          });
        }
      }
    });

    // Calculate statistics for working hours
    const hoursStats = calculateStatistics(workingHours);

    // Detect unusual working hours
    workingHours.forEach((hours, index) => {
      if (hoursStats.stdDev > 0 && Math.abs(hours - hoursStats.mean) > 2 * hoursStats.stdDev) {
        anomalies.push({
          type: "UNUSUAL_WORKING_HOURS",
          severity: "INFO",
          date: records.filter(r => r.status === "Present")[index]?.date,
          description: `Working hours: ${hours.toFixed(1)}h (Expected: ${hoursStats.mean.toFixed(1)}h)`,
          anomalyScore: 20,
          recommendation: "Review workload and work-life balance",
        });
      }
    });

    // Detect absence rate anomaly
    const totalDays = records.length;
    const absenceRate = (statusCounts.Absent / totalDays) * 100;
    const expectedAbsenceRate = 5; // 5% expected
    if (absenceRate > expectedAbsenceRate * 2) {
      anomalies.push({
        type: "HIGH_ABSENCE_RATE",
        severity: "HIGH",
        date: endDate,
        description: `Absence rate: ${absenceRate.toFixed(1)}% (Expected: ~${expectedAbsenceRate}%)`,
        anomalyScore: Math.min(absenceRate * 2, 100),
        recommendation: "Schedule meeting to discuss attendance concerns",
      });
    }

    // Detect irregular patterns (weekday vs weekend)
    const weekdayAbsences = records.filter(
      r => r.status === "Absent" && [1, 2, 3, 4, 5].includes(new Date(r.date).getDay())
    ).length;
    const weekdayTotal = records.filter(
      r => [1, 2, 3, 4, 5].includes(new Date(r.date).getDay())
    ).length;
    if (weekdayTotal > 0 && weekdayAbsences / weekdayTotal > 0.15) {
      anomalies.push({
        type: "WEEKDAY_ABSENCE_PATTERN",
        severity: "MEDIUM",
        date: endDate,
        description: `High weekday absence rate detected`,
        anomalyScore: 60,
        recommendation: "Investigate if there are workplace issues",
      });
    }

    // Calculate overall anomaly score
    const averageAnomalyScore = anomalies.length > 0 
      ? anomalies.reduce((sum, a) => sum + a.anomalyScore, 0) / anomalies.length 
      : 0;

    return {
      success: true,
      anomalies: anomalies.sort((a, b) => b.anomalyScore - a.anomalyScore),
      summary: {
        totalDaysAnalyzed: totalDays,
        anomaliesDetected: anomalies.length,
        averageAnomalyScore: averageAnomalyScore.toFixed(2),
        statusDistribution: statusCounts,
        maxConsecutiveAbsences,
        absenceRate: absenceRate.toFixed(2),
        averageWorkingHours: hoursStats.mean.toFixed(2),
        riskLevel: averageAnomalyScore > 60 ? "HIGH" : averageAnomalyScore > 30 ? "MEDIUM" : "LOW",
      },
    };
  } catch (error) {
    console.error("Error detecting anomalies:", error);
    return {
      success: false,
      error: error.message,
      anomalies: [],
    };
  }
};

/**
 * Predict future attendance issues
 * @param {string} employeeId - Employee ID
 */
const predictAttendanceIssues = async (employeeId) => {
  try {
    const anomalyData = await detectAnomalies(employeeId, 60);

    if (!anomalyData.success) {
      return { predictions: [], confidence: 0 };
    }

    const predictions = [];
    const { summary } = anomalyData;

    // Prediction 1: Continued absences
    if (summary.absenceRate > 10) {
      predictions.push({
        issue: "Continued High Absence Rate",
        probability: Math.min(summary.absenceRate / 100, 1),
        timeframe: "Next 2 weeks",
        recommendation: "Initiate attendance improvement plan",
        severity: "HIGH",
      });
    }

    // Prediction 2: Pattern continuation
    if (summary.maxConsecutiveAbsences >= 3) {
      predictions.push({
        issue: "Potential Consecutive Absence Pattern",
        probability: 0.65,
        timeframe: "Next 1-2 weeks",
        recommendation: "Monitor closely and check in with employee",
        severity: "MEDIUM",
      });
    }

    // Prediction 3: Recurring late arrivals
    const lateAnomalies = anomalyData.anomalies.filter(a => a.type === "LATE_ARRIVAL").length;
    if (lateAnomalies > 3) {
      predictions.push({
        issue: "Recurring Late Arrival Pattern",
        probability: Math.min(lateAnomalies / 10, 1),
        timeframe: "Ongoing",
        recommendation: "Discuss timing challenges and support needed",
        severity: "MEDIUM",
      });
    }

    return {
      predictions,
      confidence: Math.min((summary.anomaliesDetected / 10) * 100, 100),
    };
  } catch (error) {
    console.error("Error predicting attendance issues:", error);
    return { predictions: [], confidence: 0 };
  }
};

module.exports = {
  detectAnomalies,
  predictAttendanceIssues,
  calculateStatistics,
};
