const fs = require("fs");
const path = require("path");

const logsDir = path.join(__dirname, "..", "logs");
const appLogPath = path.join(logsDir, "app.log");
const errorLogPath = path.join(logsDir, "error.log");

const redactKeys = ["password", "token", "authorization", "cookie", "jwt", "secret"];

const ensureLogDir = () => {
  if (process.env.LOG_TO_FILE === "false") {
    return false;
  }

  fs.mkdirSync(logsDir, { recursive: true });
  return true;
};

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      const shouldRedact = redactKeys.some((redactKey) => key.toLowerCase().includes(redactKey));
      acc[key] = shouldRedact ? "[REDACTED]" : sanitizeValue(nestedValue);
      return acc;
    }, {});
  }

  return value;
};

const formatMeta = (meta = {}) => {
  const sanitized = Object.entries(meta).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      const shouldRedact = redactKeys.some((redactKey) => key.toLowerCase().includes(redactKey));
      acc[key] = shouldRedact ? "[REDACTED]" : sanitizeValue(value);
    }
    return acc;
  }, {});

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
};

const writeLog = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...formatMeta(meta),
  };

  const output = JSON.stringify(entry);

  if (ensureLogDir()) {
    fs.appendFileSync(appLogPath, `${output}\n`);

    if (level === "error" || level === "warn") {
      fs.appendFileSync(errorLogPath, `${output}\n`);
    }
  }

  if (level === "error" || level === "warn") {
    console.error(output);
    return;
  }

  console.log(output);
};

module.exports = {
  info: (message, meta) => writeLog("info", message, meta),
  warn: (message, meta) => writeLog("warn", message, meta),
  error: (message, meta) => writeLog("error", message, meta),
};
