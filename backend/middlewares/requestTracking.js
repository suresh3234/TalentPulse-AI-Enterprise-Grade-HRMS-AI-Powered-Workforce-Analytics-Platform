const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

/**
 * Request Tracking Middleware
 * Adds request ID for end-to-end tracing and performance monitoring
 */
const requestTracking = (req, res, next) => {
  // Generate or use existing request ID
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId = requestId;

  // Add request ID to response headers
  res.setHeader("X-Request-ID", requestId);

  // Capture request start time
  const startTime = Date.now();

  // Log incoming request
  logger.info("Incoming request", {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    userId: req.user?._id,
  });

  // Capture original send function
  const originalSend = res.send;

  // Override send to log response
  res.send = function (data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log response
    logger.info("Outgoing response", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      contentType: res.get("content-type"),
      userId: req.user?._id,
    });

    // Alert if response time is high (>5s)
    if (duration > 5000) {
      logger.warn("Slow response detected", {
        requestId,
        path: req.path,
        duration: `${duration}ms`,
        threshold: "5000ms",
      });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

module.exports = requestTracking;
