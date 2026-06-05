const os = require("os");
const fs = require("fs");
const path = require("path");
const queueService = require("./queue.service");
const logger = require("../utils/logger");

class DevOpsService {
  constructor() {
    this.aiMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      latencies: [], // Last 100 latencies
      lastError: null,
    };
    this.thresholds = {
      aiFailureRate: 0.1, // 10%
      aiLatencyP95: 3000, // 3s
      memoryUsage: 0.85, // 85%
      failedLogins: 5,   // 5 failed logins
    };
    this.securityMetrics = {
      failedLogins: 0,
      unauthorizedAccess: 0,
      rbacViolations: 0,
      lastEvent: null
    };
    this.startTime = Date.now();
    this.alerts = [];
    this.previousState = "healthy";
    this.overrides = null;
  }

  /**
   * Record AI request metrics
   */
  recordAiMetrics(latencyMs, success = true, error = null) {
    this.aiMetrics.totalRequests++;
    if (success) {
      this.aiMetrics.successfulRequests++;
    } else {
      this.aiMetrics.failedRequests++;
      this.aiMetrics.lastError = {
        message: error?.message || "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }

    this.aiMetrics.latencies.push(latencyMs);
    if (this.aiMetrics.latencies.length > 100) {
      this.aiMetrics.latencies.shift();
    }

    this.checkAlertThresholds();
  }

  /**
   * Check metrics against defined thresholds
   */
  checkAlertThresholds() {
    const aiMetrics = this.getAiMetrics();
    const failureRate = (this.aiMetrics.failedRequests / this.aiMetrics.totalRequests) || 0;

    if (this.aiMetrics.totalRequests > 10 && failureRate > this.thresholds.aiFailureRate) {
      this.triggerAlert("AI_HIGH_FAILURE_RATE", `AI failure rate is ${Math.round(failureRate * 100)}%, exceeding threshold of ${this.thresholds.aiFailureRate * 100}%`);
    }

    if (aiMetrics.averageLatencyMs > this.thresholds.aiLatencyP95) {
      this.triggerAlert("AI_HIGH_LATENCY", `AI average latency is ${aiMetrics.averageLatencyMs}ms, exceeding threshold of ${this.thresholds.aiLatencyP95}ms`);
    }
  }

  /**
   * Trigger a system alert
   */
  triggerAlert(type, message) {
    const alert = {
      id: Date.now().toString(36),
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: "warning"
    };

    // Prevent duplicate active alerts for the same type within short window
    const recentDuplicate = this.alerts.find(a => a.type === type && (Date.now() - new Date(a.timestamp).getTime()) < 300000);
    if (recentDuplicate) return;

    this.alerts.push(alert);
    if (this.alerts.length > 50) this.alerts.shift();

    logger.warn(`SYSTEM ALERT: [${type}] ${message}`, { alert });
    
    // In a real app, this would send to Slack/Email
    this.logAlertToFile(alert);
  }

  /**
   * Log alert to a dedicated file
   */
  logAlertToFile(alert) {
    const alertsLogPath = path.join(__dirname, "..", "logs", "alerts.log");
    try {
      const logsDir = path.join(__dirname, "..", "logs");
      if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
      fs.appendFileSync(alertsLogPath, JSON.stringify(alert) + "\n");
    } catch (error) {
      console.error("Failed to log alert to file", error);
    }
  }

  /**
   * Record a security-related event
   */
  recordSecurityEvent(type, details = {}) {
    logger.warn(`Security Event: [${type}]`, details);
    
    switch (type) {
      case "FAILED_LOGIN":
        this.securityMetrics.failedLogins++;
        if (this.securityMetrics.failedLogins >= this.thresholds.failedLogins) {
          this.triggerAlert("BRUTE_FORCE_ATTEMPT", `Detected ${this.securityMetrics.failedLogins} failed login attempts.`);
        }
        break;
      case "UNAUTHORIZED_ACCESS":
        this.securityMetrics.unauthorizedAccess++;
        this.triggerAlert("UNAUTHORIZED_ACCESS", `Unauthorized access attempt at ${details.path || "unknown"}`);
        break;
      case "RBAC_VIOLATION":
        this.securityMetrics.rbacViolations++;
        this.triggerAlert("RBAC_VIOLATION", `User ${details.userId || "unknown"} attempted unauthorized action: ${details.action || "unknown"}`);
        break;
    }

    this.securityMetrics.lastEvent = {
      type,
      timestamp: new Date().toISOString(),
      ...details
    };

    this.logAlertToFile({ type, ...details, timestamp: new Date().toISOString(), category: "security" });
  }

  /**
   * Monitor state transitions for failure recovery
   */
  monitorState(currentState) {
    if (this.previousState !== "healthy" && currentState === "healthy") {
      this.triggerAlert("SYSTEM_RECOVERY", `System component has recovered and is now Healthy.`);
    }
    this.previousState = currentState;
  }

  /**
   * Get system resource usage
   */
  getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const rssVal = this.overrides?.rssMb ? this.overrides.rssMb * 1024 * 1024 : memUsage.rss;
    const freeMemVal = this.overrides?.freeMemMb ? this.overrides.freeMemMb * 1024 * 1024 : os.freemem();
    const totalMemVal = this.overrides?.totalMemMb ? this.overrides.totalMemMb * 1024 * 1024 : os.totalmem();
    const loadAvgVal = this.overrides?.loadAvg || os.loadavg();

    return {
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memory: {
        rss: Math.round(rssVal / 1024 / 1024) + " MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB",
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
        external: Math.round(memUsage.external / 1024 / 1024) + " MB",
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000) + " ms",
        system: Math.round(cpuUsage.system / 1000) + " ms",
      },
      os: {
        freeMem: Math.round(freeMemVal / 1024 / 1024) + " MB",
        totalMem: Math.round(totalMemVal / 1024 / 1024) + " MB",
        loadAvg: loadAvgVal,
      }
    };
  }

  /**
   * Get AI processing metrics
   */
  getAiMetrics() {
    const avgLatency = this.aiMetrics.latencies.length > 0
      ? Math.round(this.aiMetrics.latencies.reduce((a, b) => a + b, 0) / this.aiMetrics.latencies.length)
      : 0;

    return {
      ...this.aiMetrics,
      averageLatencyMs: avgLatency,
      successRate: this.aiMetrics.totalRequests > 0
        ? Math.round((this.aiMetrics.successfulRequests / this.aiMetrics.totalRequests) * 100) + "%"
        : "100%",
    };
  }

  /**
   * Get background job metrics
   */
  async getQueueMetrics() {
    const queues = ["analytics", "ai-workflows"];
    const stats = {};

    for (const q of queues) {
      const qStats = await queueService.getQueueStats(q);
      if (qStats) {
        stats[q] = qStats;
      }
    }

    return stats;
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(limit = 20) {
    const errorLogPath = path.join(__dirname, "..", "logs", "error.log");
    try {
      if (!fs.existsSync(errorLogPath)) return [];

      const content = fs.readFileSync(errorLogPath, "utf8");
      const lines = content.trim().split("\n");
      return lines.slice(-limit).map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return { message: line, raw: true };
        }
      });
    } catch (error) {
      logger.error("Failed to read error logs", { error: error.message });
      return [];
    }
  }

  /**
   * Check system resource thresholds and trigger alerts
   */
  checkSystemAlerts() {
    try {
      // 1. Process Memory Usage Check
      const memUsage = process.memoryUsage();
      const rssMb = this.overrides?.rssMb || (memUsage.rss / 1024 / 1024);
      if (rssMb > 400) { // Threshold 400 MB for node process
        this.triggerAlert(
          "PROCESS_HIGH_MEMORY",
          `Node.js process RSS memory is ${Math.round(rssMb)} MB, exceeding threshold of 400 MB`
        );
      }

      // 2. OS Memory Usage Check
      const totalMem = this.overrides?.totalMemMb ? this.overrides.totalMemMb * 1024 * 1024 : os.totalmem();
      const freeMem = this.overrides?.freeMemMb ? this.overrides.freeMemMb * 1024 * 1024 : os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsageRatio = usedMem / totalMem;

      if (memUsageRatio > this.thresholds.memoryUsage) {
        this.triggerAlert(
          "SYSTEM_HIGH_MEMORY",
          `System overall memory usage is ${Math.round(memUsageRatio * 100)}%, exceeding threshold of ${this.thresholds.memoryUsage * 100}%`
        );
      }

      // 3. CPU Load Average Check
      const loadAvg = this.overrides?.loadAvg || os.loadavg();
      const cpus = os.cpus();
      const numCores = cpus && cpus.length ? cpus.length : 1;
      const loadPerCore = loadAvg[0] / numCores;

      // Threshold is 0.85 per core
      if (loadPerCore > 0.85) {
        this.triggerAlert(
          "SYSTEM_HIGH_CPU",
          `System CPU load per core is ${loadPerCore.toFixed(2)}, exceeding threshold of 0.85`
        );
      }
    } catch (error) {
      logger.error("Failed to check system alerts", { error: error.message });
    }
  }

  /**
   * Aggregate all metrics
   */
  async getAllMetrics() {
    let system = {};
    let ai = {};
    let queues = {};

    try {
      [system, ai] = await Promise.all([
        this.getSystemMetrics(),
        this.getAiMetrics(),
      ]);
    } catch (error) {
      logger.error("Failed to fetch primary metrics", { error: error.message });
    }

    try {
      queues = await this.getQueueMetrics();
    } catch (error) {
      logger.warn("Queue metrics unavailable", { error: error.message });
    }

    // Evaluate system resource alerts dynamically
    try {
      this.checkSystemAlerts();
    } catch (e) {
      logger.warn("Error running system alert checks", { error: e.message });
    }

    return {
      timestamp: new Date().toISOString(),
      system,
      ai,
      queues,
      security: this.securityMetrics,
      activeAlerts: this.alerts.filter(a => (Date.now() - new Date(a.timestamp).getTime()) < 3600000), // Last hour
    };
  }
}

module.exports = new DevOpsService();
