const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/offboarding.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/all", authorizeRole("admin", "hr"), ctrl.getAllOffboarding);
router.post("/", authorizeRole("admin", "hr"), ctrl.initiateOffboarding);
router.get("/:employeeId", ctrl.getOffboarding);
router.put("/:id/step", authorizeRole("admin", "hr"), ctrl.updateOffboardingStep);

module.exports = router;
