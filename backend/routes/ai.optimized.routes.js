const express = require("express");
const aiOptimizedController = require("../controllers/ai.optimized.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: AI - Optimized
 *   description: High-performance AI endpoints with caching and error recovery
 */

/**
 * @swagger
 * /ai/health:
 *   get:
 *     summary: Get system health and performance metrics
 *     tags: [AI - Optimized]
 *     responses:
 *       200:
 *         description: System health status
 */
router.get("/health", aiOptimizedController.getSystemHealth);

/**
 * @swagger
 * /ai/attendance:
 *   get:
 *     summary: Analyze attendance with caching (Optimized)
 *     tags: [AI - Optimized]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         description: Employee ID
 *       - in: query
 *         name: startDate
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         description: End date (ISO format)
 *       - in: query
 *         name: useCache
 *         description: Use cached results if available
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Attendance analysis results
 */
router.get("/attendance", aiOptimizedController.getAttendanceAI);

/**
 * @swagger
 * /ai/performance:
 *   get:
 *     summary: Analyze performance with caching (Optimized)
 *     tags: [AI - Optimized]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *       - in: query
 *         name: startDate
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         description: End date (ISO format)
 *       - in: query
 *         name: useCache
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: Performance analysis results
 */
router.get("/performance", aiOptimizedController.getPerformanceAI);

/**
 * @swagger
 * /ai/queue-analytics:
 *   post:
 *     summary: Queue analytics job for background processing
 *     tags: [AI - Optimized]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *             properties:
 *               employeeId:
 *                 type: string
 *               analysisType:
 *                 type: string
 *                 enum: [comprehensive, attendance, performance]
 *     responses:
 *       202:
 *         description: Job queued successfully
 */
router.post("/queue-analytics", aiOptimizedController.queueAnalyticsJob);

/**
 * @swagger
 * /ai/job/{jobId}:
 *   get:
 *     summary: Get background job status
 *     tags: [AI - Optimized]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job status and progress
 */
router.get("/job/:jobId", aiOptimizedController.getJobStatus);

/**
 * @swagger
 * /ai/cache/clear:
 *   post:
 *     summary: Clear all cached data (Admin only)
 *     tags: [AI - Optimized]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post("/cache/clear", authMiddleware, aiOptimizedController.clearCache);

module.exports = router;
