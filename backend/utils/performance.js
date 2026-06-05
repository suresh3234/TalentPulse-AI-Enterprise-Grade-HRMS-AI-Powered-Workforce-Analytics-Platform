const logger = require("../utils/logger");

/**
 * Performance Monitoring & Load Testing Utilities
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.thresholds = {
      aiResponseTime: 5000, // 5 seconds
      analyticsProcessing: 10000, // 10 seconds
      dbQuery: 1000, // 1 second
    };
  }

  /**
   * Start timing a request
   */
  startTimer(operationName) {
    const timerId = `${operationName}-${Date.now()}-${Math.random()}`;
    if (!this.metrics[operationName]) {
      this.metrics[operationName] = {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        failures: 0,
        lastError: null,
      };
    }
    return timerId;
  }

  /**
   * End timing and record metric
   */
  endTimer(operationName, timerId, success = true, error = null) {
    // In a real implementation, you'd track the actual time
    // For now, we'll log the operation
    if (!this.metrics[operationName]) {
      this.metrics[operationName] = {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        failures: 0,
        lastError: null,
      };
    }

    this.metrics[operationName].count++;

    if (!success) {
      this.metrics[operationName].failures++;
      this.metrics[operationName].lastError = error;
    }

    logger.debug(`Operation completed`, { operationName, success });
  }

  /**
   * Measure operation with async function
   */
  async measure(operationName, fn) {
    const startTime = Date.now();
    const timerId = this.startTimer(operationName);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      if (!this.metrics[operationName]) {
        this.metrics[operationName] = {
          count: 0,
          totalTime: 0,
          minTime: Infinity,
          maxTime: 0,
          failures: 0,
          averageTime: 0,
        };
      }

      this.metrics[operationName].count++;
      this.metrics[operationName].totalTime += duration;
      this.metrics[operationName].minTime = Math.min(this.metrics[operationName].minTime, duration);
      this.metrics[operationName].maxTime = Math.max(this.metrics[operationName].maxTime, duration);
      this.metrics[operationName].averageTime = Math.round(
        this.metrics[operationName].totalTime / this.metrics[operationName].count
      );

      // Check threshold
      if (duration > this.thresholds[operationName]) {
        logger.warn(`Operation exceeded threshold`, {
          operationName,
          duration,
          threshold: this.thresholds[operationName],
        });
      }

      return result;
    } catch (error) {
      this.endTimer(operationName, timerId, false, error.message);
      throw error;
    }
  }

  /**
   * Get operation metrics
   */
  getMetrics(operationName = null) {
    if (operationName) {
      return this.metrics[operationName] || null;
    }
    return this.metrics;
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = {};
    for (const [operation, metrics] of Object.entries(this.metrics)) {
      report[operation] = {
        ...metrics,
        status: metrics.failures === 0 ? "Healthy" : "Degraded",
        errorRate: metrics.count > 0 ? (metrics.failures / metrics.count) * 100 : 0,
      };
    }
    return report;
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {};
  }

  /**
   * Check if system is under load
   */
  isUnderLoad() {
    const metrics = this.getPerformanceReport();
    const underLoad = Object.values(metrics).some((m) => m.averageTime > this.thresholds[m.operation] * 0.7);
    return underLoad;
  }
}

/**
 * Load Testing Simulation
 */
class LoadTester {
  constructor() {
    this.testResults = {};
  }

  /**
   * Simulate load and measure stability
   */
  async runLoadTest(operationFn, concurrentRequests = 10, duration = 10000) {
    const testId = `test-${Date.now()}`;
    const startTime = Date.now();
    const results = {
      testId,
      concurrentRequests,
      duration,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      errors: [],
      responseTimes: [],
      startTime: new Date(startTime),
      endTime: null,
    };

    try {
      logger.info(`Starting load test`, { testId, concurrentRequests, duration });

      const promises = [];
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        // Create concurrent requests
        for (let i = 0; i < concurrentRequests; i++) {
          const promise = (async () => {
            const reqStartTime = Date.now();
            try {
              await operationFn();
              results.successfulRequests++;
              results.responseTimes.push(Date.now() - reqStartTime);
            } catch (error) {
              results.failedRequests++;
              results.errors.push({
                error: error.message,
                timestamp: new Date(),
              });
            }
            results.totalRequests++;
            requestCount++;
          })();

          promises.push(promise);
        }

        // Wait for batch to complete
        await Promise.allSettled(promises.splice(0, concurrentRequests));

        // Small delay between batches
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      results.endTime = new Date();

      // Calculate statistics
      if (results.responseTimes.length > 0) {
        results.avgResponseTime = Math.round(
          results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length
        );
        results.minResponseTime = Math.min(...results.responseTimes);
        results.maxResponseTime = Math.max(...results.responseTimes);
        results.p95ResponseTime = results.responseTimes.sort((a, b) => a - b)[
          Math.floor(results.responseTimes.length * 0.95)
        ];
      }

      results.successRate = Math.round(
        (results.successfulRequests / results.totalRequests) * 100
      );
      results.throughput = Math.round((results.totalRequests / (duration / 1000)) * 100) / 100;

      logger.info(`Load test completed`, { testId, results });
      this.testResults[testId] = results;

      return results;
    } catch (error) {
      logger.error(`Load test failed`, { testId, error: error.message });
      throw error;
    }
  }

  /**
   * Get test results
   */
  getTestResults(testId = null) {
    if (testId) {
      return this.testResults[testId] || null;
    }
    return this.testResults;
  }
}

module.exports = {
  PerformanceMonitor: new PerformanceMonitor(),
  LoadTester: new LoadTester(),
};
