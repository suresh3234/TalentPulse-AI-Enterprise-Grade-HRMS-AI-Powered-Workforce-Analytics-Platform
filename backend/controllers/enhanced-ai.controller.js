/**
 * Enhanced AI Controller
 * Handles AI endpoints for insights, anomalies, recommendations, live-analytics, and workflow-monitoring
 */

const { detectAnomalies, predictAttendanceIssues } = require("../services/ai/anomaly-detection.ai");
const { getActivityInsights } = require("../services/ai/activity-insights.ai");
const { generateEnhancedRecommendations } = require("../services/ai/enhanced-recommendation.ai");
const liveAnalyticsService = require("../services/ai/live-analytics.service");
const realtimeInsightsService = require("../services/ai/realtime-insights.service");
const workflowService = require("../services/ai/workflow.service");
const WorkflowRun = require("../models/workflowRun.model");
const queueService = require("../services/queue.service");
const logger = require("../utils/logger");
const devopsService = require("../services/devops.service");

/**
 * Standardized response format
 */
const sendResponse = (res, statusCode, success, message, data = null, metadata = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
  };
  if (data) response.data = data;
  if (metadata) response.metadata = metadata;
  return res.status(statusCode).json(response);
};

/**
 * Get activity insights for employee
 * GET /api/ai/activity-insights/:employeeId?days=30
 */
exports.getActivityInsights = async (req, res) => {
  const startTime = Date.now();
  try {
    const { employeeId } = req.params;
    const { days = 30 } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    logger.info("Fetching activity insights", { employeeId, days });

    const insights = await getActivityInsights(employeeId, parseInt(days));
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, insights.success);

    if (!insights.success) {
      return sendResponse(res, 404, false, insights.message || "Failed to generate insights");
    }

    return sendResponse(res, 200, true, "Activity insights generated successfully", insights, {
      generatedAt: new Date().toISOString(),
      version: "2.0",
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, false, error);
    logger.error("Activity insights error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to generate activity insights");
  }
};

/**
 * Get anomalies detection for employee
 * GET /api/ai/anomalies/:employeeId?lookbackDays=90
 */
exports.getAnomalies = async (req, res) => {
  const startTime = Date.now();
  try {
    const { employeeId } = req.params;
    const { lookbackDays = 90 } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    logger.info("Detecting attendance anomalies", { employeeId, lookbackDays });

    const anomalies = await detectAnomalies(employeeId, parseInt(lookbackDays));
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, anomalies.success);

    if (!anomalies.success) {
      return sendResponse(res, 404, false, anomalies.message || "Failed to detect anomalies");
    }

    return sendResponse(res, 200, true, "Anomalies detected successfully", anomalies, {
      detectionDate: new Date().toISOString(),
      version: "2.0",
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, false, error);
    logger.error("Anomaly detection error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to detect anomalies");
  }
};

/**
 * Predict attendance issues
 * GET /api/ai/predict-attendance/:employeeId
 */
exports.predictAttendanceIssues = async (req, res) => {
  const startTime = Date.now();
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    logger.info("Predicting attendance issues", { employeeId });

    const predictions = await predictAttendanceIssues(employeeId);
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, true);

    return sendResponse(res, 200, true, "Attendance predictions generated", predictions, {
      predictedAt: new Date().toISOString(),
      version: "2.0",
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, false, error);
    logger.error("Attendance prediction error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to predict attendance issues");
  }
};

/**
 * Get comprehensive employee summary
 * GET /api/ai/employee-summary/:employeeId?days=30
 */
exports.getEmployeeSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { days = 30 } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    logger.info("Generating employee summary", { employeeId, days });

    // Get activity insights
    const insights = await getActivityInsights(employeeId, parseInt(days));

    if (!insights.success) {
      return sendResponse(res, 404, false, "Failed to generate employee summary");
    }

    // Get anomalies
    const anomalies = await detectAnomalies(employeeId, 90);

    // Get predictions
    const predictions = await predictAttendanceIssues(employeeId);

    const summary = {
      employee: insights.employee,
      period: insights.period,
      metrics: insights.metrics,
      insights: insights.insights,
      trend: insights.trend,
      recommendations: insights.recommendations,
      anomalies: anomalies.success
        ? {
            detected: anomalies.anomalies,
            summary: anomalies.summary,
          }
        : null,
      predictions: predictions,
      generatedAt: new Date().toISOString(),
    };

    return sendResponse(res, 200, true, "Employee summary generated successfully", summary, {
      version: "2.0",
      includesAnomalies: anomalies.success,
      includedPredictions: true,
    });
  } catch (error) {
    logger.error("Employee summary error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to generate employee summary");
  }
};

/**
 * Generate enhanced recommendations
 * GET /api/ai/recommendation-engine/:employeeId?scope=all
 * scope: all, performance, attendance, development
 */
exports.generateRecommendations = async (req, res) => {
  const startTime = Date.now();
  try {
    const { employeeId } = req.params;
    const { scope = "all" } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    const validScopes = ["all", "performance", "attendance", "development"];
    if (!validScopes.includes(scope)) {
      return sendResponse(res, 400, false, `Invalid scope. Must be one of: ${validScopes.join(", ")}`);
    }

    logger.info("Generating enhanced recommendations", { employeeId, scope });

    const recommendations = await generateEnhancedRecommendations(employeeId, scope);
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, recommendations.success);

    if (!recommendations.success) {
      return sendResponse(res, 404, false, recommendations.error || "Failed to generate recommendations");
    }

    return sendResponse(res, 200, true, "Recommendations generated successfully", recommendations, {
      generatedAt: new Date().toISOString(),
      scope,
      version: "2.0",
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, false, error);
    logger.error("Recommendation generation error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to generate recommendations");
  }
};

