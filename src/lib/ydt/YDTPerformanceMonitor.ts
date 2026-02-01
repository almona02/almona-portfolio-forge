/**
 * YDT Performance Monitor
 * 
 * Gold Tier Implementation:
 * - Tracks P95/P99 latency metrics
 * - Monitors cache hit rates
 * - Tracks response time percentiles
 * - Provides performance analytics
 * 
 * Purpose: Ensure YDT meets ≤150ms P95 latency requirement
 */

export interface YDTPerformanceMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  cacheHits: number;
  cacheMisses: number;
  responseTimes: number[]; // Array of response times in ms
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  averageLatency: number;
  circuitBreakerTrips: number;
  timeoutCount: number;
}

export interface YDTCallRecord {
  operation: string;
  responseTime: number;
  timestamp: number;
  cached: boolean;
  success: boolean;
  error?: string;
}

/**
 * YDT Performance Monitor
 * 
 * Singleton service for tracking YDT performance metrics
 */
export class YDTPerformanceMonitor {
  private static instance: YDTPerformanceMonitor | null = null;
  private callHistory: YDTCallRecord[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 calls
  private metrics: YDTPerformanceMetrics = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    responseTimes: [],
    p50Latency: 0,
    p95Latency: 0,
    p99Latency: 0,
    averageLatency: 0,
    circuitBreakerTrips: 0,
    timeoutCount: 0,
  };

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): YDTPerformanceMonitor {
    if (!this.instance) {
      this.instance = new YDTPerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Record a YDT call
   */
  recordCall(record: YDTCallRecord): void {
    this.metrics.totalCalls++;
    
    if (record.success) {
      this.metrics.successfulCalls++;
    } else {
      this.metrics.failedCalls++;
      if (record.error?.includes('timeout')) {
        this.metrics.timeoutCount++;
      }
    }

    if (record.cached) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Add to response times array
    this.metrics.responseTimes.push(record.responseTime);
    
    // Keep only last MAX_HISTORY response times
    if (this.metrics.responseTimes.length > this.MAX_HISTORY) {
      this.metrics.responseTimes.shift();
    }

    // Add to call history
    this.callHistory.push(record);
    if (this.callHistory.length > this.MAX_HISTORY) {
      this.callHistory.shift();
    }

    // Recalculate percentiles
    this.recalculateMetrics();
  }

  /**
   * Record circuit breaker trip
   */
  recordCircuitBreakerTrip(): void {
    this.metrics.circuitBreakerTrips++;
  }

  /**
   * Recalculate performance metrics
   */
  private recalculateMetrics(): void {
    const times = [...this.metrics.responseTimes].sort((a, b) => a - b);
    
    if (times.length === 0) {
      return;
    }

    // Calculate percentiles
    this.metrics.p50Latency = this.getPercentile(times, 50);
    this.metrics.p95Latency = this.getPercentile(times, 95);
    this.metrics.p99Latency = this.getPercentile(times, 99);
    
    // Calculate average
    const sum = times.reduce((a, b) => a + b, 0);
    this.metrics.averageLatency = sum / times.length;
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): YDTPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent call history
   */
  getRecentCalls(limit: number = 50): YDTCallRecord[] {
    return this.callHistory.slice(-limit).reverse();
  }

  /**
   * Check if P95 latency meets requirement (≤150ms)
   */
  meetsLatencyRequirement(): boolean {
    return this.metrics.p95Latency <= 150;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    if (total === 0) return 0;
    return (this.metrics.cacheHits / total) * 100;
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.metrics.totalCalls === 0) return 0;
    return (this.metrics.successfulCalls / this.metrics.totalCalls) * 100;
  }

  /**
   * Reset metrics (for testing)
   */
  reset(): void {
    this.callHistory = [];
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      responseTimes: [],
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      averageLatency: 0,
      circuitBreakerTrips: 0,
      timeoutCount: 0,
    };
  }

  /**
   * Get performance summary for logging
   */
  getSummary(): string {
    const metrics = this.getMetrics();
    return `YDT Performance: P95=${metrics.p95Latency.toFixed(0)}ms, ` +
           `P99=${metrics.p99Latency.toFixed(0)}ms, ` +
           `Avg=${metrics.averageLatency.toFixed(0)}ms, ` +
           `Cache Hit Rate=${this.getCacheHitRate().toFixed(1)}%, ` +
           `Success Rate=${this.getSuccessRate().toFixed(1)}%`;
  }
}

