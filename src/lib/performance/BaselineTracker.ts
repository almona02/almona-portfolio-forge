/**
 * BaselineTracker - Performance Baseline Tracking
 * 
 * Tracks performance baselines, detects regressions, and compares current
 * performance against historical baselines.
 * 
 * Week 2 Task 2.2: Monitoring Infrastructure
 */

export interface Baseline {
  id: string;
  name: string;
  metric: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface BaselineComparison {
  baseline: Baseline;
  current: number;
  difference: number;
  percentageChange: number;
  isRegression: boolean;
  threshold: number;
}

export interface PerformanceBaseline {
  workflowDuration: number; // milliseconds
  accuracyRate: number; // percentage (0-100)
  errorRate: number; // percentage (0-100)
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * BaselineTracker - Main baseline tracking class
 */
export class BaselineTracker {
  private baselines: Map<string, Baseline[]> = new Map();
  private performanceBaselines: PerformanceBaseline[] = [];
  private readonly maxBaselinesPerMetric = 100;

  /**
   * Record a baseline value
   */
  recordBaseline(metric: string, value: number, name?: string, metadata?: Record<string, any>): void {
    const baseline: Baseline = {
      id: `${metric}-${Date.now()}`,
      name: name || metric,
      metric,
      value,
      timestamp: Date.now(),
      metadata,
    };

    if (!this.baselines.has(metric)) {
      this.baselines.set(metric, []);
    }

    const metricBaselines = this.baselines.get(metric)!;
    metricBaselines.push(baseline);

    // Keep only recent baselines
    if (metricBaselines.length > this.maxBaselinesPerMetric) {
      metricBaselines.shift();
    }
  }

  /**
   * Record a performance baseline
   */
  recordPerformanceBaseline(
    workflowDuration: number,
    accuracyRate: number,
    errorRate: number,
    metadata?: Record<string, any>
  ): void {
    const baseline: PerformanceBaseline = {
      workflowDuration,
      accuracyRate,
      errorRate,
      timestamp: Date.now(),
      metadata,
    };

    this.performanceBaselines.push(baseline);

    // Keep only recent baselines
    if (this.performanceBaselines.length > this.maxBaselinesPerMetric) {
      this.performanceBaselines.shift();
    }

    // Also record individual metrics
    this.recordBaseline('workflow_duration', workflowDuration, 'Workflow Duration', metadata);
    this.recordBaseline('accuracy_rate', accuracyRate, 'Accuracy Rate', metadata);
    this.recordBaseline('error_rate', errorRate, 'Error Rate', metadata);
  }

  /**
   * Get latest baseline for a metric
   */
  getLatestBaseline(metric: string): Baseline | null {
    const baselines = this.baselines.get(metric);
    if (!baselines || baselines.length === 0) {
      return null;
    }
    return baselines[baselines.length - 1];
  }

  /**
   * Get average baseline for a metric
   */
  getAverageBaseline(metric: string, count?: number): number | null {
    const baselines = this.baselines.get(metric);
    if (!baselines || baselines.length === 0) {
      return null;
    }

    const recentBaselines = count
      ? baselines.slice(-count)
      : baselines;

    const sum = recentBaselines.reduce((acc, b) => acc + b.value, 0);
    return sum / recentBaselines.length;
  }

  /**
   * Compare current value against baseline
   */
  compareToBaseline(
    metric: string,
    currentValue: number,
    threshold: number = 0.1 // 10% threshold for regression
  ): BaselineComparison | null {
    const baseline = this.getLatestBaseline(metric);
    if (!baseline) {
      return null;
    }

    const difference = currentValue - baseline.value;
    const percentageChange = (difference / baseline.value) * 100;
    const isRegression = Math.abs(percentageChange) > threshold * 100;

    return {
      baseline,
      current: currentValue,
      difference,
      percentageChange,
      isRegression,
      threshold: threshold * 100,
    };
  }

  /**
   * Detect performance regression
   */
  detectRegression(
    workflowDuration: number,
    accuracyRate: number,
    errorRate: number,
    thresholds: {
      workflowDuration?: number; // percentage threshold
      accuracyRate?: number; // percentage threshold
      errorRate?: number; // percentage threshold
    } = {}
  ): {
    hasRegression: boolean;
    regressions: BaselineComparison[];
    improvements: BaselineComparison[];
  } {
    const regressions: BaselineComparison[] = [];
    const improvements: BaselineComparison[] = [];

    // Check workflow duration (lower is better)
    const durationComparison = this.compareToBaseline(
      'workflow_duration',
      workflowDuration,
      thresholds.workflowDuration || 0.1
    );
    if (durationComparison) {
      if (durationComparison.percentageChange > 0) {
        // Duration increased (regression)
        regressions.push(durationComparison);
      } else {
        // Duration decreased (improvement)
        improvements.push(durationComparison);
      }
    }

    // Check accuracy rate (higher is better)
    const accuracyComparison = this.compareToBaseline(
      'accuracy_rate',
      accuracyRate,
      thresholds.accuracyRate || 0.1
    );
    if (accuracyComparison) {
      if (accuracyComparison.percentageChange < 0) {
        // Accuracy decreased (regression)
        regressions.push(accuracyComparison);
      } else {
        // Accuracy increased (improvement)
        improvements.push(accuracyComparison);
      }
    }

    // Check error rate (lower is better)
    const errorComparison = this.compareToBaseline(
      'error_rate',
      errorRate,
      thresholds.errorRate || 0.1
    );
    if (errorComparison) {
      if (errorComparison.percentageChange > 0) {
        // Error rate increased (regression)
        regressions.push(errorComparison);
      } else {
        // Error rate decreased (improvement)
        improvements.push(errorComparison);
      }
    }

    return {
      hasRegression: regressions.length > 0,
      regressions,
      improvements,
    };
  }

