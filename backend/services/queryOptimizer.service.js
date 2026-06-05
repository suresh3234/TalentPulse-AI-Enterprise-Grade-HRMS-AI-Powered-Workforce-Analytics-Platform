/**
 * Query Optimizer Service
 * Optimizes database queries with indexing, batching, and query analysis
 */

const logger = require("../utils/logger");
const mongoose = require("mongoose");

class QueryOptimizer {
  constructor() {
    this.queryStats = {};
    this.indexRecommendations = [];
  }

  /**
   * Analyze query performance
   */
  analyzeQuery(collection, query, options = {}, duration, result) {
    const queryKey = `${collection}-${JSON.stringify(query)}`;

    if (!this.queryStats[queryKey]) {
      this.queryStats[queryKey] = {
        collection,
        query,
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
      };
    }

    const stats = this.queryStats[queryKey];
    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.minTime = Math.min(stats.minTime, duration);

    // Alert if query is slow
    if (duration > 1000) {
      logger.warn(`SLOW_QUERY_DETECTED: ${collection}`, {
        query,
        duration,
        resultSize: Array.isArray(result) ? result.length : 1,
      });

      // Suggest indexing
      this.recommendIndexing(collection, query);
    }

    return { stats, shouldOptimize: duration > 1000 };
  }

  /**
   * Recommend indexing for queries
   */
  recommendIndexing(collection, query) {
    const fields = Object.keys(query);
    const recommendation = {
      collection,
      fields,
      query,
      timestamp: new Date(),
    };

    // Check if already recommended
    const exists = this.indexRecommendations.some(
      (rec) =>
        rec.collection === collection &&
        JSON.stringify(rec.fields.sort()) === JSON.stringify(fields.sort())
    );

    if (!exists) {
      this.indexRecommendations.push(recommendation);
      logger.info(`INDEX_RECOMMENDATION: Create index on ${collection}(${fields.join(",")})`, {
        collection,
        fields,
      });
    }
  }

  /**
   * Batch queries to reduce database calls
   */
  batchQueries(queries) {
    // Group queries by collection
    const grouped = queries.reduce((acc, query) => {
      if (!acc[query.collection]) acc[query.collection] = [];
      acc[query.collection].push(query);
      return acc;
    }, {});

    return {
      groupedByCollection: grouped,
      totalBatches: Object.keys(grouped).length,
      originalQueryCount: queries.length,
      estimatedReduction: Math.round(
        ((queries.length - Object.keys(grouped).length) / queries.length) * 100
      ),
    };
  }

  /**
   * Optimize select fields (projection)
   */
  optimizeProjection(fields) {
    // Remove sensitive fields
    const sensitiveFields = ["password", "__v", "createdAt", "updatedAt"];

    const optimized = fields.filter((f) => !sensitiveFields.includes(f));

    return {
      original: fields,
      optimized,
      removed: fields.filter((f) => !optimized.includes(f)),
      estimatedSizeSavings: `${(optimized.length / fields.length * 100).toFixed(2)}%`,
    };
  }

  /**
   * Get query optimization report
   */
  getOptimizationReport() {
    const sortedQueries = Object.values(this.queryStats)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 20);

    const slowQueries = sortedQueries.filter((q) => q.avgTime > 500);
    const extremelySlowQueries = sortedQueries.filter((q) => q.avgTime > 2000);

    return {
      totalQueryPatterns: Object.keys(this.queryStats).length,
      indexRecommendations: this.indexRecommendations.slice(-10),
      slowQueries: {
        total: slowQueries.length,
        queries: slowQueries.map((q) => ({
          collection: q.collection,
          avgTime: q.avgTime.toFixed(2),
          count: q.count,
          impact: (q.avgTime * q.count).toFixed(0),
        })),
      },
      extremelySlowQueries: {
        total: extremelySlowQueries.length,
        queries: extremelySlowQueries,
      },
      recommendations: this.getOptimizationRecommendations(slowQueries),
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(slowQueries) {
    const recommendations = [];

    if (slowQueries.length > 5) {
      recommendations.push("Create indexes for frequently slow queries");
    }

    if (this.indexRecommendations.length > 3) {
      recommendations.push(
        `Implement ${this.indexRecommendations.length} suggested indexes to improve performance`
      );
    }

    if (slowQueries.some((q) => q.avgTime > 2000)) {
      recommendations.push("Some queries are extremely slow (>2s). Consider query restructuring.");
    }

    recommendations.push("Use query batching to reduce database round trips");
    recommendations.push("Enable query caching for frequently accessed data");

    return recommendations;
  }

  /**
   * Suggest query alternatives
   */
  suggestQueryAlternatives(collection, operation) {
    const alternatives = {
      "find-many": {
        description: "Use lean() for read-only operations",
        example: `db.${collection}.find().lean()`,
      },
      "find-with-populate": {
        description: "Use select() to limit fields in populated documents",
        example: `db.${collection}.find().populate('ref', 'field1 field2')`,
      },
      "find-and-count": {
        description: "Use countDocuments() separately if count needed for pagination",
        example: `Promise.all([db.${collection}.find(), db.${collection}.countDocuments()])`,
      },
      "bulk-update": {
        description: "Use bulkWrite() for multiple updates",
        example: `db.${collection}.bulkWrite([...operations])`,
      },
    };

    return alternatives[operation] || null;
  }

  /**
   * Reset statistics
   */
  reset() {
    this.queryStats = {};
    this.indexRecommendations = [];
  }
}

module.exports = new QueryOptimizer();
