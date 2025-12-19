/**
 * WorkflowProfiler - Performance Profiling for Workflow Stages
 * 
 * Tracks workflow duration, performance metrics, and identifies bottlenecks.
 * Target: <45 minutes for complete workflow.
 * 
 * Week 2 Task 2.2: Monitoring Infrastructure
 */

export interface WorkflowStage {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowMetrics {
  totalDuration: number;
  stages: WorkflowStage[];
  averageStageDuration: number;
  slowestStage?: WorkflowStage;
  fastestStage?: WorkflowStage;
  withinTarget: boolean;
  targetDuration: number; // in milliseconds (45 minutes = 2700000ms)
}

export interface PerformanceCheckpoint {
  stage: string;
  timestamp: number;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * WorkflowProfiler - Main profiling class
 */
export class WorkflowProfiler {
  private stages: Map<string, WorkflowStage> = new Map();
  private checkpoints: PerformanceCheckpoint[] = [];
  private workflowStartTime: number | null = null;
  private workflowEndTime: number | null = null;
  private readonly targetDuration = 45 * 60 * 1000; // 45 minutes in milliseconds

  /**
   * Start profiling a workflow
   */
  startWorkflow(): void {
    this.workflowStartTime = performance.now();
    this.stages.clear();
    this.checkpoints = [];
  }

  /**
   * Start timing a workflow stage
   */
  startTiming(stageId: string, stageName: string, metadata?: Record<string, any>): void {
    const stage: WorkflowStage = {
      id: stageId,
      name: stageName,
      startTime: performance.now(),
      metadata,
    };
    this.stages.set(stageId, stage);
  }

  /**
   * End timing a workflow stage
   */
  endTiming(stageId: string, metadata?: Record<string, any>): WorkflowStage | null {
    const stage = this.stages.get(stageId);
    if (!stage) {
      console.warn(`Stage ${stageId} not found`);
      return null;
    }

    stage.endTime = performance.now();
    stage.duration = stage.endTime - stage.startTime;
    
    if (metadata) {
      stage.metadata = { ...stage.metadata, ...metadata };
    }

    // Add checkpoint
    this.checkpoints.push({
      stage: stageId,
      timestamp: stage.endTime,
      duration: stage.duration,
      metadata: stage.metadata,
    });

    return stage;
  }

  /**
   * End profiling a workflow
   */
  endWorkflow(): WorkflowMetrics {
    this.workflowEndTime = performance.now();
    
    const totalDuration = this.workflowEndTime - (this.workflowStartTime || 0);
    const stages = Array.from(this.stages.values());
    
    // Calculate average stage duration
    const completedStages = stages.filter(s => s.duration !== undefined);
    const averageStageDuration = completedStages.length > 0
      ? completedStages.reduce((sum, s) => sum + (s.duration || 0), 0) / completedStages.length
      : 0;

    // Find slowest and fastest stages
    const slowestStage = completedStages.reduce((slowest, current) => {
      return (!slowest || (current.duration || 0) > (slowest.duration || 0)) ? current : slowest;
    }, undefined as WorkflowStage | undefined);

    const fastestStage = completedStages.reduce((fastest, current) => {
      return (!fastest || (current.duration || 0) < (fastest.duration || 0)) ? current : fastest;
    }, undefined as WorkflowStage | undefined);

    const metrics: WorkflowMetrics = {
      totalDuration,
      stages,
      averageStageDuration,
      slowestStage,
      fastestStage,
      withinTarget: totalDuration < this.targetDuration,
      targetDuration: this.targetDuration,
    };

    // Log metrics
    this.logMetrics(metrics);

    return metrics;
  }

  /**
   * Get current workflow efficiency
   */
  getWorkflowEfficiency(): {
    totalDuration: number;
    targetDuration: number;
    efficiency: number; // percentage (can exceed 100 if better than target)
    reduction: number; // percentage reduction needed
    achieved: boolean;
  } {
    const totalDuration = this.workflowEndTime && this.workflowStartTime
      ? this.workflowEndTime - this.workflowStartTime
      : performance.now() - (this.workflowStartTime || 0);

    const efficiency = (this.targetDuration / totalDuration) * 100;
    const reduction = Math.max(0, ((totalDuration - this.targetDuration) / totalDuration) * 100);

    return {
      totalDuration,
      targetDuration: this.targetDuration,
      efficiency, // Allow values > 100% to indicate better than target performance
      reduction,
      achieved: totalDuration < this.targetDuration,
    };
  }

