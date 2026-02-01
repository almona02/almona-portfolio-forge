/**
 * API Optimizer
 * 
 * Optimizes API requests for workshop environments with intermittent connectivity.
 * Features: Request batching, response compression, connection pooling, smart retry logic.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

/**
 * Batched request item
 */
export interface BatchedRequest<T = any> {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Batch configuration
 */
export interface BatchConfig {
  maxBatchSize: number; // Maximum requests per batch
  batchDelayMs: number; // Delay before sending batch (debounce)
  maxWaitTimeMs: number; // Maximum time to wait before sending batch
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number; // Base delay for exponential backoff
  maxDelayMs: number; // Maximum delay between retries
  retryableStatusCodes: number[]; // HTTP status codes to retry
  retryableErrors: string[]; // Error patterns to retry
}

/**
 * API Optimizer
 * 
 * Handles request batching, retries, and connection management.
 */
export class APIOptimizer {
  private batchQueue: BatchedRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private batchStartTime: number = 0;
  private readonly config: BatchConfig;
  private readonly retryConfig: RetryConfig;
  private activeRequests: Map<string, Promise<any>> = new Map();

  constructor(
    batchConfig: Partial<BatchConfig> = {},
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.config = {
      maxBatchSize: batchConfig.maxBatchSize || 10,
      batchDelayMs: batchConfig.batchDelayMs || 100,
      maxWaitTimeMs: batchConfig.maxWaitTimeMs || 500,
      ...batchConfig,
    };

    this.retryConfig = {
      maxRetries: retryConfig.maxRetries || 3,
      baseDelayMs: retryConfig.baseDelayMs || 1000,
      maxDelayMs: retryConfig.maxDelayMs || 10000,
      retryableStatusCodes: retryConfig.retryableStatusCodes || [429, 500, 502, 503, 504],
      retryableErrors: retryConfig.retryableErrors || ['NetworkError', 'TimeoutError'],
      ...retryConfig,
    };
  }

  /**
   * Batch a request (for GET requests that can be batched)
   */
  batchRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: BatchedRequest<T> = {
        id: `${Date.now()}-${Math.random()}`,
        endpoint,
        method,
        body,
        headers,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      this.batchQueue.push(request);

      // Start batch timer if this is the first request
      if (this.batchQueue.length === 1) {
        this.batchStartTime = Date.now();
        this.scheduleBatch();
      }

      // Send batch if it reaches max size
      if (this.batchQueue.length >= this.config.maxBatchSize) {
        this.sendBatch();
      }
    });
  }

  /**
   * Schedule batch send
   */
  private scheduleBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.sendBatch();
    }, this.config.batchDelayMs);

    // Also send if max wait time is exceeded
    setTimeout(() => {
      if (this.batchQueue.length > 0 && Date.now() - this.batchStartTime >= this.config.maxWaitTimeMs) {
        this.sendBatch();
      }
    }, this.config.maxWaitTimeMs);
  }

  /**
   * Send batched requests
   */
  private async sendBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchQueue.length === 0) {
      return;
    }

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    // Process batch (in real implementation, would send to batch endpoint)
    // For now, process individually with batching benefits (connection reuse, etc.)
    const promises = batch.map(request => 
      this.executeRequest(request)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Execute a request with retry logic
   */
  async executeRequest<T>(request: BatchedRequest<T>): Promise<T> {
    const cacheKey = `${request.method}:${request.endpoint}`;
    
    // Check for active request (deduplication)
    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey)!;
    }

    const requestPromise = this.executeWithRetry(request);
    this.activeRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(request: BatchedRequest<T>, attempt: number = 0): Promise<T> {
    try {
      const response = await fetch(request.endpoint, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br', // Request compression
          ...request.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        // Check if status is retryable
        if (
          this.retryConfig.retryableStatusCodes.includes(response.status) &&
          attempt < this.retryConfig.maxRetries
        ) {
          const delay = this.calculateRetryDelay(attempt);
          await this.delay(delay);
          return this.executeWithRetry(request, attempt + 1);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      request.resolve(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if error is retryable
      const isRetryable = this.retryConfig.retryableErrors.some(pattern =>
        errorMessage.includes(pattern)
      );

      if (isRetryable && attempt < this.retryConfig.maxRetries) {
        const delay = this.calculateRetryDelay(attempt);
        await this.delay(delay);
        return this.executeWithRetry(request, attempt + 1);
      }

      request.reject(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Calculate retry delay (exponential backoff)
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear batch queue
   */
  clearBatch(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.batchQueue.forEach(request => {
      request.reject(new Error('Batch cleared'));
    });
    this.batchQueue = [];
  }
}

/**
 * Request deduplication cache
 */
class RequestDeduplicationCache {
  private cache: Map<string, { promise: Promise<any>; timestamp: number }> = new Map();
  private readonly ttl: number = 5000; // 5 seconds

  /**
   * Get or create request
   */
  getOrCreate<T>(
    key: string,
    factory: () => Promise<T>
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.promise;
    }

    const promise = factory();
    this.cache.set(key, { promise, timestamp: Date.now() });

    // Cleanup old entries
    this.cleanup();

    return promise;
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Global API optimizer instance
 */
let globalAPIOptimizer: APIOptimizer | null = null;

/**
 * Get or create global API optimizer
 */
export function getAPIOptimizer(config?: Partial<BatchConfig & RetryConfig>): APIOptimizer {
  if (!globalAPIOptimizer) {
    globalAPIOptimizer = new APIOptimizer(config, config);
  }
  return globalAPIOptimizer;
}

/**
 * Request deduplication cache instance
 */
export const requestDeduplicationCache = new RequestDeduplicationCache();
