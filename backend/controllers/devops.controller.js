const devopsService = require("../services/devops.service");
const queueService = require("../services/queue.service");
const mongoose = require("mongoose");
const axios = require("axios");
const performanceMonitor = require("../services/performanceMonitor.service");
const queryOptimizer = require("../services/queryOptimizer.service");
const cacheOptimizer = require("../services/cacheOptimizer.service");
const aiOptimizer = require("../services/aiOptimizer.service");
const PerformanceTestSuite = require("../tests/performance.test");
const logger = require("../utils/logger");

/**
 * DevOps Controller
 * Handles system health, metrics, logs, and performance optimizations
 */
class DevOpsController {
  /**
   * Get comprehensive system metrics
   */
  async getMetrics(req, res) {
    try {
      const metrics = await devopsService.getAllMetrics();
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch metrics",
        error: error.message
      });
    }
  }

  /**
   * Get system health status
   */
  async getHealth(req, res) {
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };

    let aiServiceStatus = "unknown";
    let aiServiceDetails = {};
    try {
      const aiUrl = process.env.AI_SERVICE_URL || "http://localhost:8001";
      const startTime = Date.now();
      const response = await axios.get(`${aiUrl}/health`, { timeout: 2000 });
      const latency = Date.now() - startTime;
      
      aiServiceStatus = response.data.status === "ok" ? "healthy" : "degraded";
      aiServiceDetails = {
        latency: `${latency}ms`,
        version: response.data.version || "unknown",
        resources: response.data.resources || {}
      };
    } catch (error) {
      aiServiceStatus = "unreachable";
      aiServiceDetails = { error: error.message };
    }

    const health = {
      status: (dbState === 1 && aiServiceStatus === "healthy") ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbStatus[dbState],
          latency: "unknown"
        },
        aiService: {
          status: aiServiceStatus,
          ...aiServiceDetails
        },
        queue: {
          status: queueService.isEnabled() ? "active" : "degraded",
          reason: queueService.isEnabled() ? undefined : (queueService.disableReason || "Redis unavailable")
        }
      }
    };

    // Monitor state for recovery notifications
    devopsService.monitorState(health.status);

    res.status(health.status === "healthy" ? 200 : 207).json({
      success: true,
      data: health
    });
  }

  /**
   * Get recent system error logs
   */
  async getLogs(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const logs = devopsService.getRecentLogs(limit);
      res.status(200).json({
        success: true,
        count: logs.length,
        data: logs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch logs",
        error: error.message
      });
    }
  }

  /**
   * Inject simulation overrides or trigger alerts
   */
  async simulate(req, res) {
    try {
      const { type, action, value } = req.body;
      
      if (action === "trigger_alert") {
        devopsService.triggerAlert(type || "SIMULATED_ALERT", value || "This is a simulated system event.");
        return res.status(200).json({
          success: true,
          message: `Alert of type [${type || "SIMULATED_ALERT"}] triggered successfully.`
        });
      }

      if (action === "set_overrides") {
        devopsService.overrides = value || null;
        return res.status(200).json({
          success: true,
          message: devopsService.overrides 
            ? "Simulation overrides injected successfully." 
            : "Simulation overrides cleared."
        });
      }

      res.status(400).json({
        success: false,
        message: "Invalid action. Use 'trigger_alert' or 'set_overrides'."
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Simulation command failed",
        error: error.message
      });
    }
  }

  /**
   * Get real-time performance metrics report
   */
  async getPerformanceMetrics(req, res) {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow) : 3600000;
      const report = performanceMonitor.getDetailedReport(timeWindow);
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch performance metrics",
        error: error.message
      });
    }
  }

  /**
   * Get database query optimizations recommendations
   */
  async getQueryOptimizations(req, res) {
    try {
      const report = queryOptimizer.getOptimizationReport();
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch query optimizations",
        error: error.message
      });
    }
  }

  /**
   * Get cache optimizations recommendations
   */
  async getCacheOptimizations(req, res) {
    try {
      const report = cacheOptimizer.getOptimizationReport();
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch cache optimizations",
        error: error.message
      });
    }
  }

  /**
   * Get AI optimizations recommendations
   */
  async getAiOptimizations(req, res) {
    try {
      const report = aiOptimizer.getOptimizationReport();
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch AI optimizations",
        error: error.message
      });
    }
  }

  /**
   * Get system performance health status and score
   */
  async getPerformanceHealth(req, res) {
    try {
      const health = performanceMonitor.getHealthStatus();
      res.status(200).json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch performance health status",
        error: error.message
      });
    }
  }

  /**
   * Get comprehensive system analysis and combined recommendations
   */
  async getSystemAnalysis(req, res) {
    try {
      const timeWindow = req.query.timeWindow ? parseInt(req.query.timeWindow) : 3600000;
      const performance = performanceMonitor.getDetailedReport(timeWindow);
      const queries = queryOptimizer.getOptimizationReport();
      const cache = cacheOptimizer.getOptimizationReport();
      const ai = aiOptimizer.getOptimizationReport();
      const health = performanceMonitor.getHealthStatus();

      res.status(200).json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          health,
          performance,
          optimizations: {
            queries,
            cache,
            ai
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to generate comprehensive system analysis",
        error: error.message
      });
    }
  }

  /**
   * Run performance tests suite
   */
  async runPerformanceTests(req, res) {
    try {
      const port = process.env.PORT || 5000;
      const baseUrl = `http://localhost:${port}`;
      const suite = new PerformanceTestSuite(baseUrl);
      
      const quick = req.query.quick === "true";
      logger.info(`Starting manual performance test execution (quick mode: ${quick})`);

      if (quick) {
        // Run a fast validation subset of the tests (takes ~5-10 seconds instead of 1.5 minutes)
        await suite.testConcurrentRequests("/api/health", 10);
        await suite.testSustainedLoad("/api/health", 2000, 5);
        await suite.testSpikeLoad("/api/health", 2, 10, 2000);
        await suite.testMemoryStability(2000);
        await suite.testErrorRecovery("/api/invalid-endpoint-test-quick", 3);
        
        const report = suite.getReport();
        res.status(200).json({
          success: true,
          message: "Quick performance tests executed successfully",
          data: report
        });
      } else {
        // Run full test suite in background or synchronously depending on client preference
        // Since full suite takes ~85s, running synchronously might timeout some HTTP clients.
        // We will run it and return the report.
        const report = await suite.runAllTests();
        res.status(200).json({
          success: true,
          message: "Complete performance tests executed successfully",
          data: report
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to run performance tests",
        error: error.message
      });
    }
  }
}

module.exports = new DevOpsController();
