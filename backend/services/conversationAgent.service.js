const { getAiResponse } = require("../utils/ai-service-client");
const logger = require("../utils/logger");

class ConversationAgentService {
  /**
   * Generates the next AI co-interviewer follow-up question based on dialogue history and job skills.
   * @param {Array<{speaker: string, text: string}>} transcriptHistory - Dialogue turn history
   * @param {string[]} jobSkills - List of target skills
   * @returns {Promise<string>} Next question text
   */
  async generateNextQuestion(transcriptHistory, jobSkills) {
    try {
      const skillsStr = jobSkills && jobSkills.length > 0 ? jobSkills.join(", ") : "general engineering";
      const historyStr = transcriptHistory
        .map((t) => `${t.speaker}: ${t.text}`)
        .join("\n");

      const prompt = `
        You are an intelligent AI Co-Interviewer named RecruitAI conducting a video interview.
        The candidate is being evaluated for a job requiring skills in: ${skillsStr}.
        
        Here is the conversation history so far:
        ${historyStr}
        
        Generate the next short, contextual follow-up question to ask the candidate. 
        Focus on evaluating depth, clarifying their previous statements, or testing one of the target skills.
        Provide ONLY the question itself. Do not include prefix comments, preambles, or quotes.
      `;

      logger.info("Requesting next question from RecruitAI co-interviewer...");
      const question = await getAiResponse(prompt);
      if (question && question.trim()) {
        return question.trim();
      }

      throw new Error("Empty response from AI client");
    } catch (err) {
      logger.warn("AI next question generation failed, using local fallback question:", { error: err.message });
      return this.localGetFallbackQuestion(transcriptHistory, jobSkills);
    }
  }

  /**
   * Generates 3 suggested next questions for HR to ask manually
   * @param {Array<{speaker: string, text: string}>} transcriptHistory - Dialogue turn history
   * @param {string[]} jobSkills - List of target skills
   * @returns {Promise<string[]>} Array of 3 suggestions
   */
  async generateQuestionSuggestions(transcriptHistory, jobSkills) {
    try {
      const skillsStr = jobSkills && jobSkills.length > 0 ? jobSkills.join(", ") : "general software development";
      const historyStr = transcriptHistory
        .map((t) => `${t.speaker}: ${t.text}`)
        .join("\n");

      const prompt = `
        You are an interview advisor helping the HR hiring manager.
        The candidate is being interviewed for a role requiring: ${skillsStr}.
        
        Conversation history:
        ${historyStr}
        
        Based on the candidate's responses, suggest exactly 3 relevant questions the HR manager could ask manually.
        Return ONLY a JSON array of strings, e.g.:
        ["question 1", "question 2", "question 3"]
        No preambles, markdown code blocks, or extra text.
      `;

      logger.info("Requesting HR question suggestions from AI client...");
      const content = await getAiResponse(prompt);
      if (content) {
        try {
          const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed)) {
            return parsed.slice(0, 3);
          }
        } catch (parseErr) {
          logger.warn("Failed to parse JSON for HR suggestions, running regex extractor:", { error: parseErr.message });
        }
      }

      throw new Error("Invalid suggestions output");
    } catch (err) {
      logger.warn("AI HR question suggestion failed, using local suggestions:", { error: err.message });
      return [
        "Can you explain a time when you solved a complex scalability problem under high traffic?",
        "How do you approach team collaboration when developers disagree on architectural choices?",
        "What strategies do you use to test code and ensure quality before deploying to staging?"
      ];
    }
  }

  /**
   * Local fallback question generator
   */
  localGetFallbackQuestion(history, skills) {
    const list = skills && skills.length > 0 ? skills : ["React", "Node.js", "Collaboration"];
    if (history.length === 0) {
      return `Welcome to the interview! Can you introduce yourself and walk us through your experience with ${list[0]}?`;
    }
    const lastAnswer = history[history.length - 1]?.text || "";
    if (lastAnswer.length < 50) {
      return "That sounds interesting. Could you elaborate more on the technical details of that implementation?";
    }
    const skillIndex = history.length % list.length;
    return `Excellent. Moving on, how have you handled testing and error monitoring when working with ${list[skillIndex]}?`;
  }
}

module.exports = new ConversationAgentService();
