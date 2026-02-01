/**
 * Workflow Performance Audit Utility
 * 
 * Provides timing markers and performance tracking for end-to-end workflow.
 * 
 * Usage:
 * - Add timing markers at critical checkpoints
 * - Track performance metrics across the workflow
 * - Generate performance reports
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

/**
 * Performance checkpoint names
 */
export enum PerformanceCheckpoint {
  // Design Phase
  DESIGN_START = 'design:start',
  DESIGN_COMPLETE = 'design:complete',
  
  // Validation Phase
  VALIDATION_START = 'validation:start',
  VALIDATION_ENVELOPE = 'validation:envelope',
  VALIDATION_COMPLETE = 'validation:complete',
  
  // BOM Generation Phase
  BOM_START = 'bom:start',
  BOM_REPLAY_TRACKING = 'bom:replay-tracking',
  BOM_CALCULATION = 'bom:calculation',
  BOM_COMPLETE = 'bom:complete',
  
  // Optimization Phase
  OPTIMIZATION_START = 'optimization:start',
  OPTIMIZATION_ALGORITHM_SELECTION = 'optimization:algorithm-selection',
  OPTIMIZATION_EXECUTION = 'optimization:execution',
  OPTIMIZATION_COMPLETE = 'optimization:complete',
  
  // Export Phase
  EXPORT_START = 'export:start',
  EXPORT_DXF_GENERATION = 'export:dxf-generation',
  EXPORT_GCODE_GENERATION = 'export:gcode-generation',
  EXPORT_COMPLETE = 'export:complete',
  
  // Audit Trail Phase
  AUDIT_START = 'audit:start',
  AUDIT_RECORDING = 'audit:recording',
  AUDIT_COMPLETE = 'audit:complete',
  
  // Workflow Totals
  WORKFLOW_START = 'workflow:start',
  WORKFLOW_COMPLETE = 'workflow:complete',
}

/**
 * Performance metric for a checkpoint
 */
export interface CheckpointMetric {
  checkpoint: PerformanceCheckpoint;
  timestamp: number;
  duration?: number; // Duration from previous checkpoint
  metadata?: Record<string, any>;
}

/**
 * Performance audit result
 */
export interface PerformanceAuditResult {
  workflowId: string;
  checkpoints: CheckpointMetric[];
  totalDuration: number;
  phaseDurations: {
    design: number;
    validation: number;
    bom: number;
    optimization: number;
    export: number;
    audit: number;
  };
  memoryUsage?: {
    initial: number;
    peak: number;
    final: number;
  };
  networkRequests?: number;
  errors?: string[];
}

/**
 * Performance Audit Manager
 */
export class WorkflowPerformanceAudit {
  private checkpoints: CheckpointMetric[] = [];
  private workflowId: string;
  private startTime: number = 0;
  private memoryInitial: number = 0;

  constructor(workflowId: string) {
    this.workflowId = workflowId;
    this.initializeMemoryTracking();
  }

  /**
   * Mark a performance checkpoint
   */
  mark(checkpoint: PerformanceCheckpoint, metadata?: Record<string, any>): void {
    const timestamp = performance.now();
    const duration = this.checkpoints.length > 0
      ? timestamp - this.checkpoints[this.checkpoints.length - 1].timestamp
      : undefined;

    const metric: CheckpointMetric = {
      checkpoint,
      timestamp,
      duration,
      metadata,
    };

    this.checkpoints.push(metric);

    // Also create browser performance mark for Chrome DevTools
    if (typeof performance.mark === 'function') {
      performance.mark(`${checkpoint}-${this.workflowId}`);
    }

    // Log checkpoint in development
    if (import.meta.env.DEV) {
      const durationStr = duration !== undefined ? ` (+${duration.toFixed(2)}ms)` : '';
      console.log(`[Performance] ${checkpoint}${durationStr}`, metadata || '');
    }
  }

  /**
   * Measure duration between two checkpoints
   */
  measure(checkpointStart: PerformanceCheckpoint, checkpointEnd: PerformanceCheckpoint): number | null {
    const start = this.checkpoints.find(c => c.checkpoint === checkpointStart);
    const end = this.checkpoints.find(c => c.checkpoint === checkpointEnd);

    if (!start || !end) {
      return null;
    }

    const duration = end.timestamp - start.timestamp;

    // Create browser performance measure for Chrome DevTools
    if (typeof performance.measure === 'function') {
      const measureName = `${checkpointStart}-to-${checkpointEnd}-${this.workflowId}`;
      try {
        performance.measure(measureName, `${checkpointStart}-${this.workflowId}`, `${checkpointEnd}-${this.workflowId}`);
      } catch (_e) {
        // Mark might not exist, ignore
      }
    }

    return duration;
  }