  /**
   * Get performance checkpoints
   */
  getCheckpoints(): PerformanceCheckpoint[] {
    return [...this.checkpoints];
  }

  /**
   * Get stage by ID
   */
  getStage(stageId: string): WorkflowStage | undefined {
    return this.stages.get(stageId);
  }

  /**
   * Get all stages
   */
  getStages(): WorkflowStage[] {
    return Array.from(this.stages.values());
  }

  /**
   * Check if workflow is within target duration
   */
  isWithinTarget(): boolean {
    if (!this.workflowStartTime) return false;
    
    const currentDuration = (this.workflowEndTime || performance.now()) - this.workflowStartTime;
    return currentDuration < this.targetDuration;
  }

  /**
   * Get estimated time remaining
   */
  getEstimatedTimeRemaining(): number | null {
    if (!this.workflowStartTime) return null;

    const currentDuration = (this.workflowEndTime || performance.now()) - this.workflowStartTime;
    const remaining = this.targetDuration - currentDuration;
    
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Log metrics to console and send to backend
   */
  private logMetrics(metrics: WorkflowMetrics): void {
    // Console log
    console.group('📊 Workflow Performance Metrics');
    console.log(`Total Duration: ${this.formatDuration(metrics.totalDuration)}`);
    console.log(`Target: ${this.formatDuration(metrics.targetDuration)}`);
    console.log(`Within Target: ${metrics.withinTarget ? '✅' : '❌'}`);
    console.log(`Average Stage Duration: ${this.formatDuration(metrics.averageStageDuration)}`);
    
    if (metrics.slowestStage) {
      console.log(`Slowest Stage: ${metrics.slowestStage.name} (${this.formatDuration(metrics.slowestStage.duration || 0)})`);
    }
    
    if (metrics.fastestStage) {
      console.log(`Fastest Stage: ${metrics.fastestStage.name} (${this.formatDuration(metrics.fastestStage.duration || 0)})`);
    }
    
    console.groupEnd();

    // Send to backend (non-blocking)
    this.sendMetricsToBackend(metrics).catch(() => {
      // Silently fail if backend is unavailable
    });
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}min`;
    return `${(ms / 3600000).toFixed(2)}h`;
  }

  /**
   * Send metrics to backend
   */
  private async sendMetricsToBackend(metrics: WorkflowMetrics): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiBase}/api/v2/performance/workflow-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalDuration: metrics.totalDuration,
          targetDuration: metrics.targetDuration,
          withinTarget: metrics.withinTarget,
          stages: metrics.stages.map(s => ({
            id: s.id,
            name: s.name,
            duration: s.duration,
            metadata: s.metadata,
          })),
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      // Silently fail - don't break user experience
      console.warn('Failed to send workflow metrics to backend:', error);
    }
  }

  /**
   * Reset profiler
   */
  reset(): void {
    this.stages.clear();
    this.checkpoints = [];
    this.workflowStartTime = null;
    this.workflowEndTime = null;
  }
}

/**
 * Export singleton instance
 */
let workflowProfilerInstance: WorkflowProfiler | null = null;

export function getWorkflowProfiler(): WorkflowProfiler {
  if (!workflowProfilerInstance) {
    workflowProfilerInstance = new WorkflowProfiler();
  }
  return workflowProfilerInstance;
}

/**
 * Convenience functions
 */
export function startWorkflow(): void {
  getWorkflowProfiler().startWorkflow();
}

export function startTiming(stageId: string, stageName: string, metadata?: Record<string, any>): void {
  getWorkflowProfiler().startTiming(stageId, stageName, metadata);
}

export function endTiming(stageId: string, metadata?: Record<string, any>): WorkflowStage | null {
  return getWorkflowProfiler().endTiming(stageId, metadata);
}

export function endWorkflow(): WorkflowMetrics {
  return getWorkflowProfiler().endWorkflow();
}

