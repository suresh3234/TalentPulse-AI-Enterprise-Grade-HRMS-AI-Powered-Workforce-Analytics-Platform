const express = require("express");
const multer = require("multer");
const {
  createEmployee,
  getAllEmployees,
  getEmployeeStats,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  getOrgChart,
  uploadEmployeeDocument,
  getEmployeeDocuments,
} = require("../controllers/employee.controller");
const {
  createEmployeeValidator,
  updateEmployeeValidator,
  deleteEmployeeValidator,
} = require("../validators/employeeValidator");
const validate = require("../middlewares/validate");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRole } = require("../middlewares/rbac.middleware");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Apply authentication middleware globally to all employee routes
router.use(authMiddleware);

// Org chart (Needs to be placed BEFORE specific wildcards like /:id)
router.get("/org-chart", getOrgChart);

// Stats
router.route("/stats").get(authorizeRole("admin", "hr", "manager"), getEmployeeStats);

// Employee CRUD
router.post("/createemployee", authorizeRole("admin", "hr"), createEmployeeValidator, validate, createEmployee);
router.put("/updateemployee/:id", authorizeRole("admin", "hr", "manager"), updateEmployeeValidator, validate, updateEmployee);
router.delete("/deleteemployee/:id", authorizeRole("admin", "hr"), deleteEmployeeValidator, validate, deleteEmployee);
router.get("/getallemployees", getAllEmployees);
router.get("/:id", getEmployeeById);

// Employee Documents
router.post("/:id/documents", upload.single("document"), uploadEmployeeDocument);
router.get("/:id/documents", getEmployeeDocuments);

module.exports = router;