  /**
   * Start workflow tracking
   */
  startWorkflow(): void {
    this.startTime = performance.now();
    this.memoryInitial = this.getMemoryUsage();
    this.mark(PerformanceCheckpoint.WORKFLOW_START);
  }

  /**
   * Complete workflow tracking
   */
  completeWorkflow(): PerformanceAuditResult {
    this.mark(PerformanceCheckpoint.WORKFLOW_COMPLETE);
    
    const totalDuration = performance.now() - this.startTime;
    const memoryFinal = this.getMemoryUsage();
    const memoryPeak = this.getPeakMemoryUsage();

    // Calculate phase durations
    const phaseDurations = this.calculatePhaseDurations();

    const result: PerformanceAuditResult = {
      workflowId: this.workflowId,
      checkpoints: [...this.checkpoints],
      totalDuration,
      phaseDurations,
      memoryUsage: {
        initial: this.memoryInitial,
        peak: memoryPeak,
        final: memoryFinal,
      },
    };

    // Log summary in development
    if (import.meta.env.DEV) {
      this.logSummary(result);
    }

    return result;
  }

  /**
   * Calculate phase durations
   */
  private calculatePhaseDurations(): PerformanceAuditResult['phaseDurations'] {
    const getPhaseDuration = (start: PerformanceCheckpoint, end: PerformanceCheckpoint): number => {
      return this.measure(start, end) || 0;
    };

    return {
      design: getPhaseDuration(PerformanceCheckpoint.DESIGN_START, PerformanceCheckpoint.DESIGN_COMPLETE),
      validation: getPhaseDuration(PerformanceCheckpoint.VALIDATION_START, PerformanceCheckpoint.VALIDATION_COMPLETE),
      bom: getPhaseDuration(PerformanceCheckpoint.BOM_START, PerformanceCheckpoint.BOM_COMPLETE),
      optimization: getPhaseDuration(PerformanceCheckpoint.OPTIMIZATION_START, PerformanceCheckpoint.OPTIMIZATION_COMPLETE),
      export: getPhaseDuration(PerformanceCheckpoint.EXPORT_START, PerformanceCheckpoint.EXPORT_COMPLETE),
      audit: getPhaseDuration(PerformanceCheckpoint.AUDIT_START, PerformanceCheckpoint.AUDIT_COMPLETE),
    };
  }

  /**
   * Get memory usage (if available)
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Get peak memory usage (if available)
   */
  private getPeakMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.jsHeapSizeLimit / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Initialize memory tracking
   */
  private initializeMemoryTracking(): void {
    // Force garbage collection if available (Chrome DevTools)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  /**
   * Log performance summary
   */
  private logSummary(result: PerformanceAuditResult): void {
    console.group(`[Performance Audit] Workflow: ${result.workflowId}`);
    console.log(`Total Duration: ${result.totalDuration.toFixed(2)}ms`);
    console.log('Phase Durations:');
    Object.entries(result.phaseDurations).forEach(([phase, duration]) => {
      console.log(`  ${phase}: ${duration.toFixed(2)}ms`);
    });
    if (result.memoryUsage) {
      console.log('Memory Usage:');
      console.log(`  Initial: ${result.memoryUsage.initial.toFixed(2)}MB`);
      console.log(`  Peak: ${result.memoryUsage.peak.toFixed(2)}MB`);
      console.log(`  Final: ${result.memoryUsage.final.toFixed(2)}MB`);
      console.log(`  Increase: ${(result.memoryUsage.final - result.memoryUsage.initial).toFixed(2)}MB`);
    }
    console.groupEnd();
  }

  /**
   * Get checkpoint by name
   */
  getCheckpoint(checkpoint: PerformanceCheckpoint): CheckpointMetric | undefined {
    return this.checkpoints.find(c => c.checkpoint === checkpoint);
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints(): CheckpointMetric[] {
    return [...this.checkpoints];
  }

  /**
   * Reset audit tracker
   */
  reset(): void {
    this.checkpoints = [];
    this.startTime = 0;
    this.memoryInitial = 0;
  }
}

/**
 * Global performance audit instance (for React components)
 */
let globalAuditInstance: WorkflowPerformanceAudit | null = null;

/**
 * Get or create global performance audit instance
 */
export function getPerformanceAudit(workflowId: string): WorkflowPerformanceAudit {
  if (!globalAuditInstance || globalAuditInstance['workflowId'] !== workflowId) {
    globalAuditInstance = new WorkflowPerformanceAudit(workflowId);
  }
  return globalAuditInstance;
}

/**
 * Clear global performance audit instance
 */
export function clearPerformanceAudit(): void {
  globalAuditInstance = null;
}
