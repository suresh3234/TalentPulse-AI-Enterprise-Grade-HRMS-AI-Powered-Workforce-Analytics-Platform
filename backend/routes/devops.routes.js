const express = require("express");
const router = express.Router();
const devopsController = require("../controllers/devops.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");

// Secure all devops routes with admin-only authentication
router.use(authMiddleware);
router.use(authorizeRole("admin"));

/**
 * @route GET /api/devops/metrics
 * @desc Get real-time system and AI metrics
 */
router.get("/metrics", devopsController.getMetrics);

/**
 * @route GET /api/devops/health
 * @desc Detailed system health check
 */
router.get("/health", devopsController.getHealth);

/**
 * @route GET /api/devops/logs
 * @desc Retrieve recent error logs
 */
router.get("/logs", devopsController.getLogs);

/**
 * @route POST /api/devops/simulate
 * @desc Inject simulation overrides or trigger system alerts
 */
router.post("/simulate", devopsController.simulate);

/**
 * @route GET /api/devops/performance
 * @desc Get performance monitoring data
 */
router.get("/performance", devopsController.getPerformanceMetrics);

/**
 * @route GET /api/devops/query-optimizations
 * @desc Get database query optimization recommendations
 */
router.get("/query-optimizations", devopsController.getQueryOptimizations);

/**
 * @route GET /api/devops/cache-optimizations
 * @desc Get cache optimization recommendations
 */
router.get("/cache-optimizations", devopsController.getCacheOptimizations);

/**
 * @route GET /api/devops/ai-optimizations
 * @desc Get AI optimization recommendations
 */
router.get("/ai-optimizations", devopsController.getAiOptimizations);

/**
 * @route GET /api/devops/performance-tests
 * @desc Run performance tests (takes 1-2 minutes)
 */
router.get("/performance-tests", devopsController.runPerformanceTests);

/**
 * @route GET /api/devops/performance-health
 * @desc Get current performance health status
 */
router.get("/performance-health", devopsController.getPerformanceHealth);

/**
 * @route GET /api/devops/analysis
 * @desc Get comprehensive system analysis and recommendations
 */
router.get("/analysis", devopsController.getSystemAnalysis);

module.exports = router;
