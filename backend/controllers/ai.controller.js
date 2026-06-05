const aiAttendanceService = require("../services/ai/attendance.ai");
const aiPerformanceService = require("../services/ai/performance.ai");
const aiRecruitmentService = require("../services/ai/recruitment.ai");
const aiAlertService = require("../services/ai/alert.ai");
const aiRecommendationService = require("../services/ai/recommendation.ai");
const aiSummaryService = require("../services/ai/summary.ai");
const {
  generateAttendanceTriggers,
  generatePerformanceTriggers,
  generateRecruitmentTriggers,
} = require("../services/ai/automation.triggers");

/**
 * Standardized response format
 */
const sendResponse = (res, statusCode, success, message, data = null, metadata = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
  };
  if (data) response.data = data;
  if (metadata) response.metadata = metadata;
  return res.status(statusCode).json(response);
};

/**
 * Improved Attendance Analysis Endpoint
 */
exports.getAttendanceAI = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const attendanceData = await aiAttendanceService.analyzeAttendance(employeeId, start, end);

    // Generate automation triggers
    const triggers = generateAttendanceTriggers(attendanceData);

    const responseData = {
      analysis: attendanceData,
      triggers: {
        total: triggers.length,
        highPriority: triggers.filter((t) => t.priority === "high"),
        mediumPriority: triggers.filter((t) => t.priority === "medium"),
        allTriggers: triggers,
      },
    };

    return sendResponse(res, 200, true, "Attendance analysis completed successfully", responseData, {
      analysisDate: new Date(),
      version: "2.0",
    });
  } catch (error) {
    console.error("Attendance analysis error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to analyze attendance");
  }
};

/**
 * Improved Performance Analysis Endpoint
 */
exports.getPerformanceAI = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const performanceData = await aiPerformanceService.analyzePerformance(employeeId, start, end);

    // Generate automation triggers
    const triggers = generatePerformanceTriggers(performanceData);

    const responseData = {
      analysis: performanceData,
      triggers: {
        total: triggers.length,
        highPriority: triggers.filter((t) => t.priority === "high"),
        mediumPriority: triggers.filter((t) => t.priority === "medium"),
        allTriggers: triggers,
      },
    };

    return sendResponse(res, 200, true, "Performance analysis completed successfully", responseData, {
      analysisDate: new Date(),
      version: "2.0",
    });
  } catch (error) {
    console.error("Performance analysis error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to analyze performance");
  }
};

/**
 * Improved Recruitment Analysis Endpoint
 */
exports.postRecruitmentAI = async (req, res) => {
  try {
    const {
      candidateName,
      skills,
      experience,
      interviewScore,
      requiredSkills = [],
      requiredExperience = 5,
      currentCompany = "N/A",
    } = req.body;

    // Validation
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return sendResponse(res, 400, false, "skills must be a non-empty array");
    }

    if (experience === undefined || typeof experience !== "number") {
      return sendResponse(res, 400, false, "experience must be a number");
    }

    if (interviewScore === undefined || typeof interviewScore !== "number" || interviewScore < 0 || interviewScore > 100) {
      return sendResponse(res, 400, false, "interviewScore must be a number between 0-100");
    }

    const recruitmentData = aiRecruitmentService.analyzeRecruitment({
      candidateName,
      skills,
      experience,
      interviewScore,
      requiredSkills,
      requiredExperience,
      currentCompany,
    });

    // Generate automation triggers
    const triggers = generateRecruitmentTriggers(recruitmentData);

    const responseData = {
      analysis: recruitmentData,
      triggers: {
        total: triggers.length,
        highPriority: triggers.filter((t) => t.priority === "high"),
        mediumPriority: triggers.filter((t) => t.priority === "medium"),
        allTriggers: triggers,
      },
    };

    return sendResponse(res, 200, true, "Recruitment analysis completed successfully", responseData, {
      analysisDate: new Date(),
      version: "2.0",
    });
  } catch (error) {
    console.error("Recruitment analysis error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to analyze recruitment");
  }
};

/**
 * Alerts Generation Endpoint
 */
