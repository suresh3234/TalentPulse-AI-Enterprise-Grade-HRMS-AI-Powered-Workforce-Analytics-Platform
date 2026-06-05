// Candidate Workflow State Management
// Workflow: Applied → Under Review/Interview → Selected/Rejected

const WORKFLOW_STATUSES = {
  APPLIED: "Applied",
  UNDER_REVIEW: "Under Review",
  SHORTLISTED: "Shortlisted",
  INTERVIEW_SCHEDULED: "Interview Scheduled",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  OFFERED: "Offered",
  JOINED: "Joined"
};

// Define valid state transitions
const VALID_TRANSITIONS = {
  [WORKFLOW_STATUSES.APPLIED]: [
    WORKFLOW_STATUSES.UNDER_REVIEW,
    WORKFLOW_STATUSES.SHORTLISTED,
    WORKFLOW_STATUSES.REJECTED
  ],
  [WORKFLOW_STATUSES.UNDER_REVIEW]: [
    WORKFLOW_STATUSES.SHORTLISTED,
    WORKFLOW_STATUSES.REJECTED,
    WORKFLOW_STATUSES.INTERVIEW_SCHEDULED
  ],
  [WORKFLOW_STATUSES.SHORTLISTED]: [
    WORKFLOW_STATUSES.INTERVIEW_SCHEDULED,
    WORKFLOW_STATUSES.REJECTED
  ],
  [WORKFLOW_STATUSES.INTERVIEW_SCHEDULED]: [
    WORKFLOW_STATUSES.SELECTED,
    WORKFLOW_STATUSES.REJECTED
  ],
  [WORKFLOW_STATUSES.SELECTED]: [
    WORKFLOW_STATUSES.OFFERED,
    WORKFLOW_STATUSES.REJECTED
  ],
  [WORKFLOW_STATUSES.OFFERED]: [
    WORKFLOW_STATUSES.JOINED,
    WORKFLOW_STATUSES.REJECTED
  ],
  [WORKFLOW_STATUSES.REJECTED]: [],
  [WORKFLOW_STATUSES.JOINED]: []
};

// Check if transition is valid
const isValidTransition = (currentStatus, newStatus) => {
  if (!VALID_TRANSITIONS[currentStatus]) {
    return false;
  }
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
};

// Get allowed transitions from current status
const getAllowedTransitions = (currentStatus) => {
  return VALID_TRANSITIONS[currentStatus] || [];
};

// Validate workflow stage
const validateWorkflowStage = (status) => {
  return Object.values(WORKFLOW_STATUSES).includes(status);
};

// Get workflow stage description
const getStageDescription = (status) => {
  const descriptions = {
    [WORKFLOW_STATUSES.APPLIED]: "Application submitted by candidate",
    [WORKFLOW_STATUSES.UNDER_REVIEW]: "Application under initial review",
    [WORKFLOW_STATUSES.SHORTLISTED]: "Candidate shortlisted for interview",
    [WORKFLOW_STATUSES.INTERVIEW_SCHEDULED]: "Interview scheduled with candidate",
    [WORKFLOW_STATUSES.SELECTED]: "Candidate selected after interview",
    [WORKFLOW_STATUSES.REJECTED]: "Candidate rejected",
    [WORKFLOW_STATUSES.OFFERED]: "Job offer extended to candidate",
    [WORKFLOW_STATUSES.JOINED]: "Candidate has joined the organization"
  };
  return descriptions[status] || "Unknown status";
};

module.exports = {
  WORKFLOW_STATUSES,
  VALID_TRANSITIONS,
  isValidTransition,
  getAllowedTransitions,
  validateWorkflowStage,
  getStageDescription
};
