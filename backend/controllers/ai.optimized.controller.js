const aiAttendanceService = require("../services/ai/attendance.ai");
const aiPerformanceService = require("../services/ai/performance.ai");
const aiRecruitmentService = require("../services/ai/recruitment.ai");
const cacheService = require("../services/cache.service");
const queueService = require("../services/queue.service");
const { CircuitBreakerRegistry, RetryHandler } = require("../services/circuitBreaker.service");
const { PerformanceMonitor } = require("../utils/performance");
const logger = require("../utils/logger");
const devopsService = require("../services/devops.service");

const retryHandler = new RetryHandler({ maxRetries: 2, initialDelay: 100 });

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
 * Optimized Attendance Analysis with Caching & Error Recovery
 */
exports.getAttendanceAI = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, useCache = true } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    return await PerformanceMonitor.measure("attendance-analysis", async () => {
      // Build cache key
      const cacheKey = `attendance:${employeeId}:${startDate || "all"}:${endDate || "all"}`;

      // Try cache first if enabled
      if (useCache) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.info("Attendance analysis served from cache", { employeeId });
          return sendResponse(res, 200, true, "Attendance analysis retrieved from cache", cached, {
            source: "cache",
            analysisDate: new Date(),
          });
        }
      }

      // Get circuit breaker
      const breaker = CircuitBreakerRegistry.getBreaker("attendance-ai", {
        failureThreshold: 5,
        timeout: 60000,
      });

      // Execute with circuit breaker and retry
      const attendanceData = await breaker.execute(
        async () => {
          return await retryHandler.execute(
            async () => {
              const start = startDate ? new Date(startDate) : null;
              const end = endDate ? new Date(endDate) : null;
              const startTime = Date.now();
              try {
                const result = await aiAttendanceService.analyzeAttendance(employeeId, start, end);
                const latency = Date.now() - startTime;
                devopsService.recordAiMetrics(latency, true);
                return result;
              } catch (err) {
                const latency = Date.now() - startTime;
                devopsService.recordAiMetrics(latency, false, err);
                throw err;
              }
            },
            "attendance-analysis"
          );
        },
        async () => {
          // Fallback: return cached data if available
          logger.warn("Using fallback for attendance analysis");
          devopsService.recordAiMetrics(0, false, new Error("Circuit breaker fallback triggered"));
          return {
            metrics: { totalDays: 0, presentCount: 0 },
            attendanceScore: 0,
            recommendation: "Service temporarily unavailable. Please retry.",
          };
        }
      );

      // Cache the result
      await cacheService.set(cacheKey, attendanceData, 600); // 10 minutes TTL

      return sendResponse(res, 200, true, "Attendance analysis completed successfully", attendanceData, {
        source: "computed",
        analysisDate: new Date(),
      });
    });
  } catch (error) {
    logger.error("Attendance analysis error", { error: error.message });
    return sendResponse(res, 500, false, error.message || "Failed to analyze attendance");
  }
};

/**
 * Optimized Performance Analysis with Caching
 */
exports.getPerformanceAI = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, useCache = true } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    return await PerformanceMonitor.measure("performance-analysis", async () => {
      const cacheKey = `performance:${employeeId}:${startDate || "all"}:${endDate || "all"}`;

      if (useCache) {
        const cached = await cacheService.get(cacheKey);
        if (cached) {
          logger.info("Performance analysis served from cache", { employeeId });
          return sendResponse(res, 200, true, "Performance analysis retrieved from cache", cached, {
            source: "cache",
            analysisDate: new Date(),
          });
        }
      }

      const breaker = CircuitBreakerRegistry.getBreaker("performance-ai", {
        failureThreshold: 5,
        timeout: 60000,
      });

      const performanceData = await breaker.execute(
        async () => {
          return await retryHandler.execute(
            async () => {
              const start = startDate ? new Date(startDate) : null;
              const end = endDate ? new Date(endDate) : null;
              const startTime = Date.now();
              try {
                const result = await aiPerformanceService.analyzePerformance(employeeId, start, end);
                const latency = Date.now() - startTime;
                devopsService.recordAiMetrics(latency, true);
                return result;
              } catch (err) {
                const latency = Date.now() - startTime;
                devopsService.recordAiMetrics(latency, false, err);
                throw err;
              }
            },
            "performance-analysis"
          );
        },
        async () => {
          logger.warn("Using fallback for performance analysis");
          devopsService.recordAiMetrics(0, false, new Error("Circuit breaker fallback triggered"));
          return {
            performanceScore: 0,
            performanceStatus: "Service temporarily unavailable",
            recommendation: "Please retry.",
          };
        }
      );

      await cacheService.set(cacheKey, performanceData, 600);

      return sendResponse(res, 200, true, "Performance analysis completed successfully", performanceData, {
        source: "computed",
        analysisDate: new Date(),
      });
    });
  } catch (error) {
    logger.error("Performance analysis error", { error: error.message });
    return sendResponse(res, 500, false, error.message || "Failed to analyze performance");
  }
};

/**
 * Background Analytics Processing (Queue-based)
 */
exports.queueAnalyticsJob = async (req, res) => {
  try {
    const { employeeId, analysisType = "comprehensive" } = req.body;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    if (!queueService.isEnabled()) {
      return sendResponse(res, 503, false, "Queue service unavailable");
    }

    // Add to queue for background processing
    const job = await queueService.addJob("analytics", "analyze", {
      employeeId,
      analysisType,
      requestedAt: new Date(),
    });

    if (!job) {
      return sendResponse(res, 503, false, "Queue service unavailable");
    }

    logger.info("Analytics job queued", { employeeId, jobId: job.id });

    return sendResponse(res, 202, true, "Analytics job queued for processing", {
      jobId: job.id,
      status: "queued",
    });
  } catch (error) {
    logger.error("Failed to queue analytics job", { error: error.message });
    return sendResponse(res, 500, false, error.message || "Failed to queue job");
  }
};

/**
 * Get System Health & Performance Metrics
 */
exports.getSystemHealth = async (req, res) => {
  try {
    const cacheStats = await cacheService.getStats();
    const performanceMetrics = PerformanceMonitor.getPerformanceReport();
    const circuitBreakerStatus = CircuitBreakerRegistry.getAllStatus();

    return sendResponse(res, 200, true, "System health retrieved", {
      cache: cacheStats,
      performance: performanceMetrics,
      circuitBreakers: circuitBreakerStatus,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to get system health", { error: error.message });
    return sendResponse(res, 500, false, error.message || "Failed to get system health");
  }
};

/**
 * Clear Cache (Admin only)
 */
exports.clearCache = async (req, res) => {
  try {
    const result = await cacheService.flush();
    logger.info("Cache cleared");
    return sendResponse(res, 200, result, result ? "Cache cleared successfully" : "Cache is not available");
  } catch (error) {
    logger.error("Failed to clear cache", { error: error.message });
    return sendResponse(res, 500, false, error.message || "Failed to clear cache");
  }
};

/**
 * Get Job Status
 */
exports.getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return sendResponse(res, 400, false, "jobId is required");
    }

    const queue = queueService.getQueue("analytics");
    if (!queue) {
      return sendResponse(res, 503, false, "Queue service unavailable");
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return sendResponse(res, 404, false, "Job not found");
    }

    const state = await job.getState();
    const progress = job.progress();

    return sendResponse(res, 200, true, "Job status retrieved", {
      jobId,
      state,
      progress,
      data: job.data,
    });
  } catch (error) {
    logger.error("Failed to get job status", { error: error.message });
    return sendResponse(res, 500, false, error.message || "Failed to get job status");
  }
};