  /**
   * Get performance trend
   */
  getPerformanceTrend(metric: string, count: number = 10): {
    trend: 'improving' | 'degrading' | 'stable';
    average: number;
    latest: number;
    change: number;
    percentageChange: number;
  } | null {
    const baselines = this.baselines.get(metric);
    if (!baselines || baselines.length < 2) {
      return null;
    }

    const recentBaselines = baselines.slice(-count);
    const latest = recentBaselines[recentBaselines.length - 1].value;
    const previous = recentBaselines[0].value;
    const average = recentBaselines.reduce((sum, b) => sum + b.value, 0) / recentBaselines.length;

    const change = latest - previous;
    const percentageChange = (change / previous) * 100;

    let trend: 'improving' | 'degrading' | 'stable';
    if (Math.abs(percentageChange) < 1) {
      trend = 'stable';
    } else if (percentageChange > 0) {
      // For metrics where lower is better (duration, error rate)
      if (metric.includes('duration') || metric.includes('error')) {
        trend = 'degrading';
      } else {
        trend = 'improving';
      }
    } else {
      // For metrics where lower is better
      if (metric.includes('duration') || metric.includes('error')) {
        trend = 'improving';
      } else {
        trend = 'degrading';
      }
    }

    return {
      trend,
      average,
      latest,
      change,
      percentageChange,
    };
  }

  /**
   * Get all baselines for a metric
   */
  getBaselines(metric: string): Baseline[] {
    return this.baselines.get(metric) || [];
  }

  /**
   * Get all performance baselines
   */
  getPerformanceBaselines(): PerformanceBaseline[] {
    return [...this.performanceBaselines];
  }

  /**
   * Get latest performance baseline
   */
  getLatestPerformanceBaseline(): PerformanceBaseline | null {
    if (this.performanceBaselines.length === 0) {
      return null;
    }
    return this.performanceBaselines[this.performanceBaselines.length - 1];
  }

  /**
   * Clear baselines for a metric
   */
  clearBaselines(metric: string): void {
    this.baselines.delete(metric);
  }

  /**
   * Clear all baselines
   */
  clearAllBaselines(): void {
    this.baselines.clear();
    this.performanceBaselines = [];
  }

  /**
   * Export baselines for persistence
   */
  exportBaselines(): {
    baselines: Record<string, Baseline[]>;
    performanceBaselines: PerformanceBaseline[];
  } {
    const baselinesObj: Record<string, Baseline[]> = {};
    for (const [metric, baselines] of this.baselines.entries()) {
      baselinesObj[metric] = baselines;
    }

    return {
      baselines: baselinesObj,
      performanceBaselines: [...this.performanceBaselines],
    };
  }

  /**
   * Import baselines from persisted data
   */
  importBaselines(data: {
    baselines: Record<string, Baseline[]>;
    performanceBaselines: PerformanceBaseline[];
  }): void {
    this.baselines.clear();
    for (const [metric, baselines] of Object.entries(data.baselines)) {
      this.baselines.set(metric, baselines);
    }
    this.performanceBaselines = [...data.performanceBaselines];
  }
}

/**
 * Export singleton instance
 */
let baselineTrackerInstance: BaselineTracker | null = null;

export function getBaselineTracker(): BaselineTracker {
  if (!baselineTrackerInstance) {
    baselineTrackerInstance = new BaselineTracker();
  }
  return baselineTrackerInstance;
}

/**
 * Convenience functions for baseline tracking
 */
export function recordPerformanceBaseline(
  workflowDuration: number,
  accuracyRate: number,
  errorRate: number,
  metadata?: Record<string, any>
): void {
  getBaselineTracker().recordPerformanceBaseline(workflowDuration, accuracyRate, errorRate, metadata);
}

export function detectRegression(
  workflowDuration: number,
  accuracyRate: number,
  errorRate: number,
  thresholds?: {
    workflowDuration?: number;
    accuracyRate?: number;
    errorRate?: number;
  }
): {
  hasRegression: boolean;
  regressions: any[];
  improvements: any[];
} {
  return getBaselineTracker().detectRegression(workflowDuration, accuracyRate, errorRate, thresholds);
}

