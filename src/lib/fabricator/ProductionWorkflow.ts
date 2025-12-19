/**
 * ProductionWorkflow - Production Workflow with Checkpoint System
 * 
 * Provides a production-grade workflow system with automatic checkpointing,
 * recovery from interruptions, and Arabic resume messages.
 * 
 * Week 4 Task 4.2: Production Workflow with Checkpoint System
 */

import { CheckpointManager, WorkflowCheckpoint, CheckpointResumeInfo } from './CheckpointManager';
import { WorkflowProfiler, WorkflowStage } from '@/lib/performance/WorkflowProfiler';
import { SecurityGateway } from '@/lib/security/SecurityGateway';

export interface WorkflowStageConfig {
  id: string;
  name: string;
  checkpointable: boolean; // Whether to create checkpoint at this stage
  estimatedDuration?: number; // milliseconds
  onStart?: () => Promise<void> | void;
  onComplete?: (data: any) => Promise<any> | any;
  onError?: (error: Error) => Promise<void> | void;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  stages: WorkflowStageConfig[];
  locale: 'en' | 'ar';
  autoCheckpoint: boolean; // Auto-checkpoint at each checkpointable stage
  checkpointInterval?: number; // milliseconds (optional time-based checkpointing)
}

export interface WorkflowState {
  workflowId: string;
  currentStage: string | null;
  completedStages: string[];
  data: Record<string, any>;
  progress: number; // 0-100
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  error?: string;
  errorAr?: string;
  startedAt: number | null;
  completedAt: number | null;
}

export interface WorkflowResumeOptions {
  fromStage?: string; // Resume from specific stage (default: current stage)
  skipCompleted?: boolean; // Skip already completed stages
}

/**
 * ProductionWorkflow - Main workflow class with checkpoint support
 */
