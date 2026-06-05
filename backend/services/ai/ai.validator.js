/**
 * AI Validation and Utility Functions
 * Provides validation, constants, and helper functions for AI services
 */

const ATTENDANCE_THRESHOLDS = {
  excellent: 95,
  good: 85,
  acceptable: 75,
  poor: 60,
};

const PERFORMANCE_THRESHOLDS = {
  topPerformer: 90,
  excellent: 80,
  good: 70,
  satisfactory: 60,
  needsImprovement: 50,
};

const RECRUITMENT_THRESHOLDS = {
  stronglyRecommend: 80,
  recommend: 70,
  consider: 60,
  borderline: 50,
};

const ALERT_SEVERITY = {
  CRITICAL: "critical",
  WARNING: "warning",
  INFO: "info",
};

/**
 * Validates attendance data
 */
const validateAttendanceData = (data) => {
  const errors = [];
  if (!data) errors.push("No attendance data provided");
  if (data && !data.status) errors.push("Status field missing");
  if (data && data.date && !(data.date instanceof Date)) errors.push("Invalid date format");
  return errors;
};

/**
 * Validates performance data
 */
const validatePerformanceData = (data) => {
  const errors = [];
  if (!data) errors.push("No performance data provided");
  if (data && data.score !== undefined && (typeof data.score !== "number" || data.score < 0 || data.score > 100)) {
    errors.push("Score must be a number between 0-100");
  }
  return errors;
};

/**
 * Validates recruitment data
 */
const validateRecruitmentData = (data) => {
  const errors = [];
  if (!data) errors.push("No recruitment data provided");
  if (data && !data.skills && !Array.isArray(data.skills)) errors.push("Skills must be an array");
  if (data && data.experience !== undefined && typeof data.experience !== "number") {
    errors.push("Experience must be a number");
  }
  if (data && data.interviewScore !== undefined && (typeof data.interviewScore !== "number" || data.interviewScore < 0 || data.interviewScore > 100)) {
    errors.push("Interview score must be between 0-100");
  }
  return errors;
};

/**
 * Parse time string (e.g., "09:30 AM") to minutes since midnight
 * @param {string} timeStr - Time in "HH:MM AM/PM" format
 * @returns {number} Minutes since midnight, or null if invalid
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return null;

  try {
    const parts = timeStr.trim().split(/\s+/);
    if (parts.length !== 2) return null;

    const [time, modifier] = parts;
    let [hours, minutes] = time.split(":").map(Number);

    if (isNaN(hours) || isNaN(minutes)) return null;

    if (modifier.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  } catch {
    return null;
  }
};

/**
 * Generate performance recommendation based on score and status
 */
const generatePerformanceRecommendation = (score, status) => {
  if (status === "Top Performer") {
    return {
      recommendation: "Excellent performance. Consider for leadership, mentorship, or promotion roles.",
      actionItems: [
        "Recognize and reward excellence",
        "Involve in strategic projects",
        "Consider for team lead position",
        "Leverage for training junior staff",
      ],
    };
  }
  if (status === "Good" || status === "Excellent") {
    return {
      recommendation: "Consistent high performance. Focus on skill development and knowledge sharing.",
      actionItems: [
        "Encourage skill certifications",
        "Assign challenging projects",
        "Include in knowledge transfer sessions",
      ],
    };
  }
  if (status === "Satisfactory") {
    return {
      recommendation: "Stable performance. Provide opportunities for growth and development.",
      actionItems: [
        "Identify skill gaps",
        "Create development plan",
        "Provide regular feedback",
      ],
    };
  }
  // Needs Improvement
  return {
    recommendation: "Performance below expectations. Immediate action required to support improvement.",
    actionItems: [
      "Schedule performance review meeting",
      "Create improvement plan with clear goals",
      "Provide mentorship or training",
      "Weekly check-ins recommended",
    ],
  };
};

/**
 * Generate recruitment recommendation with detailed feedback
 */
