const { analyzeAttendance } = require("./attendance.ai");
const { analyzePerformance } = require("./performance.ai");

/**
 * Generates alerts based on attendance and performance
 * @param {string} employeeId - Optional employee ID
 */
const generateAlerts = async (employeeId) => {
  const alerts = [];

  const attendance = await analyzeAttendance(employeeId);
  const performance = await analyzePerformance(employeeId);

  // High absence
  if (attendance.absentCount >= 3) {
    alerts.push({
      type: "High Absence",
      message: `Detected ${attendance.absentCount} absences.`,
    });
  }

  // Frequent late
  if (attendance.lateCount >= 3) {
    alerts.push({
      type: "Frequent Late",
      message: `Detected ${attendance.lateCount} late arrivals.`,
    });
  }

  // Low performance
  if (performance.score < 70) {
    alerts.push({
      type: "Low Performance",
      message: `Performance score is below 70 (${performance.score}%).`,
    });
  }

  return alerts;
};

module.exports = { generateAlerts };
