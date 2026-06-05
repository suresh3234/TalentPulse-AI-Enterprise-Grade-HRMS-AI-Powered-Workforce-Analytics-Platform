/**
 * Performance Testing Suite
 * Tests system stability, load handling, and performance under stress
 */

const axios = require("axios");
const logger = require("../utils/logger");

class PerformanceTestSuite {
  constructor(baseUrl = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.results = {
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
      },
    };
  }

  /**
   * Test 1: Concurrent requests
   */
  async testConcurrentRequests(endpoint = "/api/health", concurrency = 50) {
    const testName = "Concurrent Requests";
    const startTime = Date.now();

    try {
      const promises = Array(concurrency)
        .fill()
        .map(() =>
          axios.get(`${this.baseUrl}${endpoint}`, { timeout: 5000 }).catch((err) => ({
            error: err.message,
          }))
        );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const successful = results.filter((r) => !r.error).length;
      const failed = results.filter((r) => r.error).length;

      const result = {
        name: testName,
        status: failed === 0 ? "PASS" : "WARN",
        duration,
        metrics: {
          concurrency,
          successful,
          failed,
          avgTime: (duration / concurrency).toFixed(2),
          requestsPerSecond: (concurrency / (duration / 1000)).toFixed(2),
        },
      };

      this.addResult(result);
      return result;
    } catch (error) {
      this.addResult({
        name: testName,
        status: "FAIL",
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Test 2: Sustained load test
   */
  async testSustainedLoad(endpoint = "/api/health", duration = 30000, rps = 10) {
    const testName = "Sustained Load Test";
    const startTime = Date.now();
    let requestCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let totalDuration = 0;
    const responseTimes = [];

    try {
      while (Date.now() - startTime < duration) {
        const reqStart = Date.now();
        try {
          await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
          successCount++;
        } catch {
          errorCount++;
        }
        requestCount++;
        totalDuration += Date.now() - reqStart;
        responseTimes.push(Date.now() - reqStart);

        // Rate limiting
        const elapsedTime = Date.now() - startTime;
        const expectedRequests = (elapsedTime / 1000) * rps;
        if (requestCount < expectedRequests) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      responseTimes.sort((a, b) => a - b);
      const result = {
        name: testName,
        status: errorCount === 0 ? "PASS" : "WARN",
        duration: Date.now() - startTime,
        metrics: {
          totalRequests: requestCount,
          successful: successCount,
          failed: errorCount,
          targetRps: rps,
          actualRps: (requestCount / ((Date.now() - startTime) / 1000)).toFixed(2),
          avgResponseTime: (totalDuration / requestCount).toFixed(2),
          p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
          p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
        },
      };

      this.addResult(result);
      return result;
    } catch (error) {
      this.addResult({
        name: testName,
        status: "FAIL",
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Test 3: Spike test (sudden load increase)
   */
  async testSpikeLoad(endpoint = "/api/health", baseRps = 10, peakRps = 100, duration = 10000) {
    const testName = "Spike Load Test";
    const startTime = Date.now();
    let requestCount = 0;
    let errorCount = 0;
    const responseTimes = [];

    try {
      while (Date.now() - startTime < duration) {
        const elapsed = Date.now() - startTime;
        const halfway = duration / 2;
        const currentRps = elapsed < halfway ? baseRps : peakRps;

        const reqStart = Date.now();
        try {
          await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
        } catch {
          errorCount++;
        }
        requestCount++;
        responseTimes.push(Date.now() - reqStart);

        const expectedRequests = (elapsed / 1000) * currentRps;
        if (requestCount < expectedRequests) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      responseTimes.sort((a, b) => a - b);
      const result = {
        name: testName,
        status: errorCount === 0 ? "PASS" : "WARN",
        duration: Date.now() - startTime,
        metrics: {
          totalRequests: requestCount,
          errors: errorCount,
          baseRps,
          peakRps,
          avgResponseTime: (
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          ).toFixed(2),
          p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
        },
      };

      this.addResult(result);
      return result;
    } catch (error) {
      this.addResult({
        name: testName,
        status: "FAIL",
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Test 4: Memory stability
   */
  async testMemoryStability(duration = 60000) {
    const testName = "Memory Stability";

    try {
      const initialMemory = process.memoryUsage();
      const measurements = [initialMemory.heapUsed];

      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, duration / 10));
        measurements.push(process.memoryUsage().heapUsed);
      }

      const avgMemory = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxMemory = Math.max(...measurements);
      const minMemory = Math.min(...measurements);
      const memoryGrowth = maxMemory - minMemory;

      const result = {
        name: testName,
        status: memoryGrowth < 50 * 1024 * 1024 ? "PASS" : "WARN", // 50MB threshold
        duration,
        metrics: {
          initialHeapMB: (initialMemory.heapUsed / (1024 * 1024)).toFixed(2),
          avgHeapMB: (avgMemory / (1024 * 1024)).toFixed(2),
          maxHeapMB: (maxMemory / (1024 * 1024)).toFixed(2),
          minHeapMB: (minMemory / (1024 * 1024)).toFixed(2),
          growthMB: (memoryGrowth / (1024 * 1024)).toFixed(2),
        },
      };

      this.addResult(result);
      return result;
    } catch (error) {
      this.addResult({
        name: testName,
        status: "FAIL",
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Test 5: Error recovery
   */
  async testErrorRecovery(endpoint = "/api/invalid-endpoint", attempts = 10) {
    const testName = "Error Recovery";

    try {
      let recoveredCount = 0;
      const responseTimes = [];

      for (let i = 0; i < attempts; i++) {
        const startTime = Date.now();
        try {
          await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 5000 });
        } catch (error) {
          if (error.response?.status) {
            recoveredCount++;
          }
        }
        responseTimes.push(Date.now() - startTime);
      }

      const result = {
        name: testName,
        status: recoveredCount === attempts ? "PASS" : "WARN",
        metrics: {
          attempts,
          recoveredCount,
          recoveryRate: ((recoveredCount / attempts) * 100).toFixed(2),
          avgResponseTime: (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(
            2
          ),
        },
      };

      this.addResult(result);
      return result;
    } catch (error) {
      this.addResult({
        name: testName,
        status: "FAIL",
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Add result to results array
   */
  addResult(result) {
    this.results.tests.push(result);
    this.results.summary.total++;

    if (result.status === "PASS") {
      this.results.summary.passed++;
    } else if (result.status === "FAIL") {
      this.results.summary.failed++;
    } else if (result.status === "WARN") {
      this.results.summary.skipped++;
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    logger.info("Starting performance test suite...");

    // Test 1: Concurrent
    await this.testConcurrentRequests("/api/health", 50);

    // Test 2: Sustained
    await this.testSustainedLoad("/api/health", 30000, 10);

    // Test 3: Spike
    await this.testSpikeLoad("/api/health", 5, 50, 15000);

    // Test 4: Memory
    await this.testMemoryStability(30000);

    // Test 5: Error recovery
    await this.testErrorRecovery("/api/invalid", 10);

    logger.info("Performance test suite completed");
    return this.getReport();
  }

  /**
   * Get report
   */
  getReport() {
    const passRate =
      this.results.summary.total > 0
        ? (((this.results.summary.passed + this.results.summary.skipped) /
            this.results.summary.total) *
            100).toFixed(2)
        : 0;

    return {
      timestamp: new Date().toISOString(),
      summary: {
        ...this.results.summary,
        passRate: `${passRate}%`,
        status:
          this.results.summary.failed === 0 ? "✅ HEALTHY" : "⚠️ ISSUES_DETECTED",
      },
      tests: this.results.tests,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];

    const concurrentTest = this.results.tests.find((t) => t.name === "Concurrent Requests");
    if (concurrentTest && concurrentTest.metrics?.failed > 5) {
      recommendations.push("High failure rate under concurrent load. Check resource limits.");
    }

    const sustainedTest = this.results.tests.find((t) => t.name === "Sustained Load Test");
    if (sustainedTest && parseFloat(sustainedTest.metrics?.avgResponseTime) > 1000) {
      recommendations.push(
        "Average response time under sustained load is high. Optimize queries or add caching."
      );
    }

    const memoryTest = this.results.tests.find((t) => t.name === "Memory Stability");
    if (memoryTest && parseFloat(memoryTest.metrics?.growthMB) > 50) {
      recommendations.push("Significant memory growth detected. Check for memory leaks.");
    }

    if (recommendations.length === 0) {
      recommendations.push("System performing well under load. Continue monitoring.");
    }

    return recommendations;
  }
}

module.exports = PerformanceTestSuite;