/**
 * Get all AI insights combined (dashboard view)
 * GET /api/ai/full-analysis/:employeeId
 */
exports.getFullAnalysis = async (req, res) => {
  const startTime = Date.now();
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    logger.info("Running full AI analysis", { employeeId });

    // Run all analyses in parallel
    const [insights, anomalies, predictions, recommendations] = await Promise.all([
      getActivityInsights(employeeId, 30),
      detectAnomalies(employeeId, 90),
      predictAttendanceIssues(employeeId),
      generateEnhancedRecommendations(employeeId, "all"),
    ]);

    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, true);

    const analysis = {
      employee: insights.employee,
      executiveSummary: {
        engagementScore: insights.metrics?.engagement?.score,
        productivityScore: insights.metrics?.productivity?.score,
        anomalies: anomalies.summary?.anomaliesDetected || 0,
        riskLevel: anomalies.summary?.riskLevel || "LOW",
      },
      activityInsights: insights.success ? insights : null,
      anomalies: anomalies.success ? anomalies : null,
      predictions: predictions,
      recommendations: recommendations.success ? recommendations.recommendations : [],
      actionItems: generateActionItems(insights, anomalies, recommendations),
      generatedAt: new Date().toISOString(),
    };

    return sendResponse(res, 200, true, "Full AI analysis completed", analysis, {
      version: "2.0",
      analysisComponents: {
        activityInsights: !!insights.success,
        anomalyDetection: !!anomalies.success,
        predictions: !!predictions.predictions?.length,
        recommendations: !!recommendations.success,
      },
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    devopsService.recordAiMetrics(latency, false, error);
    logger.error("Full analysis error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to complete full analysis");
  }
};

/**
 * NEW: Get aggregated live business analytics
 * GET /api/ai/live-analytics
 */
exports.getLiveAnalytics = async (req, res) => {
  try {
    const forceRefresh = req.query.forceRefresh === "true";
    const analytics = await liveAnalyticsService.getLiveAnalytics(forceRefresh);
    return sendResponse(res, 200, true, "Live corporate analytics aggregated successfully", analytics);
  } catch (error) {
    logger.error("Live Analytics Controller error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to retrieve live analytics");
  }
};

/**
 * NEW: Monitor ongoing and historic workflows and fallback queues
 * GET /api/ai/workflow-monitor
 */
exports.getWorkflowMonitor = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { type, status } = req.query;

    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    // Fetch historic and active runs persistently
    const runs = await WorkflowRun.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Fetch active queue statuses
    let redisQueueStats = null;
    if (queueService.isEnabled()) {
      redisQueueStats = await queueService.getQueueStats("ai-workflows");
    }

    const monitorData = {
      summary: {
        totalTrackedRuns: await WorkflowRun.countDocuments(query),
        activeFallbackQueueCount: workflowService.fallbackQueue.length,
        isFallbackQueueProcessing: workflowService.fallbackProcessing
      },
      queueSystem: {
        redisQueueEnabled: queueService.isEnabled(),
        redisQueueStats,
        localFallbackActiveJobs: workflowService.fallbackQueue.map(item => ({
          type: item.type,
          targetId: item.id,
          attempts: item.attempts,
          workflowId: item.runDoc?.workflowId
        }))
      },
      recentExecutions: runs
    };

    return sendResponse(res, 200, true, "AI workflows monitor state retrieved", monitorData);
  } catch (error) {
    logger.error("Workflow Monitor Controller error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to retrieve workflow monitor data");
  }
};

/**
 * NEW: Generate real-time strategic recommendations and flight-risk alerts
 * GET /api/ai/realtime-insights
 */
exports.getRealtimeInsights = async (req, res) => {
  try {
    const { employeeId } = req.query;
    const insights = await realtimeInsightsService.getRealtimeInsights(employeeId || null);
    return sendResponse(res, 200, true, "Real-time AI corporate insights updated", insights);
  } catch (error) {
    logger.error("Real-time Insights Controller error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to retrieve real-time insights");
  }
};

/**
 * Generate action items from analysis (helper)
 */
const generateActionItems = (insights, anomalies, recommendations) => {
  const items = [];

  // From insights
  if (insights.success && insights.recommendations) {
    items.push(...insights.recommendations.slice(0, 3).map(r => ({
      source: "INSIGHTS",
      action: r.action,
      priority: r.priority,
      description: r.description,
    })));
  }

  // From anomalies
  if (anomalies.success && anomalies.anomalies) {
    items.push(
      ...anomalies.anomalies
        .slice(0, 2)
        .filter(a => a.severity === "HIGH")
        .map(a => ({
          source: "ANOMALY",
          action: a.type,
          priority: "HIGH",
          description: a.recommendation,
        }))
    );
  }

  // From recommendations
  if (recommendations.success && recommendations.recommendations) {
    items.push(
      ...recommendations.recommendations
        .slice(0, 3)
        .filter(r => r.priority !== "LOW")
        .map(r => ({
          source: "RECOMMENDATION",
          action: r.title,
          priority: r.priority,
          description: r.description,
          timeline: r.timeline,
        }))
    );
  }

  return items.slice(0, 10); // Top 10 action items
};
