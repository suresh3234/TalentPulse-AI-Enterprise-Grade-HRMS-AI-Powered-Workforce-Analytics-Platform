const logger = require("../utils/logger");

const isDatabaseUnavailableError = (err) =>
  err.name === "MongoServerSelectionError" ||
  err.name === "MongooseServerSelectionError" ||
  err.message?.includes("before initial connection is complete");

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  const timestamp = new Date().toISOString();
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let errorDetails = {};

  if (isDatabaseUnavailableError(err)) {
    statusCode = 503;
    message = "Database unavailable. Check MongoDB connection and retry.";
  }

  // Handle MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    errorDetails = { field, value: err.keyValue[field] };
  }

  // Handle MongoDB Validation Error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    message = "Validation Error";
    errorDetails = { errors };
  }

  // Handle MongoDB Cast Error
  if (err.name === "CastError") {
    message = `Invalid ${err.path}: ${err.value}`;
    errorDetails = { path: err.path, value: err.value };
  }

  // Handle JWT Errors
  if (err.name === "JsonWebTokenError") {
    message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    message = "Token expired";
  }

  logger.error("Unhandled application error", {
    requestId: req.requestId,
    timestamp,
    statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: err.stack,
  });

  return res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? errorDetails : undefined,
    timestamp,
  });
};

module.exports = errorHandler;
