const { body, param } = require("express-validator");

exports.createEmployeeValidator = [
  body("user")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
  body("position").notEmpty().withMessage("Position is required"),
  body("baseSalary")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("Base salary must be a number"),
  body("department").notEmpty().withMessage("Department is required"),
  body("role").notEmpty().withMessage("Role is required"),
];

exports.updateEmployeeValidator = [
  param("id").isMongoId().withMessage("Employee ID must be valid"),
  body("user")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
  body("position")
    .optional()
    .notEmpty()
    .withMessage("Position cannot be empty"),
  body("baseSalary")
    .optional({ nullable: true })
    .isNumeric()
    .withMessage("Base salary must be a number"),
  body("department")
    .optional()
    .notEmpty()
    .withMessage("Department cannot be empty"),
  body("role").optional().notEmpty().withMessage("Role cannot be empty"),
  body("status")
    .optional()
    .isIn(["Active", "Inactive", "On Leave", "Onboarding"])
    .withMessage("Invalid status value"),
];

exports.deleteEmployeeValidator = [
  param("id").isMongoId().withMessage("Employee ID must be valid"),
];
