const { body, param } = require("express-validator");

exports.createLeaveValidator = [
  body("employeeId")
    .notEmpty()
    .withMessage("Employee ID is required")
    .isMongoId()
    .withMessage("Employee ID must be a valid MongoDB ObjectId"),
  body("leaveType")
    .notEmpty()
    .withMessage("Leave type is required")
    .isIn(["Sick Leave", "Casual Leave", "Annual Leave", "Maternity Leave", "Paternity Leave", "Unpaid Leave"])
    .withMessage("Invalid leave type"),
  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid date"),
  body("reason")
    .notEmpty()
    .withMessage("Reason is required")
    .isLength({ min: 5 })
    .withMessage("Reason must be at least 5 characters"),
  body("numberOfDays")
    .notEmpty()
    .withMessage("Number of days is required")
    .isInt({ min: 1, max: 365 })
    .withMessage("Number of days must be between 1 and 365"),
];

exports.updateLeaveValidator = [
  param("id").isMongoId().withMessage("Leave ID must be valid"),
  body("leaveType")
    .optional()
    .isIn(["Sick Leave", "Casual Leave", "Annual Leave", "Maternity Leave", "Paternity Leave", "Unpaid Leave"])
    .withMessage("Invalid leave type"),
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),
  body("reason")
    .optional()
    .isLength({ min: 5 })
    .withMessage("Reason must be at least 5 characters"),
  body("numberOfDays")
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage("Number of days must be between 1 and 365"),
];

exports.approveLeaveValidator = [
  param("id").isMongoId().withMessage("Leave ID must be valid"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["Approved", "Rejected"])
    .withMessage("Status must be Approved or Rejected"),
  body("remarks")
    .optional()
    .isLength({ min: 3 })
    .withMessage("Remarks must be at least 3 characters if provided"),
];

exports.deleteLeaveValidator = [
  param("id").isMongoId().withMessage("Leave ID must be valid"),
];
