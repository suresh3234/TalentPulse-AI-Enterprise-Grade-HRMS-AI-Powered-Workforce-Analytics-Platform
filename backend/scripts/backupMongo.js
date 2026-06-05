const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const logger = require("../utils/logger");

const mongoUri = process.env.MONGO_URI;
const backupRoot = path.resolve(__dirname, "..", process.env.BACKUP_DIR || "backups");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupRoot, `mongo-${timestamp}`);

if (!mongoUri) {
  logger.error("Database backup failed: MONGO_URI is not configured");
  process.exit(1);
}

fs.mkdirSync(backupPath, { recursive: true });

const dump = spawn("mongodump", ["--uri", mongoUri, "--out", backupPath], {
  stdio: "inherit",
});

dump.on("error", (error) => {
  logger.error("Database backup command failed to start", {
    message: error.message,
    hint: "Install MongoDB Database Tools and ensure mongodump is available in PATH.",
  });
  process.exit(1);
});

dump.on("exit", (code) => {
  if (code === 0) {
    logger.info("Database backup completed", { backupPath });
    return;
  }

  logger.error("Database backup failed", { exitCode: code, backupPath });
  process.exit(code || 1);
});
