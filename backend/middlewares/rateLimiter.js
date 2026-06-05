const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;
const Redis = require("ioredis");
const logger = require("../utils/logger");

let redisClient = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return 1000;
      }
    });
    
    redisClient.on("error", (error) => {
      logger.warn("Redis rate-limiting client connection error:", { error: error.message });
    });
  } catch (error) {
    logger.warn("Redis client failed to initialize for rate limiting store:", { error: error.message });
  }
}

const getStore = (prefix) => {
  if (redisClient) {
    return new RedisStore({
      sendCommand: async (...args) => {
        if (redisClient.status === "ready") {
          try {
            return await redisClient.call(...args);
          } catch (error) {
            logger.warn(`Redis rate-limiting command failed for ${prefix}, falling open:`, { error: error.message });
          }
        }
        // Graceful degradation: fail-open with appropriate mock types to satisfy rate-limit-redis
        const command = args[0] ? String(args[0]).toUpperCase() : "";
        if (command === "SCRIPT") {
          return "fakesha1234567890fakesha1234567890fakesha12";
        }
        if (command === "EVALSHA" || command === "EVAL") {
          return [1, 60000];
        }
        if (command === "DECR" || command === "DEL") {
          return 0;
        }
        return [1, 60000];
      },
      prefix: `rl:${prefix}:`,
    });
  }
  return undefined; // Falls back to standard in-memory store
};

// Tier 1: Global Limiter - 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  store: getStore("global"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || "200"),
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    logger.warn("Global rate limit exceeded", { ip: req.ip, path: req.path });
    res.status(429).json({ error: "Too many requests. Please try again later." });
  }
});

// Tier 2: Auth Limiter - 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  store: getStore("auth"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "10"),
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", { ip: req.ip, email: req.body?.email });
    res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
  }
});

// Tier 3: AI Limiter - 30 requests per 1 minute per authenticated user (or IP fallback)
const aiLimiter = rateLimit({
  store: getStore("ai"),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_AI_MAX || "30"),
  keyGenerator: (req) => {
    // Limit per authenticated user ID, or fallback to IP for anonymous traffic
    const userId = req.user?._id || req.user?.id || req.ip;
    return String(userId);
  },
  message: { error: "AI request limit reached. Please wait 60 seconds." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    logger.warn("AI rate limit exceeded", {
      ip: req.ip,
      userId: req.user?._id || req.user?.id || "anon",
      path: req.path
    });
    res.status(429).json({ error: "AI request limit reached. Please wait 60 seconds." });
  }
});
// Tier 4: Queue Limiter - 60 requests per 1 minute per authenticated user (or IP fallback)
const queueLimiter = rateLimit({
  store: getStore("queue"),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_QUEUE_MAX || "60"),
  keyGenerator: (req) => {
    const userId = req.user?._id || req.user?.id || req.ip;
    return String(userId);
  },
  message: { error: "Queue request limit reached. Please try again in 60 seconds." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    logger.warn("Queue rate limit exceeded", {
      ip: req.ip,
      userId: req.user?._id || req.user?.id || "anon",
      path: req.path
    });
    res.status(429).json({ error: "Queue request limit reached. Please try again in 60 seconds." });
  }
});

// Tier 5: Payroll Limiter - 50 requests per 15 minutes per authenticated user (or IP fallback)
const payrollLimiter = rateLimit({
  store: getStore("payroll"),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_PAYROLL_MAX || "50"),
  keyGenerator: (req) => {
    const userId = req.user?._id || req.user?.id || req.ip;
    return String(userId);
  },
  message: { error: "Too many payroll requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
  handler: (req, res) => {
    logger.warn("Payroll rate limit exceeded", {
      ip: req.ip,
      userId: req.user?._id || req.user?.id || "anon",
      path: req.path
    });
    res.status(429).json({ error: "Too many payroll requests. Please try again in 15 minutes." });
  }
});

module.exports = {
  globalLimiter,
  authLimiter,
  aiLimiter,
  queueLimiter,
  payrollLimiter
};

