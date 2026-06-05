const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");
const ctrl = require("../controllers/benefit.controller");

const router = express.Router();

router.use(authMiddleware);

router.get("/summary", authorizeRole("admin", "hr"), ctrl.getCompanyBenefitsSummary);
router.get("/:employeeId", ctrl.getEmployeeBenefits);
router.put("/:employeeId", authorizeRole("admin", "hr"), ctrl.updateBenefits);

module.exports = router;
