/**
 * Cache Optimizer Service
 * Optimizes caching strategy, TTLs, and memory usage
 */

const logger = require("../utils/logger");

class CacheOptimizer {
  constructor() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      itemCount: 0,
    };

    this.cachePatterns = {};
    this.keyMetrics = {};
  }

  /**
   * Record cache access
   */
  recordAccess(key, hit = true, dataSize = 0) {
    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    // Track key metrics
    if (!this.keyMetrics[key]) {
      this.keyMetrics[key] = {
        hits: 0,
        misses: 0,
        size: dataSize,
        lastAccessed: new Date(),
        created: new Date(),
      };
    }

    const metric = this.keyMetrics[key];
    if (hit) {
      metric.hits++;
    } else {
      metric.misses++;
    }
    metric.lastAccessed = new Date();
  }

  /**
   * Recommend cache TTL based on access patterns
   */
  recommendTTL(key, accessCount = 0) {
    // High access = longer TTL
    if (accessCount > 100) {
      return 3600; // 1 hour
    } else if (accessCount > 50) {
      return 1800; // 30 minutes
    } else if (accessCount > 10) {
      return 600; // 10 minutes
    } else {
      return 300; // 5 minutes
    }
  }

  /**
   * Identify cache hotspots (frequently accessed)
   */
  getHotspots(limit = 20) {
    const hotspots = Object.entries(this.keyMetrics)
      .map(([key, metrics]) => ({
        key,
        ...metrics,
        accessRate: metrics.hits / (metrics.misses + 1),
        totalAccess: metrics.hits + metrics.misses,
      }))
      .sort((a, b) => b.accessRate - a.accessRate)
      .slice(0, limit);

    return hotspots;
  }

  /**
   * Identify cache coldspots (rarely accessed)
   */
  getColdspots(limit = 20) {
    const coldspots = Object.entries(this.keyMetrics)
      .map(([key, metrics]) => ({
        key,
        ...metrics,
        accessRate: metrics.hits / (metrics.misses + 1),
        totalAccess: metrics.hits + metrics.misses,
        ageMs: Date.now() - new Date(metrics.created).getTime(),
      }))
      .filter((item) => item.totalAccess < 5) // Low access
      .sort((a, b) => a.accessRate - b.accessRate)
      .slice(0, limit);

    return coldspots;
  }

  /**
   * Recommend cache eviction strategy
   */
  getEvictionRecommendations() {
    const coldspots = this.getColdspots(100);
    const evictionCandidates = coldspots
      .filter((item) => item.ageMs > 3600000) // Older than 1 hour
      .filter((item) => item.totalAccess < 3) // Very low access
      .map((item) => item.key);

    return {
      strategy: "Evict low-access, old items",
      candidates: evictionCandidates.slice(0, 20),
      potentialSavings: `${evictionCandidates.length} items`,
    };
  }

  /**
   * Analyze cache efficiency
   */
  getCacheEfficiency() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = total > 0 ? ((this.cacheStats.hits / total) * 100).toFixed(2) : 0;

    let efficiency = "GOOD";
    if (hitRate < 30) efficiency = "POOR";
    else if (hitRate < 50) efficiency = "FAIR";
    else if (hitRate > 80) efficiency = "EXCELLENT";

    return {
      hitRate: `${hitRate}%`,
      totalHits: this.cacheStats.hits,
      totalMisses: this.cacheStats.misses,
      totalAccess: total,
      efficiency,
    };
  }

  /**
   * Get cache optimization report
   */
  getOptimizationReport() {
    const efficiency = this.getCacheEfficiency();
    const hotspots = this.getHotspots(10);
    const coldspots = this.getColdspots(10);
    const evictionRec = this.getEvictionRecommendations();

    return {
      efficiency,
      hotspots: {
        description: "Most frequently accessed items",
        items: hotspots.map((item) => ({
          key: item.key,
          hits: item.hits,
          totalAccess: item.totalAccess,
          size: item.size,
        })),
      },
      coldspots: {
        description: "Rarely accessed items",
        candidates: coldspots.slice(0, 5).map((item) => ({
          key: item.key,
          totalAccess: item.totalAccess,
          ageMs: item.ageMs,
        })),
      },
      eviction: evictionRec,
      recommendations: this.getRecommendations(efficiency, hotspots),
    };
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(efficiency, hotspots) {
    const recommendations = [];

    if (efficiency.efficiency === "POOR") {
      recommendations.push("Cache hit rate is too low. Review caching strategy.");
      recommendations.push("Consider caching more frequently accessed data.");
    }

    if (efficiency.efficiency === "FAIR") {
      recommendations.push("Cache hit rate could be improved. Increase TTLs for hot items.");
    }

    if (hotspots.length > 0) {
      recommendations.push(
        `Found ${hotspots.length} hot cache items. Consider increasing their TTL.`
      );
    }

    recommendations.push("Implement tiered caching: in-memory (L1) + Redis (L2)");
    recommendations.push("Use cache warming for predictable access patterns");
    recommendations.push("Implement cache versioning for cache invalidation");

    return recommendations;
  }

  /**
   * Suggest cache key patterns
   */
  suggestCachePatterns() {
    return {
      userCache: {
        pattern: "user:{userId}",
        ttl: 1800,
        description: "Cache user profiles and preferences",
      },
      employeeCache: {
        pattern: "employee:{employeeId}",
        ttl: 3600,
        description: "Cache employee data",
      },
      analyticsCache: {
        pattern: "analytics:{type}:{period}",
        ttl: 7200,
        description: "Cache computed analytics",
      },
      recommendationCache: {
        pattern: "recommendation:{userId}",
        ttl: 900,
        description: "Cache personalized recommendations",
      },
      queryResultCache: {
        pattern: "query:{hash}",
        ttl: 600,
        description: "Cache query results",
      },
    };
  }

  /**
   * Calculate cache size
   */
  calculateTotalSize() {
    let total = 0;
    for (const metric of Object.values(this.keyMetrics)) {
      total += metric.size;
    }
    this.cacheStats.totalSize = total;
    this.cacheStats.itemCount = Object.keys(this.keyMetrics).length;
    return {
      totalSizeBytes: total,
      totalSizeMB: (total / (1024 * 1024)).toFixed(2),
      itemCount: this.cacheStats.itemCount,
      averageSizePerItem: total / this.cacheStats.itemCount,
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      itemCount: 0,
    };
    this.keyMetrics = {};
  }
}

module.exports = new CacheOptimizer();
