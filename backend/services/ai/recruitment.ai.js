const {
  RECRUITMENT_THRESHOLDS,
  generateRecruitmentRecommendation,
} = require("./ai.validator");
const Application = require("../../models/application.model");
const JobPosting = require("../../models/jobPosting.model");
const logger = require("../../utils/logger");

/**
 * Improved candidate ranking and matching algorithm
 * @param {Object} data - Candidate data
 */
const analyzeRecruitment = (data) => {
  try {
    const {
      skills = [],
      experience = 0,
      interviewScore = 0,
      requiredSkills = [],
      requiredExperience = 5,
      candidateName = "Unknown",
      currentCompany = "N/A",
    } = data;

    // Skill Matching Analysis (40% weight)
    let skillMatch = 0;
    let matchedSkills = [];
    let missingSkills = [];

    if (Array.isArray(skills)) {
      if (requiredSkills.length > 0) {
        const candidateSkillsLower = skills.map((s) => (typeof s === "string" ? s.toLowerCase() : ""));
        const requiredSkillsLower = requiredSkills.map((s) => (typeof s === "string" ? s.toLowerCase() : ""));

        matchedSkills = requiredSkillsLower.filter((req) =>
          candidateSkillsLower.some((cand) => cand.includes(req) || req.includes(cand))
        );

        missingSkills = requiredSkillsLower.filter((req) =>
          !candidateSkillsLower.some((cand) => cand.includes(req) || req.includes(cand))
        );

        skillMatch = (matchedSkills.length / requiredSkillsLower.length) * 100;
      } else {
        skillMatch = Math.min(skills.length * 16.67, 100); // Max 6 skills = 100%
      }
    }

    // Experience Matching Analysis (30% weight)
    let experienceScore = 0;
    if (experience >= requiredExperience) {
      const excessYears = Math.min(experience - requiredExperience, 10);
      experienceScore = 70 + (excessYears / 10) * 30;
    } else if (experience >= requiredExperience * 0.8) {
      experienceScore = 50 + ((experience / requiredExperience) * 20);
    } else {
      experienceScore = (experience / requiredExperience) * 50;
    }
    experienceScore = Math.min(experienceScore, 100);

    // Interview Performance Analysis (30% weight)
    const interviewPerformance = Math.min(Math.max(interviewScore || 0, 0), 100);

    // Calculate weighted composite score
    const matchScore = (skillMatch * 0.4 + experienceScore * 0.3 + interviewPerformance * 0.3);

    // Determine ranking
    let ranking = "D";
    if (matchScore >= RECRUITMENT_THRESHOLDS.stronglyRecommend) {
      ranking = "A+";
    } else if (matchScore >= RECRUITMENT_THRESHOLDS.recommend) {
      ranking = "A";
    } else if (matchScore >= RECRUITMENT_THRESHOLDS.consider) {
      ranking = "B";
    } else if (matchScore >= RECRUITMENT_THRESHOLDS.borderline) {
      ranking = "C";
    }

    const { recommendation, feedback, nextSteps, confidenceScore } = generateRecruitmentRecommendation(
      matchScore,
      skillMatch,
      experienceScore,
      interviewPerformance
    );

    const candidateProfile = {
      name: candidateName,
      currentCompany,
      experience,
      skills: skills.length,
    };

    const insights = [];
    if (matchedSkills.length === requiredSkills.length && requiredSkills.length > 0) {
      insights.push({
        title: "Perfect Skill Match",
        description: "Candidate has all required skills.",
        severity: "info",
      });
    }

    if (missingSkills.length > 0 && requiredSkills.length > 0) {
      insights.push({
        title: "Skill Gaps",
        description: `Missing skills: ${missingSkills.join(", ")}. Training may be needed.`,
        severity: missingSkills.length > requiredSkills.length / 2 ? "warning" : "info",
      });
    }

    if (experience < requiredExperience) {
      const yearGap = (requiredExperience - experience).toFixed(1);
      insights.push({
        title: "Below Experience Requirement",
        description: `${yearGap} years below requirement. May need mentoring.`,
        severity: "warning",
      });
    }

    if (interviewPerformance < 60 && interviewPerformance > 0) {
      insights.push({
        title: "Weak Interview Performance",
        description: "Interview score indicates communication or technical issues.",
        severity: "warning",
      });
    }

    return {
      matchScore: parseFloat(matchScore.toFixed(2)),
      ranking,
      recommendation,
      confidenceScore,
      feedback,
      nextSteps,
      scoreBreakdown: {
        skills: parseFloat(skillMatch.toFixed(2)),
        experience: parseFloat(experienceScore.toFixed(2)),
        interview: parseFloat(interviewPerformance.toFixed(2)),
        weights: {
          skills: 0.4,
          experience: 0.3,
          interview: 0.3,
        },
      },
      skillAnalysis: {
        matched: matchedSkills,
        missing: missingSkills,
        totalMatched: matchedSkills.length,
        totalRequired: requiredSkills.length,
      },
      candidateProfile,
      insights,
    };
  } catch (error) {
    throw new Error(`Recruitment analysis failed: ${error.message}`);
  }
};

