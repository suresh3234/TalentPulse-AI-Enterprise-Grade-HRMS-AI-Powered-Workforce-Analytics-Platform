/**
 * AI Automation Triggers Service
 * Generates automated actions/triggers based on AI analysis
 */

const AUTOMATION_ACTIONS = {
  // Attendance-related
  SEND_ABSENCE_ALERT: "send_absence_alert",
  SCHEDULE_ABSENCE_REVIEW: "schedule_absence_review",
  AUTO_FLAG_ATTENDANCE_ISSUE: "auto_flag_attendance_issue",
  SEND_PUNCTUALITY_REMINDER: "send_punctuality_reminder",

  // Performance-related
  SCHEDULE_PERFORMANCE_REVIEW: "schedule_performance_review",
  TRIGGER_DEVELOPMENT_PLAN: "trigger_development_plan",
  NOMINATE_FOR_PROMOTION: "nominate_for_promotion",
  ASSIGN_MENTORSHIP: "assign_mentorship",

  // Recruitment-related
  FAST_TRACK_CANDIDATE: "fast_track_candidate",
  SCHEDULE_SECOND_INTERVIEW: "schedule_second_interview",
  SEND_REJECTION: "send_rejection",
  REQUEST_REFERENCE_CHECK: "request_reference_check",
};

/**
 * Generate automation triggers for attendance analysis
 */
const generateAttendanceTriggers = (attendanceData) => {
  const triggers = [];

  try {
    if (!attendanceData) return triggers;

    const { attendancePercentage, metrics, alerts } = attendanceData;

    // Critical: Multiple consecutive absences
    if (metrics.maxConsecutiveAbsences >= 5) {
      triggers.push({
        action: AUTOMATION_ACTIONS.SEND_ABSENCE_ALERT,
        priority: "high",
        message: `${metrics.maxConsecutiveAbsences} consecutive absences detected`,
        recipient: "hr_manager",
        trigger: "immediate",
        metadata: {
          consecutiveAbsences: metrics.maxConsecutiveAbsences,
          absentDates: `Last ${metrics.maxConsecutiveAbsences} working days`,
        },
      });

      triggers.push({
        action: AUTOMATION_ACTIONS.SCHEDULE_ABSENCE_REVIEW,
        priority: "high",
        message: "Schedule meeting to understand absence reasons",
        recipient: "department_manager",
        trigger: "within_24_hours",
        metadata: {
          duration: "30 minutes",
          type: "Absence Review",
        },
      });
    }

    // Warning: High absence rate
    if (attendancePercentage < 75) {
      triggers.push({
        action: AUTOMATION_ACTIONS.AUTO_FLAG_ATTENDANCE_ISSUE,
        priority: "medium",
        message: `Attendance ${attendancePercentage}% below target`,
        recipient: "hr_system",
        trigger: "immediate",
        metadata: {
          currentAttendance: attendancePercentage,
          targetAttendance: 85,
        },
      });
    }

    // Warning: Frequent late arrivals
    if (metrics.lateCount >= 10) {
      triggers.push({
        action: AUTOMATION_ACTIONS.SEND_PUNCTUALITY_REMINDER,
        priority: "medium",
        message: `${metrics.lateCount} late arrivals this month`,
        recipient: "employee",
        trigger: "end_of_week",
        metadata: {
          lateCount: metrics.lateCount,
          message:
            "We've noticed frequent late arrivals. Please discuss any challenges with your manager.",
        },
      });
    }

    return triggers;
  } catch (error) {
    console.error("Error generating attendance triggers:", error);
    return triggers;
  }
};

/**
 * Generate automation triggers for performance analysis
 */
const generatePerformanceTriggers = (performanceData) => {
  const triggers = [];

  try {
    if (!performanceData) return triggers;

    const { performanceScore, performanceStatus } = performanceData;

    // Top Performer - Consider for promotion/rewards
    if (performanceStatus === "Top Performer") {
      triggers.push({
        action: AUTOMATION_ACTIONS.NOMINATE_FOR_PROMOTION,
        priority: "high",
        message: "Top performer - consider for career advancement",
        recipient: "hr_manager",
        trigger: "monthly",
        metadata: {
          score: performanceScore,
          reason: "Exceptional performance across all metrics",
        },
      });

      triggers.push({
        action: AUTOMATION_ACTIONS.ASSIGN_MENTORSHIP,
        priority: "medium",
        message: "Consider for mentoring junior staff",
        recipient: "department_manager",
        trigger: "next_quarter",
        metadata: {
          role: "Peer Mentor",
          expectation: "Lead knowledge sharing sessions",
        },
      });
    }

    // Needs Improvement - Create development plan
    if (performanceStatus === "Needs Improvement") {
      triggers.push({
        action: AUTOMATION_ACTIONS.SCHEDULE_PERFORMANCE_REVIEW,
        priority: "high",
        message: "Performance below expectations - schedule review",
        recipient: "hr_manager",
        trigger: "within_7_days",
        metadata: {
          score: performanceScore,
          type: "Improvement Review",
          duration: "45 minutes",
        },
      });

      triggers.push({
        action: AUTOMATION_ACTIONS.TRIGGER_DEVELOPMENT_PLAN,
        priority: "high",
        message: "Create performance improvement plan",
        recipient: "department_manager",
        trigger: "after_review",
        metadata: {
          planDuration: "90 days",
          checkInFrequency: "weekly",
        },
      });
    }

    // Good/Excellent - Regular check-in and growth opportunities
    if (performanceStatus === "Good" || performanceStatus === "Excellent") {
      triggers.push({
        action: AUTOMATION_ACTIONS.SCHEDULE_PERFORMANCE_REVIEW,
        priority: "low",
        message: "Quarterly performance check-in",
        recipient: "department_manager",
        trigger: "quarterly",
        metadata: {
          type: "Growth Discussion",
          duration: "30 minutes",
        },
      });
    }

    return triggers;
  } catch (error) {
    console.error("Error generating performance triggers:", error);
    return triggers;
  }
};

