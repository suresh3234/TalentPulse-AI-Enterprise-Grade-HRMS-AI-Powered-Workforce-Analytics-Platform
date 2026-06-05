const express = require("express");
const router = express.Router();
const workflowController = require("../controllers/workflow.controller");

// Advanced Workflow APIs
router.post("/trigger", workflowController.triggerWorkflow);
router.get("/audit", workflowController.runAudit);
router.get("/status/:jobId", workflowController.getWorkflowStatus);

module.exports = router;
