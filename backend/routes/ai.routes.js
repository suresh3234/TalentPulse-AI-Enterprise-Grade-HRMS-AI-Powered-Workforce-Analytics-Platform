const express = require("express");
const aiController = require("../controllers/ai.controller");
const reportsController = require("../controllers/reports.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Protect all AI and reports routes with authentication
router.use(authMiddleware);

// Legacy AI endpoints
router.get("/attendance", aiController.getAttendanceAI);
router.get("/performance", aiController.getPerformanceAI);
router.post("/recruitment", aiController.postRecruitmentAI);

// Dashboard and assistant endpoints
router.get("/alerts", aiController.getAlerts);
router.get("/recommendations", aiController.getRecommendations);
router.get("/performance-summary", aiController.getPerformanceSummary);
router.post("/recruitment-chat", aiController.postRecruitmentChat);

// Reports & Analytics Routes
// Get all reports or filter by type
router.get("/reports", reportsController.getReports);

// Generate new analytics report
router.post("/reports", reportsController.generateAnalytics);

// Get single report by ID
router.get("/reports/:id", reportsController.getReportById);

// Delete report
router.delete("/reports/:id", reportsController.deleteReport);

// Get analytics summary
router.get("/analytics", reportsController.getAnalyticsSummary);

// Get comprehensive summary with all insights
router.get("/summary", reportsController.getAnalyticsSummary);

// Get insights from reports
router.get("/insights", reportsController.getInsights);

module.exports = router;
