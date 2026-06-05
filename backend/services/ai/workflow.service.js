/**
 * AI Workflow Service
 * Orchestrates multi-step AI processes and automated actions
 * Features:
 * - Persistent execution tracking (WorkflowRun model)
 * - Multi-step process detailing
 * - Resilient background fallback queue for environments without Redis
 * - Automatic retry logic and performance tracking
 */

const logger = require("../../utils/logger");
const WorkflowRun = require("../../models/workflowRun.model");
const { 
  generateAttendanceTriggers, 
  generatePerformanceTriggers, 
  generateRecruitmentTriggers,
  executeTriggers 
} = require("./automation.triggers");
const { analyzeAttendance } = require("./attendance.ai");
const { analyzePerformance } = require("./performance.ai");
const { analyzeCandidate } = require("./recruitment.ai");
const queueService = require("../queue.service");
const devopsService = require("../devops.service");
const performanceMonitor = require("../performanceMonitor.service");

class WorkflowService {
  constructor() {
    // Simple in-memory fallback queue for background execution if Redis is unavailable
    this.fallbackQueue = [];
    this.fallbackProcessing = false;
  }

  /**
   * Run attendance monitoring workflow
   */
  async runAttendanceWorkflow(employeeId, runDoc = null) {
    logger.info(`Starting Attendance Workflow for ${employeeId}`);
    const startTime = Date.now();
    
    // Create/fetch workflow run details for observability
    const run = runDoc || await WorkflowRun.create({
      type: "attendance",
      targetId: employeeId,
      status: "processing",
      startedAt: new Date(),
      steps: [
        { name: "attendance_analysis", status: "pending" },
        { name: "triggers_generation", status: "pending" },
        { name: "triggers_execution", status: "pending" }
      ]
    });

    try {
      // Step 1: Analyze attendance
      await this.updateStepStatus(run._id, "attendance_analysis", "processing");
      const step1Start = Date.now();
      const analysis = await analyzeAttendance(employeeId);
      const step1Duration = Date.now() - step1Start;
      await this.updateStepStatus(run._id, "attendance_analysis", "completed", step1Duration, {
        score: analysis.attendanceScore,
        status: analysis.attendanceStatus,
        present: analysis.metrics.presentCount,
        absent: analysis.metrics.absentCount
      });

      // Record AI latency in DevOps and Performance monitors
      devopsService.recordAiMetrics(step1Duration, true);
      performanceMonitor.recordAiCall("attendance-workflow-analysis", "attendance-ai", step1Duration, 0, true);

      // Step 2: Generate triggers based on analysis
      await this.updateStepStatus(run._id, "triggers_generation", "processing");
      const step2Start = Date.now();
      const triggers = generateAttendanceTriggers(analysis);
      const step2Duration = Date.now() - step2Start;
      await this.updateStepStatus(run._id, "triggers_generation", "completed", step2Duration, {
        triggersGenerated: triggers.length,
        triggerTypes: triggers.map(t => t.type)
      });

      if (triggers.length === 0) {
        logger.info(`No triggers generated for employee ${employeeId}`);
        await WorkflowRun.findByIdAndUpdate(run._id, {
          status: "completed",
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        });
        return { success: true, message: "No actions required" };
      }

      // Step 3: Execute triggers
      await this.updateStepStatus(run._id, "triggers_execution", "processing");
      const step3Start = Date.now();
      const results = await executeTriggers(triggers, { employeeId });
      const step3Duration = Date.now() - step3Start;
      await this.updateStepStatus(run._id, "triggers_execution", "completed", step3Duration, results);

      // Workflow complete
      await WorkflowRun.findByIdAndUpdate(run._id, {
        status: "completed",
        completedAt: new Date(),
        durationMs: Date.now() - startTime
      });

      logger.info(`Attendance Workflow completed for ${employeeId}`, { results });
      performanceMonitor.recordAnalyticsProcessing("attendance-workflow", Date.now() - startTime, 1, true);

      return results;
    } catch (error) {
      const latency = Date.now() - startTime;
      devopsService.recordAiMetrics(latency, false, error);
      performanceMonitor.recordAiCall("attendance-workflow-analysis", "attendance-ai", latency, 0, false);
      performanceMonitor.recordAnalyticsProcessing("attendance-workflow", latency, 1, false);

      logger.error(`Attendance Workflow failed for ${employeeId}:`, error);

      // Fail pending steps
      await this.failPendingSteps(run._id, error.message);
      await WorkflowRun.findByIdAndUpdate(run._id, {
        status: "failed",
        error: error.message,
        completedAt: new Date(),
        durationMs: latency
      });

      throw error;
    }
  }

