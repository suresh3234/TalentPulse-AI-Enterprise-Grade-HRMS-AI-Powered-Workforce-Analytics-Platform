const logger = require("../utils/logger");

/**
 * Retry Logic with Exponential Backoff
 * Handles transient failures with automatic retry
 */
class RetryHandler {
  constructor(maxRetries = 3, baseDelayMs = 1000, backoffMultiplier = 2) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.backoffMultiplier = backoffMultiplier;
  }

  /**
   * Calculate delay with exponential backoff
   */
  calculateDelay(attemptNumber) {
    return this.baseDelayMs * Math.pow(this.backoffMultiplier, attemptNumber - 1);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error) {
    // Retryable error codes
    const retryableErrors = [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "ENOTFOUND",
      "MongoServerSelectionError",
    ];

    // HTTP status codes that are retryable
    const retryableStatuses = [408, 429, 500, 502, 503, 504];

    return (
      retryableErrors.includes(error.code) ||
      retryableErrors.includes(error.name) ||
      retryableStatuses.includes(error.status) ||
      retryableStatuses.includes(error.statusCode)
    );
  }

  /**
   * Execute operation with retry logic
   */
  async execute(operation, operationName = "Operation", context = {}) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Executing ${operationName}`, {
          attempt,
          maxRetries: this.maxRetries,
          ...context,
        });

        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error)) {
          logger.error(`${operationName} failed with non-retryable error`, {
            attempt,
            error: error.message,
            code: error.code,
            ...context,
          });
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          logger.warn(`${operationName} failed, retrying...`, {
            attempt,
            nextRetryIn: `${delay}ms`,
            error: error.message,
            code: error.code,
            ...context,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error(`${operationName} failed after ${this.maxRetries} attempts`, {
      maxRetries: this.maxRetries,
      error: lastError.message,
      code: lastError.code,
      ...context,
    });

    throw new Error(
      `${operationName} failed after ${this.maxRetries} retries: ${lastError.message}`
    );
  }
}

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by failing fast when service is unavailable
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimer = null;
    this.name = options.name || "CircuitBreaker";
  }

  /**
   * Record success
   */
  recordSuccess() {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    }
  }

  /**
   * Record failure
   */
  recordFailure() {
    this.failureCount++;

    if (this.state === "CLOSED" && this.failureCount >= this.failureThreshold) {
      this.open();
    }

    if (this.state === "HALF_OPEN") {
      this.open();
    }
  }

  /**
   * Open the circuit
   */
  open() {
    this.state = "OPEN";
    logger.warn(`Circuit breaker opened: ${this.name}`, {
      failureCount: this.failureCount,
      timeout: `${this.timeout}ms`,
    });

    this.resetTimer = setTimeout(() => {
      this.halfOpen();
    }, this.timeout);
  }

  /**
   * Transition to half-open state
   */
  halfOpen() {
    this.state = "HALF_OPEN";
    this.successCount = 0;
    logger.info(`Circuit breaker half-open: ${this.name}`, {
      timeout: `${this.timeout}ms`,
    });
  }

  /**
   * Close the circuit
   */
  close() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    logger.info(`Circuit breaker closed: ${this.name}`);
  }

  /**
   * Check if circuit allows requests
   */
  isOpen() {
    return this.state === "OPEN";
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }
}

/**
 * Resilience wrapper for async operations
 */
class ResilientOperation {
  constructor(
    operation,
    operationName,
    options = {}
  ) {
    this.operation = operation;
    this.operationName = operationName;
    this.retry = new RetryHandler(
      options.maxRetries || 3,
      options.baseDelayMs || 1000,
      options.backoffMultiplier || 2
    );
    this.circuitBreaker = new CircuitBreaker({
      name: operationName,
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 60000,
    });
  }

  /**
   * Execute with both retry and circuit breaker
   */
  async execute(context = {}) {
    if (this.circuitBreaker.isOpen()) {
      const error = new Error(
        `${this.operationName} is temporarily unavailable (circuit open)`
      );
      error.statusCode = 503;
      logger.warn(`Circuit breaker prevented execution: ${this.operationName}`, context);
      throw error;
    }

    try {
      const result = await this.retry.execute(
        this.operation,
        this.operationName,
        context
      );
      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      error.statusCode = error.statusCode || 503;
      throw error;
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return this.circuitBreaker.getStatus();
  }
}

module.exports = {
  RetryHandler,
  CircuitBreaker,
  ResilientOperation,
};