exports.getAlertsAI = async (req, res) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    const data = await aiAlertService.generateAlerts(employeeId);

    return sendResponse(res, 200, true, "Alerts generated successfully", data, {
      alertCount: data.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Alert generation error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to generate alerts");
  }
};

/**
 * Recommendations Generation Endpoint
 */
exports.getRecommendationsAI = async (req, res) => {
  try {
    const { employeeId, scope, jobPostingId, month, year, windowDays, limit } = req.query;
    console.log("DEBUG: AI Recommendation Request", { employeeId, scope });

    let data;
    if (employeeId) {
      data = await aiRecommendationService.generateRecommendations(employeeId, scope);
    } else {
      const { buildSmartRecommendations } = require("../services/aiAutomation.service");
      data = await buildSmartRecommendations({ scope, jobPostingId, month, year, windowDays, limit });
    }

    const count = Array.isArray(data) ? data.length : (data ? 1 : 0);

    return sendResponse(res, 200, true, "Recommendations generated successfully", data, {
      recommendationCount: count,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Recommendation generation error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to generate recommendations");
  }
};

/**
 * Performance Summary Endpoint
 */
exports.getPerformanceSummaryAI = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId) {
      return sendResponse(res, 400, false, "employeeId is required");
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const summaryData = await aiSummaryService.generateSummary(employeeId, start, end);

    return sendResponse(res, 200, true, "Performance summary generated successfully", summaryData, {
      generatedAt: new Date(),
      version: "2.0",
    });
  } catch (error) {
    console.error("Summary generation error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to generate summary");
  }
};

/**
 * Alias endpoints
 */
exports.getAlerts = exports.getAlertsAI;
exports.getRecommendations = exports.getRecommendationsAI;
exports.getPerformanceSummary = exports.getPerformanceSummaryAI;

/**
 * Recruitment Chat Endpoint — properly wired to buildRecruitmentChatReply()
 */
exports.postRecruitmentChat = async (req, res) => {
  try {
    const { message, context, conversationHistory = [] } = req.body;

    if (!message || typeof message !== "string") {
      return sendResponse(res, 400, false, "message is required and must be a string");
    }

    // Try to load the chat service
    let chatReply;
    try {
      const aiAutomation = require("../services/aiAutomation.service");
      if (typeof aiAutomation.buildRecruitmentChatReply === "function") {
        chatReply = await aiAutomation.buildRecruitmentChatReply(message, context || {});
      }
    } catch (loadErr) {
      // Fallback if service not available
    }

    if (!chatReply) {
      // Intelligent fallback — keyword-based response
      const lower = message.toLowerCase();
      if (lower.includes("candidate") || lower.includes("skill") || lower.includes("best")) {
        chatReply = {
          reply: "I can help you analyze candidates. Try asking about top candidates, skill gaps, or hiring recommendations for a specific role.",
          confidence: 0.7,
        };
      } else if (lower.includes("interview") || lower.includes("schedule")) {
        chatReply = {
          reply: "For interview scheduling, go to a specific application and use the Schedule Interview feature. I can help you prepare interview questions too.",
          confidence: 0.7,
        };
      } else if (lower.includes("help") || lower.includes("what can")) {
        chatReply = {
          reply: "I'm your AI recruitment assistant! I can help with: analyzing candidates, identifying skill gaps, recommending hires, preparing interview questions, and providing hiring insights.",
          confidence: 0.9,
        };
      } else {
        chatReply = {
          reply: `I understand you're asking about "${message}". I can help with candidate analysis, skill matching, interview preparation, and hiring recommendations. Could you be more specific?`,
          confidence: 0.5,
        };
      }
    }

    return sendResponse(res, 200, true, "Chat reply generated", {
      reply: chatReply.reply || chatReply,
      confidence: chatReply.confidence || 0.8,
      conversationHistory: [...conversationHistory.slice(-4), { role: "user", content: message }, { role: "assistant", content: chatReply.reply || chatReply }],
    });
  } catch (error) {
    console.error("Recruitment chat error:", error);
    return sendResponse(res, 500, false, error.message || "Failed to generate chat reply");
  }
};
