const { body, param, query } = require("express-validator");

/**
 * Payroll Validators
 */

exports.generatePayrollValidator = [
  body("employeeIds")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Employee IDs must be a non-empty array")
    .custom((ids) => ids.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage("All employee IDs must be valid MongoDB ObjectIds"),
  body("month")
    .notEmpty()
    .withMessage("Month is required")
    .isInt({ min: 1, max: 12 })
    .withMessage("Month must be between 1 and 12"),
  body("year")
    .notEmpty()
    .withMessage("Year is required")
    .isInt({ min: 2000, max: new Date().getFullYear() + 1 })
    .withMessage(`Year must be between 2000 and ${new Date().getFullYear() + 1}`),
];

exports.getPayrollValidator = [
  query("month")
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage("Month must be between 1 and 12"),
  query("year")
    .optional()
    .isInt({ min: 2000 })
    .withMessage("Year must be a valid year"),
  query("status")
    .optional()
    .isIn(["Pending", "Approved", "Paid", "Rejected"])
    .withMessage("Invalid payroll status"),
  query("employeeId")
    .optional()
    .isMongoId()
    .withMessage("Employee ID must be a valid MongoDB ObjectId"),
];

exports.payPayrollValidator = [
  param("id").isMongoId().withMessage("Payroll ID must be valid"),
  body("paidDate")
    .optional()
    .isISO8601()
    .withMessage("Paid date must be a valid date"),
  body("paymentMethod")
    .optional()
    .isIn(["Bank Transfer", "Check", "Cash", "Digital Wallet"])
    .withMessage("Invalid payment method"),
  body("transactionId")
    .optional()
    .isLength({ min: 5 })
    .withMessage("Transaction ID must be at least 5 characters"),
];

exports.approvePayrollValidator = [
  body("payrollIds")
    .isArray({ min: 1 })
    .withMessage("Payroll IDs must be a non-empty array")
    .custom((ids) => ids.every((id) => /^[0-9a-fA-F]{24}$/.test(id)))
    .withMessage("All payroll IDs must be valid MongoDB ObjectIds"),
  body("approvedBy")
    .optional()
    .isMongoId()
    .withMessage("Approver ID must be a valid MongoDB ObjectId"),
  body("remarks")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Remarks must be less than 500 characters"),
];

exports.updatePayrollValidator = [
  param("id").isMongoId().withMessage("Payroll ID must be valid"),
  body("baseSalary")
    .optional()
    .isNumeric()
    .withMessage("Base salary must be a number")
    .isFloat({ min: 0 })
    .withMessage("Base salary must be positive"),
  body("bonusPercentage")
    .optional()
    .isNumeric()
    .withMessage("Bonus percentage must be a number")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Bonus percentage must be between 0 and 100"),
  body("deductions")
    .optional()
    .isNumeric()
    .withMessage("Deductions must be a number")
    .isFloat({ min: 0 })
    .withMessage("Deductions must be positive"),
  body("overtimeHours")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Overtime hours must be a non-negative integer"),
];

exports.getPayslipValidator = [
  param("id").isMongoId().withMessage("Payroll ID must be valid"),
];

exports.deletePayrollValidator = [
  param("id").isMongoId().withMessage("Payroll ID must be valid"),
];