  /**
   * Run performance review workflow
   */
  async runPerformanceWorkflow(employeeId, runDoc = null) {
    logger.info(`Starting Performance Workflow for ${employeeId}`);
    const startTime = Date.now();

    const run = runDoc || await WorkflowRun.create({
      type: "performance",
      targetId: employeeId,
      status: "processing",
      startedAt: new Date(),
      steps: [
        { name: "performance_analysis", status: "pending" },
        { name: "triggers_generation", status: "pending" },
        { name: "triggers_execution", status: "pending" }
      ]
    });

    try {
      // Step 1: Performance Analysis
      await this.updateStepStatus(run._id, "performance_analysis", "processing");
      const step1Start = Date.now();
      const analysis = await analyzePerformance(employeeId);
      const step1Duration = Date.now() - step1Start;
      await this.updateStepStatus(run._id, "performance_analysis", "completed", step1Duration, {
        score: analysis.performanceScore,
        status: analysis.performanceStatus,
        alertsCount: analysis.alerts.length
      });

      devopsService.recordAiMetrics(step1Duration, true);
      performanceMonitor.recordAiCall("performance-workflow-analysis", "performance-ai", step1Duration, 0, true);

      // Step 2: Trigger Generation
      await this.updateStepStatus(run._id, "triggers_generation", "processing");
      const step2Start = Date.now();
      const triggers = generatePerformanceTriggers(analysis);
      const step2Duration = Date.now() - step2Start;
      await this.updateStepStatus(run._id, "triggers_generation", "completed", step2Duration, {
        triggersGenerated: triggers.length,
        triggerTypes: triggers.map(t => t.type)
      });

      if (triggers.length === 0) {
        await WorkflowRun.findByIdAndUpdate(run._id, {
          status: "completed",
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        });
        return { success: true, message: "No actions required" };
      }

      // Step 3: Trigger Execution
      await this.updateStepStatus(run._id, "triggers_execution", "processing");
      const step3Start = Date.now();
      const results = await executeTriggers(triggers, { employeeId });
      const step3Duration = Date.now() - step3Start;
      await this.updateStepStatus(run._id, "triggers_execution", "completed", step3Duration, results);

      // Workflow complete
      await WorkflowRun.findByIdAndUpdate(run._id, {
        status: "completed",
        completedAt: new Date(),
        durationMs: Date.now() - startTime
      });

      performanceMonitor.recordAnalyticsProcessing("performance-workflow", Date.now() - startTime, 1, true);
      return results;
    } catch (error) {
      const latency = Date.now() - startTime;
      devopsService.recordAiMetrics(latency, false, error);
      performanceMonitor.recordAiCall("performance-workflow-analysis", "performance-ai", latency, 0, false);
      performanceMonitor.recordAnalyticsProcessing("performance-workflow", latency, 1, false);
      logger.error(`Performance Workflow failed for ${employeeId}:`, error);

      await this.failPendingSteps(run._id, error.message);
      await WorkflowRun.findByIdAndUpdate(run._id, {
        status: "failed",
        error: error.message,
        completedAt: new Date(),
        durationMs: latency
      });
      throw error;
    }
  }

