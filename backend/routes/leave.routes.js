const express = require("express");
const {
  createLeave,
  getAllLeaves,
  getLeaveById,
  updateLeave,
  approveLeave,
  deleteLeave,
  getLeaveBalance,
} = require("../controllers/leave.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate");
const {
  createLeaveValidator,
  updateLeaveValidator,
  approveLeaveValidator,
  deleteLeaveValidator,
} = require("../validators/leaveValidator");

const router = express.Router();

// Create leave request (must be BEFORE /:id wildcard)
router.post("/create", createLeaveValidator, validate, createLeave);

// Get leave balance for employee (must be BEFORE /:id wildcard)
router.get("/balance/:employeeId", getLeaveBalance);

// Get all leaves
router.get("/", getAllLeaves);

// Approve/Reject leave (specific route, goes before /:id)
router.put("/approve/:id", approveLeaveValidator, validate, approveLeave);

// Get leave by ID (wildcard parameter - must be AFTER specific routes)
router.get("/:id", getLeaveById);

// Update leave request (generic wildcard)
router.put("/:id", updateLeaveValidator, validate, updateLeave);

// Delete leave request (generic wildcard)
router.delete("/:id", deleteLeaveValidator, validate, deleteLeave);

module.exports = router;
