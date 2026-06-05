const express = require("express");
const {
  generatePayroll,
  getPayroll,
  getPayslip,
  markAsPaid,
  approveAllPayroll,
  downloadPayslipPDF,
  getMyPayroll,
} = require("../controllers/payroll.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");

const router = express.Router();

// Apply authentication middleware globally to all payroll routes
router.use(authMiddleware);

router.post("/generate", authorizeRole("admin", "hr"), generatePayroll);
router.get("/", authorizeRole("admin", "hr", "manager"), getPayroll);
router.get("/my", getMyPayroll);
router.get("/payslip", getPayslip);
router.get("/payslip/:id", getPayslip);
router.get("/payslip/:id/pdf", downloadPayslipPDF);
router.put("/pay/:id", authorizeRole("admin", "hr"), markAsPaid);
router.put("/approve", authorizeRole("admin", "hr"), approveAllPayroll);

module.exports = router;
