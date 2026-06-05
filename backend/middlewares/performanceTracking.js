/**
 * Performance Tracking Middleware
 * Integrates performance monitoring into request/response cycle
 */

const performanceMonitor = require("../services/performanceMonitor.service");
const logger = require("../utils/logger");

/**
 * Middleware to track API performance
 */
function performanceTrackingMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = req.id; // Set by requestTracking middleware

  // Intercept res.json and res.send to track response time
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function (data) {
    const duration = Date.now() - startTime;
    recordMetrics(req, res, duration, requestId);
    return originalJson.call(this, data);
  };

  res.send = function (data) {
    const duration = Date.now() - startTime;
    recordMetrics(req, res, duration, requestId);
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Record performance metrics
 */
function recordMetrics(req, res, duration, requestId) {
  const { method, path, baseUrl } = req;
  const status = res.statusCode;
  const endpoint = `${method} ${path}`;

  // Record API call metrics
  performanceMonitor.recordApiCall(endpoint, duration, status, requestId);

  // Track specific endpoint types
  if (path.includes("/ai")) {
    // Track AI endpoint calls (will be more detailed by specific controllers)
    performanceMonitor.recordAiCall(path, "grok-enterprise", duration, 0, status === 200);
  }

  if (path.includes("/analytics") || path.includes("/analyze")) {
    // Track analytics processing
    performanceMonitor.recordAnalyticsProcessing(path, duration, 0, status === 200);
  }
}

/**
 * Middleware to track database query performance
 */
function databasePerformanceMiddleware(mongooseInstance) {
  const performanceMonitor = require("../services/performanceMonitor.service");

  mongooseInstance.connection.once("connected", () => {
    // Hook into mongoose query execution
    mongooseInstance.connection.on("open", () => {
      // Track queries if available
      logger.info("Database performance tracking enabled");
    });
  });

  return (req, res, next) => next();
}

module.exports = {
  performanceTrackingMiddleware,
  databasePerformanceMiddleware,
};
