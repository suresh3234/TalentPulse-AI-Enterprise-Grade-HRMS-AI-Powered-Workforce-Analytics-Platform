const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports.controller");
const authMiddleware = require("../middlewares/auth.middleware");

// All routes protected by auth middleware
router.use(authMiddleware);

// Get reports with filtering
router.get("/", reportsController.getReports);

// Get analytics summary
router.get("/summary", reportsController.getAnalyticsSummary);

// Get insights from reports
router.get("/insights", reportsController.getInsights);

// Generate new analytics report
router.post("/", reportsController.generateAnalytics);

// Get single report by ID
router.get("/:id", reportsController.getReportById);

// Delete report
router.delete("/:id", reportsController.deleteReport);

module.exports = router;
