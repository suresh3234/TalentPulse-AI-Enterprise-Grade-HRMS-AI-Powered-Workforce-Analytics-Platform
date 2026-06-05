const { validationResult, body, param } = require("express-validator");
const validator = require("validator");

/**
 * Standardized validation error handler middleware
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

// POST /api/users/login validation rules
const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Must be a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// POST /api/recruitment/chatbot validation rules
const chatbotValidator = [
  body("message")
    .isString()
    .withMessage("Message must be a string")
    .isLength({ max: 1000 })
    .withMessage("Message cannot exceed 1000 characters")
    .trim()
    .escape(),
  body("sessionId")
    .custom((value) => {
      if (!value) return true;
      const strVal = String(value);
      if (
        validator.isUUID(strVal) ||
        validator.isMongoId(strVal) ||
        strVal.startsWith("session_")
      ) {
        return true;
      }
      throw new Error("Session ID must be a valid UUID, Mongo ID, or session key");
    })
    .optional({ nullable: true }),
  body("candidateId")
    .isMongoId()
    .withMessage("Candidate ID must be a valid Mongo ID")
    .optional({ nullable: true, checkFalsy: true }),
];

// POST /api/recruitment/voice-interview/score validation rules
const voiceScoreValidator = [
  body("candidateId")
    .isMongoId()
    .withMessage("Candidate ID must be a valid Mongo ID"),
  body("jobPostingId")
    .isMongoId()
    .withMessage("Job Posting ID must be a valid Mongo ID"),
  body("questionIndex")
    .isInt({ min: 0, max: 20 })
    .withMessage("Question index must be an integer between 0 and 20"),
  body("answerTranscript")
    .isString()
    .withMessage("Transcript must be a string")
    .isLength({ min: 1, max: 5000 })
    .withMessage("Transcript must be between 1 and 5000 characters")
    .trim(),
];

// POST /api/recruitment/application/:id/evaluate-ai validation rules
const evaluateAiValidator = [
  param("applicationId")
    .isMongoId()
    .withMessage("Application ID parameter must be a valid Mongo ID"),
];

// Attach hybrid bindings for full compatibility with both:
// 1. const validate = require("../middlewares/validate"); (e.g. employee.routes.js)
// 2. const { validate, chatbotValidator } = require("../middlewares/validate"); (e.g. recruitment.routes.js)
validate.validate = validate;
validate.loginValidator = loginValidator;
validate.chatbotValidator = chatbotValidator;
validate.voiceScoreValidator = voiceScoreValidator;
validate.evaluateAiValidator = evaluateAiValidator;

module.exports = validate;
