const express = require("express");
const router = express.Router();
const conversationAgentService = require("../services/conversationAgent.service");
const logger = require("../utils/logger");

/**
 * POST /api/interview/ai/ai-question
 * Server-Sent Events (SSE) endpoint to stream generated follow-up questions word-by-word
 */
router.post("/ai-question", async (req, res, next) => {
  try {
    const { transcriptHistory = [], jobSkills = [] } = req.body;

    // Establish Server-Sent Events headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Establish stream connection immediately

    logger.info("SSE Connection opened for real-time question streaming.");

    // Generate the question
    const question = await conversationAgentService.generateNextQuestion(transcriptHistory, jobSkills);
    
    // Split the question into words and stream them to simulate a live writing agent
    const words = question.split(" ");
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < words.length) {
        const word = words[currentIdx];
        // Send word event
        res.write(`data: ${JSON.stringify({ word: word + (currentIdx === words.length - 1 ? "" : " ") })}\n\n`);
        currentIdx++;
      } else {
        // Send completion event
        res.write("data: [DONE]\n\n");
        clearInterval(interval);
        res.end();
      }
    }, 80); // 80ms delay per word for optimal reading speed

    req.on("close", () => {
      clearInterval(interval);
      logger.info("SSE Connection closed by client.");
    });
  } catch (error) {
    logger.error("SSE ai-question streaming failed:", { error: error.message });
    res.write(`data: ${JSON.stringify({ error: "AI agent failed to formulate response." })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/interview/ai-suggestions
 * Get 3 suggested manual questions for HR based on dialogue flow
 */
router.post("/ai-suggestions", async (req, res, next) => {
  try {
    const { transcriptHistory = [], jobSkills = [] } = req.body;

    const suggestions = await conversationAgentService.generateQuestionSuggestions(transcriptHistory, jobSkills);

    return res.status(200).json({
      success: true,
      suggestions,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
