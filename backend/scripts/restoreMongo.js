const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const logger = require("../utils/logger");

const mongoUri = process.env.MONGO_URI;
const requestedBackupPath = process.argv[2] || process.env.BACKUP_PATH;

if (!mongoUri) {
  logger.error("Database restore failed: MONGO_URI is not configured");
  process.exit(1);
}

if (!requestedBackupPath) {
  logger.error("Database restore failed: provide backup path as an argument or BACKUP_PATH env var");
  process.exit(1);
}

const backupPath = path.resolve(requestedBackupPath);

if (!fs.existsSync(backupPath)) {
  logger.error("Database restore failed: backup path does not exist", { backupPath });
  process.exit(1);
}

const restore = spawn("mongorestore", ["--uri", mongoUri, "--drop", backupPath], {
  stdio: "inherit",
});

restore.on("error", (error) => {
  logger.error("Database restore command failed to start", {
    message: error.message,
    hint: "Install MongoDB Database Tools and ensure mongorestore is available in PATH.",
  });
  process.exit(1);
});

restore.on("exit", (code) => {
  if (code === 0) {
    logger.info("Database restore completed", { backupPath });
    return;
  }

  logger.error("Database restore failed", { exitCode: code, backupPath });
  process.exit(code || 1);
});