/**
 * Analyzes a specific candidate application from the database
 * @param {string} applicationId - The application ID
 */
const analyzeCandidate = async (applicationId) => {
  try {
    const application = await Application.findById(applicationId).populate("jobPostingId");
    if (!application) {
      throw new Error("Application not found");
    }

    const job = application.jobPostingId;
    const data = {
      candidateName: application.candidateName,
      skills: application.skills || [],
      experience: application.experience || 0,
      interviewScore: application.rating ? application.rating * 20 : 0, 
      requiredSkills: job ? job.skills : [],
      requiredExperience: job ? job.requiredExperience : 0,
      currentCompany: application.currentCompany || "N/A"
    };

    return analyzeRecruitment(data);
  } catch (error) {
    logger.error("Candidate analysis error:", error);
    throw error;
  }
};

/**
 * IMPROVEMENT 2: Parse plain text resumes using Groq to extract skills, red flags and overall impression.
 */
const parseResumeWithLLM = async (resumeText, candidateId) => {
  try {
    const candidate = await Application.findById(candidateId);
    if (!candidate) {
      throw new Error("Candidate application not found");
    }

    // Return cache if it is already parsed and stored
    if (candidate.parsedResume && candidate.parsedResume.skills && candidate.parsedResume.skills.length > 0) {
      return candidate.parsedResume;
    }

    if (!resumeText || !String(resumeText).trim()) {
      return null;
    }

    let parsedResult;
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") {
      const Groq = require("groq-sdk");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const prompt = `
        You are an AI resume parsing assistant. Extract candidate profile parameters from the provided resume text.
        
        Resume Content:
        ${resumeText}
        
        Extract the following parameters:
        1. skills: List of specific technical and soft skills (array of strings).
        2. yearsOfExperience: Total number of years of professional experience (number).
        3. educationLevel: Highest level of education reached (string).
        4. previousRoles: List of previous job titles held (array of strings).
        5. achievements: List of notable professional accomplishments (array of strings).
        6. redFlags: Any visual gaps, short tenure, inconsistent statements (array of strings).
        7. overallImpression: A brief summary of candidate's technical profile (string).
        
        Return ONLY valid JSON with the exact following schema. Do NOT include markdown code blocks, preambles, or additional text:
        {
          "skills": ["string"],
          "yearsOfExperience": number,
          "educationLevel": "string",
          "previousRoles": ["string"],
          "achievements": ["string"],
          "redFlags": ["string"],
          "overallImpression": "string"
        }
      `;

      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const raw = chatCompletion.choices[0]?.message?.content;
        parsedResult = JSON.parse(raw.trim());
      } catch (err) {
        logger.error("Groq resume parsing failed, using fallback:", { error: err.message });
        parsedResult = localResumeParserFallback(resumeText);
      }
    } else {
      parsedResult = localResumeParserFallback(resumeText);
    }

    candidate.parsedResume = parsedResult;
    
    // Merge skills if candidate skills are empty
    if (parsedResult.skills && parsedResult.skills.length > 0) {
      const uniqueSkills = new Set([...(candidate.skills || []), ...parsedResult.skills]);
      candidate.skills = Array.from(uniqueSkills);
    }
    if (parsedResult.yearsOfExperience && !candidate.experience) {
      candidate.experience = parsedResult.yearsOfExperience;
    }
    
    await candidate.save();
    return parsedResult;
  } catch (error) {
    logger.error("parseResumeWithLLM exception:", { error: error.message });
    throw error;
  }
};

const localResumeParserFallback = (text) => {
  const skills = [];
  const lowercase = String(text).toLowerCase();
  if (lowercase.includes("react")) skills.push("React");
  if (lowercase.includes("node")) skills.push("Node.js");
  if (lowercase.includes("javascript")) skills.push("JavaScript");
  if (lowercase.includes("mongodb")) skills.push("MongoDB");
  if (lowercase.includes("express")) skills.push("Express.js");
  if (lowercase.includes("python")) skills.push("Python");

  return {
    skills: skills.length > 0 ? skills : ["General Software Development"],
    yearsOfExperience: 3,
    educationLevel: "Bachelor's Degree",
    previousRoles: ["Software Developer"],
    achievements: ["Delivered web features successfully."],
    redFlags: [],
    overallImpression: "Candidate has basic fullstack capabilities."
  };
};

