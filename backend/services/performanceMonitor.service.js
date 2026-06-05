/**
 * Performance Monitoring Service
 * Tracks AI APIs, analytics, database performance, and system metrics
 */

const logger = require("../utils/logger");
const mongoose = require("mongoose");

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: [],
      aiCalls: [],
      analyticsProcessing: [],
      databaseQueries: [],
      cacheHits: 0,
      cacheMisses: 0,
      errors: [],
    };
    
    this.thresholds = {
      slowQueryMs: 1000,      // Alert if query > 1s
      slowApiMs: 2000,        // Alert if API > 2s
      slowAnalyticsMs: 5000,  // Alert if analytics > 5s
      slowAiMs: 3000,         // Alert if AI response > 3s
    };

    this.aggregatedMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      cacheHitRate: 0,
      dbQueryCount: 0,
      aiCallCount: 0,
    };
  }

  /**
   * Record API call metrics
   */
  recordApiCall(endpoint, duration, status, requestId) {
    this.metrics.requests.push({
      endpoint,
      duration,
      status,
      requestId,
      timestamp: new Date(),
    });

    // Alert on slow responses
    if (duration > this.thresholds.slowApiMs && status === 200) {
      logger.warn(`SLOW_API_RESPONSE: ${endpoint} took ${duration}ms`, {
        requestId,
        endpoint,
        duration,
      });
    }

    this.updateAggregatedMetrics();
  }

  /**
   * Record AI API calls
   */
  recordAiCall(aiEndpoint, model, duration, tokensUsed, success = true) {
    this.metrics.aiCalls.push({
      endpoint: aiEndpoint,
      model,
      duration,
      tokensUsed,
      success,
      timestamp: new Date(),
    });

    if (duration > this.thresholds.slowAiMs && success) {
      logger.warn(`SLOW_AI_RESPONSE: ${aiEndpoint} (${model}) took ${duration}ms`, {
        endpoint: aiEndpoint,
        model,
        duration,
        tokensUsed,
      });
    }
  }

  /**
   * Record analytics processing
   */
  recordAnalyticsProcessing(analysisType, duration, recordsProcessed, success = true) {
    this.metrics.analyticsProcessing.push({
      analysisType,
      duration,
      recordsProcessed,
      recordsPerSecond: duration > 0 ? (recordsProcessed / (duration / 1000)).toFixed(2) : 0,
      success,
      timestamp: new Date(),
    });

    if (duration > this.thresholds.slowAnalyticsMs && success) {
      logger.warn(
        `SLOW_ANALYTICS: ${analysisType} processed ${recordsProcessed} records in ${duration}ms`,
        {
          analysisType,
          duration,
          recordsProcessed,
        }
      );
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(collection, operation, duration, success = true, rowsAffected = 0) {
    this.metrics.databaseQueries.push({
      collection,
      operation,
      duration,
      rowsAffected,
      success,
      timestamp: new Date(),
    });

    if (duration > this.thresholds.slowQueryMs && success) {
      logger.warn(
        `SLOW_QUERY: ${collection}.${operation} took ${duration}ms (${rowsAffected} rows)`,
        {
          collection,
          operation,
          duration,
          rowsAffected,
        }
      );
    }
  }

  /**
   * Record cache hit/miss
   */
  recordCacheAccess(key, hit = true) {
    if (hit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
  }

  /**
   * Record errors
   */
  recordError(errorType, message, context = {}) {
    this.metrics.errors.push({
      type: errorType,
      message,
      context,
      timestamp: new Date(),
    });

    if (this.metrics.errors.length > 1000) {
      this.metrics.errors = this.metrics.errors.slice(-500);
    }
  }

  /**
   * Update aggregated metrics
   */
  updateAggregatedMetrics() {
    const requests = this.metrics.requests;
    const aiCalls = this.metrics.aiCalls;
    const queries = this.metrics.databaseQueries;

    // Calculate request metrics
    if (requests.length > 0) {
      const durations = requests.map((r) => r.duration).sort((a, b) => a - b);
      this.aggregatedMetrics.totalRequests = requests.length;
      this.aggregatedMetrics.averageResponseTime = (
        durations.reduce((a, b) => a + b, 0) / durations.length
      ).toFixed(2);
      this.aggregatedMetrics.p95ResponseTime = durations[Math.floor(durations.length * 0.95)];
      this.aggregatedMetrics.p99ResponseTime = durations[Math.floor(durations.length * 0.99)];
    }

    // Calculate cache hit rate
    const totalCacheAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (totalCacheAccess > 0) {
      this.aggregatedMetrics.cacheHitRate = (
        ((this.metrics.cacheHits / totalCacheAccess) * 100).toFixed(2) + "%"
      );
    }

    // Calculate DB metrics
    this.aggregatedMetrics.dbQueryCount = queries.length;

    // Calculate AI metrics
    const successfulAiCalls = aiCalls.filter((a) => a.success);
    this.aggregatedMetrics.aiCallCount = aiCalls.length;
    this.aggregatedMetrics.aiSuccessRate =
      aiCalls.length > 0
        ? (((successfulAiCalls.length / aiCalls.length) * 100).toFixed(2) + "%")
        : "N/A";

    // Total errors
    this.aggregatedMetrics.totalErrors = this.metrics.errors.length;
  }

  /**
   * Get performance health status
   */
  getHealthStatus() {
    const avgResponseTime = parseFloat(this.aggregatedMetrics.averageResponseTime) || 0;
    const cacheHitRate = parseFloat(this.aggregatedMetrics.cacheHitRate) || 0;
    const errorCount = this.metrics.errors.length;

    let health = "HEALTHY";
    let score = 100;

    if (avgResponseTime > 2000) {
      health = "WARNING";
      score -= 25;
    }
    if (cacheHitRate < 50) {
      health = "WARNING";
      score -= 15;
    }
    if (errorCount > 10) {
      health = "CRITICAL";
      score -= 40;
    }

    return {
      status: health,
      score: Math.max(0, score),
      recommendations: this.getRecommendations(avgResponseTime, cacheHitRate, errorCount),
    };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(avgResponseTime, cacheHitRate, errorCount) {
    const recommendations = [];

    if (avgResponseTime > 2000) {
      recommendations.push(
        "Response time is high. Consider enabling caching or optimizing database queries."
      );
    }

    if (cacheHitRate < 50) {
      recommendations.push("Cache hit rate is low. Review caching strategy and TTLs.");
    }

    if (errorCount > 10) {
      recommendations.push("High error count detected. Check error logs for patterns.");
    }

    if (recommendations.length === 0) {
      recommendations.push("System performing normally. No immediate optimizations needed.");
    }

    return recommendations;
  }

  /**
   * Get detailed performance report
   */
  getDetailedReport(timeWindowMs = 3600000) {
    const cutoffTime = new Date(Date.now() - timeWindowMs);

    const recentRequests = this.metrics.requests.filter((r) => r.timestamp > cutoffTime);
    const recentAiCalls = this.metrics.aiCalls.filter((a) => a.timestamp > cutoffTime);
    const recentQueries = this.metrics.databaseQueries.filter((q) => q.timestamp > cutoffTime);
    const recentAnalytics = this.metrics.analyticsProcessing.filter(
      (a) => a.timestamp > cutoffTime
    );

    return {
      timeWindow: `Last ${timeWindowMs / 60000} minutes`,
      aggregated: this.aggregatedMetrics,
      health: this.getHealthStatus(),
      requests: {
        total: recentRequests.length,
        byStatus: this.groupByProperty(recentRequests, "status"),
        byEndpoint: this.groupByProperty(recentRequests, "endpoint"),
        slowestRequests: recentRequests
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10),
      },
      aiCalls: {
        total: recentAiCalls.length,
        successful: recentAiCalls.filter((a) => a.success).length,
        byModel: this.groupByProperty(recentAiCalls, "model"),
        averageResponseTime: this.getAverageMetric(recentAiCalls, "duration"),
        totalTokensUsed: recentAiCalls.reduce((sum, a) => sum + (a.tokensUsed || 0), 0),
      },
      database: {
        totalQueries: recentQueries.length,
        byCollection: this.groupByProperty(recentQueries, "collection"),
        byOperation: this.groupByProperty(recentQueries, "operation"),
        slowestQueries: recentQueries
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 10),
        averageQueryTime: this.getAverageMetric(recentQueries, "duration"),
      },
      analytics: {
        totalProcessing: recentAnalytics.length,
        byType: this.groupByProperty(recentAnalytics, "analysisType"),
        totalRecordsProcessed: recentAnalytics.reduce((sum, a) => sum + a.recordsProcessed, 0),
        averageProcessingTime: this.getAverageMetric(recentAnalytics, "duration"),
      },
      cache: {
        hitRate: this.aggregatedMetrics.cacheHitRate,
        totalHits: this.metrics.cacheHits,
        totalMisses: this.metrics.cacheMisses,
      },
      errors: {
        total: this.metrics.errors.length,
        recentErrors: this.metrics.errors.slice(-20),
      },
    };
  }

  /**
   * Helper: Group items by property
   */
  groupByProperty(items, property) {
    return items.reduce((acc, item) => {
      const key = item[property];
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {});
  }

  /**
   * Helper: Calculate average metric
   */
  getAverageMetric(items, property) {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item[property] || 0), 0);
    return (sum / items.length).toFixed(2);
  }

  /**
   * Reset metrics (cleanup old data)
   */
  cleanup(keepLastNItems = 1000) {
    if (this.metrics.requests.length > keepLastNItems) {
      this.metrics.requests = this.metrics.requests.slice(-keepLastNItems);
    }
    if (this.metrics.aiCalls.length > keepLastNItems) {
      this.metrics.aiCalls = this.metrics.aiCalls.slice(-keepLastNItems);
    }
    if (this.metrics.databaseQueries.length > keepLastNItems) {
      this.metrics.databaseQueries = this.metrics.databaseQueries.slice(-keepLastNItems);
    }
    if (this.metrics.analyticsProcessing.length > keepLastNItems) {
      this.metrics.analyticsProcessing = this.metrics.analyticsProcessing.slice(-keepLastNItems);
    }
  }
}

module.exports = new PerformanceMonitor();