  /**
   * Run recruitment screening workflow
   */
  async runRecruitmentWorkflow(applicationId, runDoc = null) {
    logger.info(`Starting Recruitment Workflow for ${applicationId}`);
    const startTime = Date.now();

    const run = runDoc || await WorkflowRun.create({
      type: "recruitment",
      targetId: applicationId,
      status: "processing",
      startedAt: new Date(),
      steps: [
        { name: "recruitment_screening", status: "pending" },
        { name: "triggers_generation", status: "pending" },
        { name: "triggers_execution", status: "pending" }
      ]
    });

    try {
      // Step 1: Candidate Screening
      await this.updateStepStatus(run._id, "recruitment_screening", "processing");
      const step1Start = Date.now();
      const analysis = await analyzeCandidate(applicationId);
      const step1Duration = Date.now() - step1Start;
      await this.updateStepStatus(run._id, "recruitment_screening", "completed", step1Duration, {
        matchScore: analysis.matchScore,
        decision: analysis.recommendation,
        skillsMatchedCount: analysis.skillAnalysis?.matched?.length || 0
      });

      devopsService.recordAiMetrics(step1Duration, true);
      performanceMonitor.recordAiCall("recruitment-workflow-screening", "recruitment-ai", step1Duration, 0, true);

      // Step 2: Trigger Generation
      await this.updateStepStatus(run._id, "triggers_generation", "processing");
      const step2Start = Date.now();
      const triggers = generateRecruitmentTriggers(analysis);
      const step2Duration = Date.now() - step2Start;
      await this.updateStepStatus(run._id, "triggers_generation", "completed", step2Duration, {
        triggersGenerated: triggers.length,
        triggerTypes: triggers.map(t => t.type)
      });

      if (triggers.length === 0) {
        await WorkflowRun.findByIdAndUpdate(run._id, {
          status: "completed",
          completedAt: new Date(),
          durationMs: Date.now() - startTime
        });
        return { success: true, message: "No actions required" };
      }

      // Step 3: Trigger Execution
      await this.updateStepStatus(run._id, "triggers_execution", "processing");
      const step3Start = Date.now();
      const results = await executeTriggers(triggers, { applicationId });
      const step3Duration = Date.now() - step3Start;
      await this.updateStepStatus(run._id, "triggers_execution", "completed", step3Duration, results);

      // Workflow complete
      await WorkflowRun.findByIdAndUpdate(run._id, {
        status: "completed",
        completedAt: new Date(),
        durationMs: Date.now() - startTime
      });

      performanceMonitor.recordAnalyticsProcessing("recruitment-workflow", Date.now() - startTime, 1, true);
      return results;
    } catch (error) {
      const latency = Date.now() - startTime;
      devopsService.recordAiMetrics(latency, false, error);
      performanceMonitor.recordAiCall("recruitment-workflow-screening", "recruitment-ai", latency, 0, false);
      performanceMonitor.recordAnalyticsProcessing("recruitment-workflow", latency, 1, false);
      logger.error(`Recruitment Workflow failed for ${applicationId}:`, error);

      await this.failPendingSteps(run._id, error.message);
      await WorkflowRun.findByIdAndUpdate(run._id, {
        status: "failed",
        error: error.message,
        completedAt: new Date(),
        durationMs: latency
      });
      throw error;
    }
  }

  /**
   * Queue a workflow job for background processing
   */
  async queueWorkflow(type, data) {
    const { id } = data;
    
    // 1. Create a persistent pending WorkflowRun document in Mongoose immediately
    const run = await WorkflowRun.create({
      type,
      targetId: id,
      status: "queued",
      steps: [
        { name: `${type}_analysis`, status: "pending" },
        { name: "triggers_generation", status: "pending" },
        { name: "triggers_execution", status: "pending" }
      ]
    });

    const queueName = "ai-workflows";
    try {
      // If Bull queues are disabled (e.g. Redis is not available), fall back to high-resilience local in-memory processing
      if (!queueService.isEnabled()) {
        logger.warn(`Skipping ${type} Redis queue because Redis queues are disabled. Falling back to resilient local asynchronous processing.`);
        this.enqueueFallback(type, id, run);
        return { success: true, fallback: true, workflowId: run.workflowId };
      }

      // Add task to Bull queue with reference to the persistent document
      const job = await queueService.addJob(queueName, type, { ...data, runObjectId: run._id.toString() });
      if (!job) {
        // Fallback to local execution if job creation failed
        this.enqueueFallback(type, id, run);
        return { success: true, fallback: true, workflowId: run.workflowId };
      }

      logger.info(`Queued ${type} workflow in Redis`, { data, workflowId: run.workflowId });
      return { success: true, fallback: false, workflowId: run.workflowId };
    } catch (error) {
      logger.error(`Failed to queue ${type} workflow:`, error);
      // Fallback to in-memory asynchronous execution rather than throwing
      this.enqueueFallback(type, id, run);
      return { success: true, fallback: true, workflowId: run.workflowId };
    }
  }

  /**
   * Resilient local in-memory queue fallback logic
   */
  enqueueFallback(type, id, runDoc) {
    this.fallbackQueue.push({ type, id, runDoc, attempts: 0 });
    logger.info(`Enqueued job locally: ${type} for target ${id}. Local queue length: ${this.fallbackQueue.length}`);
    
    // Process local fallback queue asynchronously in background
    if (!this.fallbackProcessing) {
      setImmediate(() => this.processLocalFallbackQueue());
    }
  }

