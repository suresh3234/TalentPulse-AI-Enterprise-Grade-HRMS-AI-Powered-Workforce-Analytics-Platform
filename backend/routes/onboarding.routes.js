const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/onboarding.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/all", authorizeRole("admin", "hr"), ctrl.getAllOnboarding);
router.post("/", authorizeRole("admin", "hr"), ctrl.createOnboarding);
router.get("/:employeeId", ctrl.getOnboardingStatus);
router.put("/:employeeId/task/:taskId", ctrl.updateTaskStatus);

module.exports = router;