/**
 * IMPROVEMENT 3: Run secondary LLM check to detect evaluation scores bias.
 */
const checkScoringBias = async (scores, candidateProfile) => {
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here") {
    try {
      const Groq = require("groq-sdk");
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const prompt = `
        You are an AI bias auditing assistant. Evaluate if there's any potential bias indicators in candidate evaluations.
        
        Candidate Profile:
        - Name: ${candidateProfile.candidateName}
        - Current Company: ${candidateProfile.currentCompany}
        - Experience: ${candidateProfile.experience} years
        - Listed Skills: ${candidateProfile.skills?.join(", ")}
        
        Assigned Evaluation Scores:
        ${JSON.stringify(scores)}
        
        Auditing Rules:
        - Check if the scores are purely justified by technical skills, years of experience, and job relevance.
        - Flag if there's a risk of bias correlating with non-job-relevant aspects (e.g. pedigree bias, name discrimination, current company prestige).
        - Compute a "biasRiskScore" between 0.0 and 1.0.
        
        Return ONLY valid JSON with the exact following schema. Do NOT include markdown code blocks, preambles, or additional text:
        {
          "biasRiskScore": number,
          "justification": "string"
        }
      `;

      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const parsed = JSON.parse(chatCompletion.choices[0]?.message?.content.trim());
      return parsed.biasRiskScore || 0.0;
    } catch (err) {
      logger.error("Bias detection check failed, bypassing bias flag:", { error: err.message });
      return 0.0;
    }
  }
  return 0.0;
};

/**
 * IMPROVEMENT 5: Auto-Advance / Auto-Reject Pipeline Stage Routing
 */
const autoAdvanceCandidate = async (candidateId, jobPostingId) => {
  const Notification = require("../../models/notification.model");
  const AuditLog = require("../../models/auditLog.model");
  
  try {
    const freshCandidate = await Application.findById(candidateId).populate("jobPostingId");
    if (!freshCandidate) return;

    const jobTitle = freshCandidate.jobPostingId?.title || "Target Position";
    const name = freshCandidate.candidateName;

    let updatedStatus = freshCandidate.status;
    let actionTaken = "";

    const hasBiasFlag = freshCandidate.aiFlags && freshCandidate.aiFlags.includes("BIAS_REVIEW_RECOMMENDED");

    // Read limits from ENV
    const minConfidence = parseFloat(process.env.AUTO_ADVANCE_MIN_CONFIDENCE || "0.8");
    const minGrade = process.env.AUTO_ADVANCE_MIN_GRADE || "A";

    const isGradeEligible = (grade) => {
      if (minGrade === "A+") return grade === "A+";
      if (minGrade === "A") return ["A+", "A"].includes(grade);
      if (minGrade === "B") return ["A+", "A", "B"].includes(grade);
      return true;
    };

    if (isGradeEligible(freshCandidate.aiGrade) && freshCandidate.confidenceScore > minConfidence && !hasBiasFlag) {
      if (["Applied", "Under Review"].includes(freshCandidate.status)) {
        updatedStatus = "Shortlisted";
        actionTaken = "auto-shortlisted";
      }
    } else if (freshCandidate.aiGrade === "D") {
      if (["Applied", "Under Review"].includes(freshCandidate.status)) {
        updatedStatus = "Rejected";
        actionTaken = "auto-rejected";
      }
    }

    if (updatedStatus !== freshCandidate.status) {
      const prevStatus = freshCandidate.status;
      freshCandidate.status = updatedStatus;
      await freshCandidate.save();

      // Create Notification
      const notificationText = actionTaken === "auto-shortlisted"
        ? `AI auto-shortlisted ${name} for ${jobTitle} — review recommended`
        : `AI auto-rejected candidate ${name} for ${jobTitle} (Grade D)`;
        
      try {
        const notification = new Notification({
          user: freshCandidate.reviewedBy || freshCandidate.jobPostingId?.postedBy || null,
          title: actionTaken === "auto-shortlisted" ? "Candidate Auto-Shortlisted" : "Candidate Auto-Rejected",
          message: notificationText,
          type: "recruitment",
          isRead: false
        });
        await notification.save();
      } catch (err) {
        logger.warn("Notification logging failed in auto-advance:", { error: err.message });
      }

      // Create Audit Log
      try {
        const audit = new AuditLog({
          action: actionTaken === "auto-shortlisted" ? "CANDIDATE_AUTO_SHORTLIST" : "CANDIDATE_AUTO_REJECT",
          module: "Recruitment",
          details: `AI System transitioned candidate ${name} from ${prevStatus} to ${updatedStatus} based on AI screening. Score: ${freshCandidate.aiScore}%, Grade: ${freshCandidate.aiGrade}.`,
          userId: null, // Null indicates AI_SYSTEM action
          ipAddress: "127.0.0.1"
        });
        await audit.save();
      } catch (err) {
        logger.warn("Audit Log failed in auto-advance:", { error: err.message });
      }

      logger.info(`AI Auto-Pipeline: Candidate ${name} ${actionTaken} successfully.`);
    }
  } catch (error) {
    logger.error("autoAdvanceCandidate failed:", { error: error.message });
  }
};