export class ProductionWorkflow {
  private checkpointManager: CheckpointManager;
  private workflowProfiler: WorkflowProfiler;
  private securityGateway: SecurityGateway;
  private config: WorkflowConfig;
  private state: WorkflowState;
  private checkpointIntervalTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: WorkflowConfig) {
    this.checkpointManager = CheckpointManager.getInstance();
    this.workflowProfiler = new WorkflowProfiler();
    this.securityGateway = SecurityGateway.getInstance();
    this.config = config;
    this.state = {
      workflowId: config.id,
      currentStage: null,
      completedStages: [],
      data: {},
      progress: 0,
      status: 'idle',
      startedAt: null,
      completedAt: null,
    };
  }

  /**
   * Start the workflow
   */
  async start(initialData?: Record<string, any>): Promise<void> {
    if (this.state.status === 'running') {
      throw new Error('Workflow is already running');
    }

    this.state.status = 'running';
    this.state.startedAt = Date.now();
    this.state.data = { ...this.state.data, ...initialData };
    this.workflowProfiler.startWorkflow();

    // Check for existing checkpoint to resume from
    const resumeInfo = await this.checkForResume();
    if (resumeInfo && resumeInfo.canResume) {
      // Resume from checkpoint
      await this.resume(resumeInfo.checkpoint);
      return;
    }

    // Start from beginning
    await this.executeStages();
  }

  /**
   * Resume workflow from a checkpoint
   */
  async resume(checkpoint: WorkflowCheckpoint, options?: WorkflowResumeOptions): Promise<void> {
    if (this.state.status === 'running') {
      throw new Error('Workflow is already running');
    }

    // Restore state from checkpoint
    this.state.currentStage = options?.fromStage || checkpoint.stage;
    this.state.data = { ...this.state.data, ...checkpoint.data };
    this.state.progress = checkpoint.progress;
    this.state.status = 'running';
    this.state.startedAt = checkpoint.timestamp;

    // Mark stages before checkpoint as completed
    const checkpointStageIndex = this.config.stages.findIndex(s => s.id === checkpoint.stage);
    if (checkpointStageIndex >= 0) {
      this.state.completedStages = this.config.stages
        .slice(0, checkpointStageIndex)
        .map(s => s.id);
    }

    this.workflowProfiler.startWorkflow();

    // Resume from checkpoint stage
    await this.executeStages(checkpointStageIndex >= 0 ? checkpointStageIndex : 0, options?.skipCompleted);
  }

  /**
   * Pause the workflow and create a checkpoint
   */
  async pause(): Promise<void> {
    if (this.state.status !== 'running') {
      return;
    }

    this.state.status = 'paused';

    // Create checkpoint at current stage
    if (this.state.currentStage) {
      await this.createCheckpoint(this.state.currentStage);
    }

    // Stop checkpoint interval
    if (this.checkpointIntervalTimer) {
      clearInterval(this.checkpointIntervalTimer);
      this.checkpointIntervalTimer = null;
    }
  }

  /**
   * Check for existing checkpoint to resume from
   */
  async checkForResume(): Promise<CheckpointResumeInfo | null> {
    // Try to find the most recent checkpoint
    const checkpoints = await this.checkpointManager.listCheckpoints(this.config.id);
    
    if (checkpoints.length === 0) {
      return null;
    }

    // Get the most recent checkpoint
    const latestCheckpoint = checkpoints[0];
    const stageConfig = this.config.stages.find(s => s.id === latestCheckpoint.stage);
    
    if (!stageConfig) {
      return null;
    }

    // Calculate estimated time remaining
    const completedStages = this.config.stages.filter(s => 
      this.state.completedStages.includes(s.id)
    );
    const totalEstimatedDuration = this.config.stages.reduce((sum, stage) => 
      sum + (stage.estimatedDuration || 0), 0
    );
    const completedDuration = completedStages.reduce((sum, stage) => 
      sum + (stage.estimatedDuration || 0), 0
    );
    const estimatedTimeRemaining = totalEstimatedDuration - completedDuration;

    return this.checkpointManager.getResumeInfo(
      latestCheckpoint,
      this.config.locale,
      estimatedTimeRemaining > 0 ? estimatedTimeRemaining : undefined
    );
  }

  /**
   * Execute workflow stages
   */
  private async executeStages(startFromIndex: number = 0, skipCompleted: boolean = true): Promise<void> {
    try {
      // Start time-based checkpointing if configured
      if (this.config.checkpointInterval && this.config.checkpointInterval > 0) {
        this.startCheckpointInterval();
      }

      for (let i = startFromIndex; i < this.config.stages.length; i++) {
        const stageConfig = this.config.stages[i];

        // Skip if already completed
        if (skipCompleted && this.state.completedStages.includes(stageConfig.id)) {
          continue;
        }

        this.state.currentStage = stageConfig.id;
        this.workflowProfiler.startTiming(stageConfig.id, stageConfig.name);

        try {
          // Execute stage start hook
          if (stageConfig.onStart) {
            await stageConfig.onStart();
          }

          // Create checkpoint if stage is checkpointable
          if (stageConfig.checkpointable && this.config.autoCheckpoint) {
            await this.createCheckpoint(stageConfig.id);
          }

          // Execute stage completion hook
          let stageResult: any = undefined;
          if (stageConfig.onComplete) {
            stageResult = await stageConfig.onComplete(this.state.data);
            if (stageResult) {
              this.state.data = { ...this.state.data, ...stageResult };
            }
          }

          // Mark stage as completed
          this.state.completedStages.push(stageConfig.id);
          this.workflowProfiler.endTiming(stageConfig.id);

          // Update progress
          this.state.progress = Math.round(
            (this.state.completedStages.length / this.config.stages.length) * 100
          );
        } catch (error) {
          // Handle stage error
          if (stageConfig.onError) {
            await stageConfig.onError(error instanceof Error ? error : new Error(String(error)));
          }

          // Create checkpoint before error
          if (stageConfig.checkpointable) {
            await this.createCheckpoint(stageConfig.id);
          }

          this.state.status = 'error';
          this.state.error = error instanceof Error ? error.message : String(error);
          this.state.errorAr = this.securityGateway.getLocalizedError(
            'WORKFLOW_STAGE_ERROR',
            this.config.locale,
            { stage: stageConfig.name, error: this.state.error }
          ).messageAr;

          throw error;
        }
      }

      // All stages completed
      this.state.status = 'completed';
      this.state.completedAt = Date.now();
      this.state.progress = 100;
      this.workflowProfiler.endWorkflow();

      // Clear checkpoints on completion
      await this.checkpointManager.clearWorkflowCheckpoints(this.config.id);

      // Stop checkpoint interval
      if (this.checkpointIntervalTimer) {
        clearInterval(this.checkpointIntervalTimer);
        this.checkpointIntervalTimer = null;
      }
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : String(error);
      this.state.errorAr = this.securityGateway.getLocalizedError(
        'WORKFLOW_ERROR',
        this.config.locale,
        { error: this.state.error }
      ).messageAr;

      // Stop checkpoint interval
      if (this.checkpointIntervalTimer) {
        clearInterval(this.checkpointIntervalTimer);
        this.checkpointIntervalTimer = null;
      }

      throw error;
    }
  }

  /**
   * Create a checkpoint at the current stage
   */
  private async createCheckpoint(stageId: string): Promise<void> {
    const stageConfig = this.config.stages.find(s => s.id === stageId);
    if (!stageConfig) {
      return;
    }

    await this.checkpointManager.saveCheckpoint(
      this.config.id,
      stageId,
      stageConfig.name,
      this.state.progress,
      this.state.data,
      {
        completedStages: this.state.completedStages,
        status: this.state.status,
        startedAt: this.state.startedAt,
      }
    );
  }

  /**
   * Start time-based checkpoint interval
   */
  private startCheckpointInterval(): void {
    if (!this.config.checkpointInterval || this.config.checkpointInterval <= 0) {
      return;
    }

    this.checkpointIntervalTimer = setInterval(async () => {
      if (this.state.currentStage && this.state.status === 'running') {
        await this.createCheckpoint(this.state.currentStage);
      }
    }, this.config.checkpointInterval);
  }

  /**
   * Get current workflow state
   */
  getState(): WorkflowState {
    return { ...this.state };
  }

  /**
   * Get workflow configuration
   */
  getConfig(): WorkflowConfig {
    return { ...this.config };
  }

  /**
   * Get workflow profiler
   */
  getProfiler(): WorkflowProfiler {
    return this.workflowProfiler;
  }

  /**
   * Reset workflow state
   */
  async reset(): Promise<void> {
    this.state = {
      workflowId: this.config.id,
      currentStage: null,
      completedStages: [],
      data: {},
      progress: 0,
      status: 'idle',
      startedAt: null,
      completedAt: null,
    };

    this.workflowProfiler.reset();

    // Clear checkpoints
    await this.checkpointManager.clearWorkflowCheckpoints(this.config.id);

    // Stop checkpoint interval
    if (this.checkpointIntervalTimer) {
      clearInterval(this.checkpointIntervalTimer);
      this.checkpointIntervalTimer = null;
    }
  }
}

