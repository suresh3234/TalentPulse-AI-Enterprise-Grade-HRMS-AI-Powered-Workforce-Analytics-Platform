const workflowService = require("../services/ai/workflow.service");
const systemAudit = require("../services/ai/system-audit.ai");
const WorkflowRun = require("../models/workflowRun.model");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

/**
 * Trigger an AI workflow manually
 * POST /api/ai/workflows/trigger
 * Body: { type: 'attendance' | 'performance' | 'recruitment', id: '...' }
 */
exports.triggerWorkflow = async (req, res) => {
  try {
    const { type, id } = req.body;
    
    if (!type || !id) {
      return res.status(400).json({ success: false, message: "Type and ID are required" });
    }

    // Queue for background execution
    const queuedResult = await workflowService.queueWorkflow(type, { type, id });

    return res.status(202).json({
      success: true,
      message: `Workflow ${type} triggered for ${id}`,
      status: "queued",
      workflowId: queuedResult.workflowId,
      fallback: queuedResult.fallback || false
    });
  } catch (error) {
    logger.error("Error triggering workflow:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Run system-wide AI audit
 * GET /api/ai/workflows/audit
 */
exports.runAudit = async (req, res) => {
  try {
    const results = await systemAudit.runSystemAudit();
    return res.status(200).json(results);
  } catch (error) {
    logger.error("Error running system audit:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get active workflow status from database
 * GET /api/ai/workflows/status/:jobId
 */
exports.getWorkflowStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Support querying by persistent workflowId or Mongoose _id
    const query = mongoose.Types.ObjectId.isValid(jobId) 
      ? { _id: jobId } 
      : { workflowId: jobId };
      
    const run = await WorkflowRun.findOne(query).lean();
    if (!run) {
      return res.status(404).json({ 
        success: false, 
        message: `Workflow run with ID ${jobId} not found` 
      });
    }
    
    return res.status(200).json({
      success: true,
      data: run
    });
  } catch (error) {
    logger.error("Error fetching workflow status:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
