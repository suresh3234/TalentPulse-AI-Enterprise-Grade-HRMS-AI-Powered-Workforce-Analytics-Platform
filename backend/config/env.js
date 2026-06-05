const logger = require("../utils/logger");

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];
const optionalEnvVars = ["OPENAI_API_KEY", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"];

const validateEnv = () => {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error("Missing required environment variables", {
      missing,
    });
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  logger.info("Environment variables validated", {
    required: requiredEnvVars,
    optionalConfigured: optionalEnvVars.filter((key) => Boolean(process.env[key])),
  });
};

module.exports = {
  validateEnv,
};