  /**
   * Process local fallback background queue with retries
   */
  async processLocalFallbackQueue() {
    if (this.fallbackQueue.length === 0) {
      this.fallbackProcessing = false;
      return;
    }

    this.fallbackProcessing = true;
    const task = this.fallbackQueue.shift();
    const { type, id, runDoc } = task;

    logger.info(`Background executing local fallback job: ${type} for ${id}`);

    try {
      // Update persistent run to processing
      await WorkflowRun.findByIdAndUpdate(runDoc._id, {
        status: "processing",
        startedAt: new Date()
      });
      const run = await WorkflowRun.findById(runDoc._id);

      if (type === "attendance") {
        await this.runAttendanceWorkflow(id, run);
      } else if (type === "performance") {
        await this.runPerformanceWorkflow(id, run);
      } else if (type === "recruitment") {
        await this.runRecruitmentWorkflow(id, run);
      }
      
      logger.info(`Background local fallback job successfully completed: ${type} for ${id}`);
    } catch (error) {
      task.attempts++;
      logger.error(`Background local fallback job failed (Attempt ${task.attempts}): ${type} for ${id}:`, error);

      if (task.attempts < 3) {
        // Re-enqueue for retry with backoff delay
        logger.info(`Re-queuing failed local job for retry in 5000ms`);
        setTimeout(() => {
          this.fallbackQueue.push(task);
          if (!this.fallbackProcessing) {
            this.processLocalFallbackQueue();
          }
        }, 5000);
      } else {
        logger.error(`Local fallback job completely failed after 3 attempts: ${type} for ${id}`);
        // Log final failure in persistent WorkflowRun
        await WorkflowRun.findByIdAndUpdate(runDoc._id, {
          status: "failed",
          error: `Failed after 3 local attempts: ${error.message}`,
          completedAt: new Date()
        });
      }
    }

    // Continue to next task
    setImmediate(() => this.processLocalFallbackQueue());
  }

  /**
   * Helper: Update status of a specific workflow step
   */
  async updateStepStatus(runId, stepName, status, durationMs = 0, result = null) {
    try {
      await WorkflowRun.updateOne(
        { _id: runId, "steps.name": stepName },
        {
          $set: {
            "steps.$.status": status,
            "steps.$.durationMs": durationMs,
            "steps.$.result": result,
            "steps.$.timestamp": new Date()
          }
        }
      );
    } catch (err) {
      logger.warn(`Failed to update step status for ${runId}/${stepName}`, err);
    }
  }

  /**
   * Helper: Mark all pending steps as failed
   */
  async failPendingSteps(runId, errorMessage) {
    try {
      await WorkflowRun.updateMany(
        { _id: runId, "steps.status": "pending" },
        {
          $set: {
            "steps.$.status": "failed",
            "steps.$.error": errorMessage,
            "steps.$.timestamp": new Date()
          }
        }
      );
    } catch (err) {
      logger.warn(`Failed to fail pending steps for ${runId}`, err);
    }
  }

  /**
   * Initialize workflow processors (for Redis queue consumer)
   */
  async initProcessors() {
    const queueName = "ai-workflows";

    if (!queueService.isEnabled()) {
      logger.warn("AI Workflow processors skipped because Redis queues are disabled", {
        reason: queueService.disableReason || "Redis unavailable",
      });
      return false;
    }
    
    await queueService.processQueue(queueName, async (jobData) => {
      const { type, id, runObjectId } = jobData;
      
      let run = null;
      if (runObjectId) {
        run = await WorkflowRun.findById(runObjectId);
      }

      if (run) {
        await WorkflowRun.findByIdAndUpdate(run._id, {
          status: "processing",
          startedAt: new Date()
        });
      }

      switch (type) {
        case "attendance":
          return await this.runAttendanceWorkflow(id, run);
        case "performance":
          return await this.runPerformanceWorkflow(id, run);
        case "recruitment":
          return await this.runRecruitmentWorkflow(id, run);
        default:
          logger.warn(`Unknown workflow type: ${type}`);
          if (run) {
            await WorkflowRun.findByIdAndUpdate(run._id, {
              status: "failed",
              error: `Unknown workflow type: ${type}`,
              completedAt: new Date()
            });
          }
          return { success: false, error: "Unknown type" };
      }
    });
    
    logger.info("AI Workflow processors initialized");
    return true;
  }
}

module.exports = new WorkflowService();
