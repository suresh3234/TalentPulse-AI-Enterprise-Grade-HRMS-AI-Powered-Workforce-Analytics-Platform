const Redis = require("ioredis");
const logger = require("../utils/logger");

let redisClient = null;
let isRedisConnected = false;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn("Redis caching offline - Max reconnection attempts reached.");
        return null; 
      }
      return 1000;
    }
  });

  redisClient.on("connect", () => {
    isRedisConnected = true;
    logger.info("Redis cache client connected successfully");
  });

  redisClient.on("error", (err) => {
    isRedisConnected = false;
    logger.warn("Redis cache client offline:", { error: err.message });
  });
} else {
  logger.warn("REDIS_URL not set in environment. Redis cache is disabled.");
}

/**
 * Cache middleware generator
 * @param {number} ttlSeconds Time-To-Live in seconds
 */
const cacheMiddleware = (ttlSeconds) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    if (!redisClient || !isRedisConnected) {
      res.setHeader("X-Cache", "BYPASS");
      return next();
    }

    const userId = req.user?._id || req.user?.id || "anon";
    const key = `cache:${req.originalUrl}:${userId}`;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Content-Type", "application/json");
        return res.send(cached);
      }

      res.setHeader("X-Cache", "MISS");
      
      // Intercept response json method
      const originalJson = res.json;
      res.json = function (body) {
        res.json = originalJson;
        
        // Cache successful responses only (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setex(key, ttlSeconds, JSON.stringify(body)).catch((err) => {
            logger.error("Failed to write to Redis cache:", { key, error: err.message });
          });
        }
        
        return res.json(body);
      };

      next();
    } catch (error) {
      logger.warn("Redis cache error - bypassing cache:", { error: error.message });
      res.setHeader("X-Cache", "BYPASS");
      next();
    }
  };
};

/**
 * Scan and clear keys matching pattern
 * @param {string} pattern Glob pattern (e.g. cache:/api/employees*)
 */
const clearCache = async (pattern) => {
  if (!redisClient || !isRedisConnected) {
    return;
  }

  try {
    let cursor = "0";
    let deletedCount = 0;
    
    do {
      const [newCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = newCursor;
      
      if (keys && keys.length > 0) {
        await redisClient.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== "0");

    if (deletedCount > 0) {
      logger.info(`Redis cache keys invalidated. Pattern: [${pattern}], Count: [${deletedCount}]`);
    }
  } catch (error) {
    logger.error("Failed to clear Redis cache keys:", { pattern, error: error.message });
  }
};

module.exports = {
  cacheMiddleware,
  clearCache,
};
