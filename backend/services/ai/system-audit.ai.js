/**
 * System-wide AI Audit Service
 * Performs comprehensive analysis across all modules
 */

const Employee = require("../../models/employee.model");
const { analyzeAttendance } = require("./attendance.ai");
const { analyzePerformance } = require("./performance.ai");
const { getActivityInsights } = require("./activity-insights.ai");
const logger = require("../../utils/logger");

const runSystemAudit = async () => {
  logger.info("Starting system-wide AI audit");
  
  try {
    const employees = await Employee.find({ status: "Active" }).lean();
    const results = [];

    for (const employee of employees) {
      const employeeId = String(employee._id);
      
      // Perform parallel analysis
      const [attendance, performance, insights] = await Promise.all([
        analyzeAttendance(employeeId),
        analyzePerformance(employeeId),
        getActivityInsights(employeeId, 30)
      ]);

      results.push({
        employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department,
        riskLevel: attendance.attendancePercentage < 75 ? "HIGH" : "LOW",
        performanceScore: performance.score,
        engagementLevel: insights.metrics?.engagement?.level || "UNKNOWN",
        recommendations: insights.recommendations
      });
    }

    return {
      success: true,
      timestamp: new Date(),
      totalEmployees: employees.length,
      auditResults: results,
      summary: {
        highRiskCount: results.filter(r => r.riskLevel === "HIGH").length,
        averagePerformance: results.reduce((sum, r) => sum + r.performanceScore, 0) / employees.length
      }
    };
  } catch (error) {
    logger.error("System audit failed:", error);
    throw error;
  }
};

module.exports = { runSystemAudit };
