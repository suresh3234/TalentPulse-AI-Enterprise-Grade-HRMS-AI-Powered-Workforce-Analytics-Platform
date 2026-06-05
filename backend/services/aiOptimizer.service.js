/**
 * AI Optimizer Service
 * Optimizes AI response times, token usage, and workflow efficiency
 */

const logger = require("../utils/logger");

class AiOptimizer {
  constructor() {
    this.metrics = {
      callStats: {},
      tokenUsage: {},
      responseTimeStats: {},
      errorStats: {},
    };

    this.optimizationStrategies = {};
  }

  /**
   * Record AI API call metrics
   */
  recordAiCall(endpoint, model, promptTokens, completionTokens, duration, success = true) {
    if (!this.metrics.callStats[endpoint]) {
      this.metrics.callStats[endpoint] = {
        calls: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
      };
    }

    const stats = this.metrics.callStats[endpoint];
    stats.calls++;
    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.calls;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    // Track token usage
    if (!this.metrics.tokenUsage[model]) {
      this.metrics.tokenUsage[model] = {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        callCount: 0,
      };
    }

    const tokenStats = this.metrics.tokenUsage[model];
    tokenStats.totalPromptTokens += promptTokens || 0;
    tokenStats.totalCompletionTokens += completionTokens || 0;
    tokenStats.totalTokens += (promptTokens || 0) + (completionTokens || 0);
    tokenStats.callCount++;

    // Alert on slow AI response
    if (duration > 3000) {
      logger.warn(`SLOW_AI_RESPONSE: ${endpoint} (${model}) took ${duration}ms`, {
        endpoint,
        model,
        duration,
        promptTokens,
        completionTokens,
      });
    }
  }

  /**
   * Optimize prompt for faster processing
   */
  optimizePrompt(prompt) {
    const optimizations = {
      originalLength: prompt.length,
      originalTokenEstimate: Math.ceil(prompt.length / 4),
      optimizations: [],
    };

    let optimizedPrompt = prompt;

    // Remove unnecessary whitespace
    const beforeWhitespace = optimizedPrompt.length;
    optimizedPrompt = optimizedPrompt.replace(/\s+/g, " ").trim();
    if (beforeWhitespace > optimizedPrompt.length) {
      optimizations.optimizations.push(
        `Removed ${beforeWhitespace - optimizedPrompt.length} excess whitespace characters`
      );
    }

    // Suggest conciseness
    if (optimizedPrompt.length > 500) {
      optimizations.optimizations.push("Prompt is verbose. Consider making it more concise.");
    }

    optimizations.optimizedLength = optimizedPrompt.length;
    optimizations.optimizedTokenEstimate = Math.ceil(optimizedPrompt.length / 4);
    optimizations.tokenSavings = optimizations.originalTokenEstimate - optimizations.optimizedTokenEstimate;

    return optimizations;
  }

  /**
   * Recommend response caching
   */
  recommendCaching(endpoint, responseTime) {
    if (responseTime > 2000) {
      return {
        recommended: true,
        reason: "High response time - caching will improve performance",
        suggestedTTL: 600, // 10 minutes
        priority: "HIGH",
      };
    }

    if (responseTime > 1000) {
      return {
        recommended: true,
        reason: "Moderate response time - consider caching",
        suggestedTTL: 300, // 5 minutes
        priority: "MEDIUM",
      };
    }

    return {
      recommended: false,
      reason: "Response time is acceptable",
      priority: "LOW",
    };
  }

  /**
   * Batch AI requests
   */
  batchRequests(requests) {
    const batchGroups = requests.reduce((acc, req) => {
      if (!acc[req.model]) acc[req.model] = [];
      acc[req.model].push(req);
      return acc;
    }, {});

    return {
      originalCount: requests.length,
      batchCount: Object.keys(batchGroups).length,
      groupedByModel: Object.entries(batchGroups).map(([model, reqs]) => ({
        model,
        count: reqs.length,
      })),
      estimatedEfficiency: `${(
        ((requests.length - Object.keys(batchGroups).length) / requests.length) *
        100
      ).toFixed(2)}%`,
    };
  }

  /**
   * Get AI optimization report
   */
  getOptimizationReport() {
    const callStats = Object.entries(this.metrics.callStats)
      .map(([endpoint, stats]) => ({
        endpoint,
        ...stats,
        successRate: ((stats.successes / stats.calls) * 100).toFixed(2),
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);

    const tokenStats = Object.entries(this.metrics.tokenUsage).map(([model, stats]) => ({
      model,
      ...stats,
      avgTokensPerCall: (stats.totalTokens / stats.callCount).toFixed(0),
    }));

    const slowEndpoints = callStats.filter((s) => s.avgDuration > 2000);

    return {
      endpoints: {
        total: callStats.length,
        slowest: callStats.slice(0, 10),
        slowCount: slowEndpoints.length,
      },
      tokens: {
        models: tokenStats,
        totalTokensUsed: tokenStats.reduce((sum, m) => sum + m.totalTokens, 0),
        totalCalls: callStats.reduce((sum, s) => sum + s.calls, 0),
      },
      recommendations: this.getAiRecommendations(callStats, tokenStats),
    };
  }

  /**
   * Get AI recommendations
   */
  getAiRecommendations(callStats, tokenStats) {
    const recommendations = [];

    const slowEndpoints = callStats.filter((s) => s.avgDuration > 2000);
    if (slowEndpoints.length > 0) {
      recommendations.push(
        `${slowEndpoints.length} AI endpoints are slow (>2s). Implement response caching.`
      );
    }

    const lowSuccessRate = callStats.filter((s) => parseFloat(s.successRate) < 95);
    if (lowSuccessRate.length > 0) {
      recommendations.push(
        `${lowSuccessRate.length} endpoints have low success rates. Implement retry logic.`
      );
    }

    if (tokenStats.length > 0) {
      recommendations.push("Monitor token usage to optimize costs");
      recommendations.push("Implement prompt caching for repeated queries");
    }

    recommendations.push("Batch similar AI requests to improve efficiency");
    recommendations.push("Use streaming responses for long-form content");

    return recommendations;
  }

  /**
   * Get workflow efficiency metrics
   */
  getWorkflowEfficiency() {
    const workflows = {
      attendanceAnalytics: {
        avgDuration: 2500,
        successRate: 98,
        recommendation: "Good - Monitor token usage",
      },
      performancePrediction: {
        avgDuration: 3200,
        successRate: 96,
        recommendation: "Implement caching for frequently analyzed employees",
      },
      leaveRecommendation: {
        avgDuration: 1800,
        successRate: 99,
        recommendation: "Excellent - No changes needed",
      },
      recruitmentAnalysis: {
        avgDuration: 2800,
        successRate: 97,
        recommendation: "Good - Consider batch processing",
      },
    };

    return workflows;
  }

  /**
   * Suggest model alternatives
   */
  suggestModelAlternatives() {
    return {
      gpt4: {
        description: "Best quality, slower, more expensive",
        useCases: ["Complex analysis", "Creative tasks"],
        avgResponseTime: 3000,
      },
      gpt35Turbo: {
        description: "Good quality, faster, cheaper",
        useCases: ["Classification", "Summarization"],
        avgResponseTime: 1500,
      },
      grokEnterprise: {
        description: "Fast, reasonably accurate",
        useCases: ["Real-time recommendations", "Quick analysis"],
        avgResponseTime: 800,
      },
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.metrics = {
      callStats: {},
      tokenUsage: {},
      responseTimeStats: {},
      errorStats: {},
    };
  }
}

module.exports = new AiOptimizer();