const generateRecruitmentRecommendation = (matchScore, skillMatch, experienceScore, interviewScore) => {
  const feedback = [];

  if (skillMatch >= 80) {
    feedback.push("Excellent skill alignment with job requirements.");
  } else if (skillMatch >= 60) {
    feedback.push("Good skill match with some gaps that can be trained.");
  } else {
    feedback.push("Limited skill match; significant training needed.");
  }

  if (experienceScore >= 80) {
    feedback.push("Strong experience level exceeds requirements.");
  } else if (experienceScore >= 60) {
    feedback.push("Adequate experience for the role.");
  } else {
    feedback.push("Experience below requirement; may need support.");
  }

  if (interviewScore >= 80) {
    feedback.push("Excellent interview performance with strong communication.");
  } else if (interviewScore >= 60) {
    feedback.push("Good interview performance.");
  } else if (interviewScore > 0) {
    feedback.push("Interview performance needs improvement.");
  }

  let recommendation = "Reject";
  let nextSteps = [];

  if (matchScore >= 80) {
    recommendation = "Strongly Recommend - Fast Track";
    nextSteps = ["Proceed to offer stage", "Schedule salary negotiation", "Conduct background check"];
  } else if (matchScore >= 70) {
    recommendation = "Recommend - Move Forward";
    nextSteps = ["Schedule second round interview", "Reference check", "Prepare offer"];
  } else if (matchScore >= 60) {
    recommendation = "Consider - Secondary Phase";
    nextSteps = ["Conduct technical assessment", "Additional interview rounds", "Evaluate cultural fit"];
  } else if (matchScore >= 50) {
    recommendation = "Borderline - Depends on pipeline";
    nextSteps = ["Compare with other candidates", "Consider skills training", "Hold for future consideration"];
  } else {
    recommendation = "Reject";
    nextSteps = ["Archive candidate profile", "Consider for other roles", "Request referrals"];
  }

  return {
    recommendation,
    feedback,
    nextSteps,
    confidenceScore: Math.round(matchScore),
  };
};

/**
 * Calculate attendance percentage with validation
 */
const calculateAttendancePercentage = (presentCount, totalDays) => {
  if (totalDays <= 0) return 0;
  return parseFloat(((presentCount / totalDays) * 100).toFixed(2));
};

/**
 * Determine attendance status based on percentage
 */
const getAttendanceStatus = (percentage) => {
  if (percentage >= ATTENDANCE_THRESHOLDS.excellent) return "Excellent";
  if (percentage >= ATTENDANCE_THRESHOLDS.good) return "Good";
  if (percentage >= ATTENDANCE_THRESHOLDS.acceptable) return "Acceptable";
  if (percentage >= ATTENDANCE_THRESHOLDS.poor) return "Poor";
  return "Critical";
};

/**
 * Generate attendance alert if needed
 */
const generateAttendanceAlert = (absentCount, lateCount, maxConsecutiveAbsences, totalDays, percentage) => {
  const alerts = [];

  if (maxConsecutiveAbsences >= 5) {
    alerts.push({
      severity: ALERT_SEVERITY.CRITICAL,
      title: "Critical Absences",
      message: `${maxConsecutiveAbsences} consecutive absences detected. Immediate action required.`,
      recommendation: "Contact employee immediately to understand situation and arrange support.",
    });
  } else if (maxConsecutiveAbsences >= 3) {
    alerts.push({
      severity: ALERT_SEVERITY.WARNING,
      title: "Frequent Absences",
      message: `${maxConsecutiveAbsences} consecutive absences detected.`,
      recommendation: "Schedule meeting with employee to discuss concerns.",
    });
  }

  if (lateCount >= 10) {
    alerts.push({
      severity: ALERT_SEVERITY.WARNING,
      title: "High Late Arrivals",
      message: `${lateCount} late arrivals this month (${((lateCount / totalDays) * 100).toFixed(1)}%).`,
      recommendation: "Discuss punctuality expectations and identify any challenges.",
    });
  }

  if (percentage < 75) {
    alerts.push({
      severity: ALERT_SEVERITY.CRITICAL,
      title: "Below Target Attendance",
      message: `Attendance at ${percentage}% is below 75% target.`,
      recommendation: "Review reasons and create improvement plan if needed.",
    });
  }

  return alerts;
};

module.exports = {
  ATTENDANCE_THRESHOLDS,
  PERFORMANCE_THRESHOLDS,
  RECRUITMENT_THRESHOLDS,
  ALERT_SEVERITY,
  validateAttendanceData,
  validatePerformanceData,
  validateRecruitmentData,
  parseTimeToMinutes,
  generatePerformanceRecommendation,
  generateRecruitmentRecommendation,
  calculateAttendancePercentage,
  getAttendanceStatus,
  generateAttendanceAlert,
};
