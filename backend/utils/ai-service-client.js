const axios = require("axios");
const logger = require("./logger");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8001";

/**
 * Sends a prompt to the Python AI service
 * @param {string} prompt - The prompt text
 * @param {string} model - Optional model name
 */
const getAiResponse = async (prompt, model = null) => {
  try {
    const startTime = Date.now();
    const response = await axios.post(`${AI_SERVICE_URL}/prompt`, {
      prompt,
      model,
    }, {
      timeout: 15000 // 15s timeout for AI thinking
    });

    const durationMs = Date.now() - startTime;
    logger.info("AI service response received", { durationMs });

    return response.data.response;
  } catch (error) {
    logger.error("AI service communication error", {
      message: error.message,
      url: AI_SERVICE_URL,
      status: error.response?.status,
    });
    return null;
  }
};

module.exports = {
  getAiResponse,
};
