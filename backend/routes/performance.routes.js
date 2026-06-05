const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/performance.controller");

const router = express.Router();

router.use(authMiddleware);

// Goals
router.post("/goals", ctrl.createGoal);
router.get("/goals", ctrl.getGoals);
router.put("/goals/:id", ctrl.updateGoal);
router.delete("/goals/:id", authorizeRole("admin", "hr", "manager"), ctrl.deleteGoal);

// Appraisals
router.post("/appraisal/start", authorizeRole("admin", "hr", "manager"), ctrl.startAppraisalCycle);
router.post("/appraisal/:id/self-review", ctrl.submitSelfReview);
router.post("/appraisal/:id/manager-review", authorizeRole("admin", "hr", "manager"), ctrl.submitManagerReview);
router.get("/appraisals", ctrl.getAppraisals);
router.get("/appraisal/:id", ctrl.getAppraisalById);

module.exports = router;
