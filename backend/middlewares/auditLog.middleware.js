const AuditLog = require("../models/auditLog.model");

/**
 * Audit logging middleware — logs all mutating HTTP requests (POST, PUT, PATCH, DELETE)
 * to the AuditLog collection for compliance tracking.
 */
const auditLogMiddleware = (req, res, next) => {
  // Only log mutating requests
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  // Skip auth routes (login/register) — they have their own logging
  if (req.originalUrl.includes("/users/login") || req.originalUrl.includes("/users/register")) {
    return next();
  }

  // Capture the original res.json to intercept the response
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Log the audit entry asynchronously (don't block the response)
    setImmediate(async () => {
      try {
        const logEntry = {
          action: req.method === "POST" ? "CREATE" : req.method === "DELETE" ? "DELETE" : "UPDATE",
          resource: req.originalUrl.split("?")[0], // URL path without query params
          resourceId: req.params?.id || body?.data?._id || "",
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          statusCode: res.statusCode,
        };

        // Add user info if authenticated
        if (req.user) {
          logEntry.userId = req.user.id || req.user._id;
          logEntry.userName = req.user.fullName || req.user.email || "system";
        }

        // Capture request body as newValue (excluding passwords)
        if (req.body && Object.keys(req.body).length > 0) {
          const sanitized = { ...req.body };
          if (sanitized.password) sanitized.password = "[REDACTED]";
          logEntry.newValue = sanitized;
        }

        await AuditLog.create(logEntry);
      } catch (err) {
        console.error("Audit log write failed:", err.message);
      }
    });

    return originalJson(body);
  };

  next();
};

module.exports = auditLogMiddleware;
