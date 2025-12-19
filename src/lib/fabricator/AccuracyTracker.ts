/**
 * AccuracyTracker - End-to-End Accuracy Tracking
 * 
 * Tracks accuracy at each workflow stage and calculates end-to-end accuracy.
 * Target: >97.5% accuracy overall.
 * 
 * Week 2 Task 2.2: Monitoring Infrastructure
 */

export type WorkflowStage = 
  | 'dxf_parsing'
  | 'hardware_validation'
  | 'cut_list_generation'
  | 'cnc_output'
  | 'optimization'
  | 'export';

export interface AccuracyCheckpoint {
  stage: WorkflowStage;
  timestamp: number;
  inputHash: string;
  outputHash: string;
  accuracy: number; // percentage (0-100)
  validated: boolean;
  metadata?: Record<string, any>;
}

export interface AccuracyMetrics {
  endToEndAccuracy: number;
  checkpoints: AccuracyCheckpoint[];
  averageStageAccuracy: number;
  lowestStageAccuracy?: AccuracyCheckpoint;
  highestStageAccuracy?: AccuracyCheckpoint;
  withinTarget: boolean;
  targetAccuracy: number; // 97.5%
}

/**
 * AccuracyTracker - Main accuracy tracking class
 */
export class AccuracyTracker {
  private accuracyChain: AccuracyCheckpoint[] = [];
  private readonly targetAccuracy = 97.5;
  private readonly stageThresholds: Record<WorkflowStage, number> = {
    dxf_parsing: 99.5,
    hardware_validation: 99.8,
    cut_list_generation: 99.8,
    cnc_output: 99.8,
    optimization: 99.0,
    export: 99.5,
  };

  /**
   * Track accuracy checkpoint at a workflow stage
   */
  trackCheckpoint(
    stage: WorkflowStage,
    input: any,
    output: any,
    accuracy: number,
    metadata?: Record<string, any>
  ): void {
    const checkpoint: AccuracyCheckpoint = {
      stage,
      timestamp: Date.now(),
      inputHash: this.hashInput(input),
      outputHash: this.hashOutput(output),
      accuracy,
      validated: accuracy >= this.getThreshold(stage),
      metadata,
    };

    this.accuracyChain.push(checkpoint);

    // Log if accuracy drops below threshold
    if (!checkpoint.validated) {
      console.warn(
        `⚠️ Accuracy drop at ${stage}: ${accuracy.toFixed(2)}% ` +
        `(threshold: ${this.getThreshold(stage)}%)`
      );
    }

    // Send to backend (non-blocking)
    this.sendCheckpointToBackend(checkpoint).catch(() => {
      // Silently fail if backend is unavailable
    });
  }

  /**
   * Calculate end-to-end accuracy
   * 
   * Formula: Multiply all checkpoint accuracies
   * E.g., 99.5% × 99.8% × 99.8% = 99.1%
   */
  calculateEndToEndAccuracy(): number {
    if (this.accuracyChain.length === 0) {
      return 100; // Perfect if no checkpoints
    }

    const product = this.accuracyChain.reduce(
      (acc, checkpoint) => acc * (checkpoint.accuracy / 100),
      1
    );

    return product * 100;
  }

  /**
   * Get accuracy metrics
   */
  getAccuracyMetrics(): AccuracyMetrics {
    const endToEndAccuracy = this.calculateEndToEndAccuracy();
    const averageStageAccuracy = this.accuracyChain.length > 0
      ? this.accuracyChain.reduce((sum, c) => sum + c.accuracy, 0) / this.accuracyChain.length
      : 100;

    const lowestStageAccuracy = this.accuracyChain.reduce((lowest, current) => {
      return (!lowest || current.accuracy < lowest.accuracy) ? current : lowest;
    }, undefined as AccuracyCheckpoint | undefined);

    const highestStageAccuracy = this.accuracyChain.reduce((highest, current) => {
      return (!highest || current.accuracy > highest.accuracy) ? current : highest;
    }, undefined as AccuracyCheckpoint | undefined);

    return {
      endToEndAccuracy,
      checkpoints: [...this.accuracyChain],
      averageStageAccuracy,
      lowestStageAccuracy,
      highestStageAccuracy,
      withinTarget: endToEndAccuracy >= this.targetAccuracy,
      targetAccuracy: this.targetAccuracy,
    };
  }

  /**
   * Get threshold for a stage
   */
  getThreshold(stage: WorkflowStage): number {
    return this.stageThresholds[stage] || 99.0;
  }

  /**
   * Get checkpoints for a specific stage
   */
  getCheckpointsForStage(stage: WorkflowStage): AccuracyCheckpoint[] {
    return this.accuracyChain.filter(c => c.stage === stage);
  }

  /**
   * Get latest checkpoint for a stage
   */
  getLatestCheckpointForStage(stage: WorkflowStage): AccuracyCheckpoint | null {
    const checkpoints = this.getCheckpointsForStage(stage);
    return checkpoints.length > 0 ? checkpoints[checkpoints.length - 1] : null;
  }

  /**
   * Check if all checkpoints are validated
   */
  allCheckpointsValidated(): boolean {
    return this.accuracyChain.every(c => c.validated);
  }

  /**
   * Get failed checkpoints (below threshold)
   */
  getFailedCheckpoints(): AccuracyCheckpoint[] {
    return this.accuracyChain.filter(c => !c.validated);
  }

  /**
   * Hash input for tracking
   */
  private hashInput(input: any): string {
    try {
      const str = JSON.stringify(input);
      // Simple hash function (for production, use a proper hash library)
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `input_${Math.abs(hash).toString(16)}`;
    } catch {
      return `input_${Date.now()}`;
    }
  }

  /**
   * Hash output for tracking
   */
  private hashOutput(output: any): string {
    try {
      const str = JSON.stringify(output);
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `output_${Math.abs(hash).toString(16)}`;
    } catch {
      return `output_${Date.now()}`;
    }
  }

  /**
   * Send checkpoint to backend
   */
  private async sendCheckpointToBackend(checkpoint: AccuracyCheckpoint): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiBase}/api/v2/performance/accuracy-checkpoint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: checkpoint.stage,
          accuracy: checkpoint.accuracy,
          validated: checkpoint.validated,
          timestamp: checkpoint.timestamp,
          metadata: checkpoint.metadata,
        }),
      });
    } catch (error) {
      // Silently fail - don't break user experience
      console.warn('Failed to send accuracy checkpoint to backend:', error);
    }
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.accuracyChain = [];
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints(): AccuracyCheckpoint[] {
    return [...this.accuracyChain];
  }
}

/**
 * Export singleton instance
 */
let accuracyTrackerInstance: AccuracyTracker | null = null;

export function getAccuracyTracker(): AccuracyTracker {
  if (!accuracyTrackerInstance) {
    accuracyTrackerInstance = new AccuracyTracker();
  }
  return accuracyTrackerInstance;
}

/**
 * Convenience functions
 */
export function trackAccuracyCheckpoint(
  stage: WorkflowStage,
  input: any,
  output: any,
  accuracy: number,
  metadata?: Record<string, any>
): void {
  getAccuracyTracker().trackCheckpoint(stage, input, output, accuracy, metadata);
}

export function getEndToEndAccuracy(): number {
  return getAccuracyTracker().calculateEndToEndAccuracy();
}

export function getAccuracyMetrics(): AccuracyMetrics {
  return getAccuracyTracker().getAccuracyMetrics();
}

