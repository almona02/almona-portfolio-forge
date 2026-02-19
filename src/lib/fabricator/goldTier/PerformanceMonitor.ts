/**
 * Performance Monitor for Gold Tier Operations
 * 
 * Tracks and reports performance metrics for validation and migration operations.
 * Provides statistics for monitoring and optimization.
 * 
 * @since Gold Tier Phase 1, Task 1
 */

export interface PerformanceMetric {
  operation: string;
  durationMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
  success?: boolean;
  error?: string;
}

export interface PerformanceStats {
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  p99Ms: number;
  successRate: number;
}

export class GoldTierPerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 1000;
  private static hits: number = 0;
  private static misses: number = 0;
  
  /**
   * Record performance metric
   * 
   * @param operation - Operation name (e.g., 'validate', 'migrate')
   * @param durationMs - Duration in milliseconds
   * @param metadata - Optional metadata
   * @param success - Whether operation succeeded
   * @param error - Error message if failed
   */
  static record(
    operation: string,
    durationMs: number,
    metadata?: Record<string, unknown>,
    success: boolean = true,
    error?: string
  ): void {
    this.metrics.push({
      operation,
      durationMs,
      timestamp: Date.now(),
      metadata,
      success,
      error,
    });
    
    // Trim if over limit (FIFO)
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }
  
  /**
   * Record cache hit
   */
  static recordCacheHit(): void {
    this.hits++;
  }
  
  /**
   * Record cache miss
   */
  static recordCacheMiss(): void {
    this.misses++;
  }
  
  /**
   * Get performance statistics
   * 
   * @param operation - Optional operation name to filter by
   * @returns Performance statistics
   */
  static getStats(operation?: string): PerformanceStats {
    const filtered = operation
      ? this.metrics.filter(m => m.operation === operation)
      : this.metrics;
    
    if (filtered.length === 0) {
      return {
        count: 0,
        avgMs: 0,
        minMs: 0,
        maxMs: 0,
        p95Ms: 0,
        p99Ms: 0,
        successRate: 0,
      };
    }
    
    const durations = filtered
      .map(m => m.durationMs)
      .sort((a, b) => a - b);
    
    const successes = filtered.filter(m => m.success !== false).length;
    const sum = durations.reduce((a, b) => a + b, 0);
    
    return {
      count: filtered.length,
      avgMs: sum / durations.length,
      minMs: durations[0],
      maxMs: durations[durations.length - 1],
      p95Ms: durations[Math.floor(durations.length * 0.95)] || 0,
      p99Ms: durations[Math.floor(durations.length * 0.99)] || 0,
      successRate: successes / filtered.length,
    };
  }
  
  /**
   * Get cache hit rate
   * 
   * @returns Cache hit rate (0-1)
   */
  static getCacheHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return this.hits / total;
  }
  
  /**
   * Clear metrics (for testing)
   */
  static clear(): void {
    this.metrics = [];
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Export metrics (for analysis)
   * 
   * @returns Copy of all metrics
   */
  static export(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  /**
   * Get metrics count
   */
  static getMetricsCount(): number {
    return this.metrics.length;
  }
  
  /**
   * Get recent metrics (last N)
   * 
   * @param count - Number of recent metrics to return
   * @returns Recent metrics
   */
  static getRecentMetrics(count: number = 10): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }
}

