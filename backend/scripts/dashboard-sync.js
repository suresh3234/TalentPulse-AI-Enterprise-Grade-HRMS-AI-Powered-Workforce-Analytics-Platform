const fs = require("fs");
const path = require("path");
const devopsService = require("../services/devops.service");
const logger = require("../utils/logger");

/**
 * Synchronizes the DevOps AI Monitoring Markdown file with real-time metrics
 */
async function syncDashboard() {
  const dashboardPath = path.join(__dirname, "..", "DEVOPS-AI-WORKFLOW-MONITORING.md");
  
  try {
    if (!fs.existsSync(dashboardPath)) {
      logger.error("Dashboard file not found", { path: dashboardPath });
      return;
    }

    const metrics = await devopsService.getAllMetrics();
    let content = fs.readFileSync(dashboardPath, "utf8");

    // Update System Health Table
    const health = metrics.system;
    const aiHealth = metrics.ai;
    
    // Core API status (Self)
    content = content.replace(
      /\| \*\*Core API\*\* \| .* \| .* \| .* \|/,
      `| **Core API** | ✅ Healthy | < 50ms | ${new Date().toLocaleTimeString()} |`
    );

    // AI Service status
    const aiStatus = (aiHealth.totalRequests === 0 || (aiHealth.successfulRequests / aiHealth.totalRequests) > 0.9) ? "✅ Healthy" : "⚠️ Degraded";
    content = content.replace(
      /\| \*\*AI Service\*\* \| .* \| .* \| .* \|/,
      `| **AI Service** | ${aiStatus} | ~${aiHealth.averageLatencyMs}ms | ${new Date().toLocaleTimeString()} |`
    );

    // AI Metrics
    content = content.replace(/- \*\*Average Latency\*\*: `.*`/, `- **Average Latency**: \`${aiHealth.averageLatencyMs}ms\``);
    content = content.replace(/- \*\*Total AI Requests\*\*: `.*`/, `- **Total AI Requests**: \`${aiHealth.totalRequests.toLocaleString()}\``);
    content = content.replace(/- \*\*Successful\*\*: `.*`/, `- **Successful**: \`${aiHealth.successfulRequests.toLocaleString()} (${aiHealth.successRate})\``);
    content = content.replace(/- \*\*Failed\*\*: `.*`/, `- **Failed**: \`${aiHealth.failedRequests.toLocaleString()}\``);

    // Background Workflows
    const workflows = metrics.queues["ai-workflows"] || { waiting: 0, active: 0, completed: 0, failed: 0 };
    content = content.replace(
      /\| `ai-workflows` \| .* \| .* \| .* \| .* \|/,
      `| \`ai-workflows\` | ${workflows.waiting} | ${workflows.active} | ${workflows.completed} | ${workflows.failed} |`
    );

    // Infrastructure Resources
    content = content.replace(
      /- \*\*Memory Usage\*\*: `.* \/ .*`[\s\S]*?- \*\*CPU Load\*\*: `.*`[\s\S]*?- \*\*Uptime\*\*: `.*`/,
      `- **Memory Usage**: \`${health.memory.heapUsed} / ${health.memory.rss}\`
- **CPU Load**: \`${health.cpu.user}\`
- **Uptime**: \`${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m\``
    );

    // Security Status (Day 28 Enhancement)
    const security = metrics.security || { failedLogins: 0, unauthorizedAccess: 0, rbacViolations: 0 };
    const securitySection = `
## 🔒 Security & System Hardening

| Metric | Count | Status |
|--------|-------|--------|
| **Failed Logins** | ${security.failedLogins} | ${security.failedLogins > 5 ? "🔴 Critical" : "🟢 Secure"} |
| **Unauthorized Access** | ${security.unauthorizedAccess} | ${security.unauthorizedAccess > 0 ? "🟡 Warning" : "🟢 Secure"} |
| **RBAC Violations** | ${security.rbacViolations} | ${security.rbacViolations > 0 ? "🟡 Warning" : "🟢 Secure"} |

---`;

    // Insert security section before Recent Alerts
    const securityHeader = "## 🔒 Security & System Hardening";
    if (!content.includes(securityHeader)) {
      content = content.replace("## ⚠️ Recent Alerts & Anomalies", `${securitySection}\n\n## ⚠️ Recent Alerts & Anomalies`);
    } else {
      // Update existing security section
      const beforeSecurity = content.split(securityHeader)[0];
      const afterSecurity = content.split("---")[2]; // Assuming it's the second horizontal rule after security
      // Actually simpler to just replace the whole block if we use markers or just regex
      content = content.replace(/## 🔒 Security & System Hardening[\s\S]*?---/, securitySection);
    }

    // Recent Alerts
    if (metrics.activeAlerts && metrics.activeAlerts.length > 0) {
      const alertLines = metrics.activeAlerts.map(a => `> [!WARNING]\n> **${a.timestamp}**: ${a.message}`).join("\n\n");
      // Replace section after Recent Alerts & Anomalies header
      const alertHeader = "## ⚠️ Recent Alerts & Anomalies";
      const devopsHeader = "## 🔍 DevOps API Endpoints";
      const beforeAlerts = content.split(alertHeader)[0];
      const afterAlerts = content.split(devopsHeader)[1];
      
      content = `${beforeAlerts}${alertHeader}\n\n${alertLines}\n\n---\n\n${devopsHeader}${afterAlerts}`;
    }

    fs.writeFileSync(dashboardPath, content);
    logger.info("Dashboard synchronized successfully");
  } catch (error) {
    logger.error("Failed to sync dashboard", { error: error.message });
  }
}

module.exports = { syncDashboard };
