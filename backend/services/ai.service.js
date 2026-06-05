// AI Integration Service for Candidate Evaluation
const axios = require("axios");
const { getAiResponse } = require("../utils/ai-service-client");

class AIService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY || "demo-key";
    this.apiEndpoint = process.env.AI_API_ENDPOINT || "https://api.openai.com/v1";
    this.model = process.env.AI_MODEL || "gpt-3.5-turbo";
  }

  // Evaluate candidate resume and skills match
  async evaluateCandidate(candidate, jobRequirements) {
    try {
      const skillsCandidate = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : (candidate.skills || "");
      const skillsRequired = Array.isArray(jobRequirements.skills) ? jobRequirements.skills.join(", ") : (jobRequirements.skills || "");

      const prompt = `
        Evaluate the following candidate for a job position and provide a score from 0-100 and brief feedback.
        
        Job Requirements:
        - Position: ${jobRequirements.position || jobRequirements.title || "Software Engineer"}
        - Required Experience: ${jobRequirements.requiredExperience || 0} years
        - Required Skills: ${skillsRequired}
        - Department: ${jobRequirements.department || "Engineering"}
        
        Candidate Profile:
        - Name: ${candidate.candidateName}
        - Experience: ${candidate.experience || 0} years
        - Skills: ${skillsCandidate}
        - Current Company: ${candidate.currentCompany || "N/A"}
        
        Response format: {"score": number, "match": "High/Medium/Low", "feedback": "string"}
        Respond with ONLY the valid JSON object. No extra text, markdown formatting, or explanation.
      `;

      const content = await getAiResponse(prompt);
      if (!content) {
        throw new Error("No response from local AI service");
      }

      // Clean formatting
      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.log("AI API unavailable, using local evaluation:", error.message);
      return this.localEvaluateCandidate(candidate, jobRequirements);
    }
  }

  // Local evaluation function (fallback)
  localEvaluateCandidate(candidate, jobRequirements) {
    let score = 50; // Base score
    let feedback = "";

    // Experience matching
    const reqExp = jobRequirements.requiredExperience || 0;
    const candExp = candidate.experience || 0;
    const expDifference = Math.abs(candExp - reqExp);
    if (candExp >= reqExp) {
      score += Math.min(20, (candExp - reqExp) * 2);
    } else {
      score -= expDifference * 5;
    }

    // Skills matching
    const candidateSkills = (Array.isArray(candidate.skills) ? candidate.skills : [candidate.skills || ""]).map(s => String(s).toLowerCase());
    const requiredSkills = (Array.isArray(jobRequirements.skills) ? jobRequirements.skills : [jobRequirements.skills || ""]).map(s => String(s).toLowerCase());
    const matchedSkills = candidateSkills.filter(s => 
      requiredSkills.some(req => req.includes(s) || s.includes(req))
    );
    
    const skillsMatchPercentage = requiredSkills.length > 0 ? (matchedSkills.length / requiredSkills.length) * 30 : 15;
    score += skillsMatchPercentage;

    // Calculate match level
    let match = "Low";
    if (score >= 70) match = "High";
    else if (score >= 50) match = "Medium";

    // Generate feedback
    if (score >= 75) {
      feedback = `Strong candidate with ${matchedSkills.length}/${requiredSkills.length} required skills and ${candExp} years of experience.`;
    } else if (score >= 50) {
      feedback = `Good match with ${matchedSkills.length}/${requiredSkills.length} required skills. Experience level acceptable.`;
    } else {
      feedback = `Moderate fit. Missing skills: ${requiredSkills.filter(s => !matchedSkills.includes(s)).join(", ")}. Experience may need development.`;
    }

    return {
      score: Math.min(100, Math.max(0, Math.round(score))),
      match,
      feedback
    };
  }

  // Generate interview questions based on candidate profile
  async generateInterviewQuestions(candidate, jobRequirements, count = 5) {
    try {
      const skillsCandidate = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : (candidate.skills || "");
      const skillsRequired = Array.isArray(jobRequirements.skills) ? jobRequirements.skills.join(", ") : (jobRequirements.skills || "");

      const prompt = `
        Generate ${count} relevant interview questions for a candidate applying for ${jobRequirements.position || jobRequirements.title || "Software Engineer"} role.
        The candidate has ${candidate.experience || 0} years of experience with skills: ${skillsCandidate}.
        Required skills: ${skillsRequired}.
        
        Response format: {"questions": ["question1", "question2", ...]}
        Respond with ONLY the valid JSON object. No extra text, markdown formatting, or explanation.
      `;

      const content = await getAiResponse(prompt);
      if (!content) {
        throw new Error("No response from local AI service");
      }

      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.log("Using local question generation:", error.message);
      return this.localGenerateQuestions(candidate, jobRequirements, count);
    }
  }

  // Local question generation
  localGenerateQuestions(candidate, jobRequirements, count = 5) {
    const requiredSkills = Array.isArray(jobRequirements.skills) ? jobRequirements.skills : [jobRequirements.skills || "Skill"];
    const questions = [
      `Tell us about your experience with ${requiredSkills[0]} and how you've applied it in your previous role at ${candidate.currentCompany || "your previous company"}.`,
      `You have ${candidate.experience || 0} years of experience. Can you describe a challenging project you led and how you overcome obstacles?`,
      `Our position requires expertise in ${requiredSkills.join(", ")}. How do you stay updated with the latest technologies?`,
      `Describe your experience working in a ${jobRequirements.department || "Engineering"} team and your preferred collaboration style.`,
      `Where do you see yourself in this role in 2 years, and how does this position align with your career goals?`
    ];

    return {
      questions: questions.slice(0, count)
    };
  }

  // Score interview response
  async scoreInterviewResponse(response, question, ideal_answer = null) {
    try {
      const prompt = `
        Score the following interview response on a scale of 1-10.
        Question: ${question}
        Candidate Response: ${response}
        ${ideal_answer ? `Expected answer includes: ${ideal_answer}` : ""}
        
        Response format: {"score": number, "remarks": "string"}
        Respond with ONLY the valid JSON object. No extra text, markdown formatting, or explanation.
      `;

      const content = await getAiResponse(prompt);
      if (!content) {
        throw new Error("No response from local AI service");
      }

      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.log("Using local scoring:", error.message);
      return this.localScoreResponse(response, question);
    }
  }

  // Local response scoring
  localScoreResponse(response, question) {
    if (!response || response.length < 50) {
      return {
        score: 3,
        remarks: "Response too brief. Provide more detailed explanation."
      };
    }

    if (response.length < 200) {
      return {
        score: 5,
        remarks: "Adequate response but lacks depth. Include more examples."
      };
    }

    if (response.length > 500) {
      return {
        score: 7,
        remarks: "Good detailed response. Consider being more concise."
      };
    }

    return {
      score: 8,
      remarks: "Strong response with good explanation and examples."
    };
  }
}

module.exports = new AIService();