/**
 * Generate automation triggers for recruitment analysis
 */
const generateRecruitmentTriggers = (recruitmentData) => {
  const triggers = [];

  try {
    if (!recruitmentData) return triggers;

    const { matchScore, ranking, recommendation } = recruitmentData;

    // A+ Ranking - Fast track to offer
    if (ranking === "A+" || matchScore >= 80) {
      triggers.push({
        action: AUTOMATION_ACTIONS.FAST_TRACK_CANDIDATE,
        priority: "high",
        message: "Excellent candidate match - fast track",
        recipient: "recruiter",
        trigger: "immediate",
        metadata: {
          score: matchScore,
          nextStep: "Proceed to offer stage",
          timeline: "24 hours",
        },
      });
    }

    // A Ranking - Schedule second interview
    if ((ranking === "A" || (matchScore >= 70 && matchScore < 80))) {
      triggers.push({
        action: AUTOMATION_ACTIONS.SCHEDULE_SECOND_INTERVIEW,
        priority: "high",
        message: "Good candidate - schedule second interview",
        recipient: "recruiter",
        trigger: "within_2_days",
        metadata: {
          interviewType: "Technical Round",
          duration: "60 minutes",
        },
      });

      triggers.push({
        action: AUTOMATION_ACTIONS.REQUEST_REFERENCE_CHECK,
        priority: "medium",
        message: "Request reference check",
        recipient: "hr_admin",
        trigger: "parallel_to_interview",
        metadata: {
          priority: "standard",
        },
      });
    }

    // Below threshold - Send rejection or hold
    if (ranking === "D" || matchScore < 50) {
      triggers.push({
        action: AUTOMATION_ACTIONS.SEND_REJECTION,
        priority: "medium",
        message: "Send rejection with feedback",
        recipient: "recruiter",
        trigger: "within_3_days",
        metadata: {
          template: "standard_rejection",
          includeFeedback: true,
        },
      });
    }

    // Fair candidate - Archive for future
    if (ranking === "C" || (matchScore >= 50 && matchScore < 60)) {
      triggers.push({
        action: "archive_candidate_profile",
        priority: "low",
        message: "Archive candidate for future openings",
        recipient: "recruiter",
        trigger: "end_of_week",
        metadata: {
          reason: "Fair match - keep for future consideration",
          tags: ["to-be-reconsidered"],
        },
      });
    }

    return triggers;
  } catch (error) {
    console.error("Error generating recruitment triggers:", error);
    return triggers;
  }
};

/**
 * Execute automation triggers
 * @param {Array} triggers - Array of trigger objects
 * @param {Object} context - Context with user, employee, candidate info
 */
const executeTriggers = async (triggers, context) => {
  const executionResults = [];
  const logger = require("../../utils/logger");
  
  // Import models needed for execution
  const Employee = require("../../models/employee.model");
  const Application = require("../../models/application.model");
  // const NotificationService = require("../notification.service"); // Assuming this exists or will be added

  try {
    for (const trigger of triggers) {
      try {
        logger.info(`Executing trigger: ${trigger.action}`, { context: trigger.metadata });
        
        let status = "completed";
        let detail = "";

        switch (trigger.action) {
          case AUTOMATION_ACTIONS.SEND_ABSENCE_ALERT:
          case AUTOMATION_ACTIONS.SEND_PUNCTUALITY_REMINDER:
            // TODO: Integrate with NotificationService
            detail = `Notification sent to ${trigger.recipient}`;
            break;

          case AUTOMATION_ACTIONS.AUTO_FLAG_ATTENDANCE_ISSUE:
            if (context.employeeId) {
              await Employee.findByIdAndUpdate(context.employeeId, {
                $set: { "metadata.attendanceFlag": true, "metadata.lastFlagDate": new Date() }
              });
              detail = "Employee flagged in system";
            }
            break;

          case AUTOMATION_ACTIONS.FAST_TRACK_CANDIDATE:
            if (context.applicationId) {
              await Application.findByIdAndUpdate(context.applicationId, {
                $set: { status: "Shortlisted", priority: "high" }
              });
              detail = "Candidate status updated to Shortlisted";
            }
            break;

          case AUTOMATION_ACTIONS.SEND_REJECTION:
            if (context.applicationId) {
              await Application.findByIdAndUpdate(context.applicationId, {
                $set: { status: "Rejected" }
              });
              detail = "Candidate status updated to Rejected";
            }
            break;

          default:
            status = "pending";
            detail = "Action queued for manual review or future implementation";
        }

        executionResults.push({
          action: trigger.action,
          status,
          detail,
          executedAt: new Date(),
          metadata: trigger.metadata
        });
      } catch (error) {
        logger.error(`Failed to execute trigger ${trigger.action}:`, error);
        executionResults.push({
          action: trigger.action,
          status: "failed",
          error: error.message,
        });
      }
    }

    return {
      success: true,
      totalTriggers: triggers.length,
      executed: executionResults.filter((r) => r.status === "completed").length,
      failed: executionResults.filter((r) => r.status === "failed").length,
      results: executionResults,
    };
  } catch (error) {
    logger.error("Error executing triggers:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  AUTOMATION_ACTIONS,
  generateAttendanceTriggers,
  generatePerformanceTriggers,
  generateRecruitmentTriggers,
  executeTriggers,
};
