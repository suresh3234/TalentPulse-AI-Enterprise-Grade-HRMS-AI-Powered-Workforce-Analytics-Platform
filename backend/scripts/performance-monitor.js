#!/usr/bin/env node

/**
 * Real-time Performance Monitor
 * Displays live performance metrics from the backend
 */

const axios = require("axios");
const chalk = require("chalk");

const API_URL = process.env.API_URL || "http://localhost:3000";
const REFRESH_INTERVAL = process.env.REFRESH_INTERVAL || 5000; // 5 seconds

class PerformanceMonitorCli {
  constructor() {
    this.lastUpdate = null;
    this.isRunning = false;
  }

  /**
   * Start monitoring
   */
  async start() {
    console.clear();
    console.log(chalk.blue("╔══════════════════════════════════════════════════════════════╗"));
    console.log(chalk.blue("║        HRMS Backend - Real-time Performance Monitor             ║"));
    console.log(chalk.blue("╚══════════════════════════════════════════════════════════════╝\n"));

    this.isRunning = true;

    while (this.isRunning) {
      await this.update();
      await new Promise((resolve) => setTimeout(resolve, REFRESH_INTERVAL));
    }
  }

  /**
   * Update metrics
   */
  async update() {
    try {
      console.clear();
      console.log(chalk.blue("╔══════════════════════════════════════════════════════════════╗"));
      console.log(chalk.blue("║        HRMS Backend - Real-time Performance Monitor             ║"));
      console.log(chalk.blue("╚══════════════════════════════════════════════════════════════╝\n"));

      // Get health status
      const healthRes = await axios.get(`${API_URL}/api/devops/performance-health`);
      const health = healthRes.data.data;

      // Get performance metrics
      const perfRes = await axios.get(`${API_URL}/api/devops/performance`);
      const perfData = perfRes.data.data;

      // Get analysis
      const analysisRes = await axios.get(`${API_URL}/api/devops/analysis`);
      const analysis = analysisRes.data.data;

      // Display health status
      this.displayHealth(health);

      // Display aggregated metrics
      this.displayAggregatedMetrics(perfData.aggregated);

      // Display AI metrics
      this.displayAiMetrics(perfData.aiCalls);

      // Display database metrics
      this.displayDatabaseMetrics(perfData.database);

      // Display recommendations
      this.displayRecommendations(analysis);

      // Display timestamp
      console.log(chalk.gray(`\nLast updated: ${new Date().toLocaleTimeString()}`));
      console.log(chalk.gray(`Press Ctrl+C to exit\n`));
    } catch (error) {
      console.error(chalk.red(`Error fetching metrics: ${error.message}`));
    }
  }

  /**
   * Display health status
   */
  displayHealth(health) {
    const statusColor = health.status === "HEALTHY" ? "green" : "yellow";
    const statusSymbol = health.status === "HEALTHY" ? "✓" : "⚠";

    console.log(chalk.bold("SYSTEM HEALTH"));
    console.log(
      `  ${chalk[statusColor](statusSymbol)} Status: ${chalk[statusColor](health.status)}`
    );
    console.log(`  Score: ${this.getScoreBar(health.score)} ${health.score}/100`);

    if (health.recommendations && health.recommendations.length > 0) {
      console.log("\n  Recommendations:");
      health.recommendations.forEach((rec) => {
        console.log(`    • ${chalk.yellow(rec)}`);
      });
    }
    console.log();
  }

  /**
   * Display aggregated metrics
   */
  displayAggregatedMetrics(metrics) {
    if (!metrics) return;

    console.log(chalk.bold("REQUEST METRICS"));
    console.log(`  Total Requests: ${metrics.totalRequests || 0}`);
    console.log(`  Avg Response Time: ${chalk.cyan(metrics.averageResponseTime + "ms")}`);
    console.log(`  P95 Response Time: ${chalk.cyan(metrics.p95ResponseTime + "ms")}`);
    console.log(`  P99 Response Time: ${chalk.cyan(metrics.p99ResponseTime + "ms")}`);
    console.log(`  Cache Hit Rate: ${chalk.cyan(metrics.cacheHitRate)}`);
    console.log(`  Total Errors: ${metrics.totalErrors || 0}`);
    console.log();
  }

  /**
   * Display AI metrics
   */
  displayAiMetrics(aiCalls) {
    if (!aiCalls) return;

    console.log(chalk.bold("AI SERVICE METRICS"));
    console.log(`  Total Calls: ${aiCalls.total || 0}`);
    console.log(`  Successful: ${aiCalls.successful || 0}`);
    console.log(`  Success Rate: ${chalk.cyan(aiCalls.successRate || "N/A")}`);

    if (aiCalls.byModel) {
      console.log("  By Model:");
      Object.entries(aiCalls.byModel).forEach(([model, count]) => {
        console.log(`    • ${model}: ${count}`);
      });
    }
    console.log();
  }

  /**
   * Display database metrics
   */
  displayDatabaseMetrics(dbMetrics) {
    if (!dbMetrics) return;

    console.log(chalk.bold("DATABASE METRICS"));
    console.log(`  Total Queries: ${dbMetrics.totalQueries || 0}`);
    console.log(`  Avg Query Time: ${chalk.cyan((dbMetrics.averageQueryTime || 0) + "ms")}`);

    if (dbMetrics.byCollection) {
      console.log("  Top Collections:");
      Object.entries(dbMetrics.byCollection)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([collection, count]) => {
          console.log(`    • ${collection}: ${count} queries`);
        });
    }
    console.log();
  }

  /**
   * Display recommendations
   */
  displayRecommendations(analysis) {
    if (!analysis || !analysis.queryOptimization) return;

    console.log(chalk.bold("OPTIMIZATION RECOMMENDATIONS"));

    const allRecs = [
      ...(analysis.queryOptimization || []),
      ...(analysis.cacheOptimization || []),
      ...(analysis.aiOptimization || []),
    ];

    if (allRecs.length > 0) {
      allRecs.slice(0, 5).forEach((rec) => {
        console.log(`  → ${chalk.yellow(rec)}`);
      });
    }

    console.log(`\n  Overall System Score: ${chalk.bold(analysis.overallScore)}/100`);
  }

  /**
   * Create score bar
   */
  getScoreBar(score) {
    const maxBars = 10;
    const filled = Math.round((score / 100) * maxBars);
    const empty = maxBars - filled;

    const color = score >= 80 ? "green" : score >= 60 ? "yellow" : "red";
    const filledBar = chalk[color]("█".repeat(filled));
    const emptyBar = chalk.gray("░".repeat(empty));

    return `[${filledBar}${emptyBar}]`;
  }
}

// Start monitoring
const monitor = new PerformanceMonitorCli();
monitor.start();

// Handle exit
process.on("SIGINT", () => {
  monitor.isRunning = false;
  console.log("\n\nMonitor stopped.");
  process.exit(0);
});