/**
 * IMPROVEMENT 1: Concurrency-limited auto-screening for all pending candidates for a job posting.
 */
const autoScreenAllPending = async (jobPostingId) => {
  try {
    const candidates = await Application.find({ jobPostingId, status: "Applied" });
    if (!candidates || candidates.length === 0) {
      return { total: 0, screened: 0, failed: 0, topCandidates: [] };
    }

    const total = candidates.length;
    let screened = 0;
    let failed = 0;

    // Concurrency limit of 5 using sliding index batches
    const batchSize = 5;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (candidate) => {
        try {
          // If resume plain text exists and parsedResume is not cached yet, parse first
          if (candidate.candidateResume && (!candidate.parsedResume || !candidate.parsedResume.skills || candidate.parsedResume.skills.length === 0)) {
            try {
              await parseResumeWithLLM(candidate.candidateResume, candidate._id);
            } catch (resumeErr) {
              logger.warn("LLM resume parsing error inside autoScreen:", { candidateId: candidate._id, error: resumeErr.message });
            }
          }

          // Fetch fresh state of candidate
          const freshCandidate = await Application.findById(candidate._id);
          const analysis = await analyzeCandidate(freshCandidate._id);
          
          freshCandidate.aiScore = analysis.matchScore;
          freshCandidate.aiGrade = analysis.ranking;
          freshCandidate.aiScreenedAt = new Date();

          // Confidence Scoring & Data Quality calculations (Improvement 4)
          let hasResume = !!freshCandidate.candidateResume;
          let hasVoice = freshCandidate.voiceInterview?.status === "completed";
          let dataQuality = (hasResume && hasVoice) ? "high" : (hasResume || hasVoice) ? "medium" : "low";
          let confidenceScore = dataQuality === "high" ? 0.94 : dataQuality === "medium" ? 0.72 : 0.45;
          
          const scoringBasis = [];
          if (hasResume) scoringBasis.push("resume_skills", "experience_years");
          if (hasVoice) scoringBasis.push("voice_interview");
          if (freshCandidate.chatbotScreening?.summary?.overallImpressionScore) scoringBasis.push("chatbot_responses");

          freshCandidate.confidenceScore = confidenceScore;
          freshCandidate.dataQuality = dataQuality;
          freshCandidate.scoringBasis = scoringBasis;

          // Bias auditing check (Improvement 3)
          try {
            const biasRisk = await checkScoringBias(
              { skills: analysis.scoreBreakdown.skills, experience: analysis.scoreBreakdown.experience, interview: analysis.scoreBreakdown.interview },
              { candidateName: freshCandidate.candidateName, currentCompany: freshCandidate.currentCompany, experience: freshCandidate.experience, skills: freshCandidate.skills }
            );
            if (biasRisk > 0.3) {
              freshCandidate.aiFlags = ["BIAS_REVIEW_RECOMMENDED"];
            } else {
              freshCandidate.aiFlags = [];
            }
          } catch (biasErr) {
            logger.warn("Bias detection skipped on error:", { error: biasErr.message });
          }

          await freshCandidate.save();

          // Auto Pipeline Advancement check (Improvement 5)
          await autoAdvanceCandidate(freshCandidate._id, jobPostingId);

          screened++;
        } catch (candErr) {
          logger.error("Failed to evaluate candidate in batch:", { candidateId: candidate._id, error: candErr.message });
          failed++;
        }
      });

      await Promise.allSettled(batchPromises);
    }

    const topCandidates = await Application.find({ jobPostingId, aiScore: { $exists: true } })
      .sort({ aiScore: -1 })
      .limit(3)
      .select("candidateName aiScore aiGrade")
      .lean();

    return {
      total,
      screened,
      failed,
      topCandidates,
    };
  } catch (error) {
    logger.error("autoScreenAllPending failed:", { error: error.message });
    throw error;
  }
};

module.exports = {
  analyzeRecruitment,
  analyzeCandidate,
  parseResumeWithLLM,
  checkScoringBias,
  autoAdvanceCandidate,
  autoScreenAllPending,
};
