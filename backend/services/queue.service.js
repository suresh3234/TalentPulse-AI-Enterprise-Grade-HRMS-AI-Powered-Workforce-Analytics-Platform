const Queue = require("bull");
const logger = require("../utils/logger");

/**
 * Background Job Queue Service using Bull + Redis
 * For analytics processing, AI inference, and heavy computations
 */
class QueueService {
  constructor() {
    this.queues = {};
    this.workers = {};
    this.enabled = true;
    this.disableReason = null;
  }

  /**
   * Enable or disable Redis-backed queues.
   */
  setEnabled(enabled, reason = null) {
    const nextEnabled = Boolean(enabled);
    if (this.enabled === nextEnabled && this.disableReason === reason) {
      return;
    }

    this.enabled = nextEnabled;
    this.disableReason = nextEnabled ? null : reason;

    if (this.enabled) {
      logger.info("Queue service enabled");
    } else {
      logger.warn("Queue service disabled", { reason: this.disableReason || "Redis unavailable" });
    }
  }

  /**
   * Check whether Redis-backed queues are available.
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Initialize a queue
   */
  createQueue(queueName, options = {}) {
    if (!this.enabled) {
      return null;
    }

    try {
      const defaultOptions = {
        redis: {
          host: process.env.REDIS_HOST || "127.0.0.1",
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
        settings: {
          maxStalledInterval: 5000,
          maxStalledCount: 2,
          lockDuration: 30000,
          lockRenewTime: 15000,
          retryProcessDelay: 5000,
        },
      };

      const config = { ...defaultOptions, ...options };
      const queue = new Queue(queueName, config);

      // Set up event listeners
      queue.on("error", (err) => {
        logger.error(`Queue ${queueName} error`, { error: err.message });
      });

      queue.on("failed", (job, err) => {
        logger.error(`Job ${job.id} failed`, { error: err.message, data: job.data });
      });

      queue.on("completed", (job) => {
        logger.info(`Job ${job.id} completed`, { data: job.data });
      });

      this.queues[queueName] = queue;
      logger.info(`Queue created: ${queueName}`);

      return queue;
    } catch (error) {
      logger.error(`Failed to create queue ${queueName}`, { error: error.message });
      return null;
    }
  }

  /**
   * Get or create queue
   */
  getQueue(queueName) {
    if (!this.enabled) {
      return null;
    }

    if (!this.queues[queueName]) {
      return this.createQueue(queueName);
    }
    return this.queues[queueName];
  }

  /**
   * Add job to queue
   */
  async addJob(queueName, jobName, data, options = {}) {
    try {
      if (!this.enabled) {
        logger.warn("Skipping queue job because Redis queues are disabled", {
          queueName,
          jobName,
          reason: this.disableReason || "Redis unavailable",
        });
        return null;
      }

      const queue = this.getQueue(queueName);
      if (!queue) throw new Error(`Queue ${queueName} not available`);

      const job = await queue.add(jobName, data, {
        jobId: `${jobName}-${Date.now()}`,
        ...options,
      });

      logger.info(`Job added to queue`, { queueName, jobName, jobId: job.id });
      return job;
    } catch (error) {
      logger.error(`Failed to add job`, { queueName, jobName, error: error.message });
      throw error;
    }
  }

  /**
   * Process jobs in queue
   */
  async processQueue(queueName, jobHandler, concurrency = 2) {
    try {
      if (!this.enabled) {
        logger.warn("Skipping queue processor because Redis queues are disabled", {
          queueName,
          reason: this.disableReason || "Redis unavailable",
        });
        return;
      }

      const queue = this.getQueue(queueName);
      if (!queue) throw new Error(`Queue ${queueName} not available`);

      queue.process(concurrency, async (job) => {
        logger.info(`Processing job`, { queueName, jobId: job.id });
        try {
          const result = await jobHandler(job.data);
          logger.info(`Job processed successfully`, { queueName, jobId: job.id });
          return result;
        } catch (error) {
          logger.error(`Job processing failed`, { queueName, jobId: job.id, error: error.message });
          throw error;
        }
      });

      this.workers[queueName] = true;
      logger.info(`Queue processor started`, { queueName, concurrency });
    } catch (error) {
      logger.error(`Failed to process queue`, { queueName, error: error.message });
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName) {
    try {
      if (!this.enabled) {
        return {
          queueName,
          enabled: false,
          reason: this.disableReason || "Redis unavailable",
          counts: null,
          waitingJobs: 0,
          isProcessing: false,
        };
      }

      const queue = this.getQueue(queueName);
      if (!queue) return null;

      const counts = await queue.getJobCounts();
      const waitingJobs = await queue.getWaiting(0, 10);

      return {
        queueName,
        counts,
        waitingJobs: waitingJobs.length,
        isProcessing: this.workers[queueName] || false,
      };
    } catch (error) {
      logger.error(`Failed to get queue stats`, { queueName, error: error.message });
      return null;
    }
  }

  /**
   * Clear completed jobs from queue
   */
  async cleanQueue(queueName, maxAge = 3600000) {
    try {
      if (!this.enabled) {
        return false;
      }

      const queue = this.getQueue(queueName);
      if (!queue) return false;

      await queue.clean(maxAge, "completed");
      logger.info(`Queue cleaned`, { queueName });
      return true;
    } catch (error) {
      logger.error(`Failed to clean queue`, { queueName, error: error.message });
      return false;
    }
  }

  /**
   * Close all queues
   */
  async closeAll() {
    try {
      for (const [queueName, queue] of Object.entries(this.queues)) {
        await queue.close();
        logger.info(`Queue closed`, { queueName });
      }
      this.queues = {};
      this.workers = {};
      this.enabled = false;
    } catch (error) {
      logger.error("Failed to close queues", { error: error.message });
    }
  }
}

module.exports = new QueueService();
