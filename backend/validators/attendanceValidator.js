const { body, param, query } = require("express-validator");

/**
 * Attendance Validators
 */

exports.createAttendanceValidator = [
  body("employeeId")
    .notEmpty()
    .withMessage("Employee ID is required")
    .isMongoId()
    .withMessage("Employee ID must be a valid MongoDB ObjectId"),
  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage("Date must be a valid date (ISO8601)"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["Present", "Absent", "Leave", "Half Day", "Remote"])
    .withMessage("Invalid attendance status"),
  body("checkInTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-in time must be in HH:MM format"),
  body("checkOutTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-out time must be in HH:MM format"),
  body("remarks")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Remarks must be less than 500 characters"),
];

exports.updateAttendanceValidator = [
  param("id").isMongoId().withMessage("Attendance ID must be valid"),
  body("status")
    .optional()
    .isIn(["Present", "Absent", "Leave", "Half Day", "Remote"])
    .withMessage("Invalid attendance status"),
  body("checkInTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-in time must be in HH:MM format"),
  body("checkOutTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Check-out time must be in HH:MM format"),
  body("remarks")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Remarks must be less than 500 characters"),
];

exports.getAttendanceValidator = [
  query("employeeId")
    .optional()
    .isMongoId()
    .withMessage("Employee ID must be a valid MongoDB ObjectId"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),
  query("status")
    .optional()
    .isIn(["Present", "Absent", "Leave", "Half Day", "Remote"])
    .withMessage("Invalid attendance status"),
];

exports.deleteAttendanceValidator = [
  param("id").isMongoId().withMessage("Attendance ID must be valid"),
];
