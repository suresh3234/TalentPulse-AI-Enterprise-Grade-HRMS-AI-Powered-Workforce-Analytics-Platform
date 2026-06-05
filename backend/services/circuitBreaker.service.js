const logger = require("../utils/logger");

/**
 * Circuit Breaker & Error Recovery Service
 * Prevents cascading failures and enables graceful degradation
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;

    // Configuration
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 60 seconds
    this.halfOpenTimeout = options.halfOpenTimeout || 30000; // 30 seconds
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn, fallbackFn = null) {
    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttemptTime) {
        logger.warn(`Circuit breaker ${this.name} is OPEN - using fallback`, {
          state: this.state,
          failureCount: this.failureCount,
        });
        if (fallbackFn) {
          return await fallbackFn();
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      } else {
        // Try to recover
        logger.info(`Circuit breaker ${this.name} transitioning to HALF_OPEN`);
        this.state = "HALF_OPEN";
        this.successCount = 0;
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      logger.error(`Circuit breaker ${this.name} caught error`, {
        error: error.message,
        state: this.state,
      });

      if (fallbackFn) {
        logger.info(`Circuit breaker ${this.name} using fallback`);
        return await fallbackFn();
      }
      throw error;
    }
  }

  /**
   * Handle successful call
   */
  onSuccess() {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        logger.info(`Circuit breaker ${this.name} CLOSED - recovery successful`);
        this.state = "CLOSED";
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed call
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      logger.warn(`Circuit breaker ${this.name} failed in HALF_OPEN - reopening`);
      this.openCircuit();
    } else if (this.failureCount >= this.failureThreshold) {
      logger.warn(`Circuit breaker ${this.name} threshold exceeded - opening circuit`);
      this.openCircuit();
    }
  }

  /**
   * Open circuit
   */
  openCircuit() {
    this.state = "OPEN";
    this.nextAttemptTime = Date.now() + this.timeout;
    this.successCount = 0;
    logger.error(`Circuit breaker ${this.name} OPEN until ${new Date(this.nextAttemptTime)}`);
  }

  /**
   * Manual reset
   */
  reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    logger.info(`Circuit breaker ${this.name} manually reset`);
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
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}

/**
 * Retry mechanism with exponential backoff
 */
class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 100;
    this.maxDelay = options.maxDelay || 10000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
  }

  /**
   * Execute with retry
   */
  async execute(fn, context = "") {
    let lastError;
    let delay = this.initialDelay;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.debug(`Attempt ${attempt}/${this.maxRetries} for ${context}`);
        return await fn();
      } catch (error) {
        lastError = error;
        logger.warn(`Attempt ${attempt} failed for ${context}`, {
          error: error.message,
          remainingRetries: this.maxRetries - attempt,
        });

        if (attempt < this.maxRetries) {
          await this.sleep(delay);
          delay = Math.min(delay * this.backoffMultiplier, this.maxDelay);
        }
      }
    }

    logger.error(`All retry attempts failed for ${context}`, { error: lastError.message });
    throw lastError;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Global circuit breakers registry
 */
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = {};
  }

  /**
   * Get or create circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers[name]) {
      this.breakers[name] = new CircuitBreaker(name, options);
    }
    return this.breakers[name];
  }

  /**
   * Get all breaker statuses
   */
  getAllStatus() {
    return Object.values(this.breakers).map((breaker) => breaker.getStatus());
  }

  /**
   * Reset all breakers
   */
  resetAll() {
    for (const breaker of Object.values(this.breakers)) {
      breaker.reset();
    }
  }
}

module.exports = {
  CircuitBreaker,
  RetryHandler,
  CircuitBreakerRegistry: new CircuitBreakerRegistry(),
};
