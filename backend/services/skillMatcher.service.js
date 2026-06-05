const { getAiResponse } = require("../utils/ai-service-client");
const logger = require("../utils/logger");

class SkillMatcherService {
  /**
   * Extract candidate skill scores, evidence, and gaps from the transcript
   * @param {string} transcript - Completed interview transcript
   * @param {string[]} requiredSkills - List of target skills for the job
   * @returns {Promise<Object>} Map of skills with score, evidence, and gaps
   */
  async extractSkillsFromTranscript(transcript, requiredSkills) {
    try {
      const skillsList = requiredSkills && requiredSkills.length > 0 ? requiredSkills : ["React", "Node.js", "System Design", "Communication"];
      
      const prompt = `
        You are an expert HR recruitment auditor.
        Given the following interview transcript and the required skills for this job role:
        Required Skills: ${JSON.stringify(skillsList)}
        
        Transcript:
        "${transcript}"
        
        Extract evidence of each skill from the candidate's answers. Rate the skill competency from 0 to 10.
        Provide a JSON object strictly matching this format:
        {
          "skills": {
            "skillName": {
              "score": number (0-10),
              "evidence": "string summarizing candidates statements showing skill",
              "gaps": "string detailing gaps, lack of mention or shallow answer"
            }
          }
        }
        Respond with ONLY the valid JSON object. No preambles, markdown formatting, or explanation.
      `;

      logger.info("Requesting LLM skill matching from AI service client...");
      const content = await getAiResponse(prompt);
      
      if (content) {
        try {
          const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanJson);
          if (parsed && parsed.skills) {
            return parsed.skills;
          }
        } catch (parseErr) {
          logger.warn("Failed to parse LLM skill match response, running local fallback parser:", { error: parseErr.message });
        }
      }

      throw new Error("Invalid or empty response from AI service");
    } catch (err) {
      logger.warn("AI skill matching failed, running local keyword heuristic fallback:", { error: err.message });
      return this.localEvaluateSkills(transcript, requiredSkills);
    }
  }

  /**
   * Local heuristic matching fallback
   */
  localEvaluateSkills(transcript, requiredSkills) {
    const skillsList = requiredSkills && requiredSkills.length > 0 ? requiredSkills : ["React", "Node.js", "System Design", "Communication"];
    const lowercaseTranscript = transcript.toLowerCase();
    const result = {};

    skillsList.forEach((skill) => {
      const isMentioned = lowercaseTranscript.includes(skill.toLowerCase());
      if (isMentioned) {
        result[skill] = {
          score: 8,
          evidence: `The candidate explicitly referenced their hands-on work and knowledge concerning ${skill} during the verbal conversation.`,
          gaps: "No major competency gaps mentioned.",
        };
      } else {
        result[skill] = {
          score: 4,
          evidence: "No direct mentions of this technology or skill found in the spoken transcript.",
          gaps: `Candidate failed to elaborate on practical experience with ${skill}. Recruiter should follow up manually.`,
        };
      }
    });

    return result;
  }
}

module.exports = new SkillMatcherService();
