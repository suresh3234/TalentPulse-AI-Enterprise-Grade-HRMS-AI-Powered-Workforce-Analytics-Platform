const Employee = require("../../models/employee.model");
const Attendance = require("../../models/attendance.model");
const Payroll = require("../../models/payroll.model");
const { analyzePerformance } = require("../ai/performance.ai");
const { analyzeAttendance } = require("../ai/attendance.ai");
const mongoose = require("mongoose");
const logger = require("../../utils/logger");

/**
 * Generates performance summaries report for specified period
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @param {string} period - Period type: 'weekly', 'monthly', 'custom'
 * @param {string} departmentId - Optional department filter
 */
const generatePerformanceReport = async (startDate, endDate, period = "monthly", departmentId = null) => {
  try {
    const query = departmentId ? { department: new mongoose.Types.ObjectId(departmentId) } : {};

    const employees = await Employee.find(query).populate("user", "email firstName lastName").lean();

    const performanceData = [];
    let totalScore = 0;
    let topPerformers = 0;
    let needsImprovement = 0;

    for (const emp of employees) {
      try {
        // Get attendance analysis for this employee
        const attendance = await analyzeAttendance(emp._id.toString());
        const performance = await analyzePerformance(emp._id.toString());

        const empData = {
          employeeId: emp._id,
          name: emp.firstName ? `${emp.firstName} ${emp.lastName}` : emp.user?.firstName || "N/A",
          email: emp.user?.email || emp.email,
          department: emp.department,
          role: emp.role,
          performanceScore: performance.score,
          performanceStatus: performance.status,
          attendanceScore: attendance.attendanceScore,
          lateCount: attendance.lateCount,
          absentCount: attendance.absentCount,
          recommendation: performance.recommendation,
        };

        performanceData.push(empData);
        totalScore += performance.score;

        if (performance.status === "Top Performer") topPerformers += 1;
        if (performance.status === "Needs Improvement") needsImprovement += 1;
      } catch (error) {
        logger.error(`Error analyzing employee ${emp._id}`, { error: error.message });
        // Continue with next employee
      }
    }

    const averageScore = employees.length > 0 ? (totalScore / employees.length).toFixed(2) : 0;

    // Generate insights
    const insights = [];
    if (needsImprovement > employees.length * 0.2) {
      insights.push({
        title: "High Number of Underperformers",
        description: `${needsImprovement} employees (${((needsImprovement / employees.length) * 100).toFixed(2)}%) need performance improvement. Consider training programs.`,
        severity: "critical",
      });
    }
    if (topPerformers > employees.length * 0.3) {
      insights.push({
        title: "Strong Team Performance",
        description: `${topPerformers} top performers (${((topPerformers / employees.length) * 100).toFixed(2)}%). Recognize and reward excellence.`,
        severity: "info",
      });
    }
    if (averageScore < 70) {
      insights.push({
        title: "Below Target Performance",
        description: `Team average performance score is ${averageScore}%, below target of 75%.`,
        severity: "warning",
      });
    }

    // Sort by performance score
    performanceData.sort((a, b) => b.performanceScore - a.performanceScore);

    return {
      reportType: "performance",
      period,
      dateRange: { startDate, endDate },
      metrics: {
        totalEmployees: employees.length,
        averageScore: parseFloat(averageScore),
        topPerformers,
        needsImprovement,
        distribution: {
          topPerformer: topPerformers,
          good: performanceData.filter((p) => p.performanceStatus === "Good").length,
          needsImprovement,
        },
      },
      performanceData,
      insights,
      summary: `Performance summary for ${employees.length} employees. Average performance score: ${averageScore}%. ${topPerformers} top performers, ${needsImprovement} need improvement.`,
    };
  } catch (error) {
    throw new Error(`Failed to generate performance report: ${error.message}`);
  }
};

module.exports = { generatePerformanceReport };
