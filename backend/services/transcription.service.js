const fs = require("fs");
const logger = require("../utils/logger");

class TranscriptionService {
  /**
   * Transcribe local recorded audio file to text
   * @param {string} filePath - Absolute path to the recorded audio file
   * @returns {Promise<string>} Transcribed text string
   */
  async transcribeAudioFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Audio file not found at path: ${filePath}`);
      }

      // Check if OpenAI key is set and valid
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-openai-key-here") {
        const OpenAI = require("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        logger.info(`Sending audio to Whisper API for transcription: ${filePath}`);
        const response = await openai.audio.transcriptions.create({
          file: fs.createReadStream(filePath),
          model: "whisper-1",
        });
        
        return response.text || "";
      } else {
        logger.warn("OpenAI API key not configured or default. Utilizing local fallback transcript parsing.");
        
        // Simulating transcription based on typical patterns or simple stub
        const mockTranscripts = [
          "I have extensive experience building React frontends and Node.js backend services. In my previous role, I spearheaded a microservices refactor that reduced query latency by 40% and improved security using JWT authorization and query caches.",
          "Regarding system design, I prefer modular architectures. I use Docker containers for local dev parity, Redis for queue orchestration, and Postgres for relational integrity. I write unit tests for high-critical service layers.",
          "I excel at team collaboration and Agile workflows. I communicate clearly during standups, manage pull reviews diligently, and ensure that our code standards conform with clean architecture patterns.",
        ];
        
        const randomSelection = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
        return `[Fallback Speech Transcript] ${randomSelection}`;
      }
    } catch (error) {
      logger.error("transcribeAudioFile failed:", { error: error.message });
      throw error;
    }
  }
}

module.exports = new TranscriptionService();
