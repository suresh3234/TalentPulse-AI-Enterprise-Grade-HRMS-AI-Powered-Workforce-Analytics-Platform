const redis = require("redis");
const logger = require("../utils/logger");

/**
 * Redis Cache Service with automatic expiration and fallback
 */
class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > this.maxRetries) {
              logger.error("Redis max reconnection attempts reached");
              return new Error("Max retries exceeded");
            }
            return retries * 100;
          },
        },
      });

      this.client.on("error", (err) => {
        logger.error("Redis error", { error: err.message });
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        logger.info("Redis connected");
        this.isConnected = true;
        this.retryCount = 0;
      });

      this.client.on("disconnect", () => {
        logger.warn("Redis disconnected");
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      return true;
    } catch (error) {
      logger.warn("Redis connection failed - cache disabled", { error: error.message });
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug("Cache hit", { key });
        return JSON.parse(value);
      }
      logger.debug("Cache miss", { key });
      return null;
    } catch (error) {
      logger.error("Cache get error", { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      logger.debug("Cache set", { key, ttl });
      return true;
    } catch (error) {
      logger.error("Cache set error", { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key) {
    if (!this.isConnected) return false;

    try {
      await this.client.del(key);
      logger.debug("Cache deleted", { key });
      return true;
    } catch (error) {
      logger.error("Cache delete error", { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async flush() {
    if (!this.isConnected) return false;

    try {
      await this.client.flushDb();
      logger.info("Cache flushed");
      return true;
    } catch (error) {
      logger.error("Cache flush error", { error: error.message });
      return false;
    }
  }

  /**
   * Get or set pattern - fetches from cache or computes and caches
   */
  async getOrSet(key, computeFn, ttl = this.defaultTTL) {
    try {
      // Try cache first
      const cached = await this.get(key);
      if (cached) return cached;

      // Compute value
      logger.debug("Computing cache value", { key });
      const value = await computeFn();

      // Store in cache
      await this.set(key, value, ttl);

      return value;
    } catch (error) {
      logger.error("Get or set error", { key, error: error.message });
      // Fallback to compute without caching
      return await computeFn();
    }
  }

  /**
   * Get cache stats
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false, stats: null };
    }

    try {
      const info = await this.client.info();
      return { connected: true, stats: info };
    } catch (error) {
      logger.error("Get stats error", { error: error.message });
      return { connected: false, stats: null };
    }
  }

  /**
   * Close connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info("Redis disconnected");
    }
  }

  /**
   * Check if connected
   */
  isReady() {
    return this.isConnected;
  }
}

module.exports = new CacheService();
