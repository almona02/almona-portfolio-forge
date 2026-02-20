/**
 * CheckpointManager - Egypt-Optimized Checkpoint Manager
 * 
 * Provides LocalStorage + cloud sync for workflow checkpoints with
 * Arabic resume messages and automatic recovery from interruptions.
 * 
 * Week 4 Task 4.2: Production Workflow with Checkpoint System
 */

import { supabase } from '@/lib/supabase';
import { SecurityGateway } from '@/lib/security/SecurityGateway';

export interface WorkflowCheckpoint {
  id: string;
  workflowId: string;
  stage: string;
  stageName: string;
  progress: number; // 0-100
  data: Record<string, unknown>;
  timestamp: number;
  lastModified: number;
  metadata?: Record<string, unknown>;
}

/** Database row shape for workflow_checkpoints table */
interface DbWorkflowCheckpoint {
  id: string;
  user_id: string;
  workflow_id: string;
  stage: string;
  stage_name: string;
  progress: number;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
  last_modified: string;
}

export interface CheckpointResumeInfo {
  checkpoint: WorkflowCheckpoint;
  resumeMessage: string;
  resumeMessageAr: string;
  canResume: boolean;
  estimatedTimeRemaining?: number; // milliseconds
}

export interface CheckpointSyncStatus {
  synced: boolean;
  syncedAt: number | null;
  usedFallback: boolean;
  error?: string;
}

/**
 * CheckpointManager - Manages workflow checkpoints with LocalStorage + cloud sync
 */
export class CheckpointManager {
  private static instance: CheckpointManager;
  private securityGateway: SecurityGateway;
  private readonly localStoragePrefix = 'workflow_checkpoint_';
  private readonly cloudTable = 'workflow_checkpoints';
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private constructor() {
    this.securityGateway = SecurityGateway.getInstance();
  }

  static getInstance(): CheckpointManager {
    if (!CheckpointManager.instance) {
      CheckpointManager.instance = new CheckpointManager();
    }
    return CheckpointManager.instance;
  }

  /**
   * Create or update a checkpoint
   */
  async saveCheckpoint(
    workflowId: string,
    stage: string,
    stageName: string,
    progress: number,
    data: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    syncToCloud: boolean = true
  ): Promise<CheckpointSyncStatus> {
    const checkpoint: WorkflowCheckpoint = {
      id: `${workflowId}_${stage}`,
      workflowId,
      stage,
      stageName,
      progress: Math.max(0, Math.min(100, progress)),
      data,
      timestamp: Date.now(),
      lastModified: Date.now(),
      metadata,
    };

    // Save to LocalStorage immediately (synchronous)
    this.saveToLocalStorage(checkpoint);

    // Sync to cloud (async, debounced)
    if (syncToCloud) {
      return this.syncToCloudDebounced(checkpoint);
    }

    return { synced: false, syncedAt: null, usedFallback: true };
  }

