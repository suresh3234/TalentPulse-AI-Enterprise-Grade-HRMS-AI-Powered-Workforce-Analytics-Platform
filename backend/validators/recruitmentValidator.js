const { body, param } = require("express-validator");

// Job Posting Validators
exports.createJobPostingValidator = [
  body("title").notEmpty().withMessage("Job title is required").isLength({ min: 3 }).withMessage("Title must be at least 3 characters"),
  body("description").notEmpty().withMessage("Description is required").isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
  body("department").notEmpty().withMessage("Department is required"),
  body("position").notEmpty().withMessage("Position is required"),
  body("requiredExperience")
    .notEmpty()
    .withMessage("Required experience is required")
    .isInt({ min: 0, max: 50 })
    .withMessage("Required experience must be between 0 and 50 years"),
  body("skills").optional().isArray().withMessage("Skills must be an array"),
  body("location").notEmpty().withMessage("Location is required"),
  body("jobType")
    .optional()
    .isIn(["Full-time", "Part-time", "Contract", "Temporary"])
    .withMessage("Invalid job type"),
  body("numberOfPositions")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Number of positions must be at least 1"),
  body("salary.min").optional().isInt({ min: 0 }).withMessage("Minimum salary must be positive"),
  body("salary.max").optional().isInt({ min: 0 }).withMessage("Maximum salary must be positive"),
];

exports.updateJobPostingValidator = [
  param("id").isMongoId().withMessage("Job Posting ID must be valid"),
  body("title").optional().isLength({ min: 3 }).withMessage("Title must be at least 3 characters"),
  body("description").optional().isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
  body("status")
    .optional()
    .isIn(["Open", "Closed", "On Hold"])
    .withMessage("Invalid status"),
];

exports.deleteJobPostingValidator = [
  param("id").isMongoId().withMessage("Job Posting ID must be valid"),
];

// Application Validators
exports.createApplicationValidator = [
  body("jobPostingId")
    .notEmpty()
    .withMessage("Job Posting ID is required")
    .isMongoId()
    .withMessage("Job Posting ID must be valid"),
  body("candidateName").notEmpty().withMessage("Candidate name is required"),
  body("candidateEmail")
    .notEmpty()
    .withMessage("Candidate email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("candidatePhone")
    .notEmpty()
    .withMessage("Candidate phone is required")
    .isMobilePhone()
    .withMessage("Invalid phone format"),
  body("experience")
    .notEmpty()
    .withMessage("Experience is required")
    .isInt({ min: 0, max: 60 })
    .withMessage("Experience must be between 0 and 60 years"),
  body("skills").optional().isArray().withMessage("Skills must be an array"),
];

exports.updateApplicationStatusValidator = [
  param("id").isMongoId().withMessage("Application ID must be valid"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["Applied", "Under Review", "Shortlisted", "Interview Scheduled", "Rejected", "Selected", "Offered", "Joined"])
    .withMessage("Invalid status"),
  body("feedback").optional().isLength({ min: 5 }).withMessage("Feedback must be at least 5 characters"),
  body("rating").optional().isInt({ min: 0, max: 5 }).withMessage("Rating must be between 0 and 5"),
];

exports.deleteApplicationValidator = [
  param("id").isMongoId().withMessage("Application ID must be valid"),
];
