/**
 * Enhanced AI Routes
 * New intelligent endpoints for insights, anomalies, and recommendations
 * Base path: /api/ai
 */

const express = require("express");
const router = express.Router();
const enhancedAiController = require("../controllers/enhanced-ai.controller");

/**
 * Live Business Analytics Endpoint
 * GET /api/ai/live-analytics
 * 
 * @desc Get real-time aggregated metrics across employment, attendance, and recruitment
 * @access Private
 */
router.get("/live-analytics", enhancedAiController.getLiveAnalytics);

/**
 * AI Workflow Monitoring Endpoint
 * GET /api/ai/workflow-monitor
 * 
 * @desc Get real-time status of active, queued, and local fallback background workflows
 * @access Private
 */
router.get("/workflow-monitor", enhancedAiController.getWorkflowMonitor);

/**
 * Real-time Strategic Insights Endpoint
 * GET /api/ai/realtime-insights
 * 
 * @desc Get real-time AI strategic recommendations and active risk alerts
 * @access Private
 */
router.get("/realtime-insights", enhancedAiController.getRealtimeInsights);


/**
 * Activity Insights Endpoint
 * GET /api/ai/activity-insights/:employeeId?days=30
 * 
 * @desc Generate activity insights for an employee
 * @access Private
 * @parameters
 *   - employeeId: Employee ID (required)
 *   - days: Number of days to analyze (optional, default: 30)
 * 
 * @returns
 * {
 *   success: true,
 *   message: "Activity insights generated successfully",
 *   data: {
 *     employee: { name, department, role },
 *     period: { days, startDate, endDate },
 *     metrics: {
 *       attendance: { present, absent, late, percentage },
 *       engagement: { score, level, factors },
 *       workingHours: { average, consistency, daysWorked },
 *       productivity: { score, level, factors },
 *       leaves: { approved, pending }
 *     },
 *     insights: [...],
 *     trend: { overallRate, recentRate, direction },
 *     recommendations: [...]
 *   }
 * }
 */
router.get("/activity-insights/:employeeId", enhancedAiController.getActivityInsights);

/**
 * Attendance Anomaly Detection Endpoint
 * GET /api/ai/anomalies/:employeeId?lookbackDays=90
 * 
 * @desc Detect anomalies in attendance patterns
 * @access Private
 * @parameters
 *   - employeeId: Employee ID (required)
 *   - lookbackDays: Number of days to analyze (optional, default: 90)
 * 
 * @returns
 * {
 *   success: true,
 *   message: "Anomalies detected successfully",
 *   data: {
 *     anomalies: [
 *       {
 *         type: "CONSECUTIVE_ABSENCES" | "LATE_ARRIVAL" | "UNUSUAL_WORKING_HOURS" | "HIGH_ABSENCE_RATE" | "WEEKDAY_ABSENCE_PATTERN",
 *         severity: "HIGH" | "MEDIUM" | "LOW",
 *         date: "date",
 *         description: "description",
 *         anomalyScore: number,
 *         recommendation: "recommendation"
 *       }
 *     ],
 *     summary: {
 *       totalDaysAnalyzed: number,
 *       anomaliesDetected: number,
 *       averageAnomalyScore: number,
 *       statusDistribution: {...},
 *       riskLevel: "HIGH" | "MEDIUM" | "LOW"
 *     }
 *   }
 * }
 */
router.get("/anomalies/:employeeId", enhancedAiController.getAnomalies);

/**
 * Attendance Issue Prediction Endpoint
 * GET /api/ai/predict-attendance/:employeeId
 * 
 * @desc Predict future attendance issues
 * @access Private
 * @parameters
 *   - employeeId: Employee ID (required)
 * 
 * @returns
 * {
 *   success: true,
 *   message: "Attendance predictions generated",
 *   data: {
 *     predictions: [
 *       {
 *         issue: "issue_name",
 *         probability: number (0-1),
 *         timeframe: "timeframe",
 *         recommendation: "recommendation",
 *         severity: "HIGH" | "MEDIUM" | "LOW"
 *       }
 *     ],
 *     confidence: number
 *   }
 * }
 */
router.get("/predict-attendance/:employeeId", enhancedAiController.predictAttendanceIssues);

/**
 * Employee Summary Endpoint
 * GET /api/ai/employee-summary/:employeeId?days=30
 * 
 * @desc Get comprehensive employee summary with all metrics
 * @access Private
 * @parameters
 *   - employeeId: Employee ID (required)
 *   - days: Number of days to analyze (optional, default: 30)
 * 
 * @returns
 * {
 *   success: true,
 *   message: "Employee summary generated successfully",
 *   data: {
 *     employee: { name, department, role },
 *     period: { days, startDate, endDate },
 *     metrics: {...},
 *     insights: [...],
 *     trend: {...},
 *     recommendations: [...],
 *     anomalies: {...},
 *     predictions: {...}
 *   }
 * }
 */
router.get("/employee-summary/:employeeId", enhancedAiController.getEmployeeSummary);

/**
 * Enhanced Recommendation Engine Endpoint
 * GET /api/ai/recommendation-engine/:employeeId?scope=all
 * 
 * @desc Generate AI-powered recommendations for employee
 * @access Private
 * @parameters
 *   - employeeId: Employee ID (required)
 *   - scope: Recommendation scope - "all" | "performance" | "attendance" | "development" (optional, default: "all")
 * 
 * @returns
 * {
 *   success: true,
 *   message: "Recommendations generated successfully",
 *   data: {
 *     employee: { name, department, role, email },
 *     metrics: {
 *       attendancePercentage: number,
 *       lateArrivals: number,
 *       leavesUsed: number,
 *       averageWorkingHours: number
 *     },
 *     recommendations: [
 *       {
 *         id: "REC_001",
 *         type: "ATTENDANCE" | "PERFORMANCE" | "DEVELOPMENT" | "RECOGNITION",
 *         title: "Recommendation Title",
 *         description: "Detailed description",
 *         actionItems: [...],
 *         priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
 *         timeline: "timeframe",
 *         expectedOutcome: "outcome",
 *         estimatedImpact: number,
 *         category: "category"
 *       }
 *     ],
 *     summary: {
 *       totalRecommendations: number,
 *       criticalRecommendations: number,
 *       highRecommendations: number
 *     }
 *   }
 * }
 */
router.get("/recommendation-engine/:employeeId", enhancedAiController.generateRecommendations);

/**
 * Full AI Analysis Endpoint
 * GET /api/ai/full-analysis/:employeeId
 * 
 * @desc Get complete AI analysis with all components
 * @access Private
 * @parameters
 *   - employeeId: Employee ID (required)
 * 
 * @returns
 * {
 *   success: true,
 *   message: "Full AI analysis completed",
 *   data: {
 *     employee: { name, department, role },
 *     executiveSummary: {
 *       engagementScore: number,
 *       productivityScore: number,
 *       anomalies: number,
 *       riskLevel: "HIGH" | "MEDIUM" | "LOW"
 *     },
 *     activityInsights: {...},
 *     anomalies: {...},
 *     predictions: {...},
 *     recommendations: [...],
 *     actionItems: [...]
 *   }
 * }
 */
router.get("/full-analysis/:employeeId", enhancedAiController.getFullAnalysis);

module.exports = router;