  /**
   * Save checkpoint to LocalStorage
   */
  private saveToLocalStorage(checkpoint: WorkflowCheckpoint): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const key = `${this.localStoragePrefix}${checkpoint.id}`;
      window.localStorage.setItem(key, JSON.stringify(checkpoint));
    } catch (error) {
      console.warn('Failed to save checkpoint to LocalStorage:', error);
    }
  }

  /**
   * Sync checkpoint to cloud (debounced)
   */
  private async syncToCloudDebounced(checkpoint: WorkflowCheckpoint): Promise<CheckpointSyncStatus> {
    return new Promise((resolve) => {
      const timerKey = checkpoint.id;

      // Clear existing timer
      const existingTimer = this.debounceTimers.get(timerKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer (2 second debounce)
      const timer = setTimeout(() => {
        this.debounceTimers.delete(timerKey);
        void this.syncToCloud(checkpoint).then(resolve);
      }, 2000);

      this.debounceTimers.set(timerKey, timer);
    });
  }

  /**
   * Sync checkpoint to cloud (Supabase)
   */
  private async syncToCloud(checkpoint: WorkflowCheckpoint): Promise<CheckpointSyncStatus> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // No authenticated user - LocalStorage only
        return { synced: false, syncedAt: null, usedFallback: true };
      }

      // Try Supabase (table not in generated types; use generic)
      const { error: supabaseError } = await supabase
        .from(this.cloudTable)
        .upsert({
          id: checkpoint.id,
          user_id: user.id,
          workflow_id: checkpoint.workflowId,
          stage: checkpoint.stage,
          stage_name: checkpoint.stageName,
          progress: checkpoint.progress,
          data: checkpoint.data,
          metadata: checkpoint.metadata || {},
          timestamp: new Date(checkpoint.timestamp).toISOString(),
          last_modified: new Date(checkpoint.lastModified).toISOString(),
        });

      if (supabaseError) {
        // Check if it's an expected error (RLS, permissions, etc.)
        const status = (supabaseError as { status?: number }).status;
        const code = (supabaseError as { code?: string | number }).code;
        const isExpectedError = status === 403 || status === 404 || status === 406 ||
                                code === 42501 || code === '42501' || code === 'PGRST116';

        if (!isExpectedError && process.env.NODE_ENV === 'development') {
          console.warn('Supabase checkpoint sync failed, using LocalStorage:', supabaseError);
        }

        return { synced: false, syncedAt: null, usedFallback: true };
      }

      return { synced: true, syncedAt: Date.now(), usedFallback: false };
    } catch (error) {
      console.warn('Failed to sync checkpoint to cloud:', error);
      return { synced: false, syncedAt: null, usedFallback: true, error: String(error) };
    }
  }

  /**
   * Load checkpoint by workflow ID and stage
   */
  async loadCheckpoint(workflowId: string, stage: string): Promise<WorkflowCheckpoint | null> {
    const checkpointId = `${workflowId}_${stage}`;

    // Try LocalStorage first (fastest)
    const localCheckpoint = this.loadFromLocalStorage(checkpointId);
    if (localCheckpoint) {
      // Also try to load from cloud in background (for conflict resolution)
      void this.loadFromCloud(checkpointId).then((cloudCheckpoint) => {
        if (cloudCheckpoint && cloudCheckpoint.lastModified > localCheckpoint.lastModified) {
          // Cloud is newer, update LocalStorage
          this.saveToLocalStorage(cloudCheckpoint);
        }
      }).catch(() => {
        // Silently fail
      });

      return localCheckpoint;
    }

    // Try cloud if LocalStorage doesn't have it
    const cloudCheckpoint = await this.loadFromCloud(checkpointId);
    if (cloudCheckpoint) {
      // Save to LocalStorage for faster access next time
      this.saveToLocalStorage(cloudCheckpoint);
      return cloudCheckpoint;
    }

    return null;
  }

  /**
   * Load checkpoint from LocalStorage
   */
  private loadFromLocalStorage(checkpointId: string): WorkflowCheckpoint | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    try {
      const key = `${this.localStoragePrefix}${checkpointId}`;
      const stored = window.localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as WorkflowCheckpoint;
      }
    } catch (error) {
      console.warn('Failed to load checkpoint from LocalStorage:', error);
    }

    return null;
  }

  /**
   * Load checkpoint from cloud
   */
  private async loadFromCloud(checkpointId: string): Promise<WorkflowCheckpoint | null> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return null;
      }

      const { data, error } = await supabase
        .from(this.cloudTable)
        .select('*')
        .eq('id', checkpointId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return null;
      }

      const row = data as unknown as DbWorkflowCheckpoint;
      return {
        id: row.id,
        workflowId: row.workflow_id,
        stage: row.stage,
        stageName: row.stage_name,
        progress: row.progress,
        data: row.data ?? {},
        timestamp: new Date(row.timestamp).getTime(),
        lastModified: new Date(row.last_modified).getTime(),
        metadata: row.metadata ?? {},
      };
    } catch (error) {
      console.warn('Failed to load checkpoint from cloud:', error);
      return null;
    }
  }

  /**
   * Get resume information for a checkpoint
   */
  getResumeInfo(
    checkpoint: WorkflowCheckpoint,
    locale: 'en' | 'ar' = 'en',
    estimatedTimeRemaining?: number
  ): CheckpointResumeInfo {
    const stageName = checkpoint.stageName;
    const progress = checkpoint.progress;

    const resumeMessage = locale === 'ar'
      ? `استئناف العملية من ${stageName} (${progress.toFixed(0)}% مكتمل)`
      : `Resume workflow from ${stageName} (${progress.toFixed(0)}% complete)`;

    const resumeMessageAr = `استئناف العملية من ${stageName} (${progress.toFixed(0)}% مكتمل)`;

    return {
      checkpoint,
      resumeMessage: locale === 'ar' ? resumeMessageAr : resumeMessage,
      resumeMessageAr,
      canResume: true,
      estimatedTimeRemaining,
    };
  }

  /**
   * List all checkpoints for a workflow
   */
  async listCheckpoints(workflowId: string): Promise<WorkflowCheckpoint[]> {
    const checkpoints: WorkflowCheckpoint[] = [];

    // Load from LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(this.localStoragePrefix)) {
            const checkpoint = this.loadFromLocalStorage(key.replace(this.localStoragePrefix, ''));
            if (checkpoint && checkpoint.workflowId === workflowId) {
              checkpoints.push(checkpoint);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to list checkpoints from LocalStorage:', error);
      }
    }

    // Also try cloud
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!authError && user) {
        const { data, error } = await supabase
          .from(this.cloudTable)
          .select('*')
          .eq('workflow_id', workflowId)
          .eq('user_id', user.id)
          .order('last_modified', { ascending: false });

        if (!error && data) {
          const rows = data as unknown as DbWorkflowCheckpoint[];
          rows.forEach((dbCheckpoint) => {
            const checkpoint: WorkflowCheckpoint = {
              id: dbCheckpoint.id,
              workflowId: dbCheckpoint.workflow_id,
              stage: dbCheckpoint.stage,
              stageName: dbCheckpoint.stage_name,
              progress: dbCheckpoint.progress,
              data: dbCheckpoint.data,
              timestamp: new Date(dbCheckpoint.timestamp).getTime(),
              lastModified: new Date(dbCheckpoint.last_modified).getTime(),
              metadata: dbCheckpoint.metadata || {},
            };

            const existingIndex = checkpoints.findIndex(c => c.id === checkpoint.id);
            if (existingIndex >= 0) {
              // Update if cloud is newer
              if (checkpoint.lastModified > checkpoints[existingIndex].lastModified) {
                checkpoints[existingIndex] = checkpoint;
              }
            } else {
              checkpoints.push(checkpoint);
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to list checkpoints from cloud:', error);
    }

    // Sort by last modified (newest first)
    return checkpoints.sort((a, b) => b.lastModified - a.lastModified);
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(workflowId: string, stage: string): Promise<void> {
    const checkpointId = `${workflowId}_${stage}`;

    // Delete from LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const key = `${this.localStoragePrefix}${checkpointId}`;
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to delete checkpoint from LocalStorage:', error);
      }
    }

    // Delete from cloud
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!authError && user) {
        await supabase
          .from(this.cloudTable)
          .delete()
          .eq('id', checkpointId)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.warn('Failed to delete checkpoint from cloud:', error);
    }
  }

  /**
   * Clear all checkpoints for a workflow
   */
  async clearWorkflowCheckpoints(workflowId: string): Promise<void> {
    const checkpoints = await this.listCheckpoints(workflowId);
    
    for (const checkpoint of checkpoints) {
      await this.deleteCheckpoint(checkpoint.workflowId, checkpoint.stage);
    }
  }
}

// Export singleton instance
export const checkpointManager = CheckpointManager.getInstance();

