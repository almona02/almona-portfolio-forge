/**
 * CONSTITUTIONAL PERFORMANCE MONITORING
 * Deterministic Execution Time Tracker
 * 
 * Measures execution time for deterministic operations
 * Verifies that operations have consistent performance characteristics
 */

export interface DeterministicMetric<T> {
  operationName: string;
  runs: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  variance: number;
  isDeterministic: boolean; // Low variance = deterministic performance
  result: T;
  constitutionalNote: string;
}

export interface PerformanceWindow {
  startTime: number;
  endTime: number;
  operations: string[];
  avgDuration: number;
  tier: 'Tier 0' | 'Tier 3';
}

/**
 * Tracks execution time for deterministic operations
 * Ensures performance characteristics are stable and predictable
 */
export class DeterministicExecutionTracker {
  private metrics: Map<string, number[]> = new Map();
  private readonly varianceThreshold = 10; // ms - acceptable variance
  private readonly performanceWindows: PerformanceWindow[] = [];

  /**
   * Calculate variance from an array of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(squareDiffs.reduce((sum, val) => sum + val, 0) / values.length);
  }

  /**
   * Measure execution time for a deterministic operation
   * Runs multiple times to verify performance consistency
   */
  async measureDeterministicOperation<T>(
    operationName: string,
    operation: () => Promise<T> | T,
    runs: number = 3
  ): Promise<DeterministicMetric<T>> {
    const durations: number[] = [];
    let result: T | undefined;

    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      result = await operation();
      const duration = performance.now() - start;
      durations.push(duration);
    }

    // Store durations for this operation
    const existingDurations = this.metrics.get(operationName) || [];
    this.metrics.set(operationName, [...existingDurations, ...durations]);

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const variance = this.calculateVariance(durations);
    const isDeterministic = variance < this.varianceThreshold;

    return {
      operationName,
      runs,
      avgDuration,
      minDuration,
      maxDuration,
      variance,
      isDeterministic,
      result: result!,
      constitutionalNote: isDeterministic
        ? `Performance is deterministic (variance: ${variance.toFixed(2)}ms)`
        : `WARNING: High performance variance detected (${variance.toFixed(2)}ms) - may indicate non-deterministic behavior`
    };
  }

  /**
   * Measure a single execution with performance marking
   */
  async measureSingleExecution<T>(
    operationName: string,
    operation: () => Promise<T> | T,
    tier: 'Tier 0' | 'Tier 3'
  ): Promise<{ result: T; duration: number }> {
    // Create performance marks
    const startMark = `${operationName}_start`;
    const endMark = `${operationName}_end`;

    performance.mark(startMark);
    const result = await operation();
    performance.mark(endMark);

    // Measure duration
    try {
      performance.measure(operationName, startMark, endMark);
      const measure = performance.getEntriesByName(operationName).pop();
      const duration = measure?.duration || 0;

      // Store duration
      const durations = this.metrics.get(operationName) || [];
      durations.push(duration);
      this.metrics.set(operationName, durations);

      // Check against tier-specific thresholds
      this.checkTierPerformance(operationName, duration, tier);

      return { result, duration };
    } finally {
      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(operationName);
    }
  }

  /**
   * Check performance against tier-specific thresholds
   */
  private checkTierPerformance(
    operationName: string,
    duration: number,
    tier: 'Tier 0' | 'Tier 3'
  ): void {
    if (tier === 'Tier 0') {
      // Tier 0: Visual operations should be <16.67ms for 60fps
      if (duration > 16.67) {
        console.warn(
          `⚠️ TIER 0 PERFORMANCE: ${operationName} took ${duration.toFixed(2)}ms ` +
          `(target: <16.67ms for 60fps)`
        );
      }
    } else if (tier === 'Tier 3') {
      // Tier 3: Execution operations should be <100ms for interactivity
      if (duration > 100) {
        console.warn(
          `⚠️ TIER 3 PERFORMANCE: ${operationName} took ${duration.toFixed(2)}ms ` +
          `(target: <100ms for interactive response)`
        );
      }
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getOperationStats(operationName: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    variance: number;
    isDeterministic: boolean;
  } | null {
    const durations = this.metrics.get(operationName);

    if (!durations || durations.length === 0) {
      return null;
    }

    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const variance = this.calculateVariance(durations);

    return {
      count: durations.length,
      avgDuration,
      minDuration,
      maxDuration,
      variance,
      isDeterministic: variance < this.varianceThreshold
    };
  }

  /**
   * Start a performance window for tracking multiple operations
   */
  startPerformanceWindow(tier: 'Tier 0' | 'Tier 3'): number {
    const windowId = this.performanceWindows.length;
    this.performanceWindows.push({
      startTime: performance.now(),
      endTime: 0,
      operations: [],
      avgDuration: 0,
      tier
    });
    return windowId;
  }

  /**
   * End a performance window and calculate stats
   */
  endPerformanceWindow(windowId: number): PerformanceWindow | null {
    const window = this.performanceWindows[windowId];

    if (!window) {
      return null;
    }

    window.endTime = performance.now();
    window.avgDuration = window.endTime - window.startTime;

    return window;
  }

  /**
   * Record an operation in the current performance window
   */
  recordOperationInWindow(windowId: number, operationName: string): void {
    const window = this.performanceWindows[windowId];

    if (window) {
      window.operations.push(operationName);
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, number[]> {
    return new Map(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.performanceWindows.length = 0;
  }

  /**
   * Export metrics for reporting
   */
  exportMetrics(): { operationName: string; durations: number[] }[] {
    return Array.from(this.metrics.entries()).map(([operationName, durations]) => ({
      operationName,
      durations
    }));
  }
}

/**
 * Singleton instance
 */
export const deterministicExecutionTracker = new DeterministicExecutionTracker();
