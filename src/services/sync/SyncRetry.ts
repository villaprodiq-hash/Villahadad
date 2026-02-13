/**
 * 🔄 Sync Retry Manager
 * 
 * Implements exponential backoff and circuit breaker patterns
 * for resilient sync operations.
 */

import { logger } from '../../utils/logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

/**
 * Calculate delay with exponential backoff
 */
export function getRetryDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep utility for async delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      logger.debug(`Attempting ${operationName}`, { attempt, maxAttempts: config.maxAttempts });
      const result = await fn();
      
      if (attempt > 1) {
        logger.info(`${operationName} succeeded after ${attempt} attempts`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxAttempts) {
        logger.error(`${operationName} failed after ${config.maxAttempts} attempts`, lastError);
        throw lastError;
      }
      
      const delay = getRetryDelay(attempt, config);
      logger.warn(`${operationName} failed (attempt ${attempt}), retrying in ${delay}ms`, {
        error: lastError.message,
        nextAttempt: attempt + 1
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Circuit Breaker Pattern Implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private name: string,
    private config: {
      failureThreshold: number;
      resetTimeout: number;
      halfOpenMaxCalls: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxCalls: 3
    }
  ) {}
  
  get isOpen(): boolean {
    if (this.state === 'OPEN') {
      // Check if we should try half-open
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.failures = 0;
        logger.info(`Circuit breaker "${this.name}" entering HALF_OPEN state`);
        return false;
      }
      return true;
    }
    return false;
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new Error(`Circuit breaker "${this.name}" is OPEN`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.failures = 0;
      this.state = 'CLOSED';
      logger.info(`Circuit breaker "${this.name}" CLOSED (recovered)`);
    } else {
      this.failures = Math.max(0, this.failures - 1);
    }
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      logger.error(`Circuit breaker "${this.name}" OPENED after ${this.failures} failures`);
    }
  }
  
  getState(): { state: string; failures: number; lastFailure: number | null } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime
    };
  }
  
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
    logger.info(`Circuit breaker "${this.name}" manually reset`);
  }
}

// Global circuit breakers for different services
export const circuitBreakers = {
  supabase: new CircuitBreaker('supabase', {
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenMaxCalls: 2
  }),
  nas: new CircuitBreaker('nas', {
    failureThreshold: 3,
    resetTimeout: 60000,
    halfOpenMaxCalls: 1
  }),
  sync: new CircuitBreaker('sync', {
    failureThreshold: 10,
    resetTimeout: 120000,
    halfOpenMaxCalls: 3
  })
};

/**
 * Batch processor with retry logic
 */
export async function processBatchWithRetry<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize: number;
    retryConfig?: RetryConfig;
    onBatchComplete?: (completed: number, total: number) => void;
    onItemError?: (item: T, error: Error) => void;
  }
): Promise<{ results: R[]; errors: Array<{ item: T; error: Error }> }> {
  const { batchSize, retryConfig = DEFAULT_RETRY_CONFIG, onBatchComplete, onItemError } = options;
  const results: R[] = [];
  const errors: Array<{ item: T; error: Error }> = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const result = await withRetry(
            () => processor(item),
            'batch item processing',
            retryConfig
          );
          return { success: true, result, item } as const;
        } catch (error) {
          const err = error as Error;
          if (onItemError) {
            onItemError(item, err);
          }
          return { success: false, error: err, item } as const;
        }
      })
    );
    
    for (const batchResult of batchResults) {
      if (batchResult.success) {
        results.push(batchResult.result);
      } else {
        errors.push({ item: batchResult.item, error: batchResult.error });
      }
    }
    
    if (onBatchComplete) {
      onBatchComplete(Math.min(i + batchSize, items.length), items.length);
    }
    
    // Yield to event loop
    await sleep(0);
  }
  
  return { results, errors };
}

export default {
  getRetryDelay,
  sleep,
  withRetry,
  CircuitBreaker,
  circuitBreakers,
  processBatchWithRetry,
  DEFAULT_RETRY_CONFIG
};
