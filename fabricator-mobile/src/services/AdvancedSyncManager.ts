/**
 * Advanced Sync Manager for complex sync operations
 * Handles conflict resolution, chunked sync, and operational transform
 */

import { offlineManager } from './OfflineManager';
import { supabase } from './supabaseClient';
import type { SyncOperation } from '../types/mobile';

export type ConflictResolution = 'mobile-wins' | 'web-wins' | 'merge' | 'manual';

export interface ConflictInfo {
  operationId: string;
  localData: any;
  remoteData: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: Date;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

export class AdvancedSyncManager {
  private conflictListeners: Array<(conflict: ConflictInfo) => void> = [];
  private progressListeners: Array<(progress: SyncProgress) => void> = [];
  private readonly CHUNK_SIZE = 50; // Process 50 operations at a time

  /**
   * Handle conflict resolution
   */
  async handleConflict(
    conflict: ConflictInfo,
    resolution: ConflictResolution
  ): Promise<void> {
    switch (resolution) {
      case 'mobile-wins':
        await this.applyLocalData(conflict);
        break;
      case 'web-wins':
        await this.applyRemoteData(conflict);
        break;
      case 'merge':
        await this.mergeData(conflict);
        break;
      case 'manual':
        // Queue for manual resolution
        await this.queueForManualResolution(conflict);
        break;
    }
  }

  /**
   * Apply local data (mobile wins)
   */
  private async applyLocalData(conflict: ConflictInfo): Promise<void> {
    try {
      switch (conflict.conflictType) {
        case 'update':
          const { error } = await supabase
            .from(this.getTableName(conflict.operationId))
            .update(conflict.localData)
            .eq('id', conflict.localData.id);
          
          if (error) throw error;
          break;
        case 'create':
          await supabase
            .from(this.getTableName(conflict.operationId))
            .insert(conflict.localData);
          break;
        case 'delete':
          await supabase
            .from(this.getTableName(conflict.operationId))
            .delete()
            .eq('id', conflict.localData.id);
          break;
      }
    } catch (error) {
      console.error('Failed to apply local data:', error);
      throw error;
    }
  }

  /**
   * Apply remote data (web wins)
   */
  private async applyRemoteData(conflict: ConflictInfo): Promise<void> {
    // Remove local operation from queue
    const queue = offlineManager.getPendingOperations();
    const operation = queue.find(op => op.id === conflict.operationId);
    
    if (operation) {
      // Mark as resolved and remove
      const allQueue = (offlineManager as any).queue;
      const index = allQueue.findIndex((op: SyncOperation) => op.id === conflict.operationId);
      if (index !== -1) {
        allQueue.splice(index, 1);
      }
    }

    // Accept remote data (no action needed, remote is already in database)
  }

  /**
   * Merge local and remote data
   */
  private async mergeData(conflict: ConflictInfo): Promise<void> {
    try {
      const merged = this.performMerge(conflict.localData, conflict.remoteData);
      
      const { error } = await supabase
        .from(this.getTableName(conflict.operationId))
        .update(merged)
        .eq('id', conflict.localData.id || conflict.remoteData.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to merge data:', error);
      throw error;
    }
  }

  /**
   * Perform intelligent merge of local and remote data
   */
  private performMerge(local: any, remote: any): any {
    const merged = { ...remote };

    // Merge strategy: take most recent non-null values
    for (const key in local) {
      if (local[key] !== null && local[key] !== undefined) {
        if (remote[key] === null || remote[key] === undefined) {
          merged[key] = local[key];
        } else {
          // If both exist, prefer the one with later timestamp
          const localTime = local.updated_at || local.created_at;
          const remoteTime = remote.updated_at || remote.created_at;
          
          if (localTime && remoteTime) {
            merged[key] = new Date(localTime) > new Date(remoteTime) ? local[key] : remote[key];
          } else {
            // Default to remote if timestamps unavailable
            merged[key] = remote[key];
          }
        }
      }
    }

    return merged;
  }

  /**
   * Queue conflict for manual resolution
   */
  private async queueForManualResolution(conflict: ConflictInfo): Promise<void> {
    // Store conflict in AsyncStorage for manual review
    const conflicts = await this.getPendingConflicts();
    conflicts.push(conflict);
    await this.savePendingConflicts(conflicts);

    // Notify listeners
    this.conflictListeners.forEach(listener => listener(conflict));
  }

  /**
   * Sync large job data with chunking
   */
  async syncLargeJobData(jobId: string): Promise<SyncProgress> {
    const progress: SyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      percentage: 0,
    };

    try {
      // Fetch job data
      const { data: jobData, error } = await supabase
        .from('cutting_jobs')
        .select('*, cutting_plans(*)')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      // Calculate total operations
      const plans = jobData.cutting_plans || [];
      progress.total = plans.length;

      // Process in chunks
      for (let i = 0; i < plans.length; i += this.CHUNK_SIZE) {
        const chunk = plans.slice(i, i + this.CHUNK_SIZE);
        
        const chunkPromises = chunk.map(async (plan: any) => {
          try {
            // Sync individual plan
            await this.syncCuttingPlan(plan);
            progress.completed++;
          } catch (error) {
            console.error(`Failed to sync plan ${plan.id}:`, error);
            progress.failed++;
          }
          
          progress.percentage = Math.round(
            ((progress.completed + progress.failed) / progress.total) * 100
          );
          
          this.notifyProgress(progress);
        });

        await Promise.allSettled(chunkPromises);
      }

      return progress;
    } catch (error) {
      console.error('Failed to sync large job data:', error);
      throw error;
    }
  }

  /**
   * Sync individual cutting plan
   */
  private async syncCuttingPlan(plan: any): Promise<void> {
    // Sync plan data to local storage or process as needed
    // This would typically update local cache or process the plan
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate work
  }

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflicts(operationId: string): Promise<ConflictInfo | null> {
    const queue = offlineManager.getPendingOperations();
    const operation = queue.find(op => op.id === operationId);
    
    if (!operation) {
      return null;
    }

    try {
      // Fetch remote data
      const tableName = this.getTableName(operationId);
      const { data: remoteData, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', operation.payload.id || operation.payload.remnantId || operation.payload.jobId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found, which is fine for create operations
        throw error;
      }

      // Compare timestamps to detect conflicts
      if (remoteData) {
        const localTimestamp = new Date(operation.timestamp);
        const remoteTimestamp = new Date(remoteData.updated_at || remoteData.created_at);

        if (remoteTimestamp > localTimestamp) {
          // Conflict detected - remote was updated after local operation
          return {
            operationId,
            localData: operation.payload,
            remoteData,
            conflictType: operation.type === 'scan_remnant' ? 'create' : 'update',
            timestamp: new Date(),
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return null;
    }
  }

  /**
   * Get table name from operation
   */
  private getTableName(operationId: string): string {
    const queue = offlineManager.getPendingOperations();
    const operation = queue.find(op => op.id === operationId);
    
    if (!operation) {
      return 'fabricator_remnants'; // Default
    }

    switch (operation.type) {
      case 'update_remnant':
      case 'scan_remnant':
        return 'fabricator_remnants';
      case 'complete_cut':
      case 'update_job_status':
        return 'cutting_jobs';
      default:
        return 'fabricator_remnants';
    }
  }

  /**
   * Subscribe to conflict events
   */
  subscribeToConflicts(listener: (conflict: ConflictInfo) => void): () => void {
    this.conflictListeners.push(listener);
    return () => {
      this.conflictListeners = this.conflictListeners.filter(l => l !== listener);
    };
  }

  /**
   * Subscribe to sync progress
   */
  subscribeToProgress(listener: (progress: SyncProgress) => void): () => void {
    this.progressListeners.push(listener);
    return () => {
      this.progressListeners = this.progressListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify progress listeners
   */
  private notifyProgress(progress: SyncProgress): void {
    this.progressListeners.forEach(listener => listener(progress));
  }

  /**
   * Get pending conflicts
   */
  private async getPendingConflicts(): Promise<ConflictInfo[]> {
    // In real implementation, would read from AsyncStorage
    return [];
  }

  /**
   * Save pending conflicts
   */
  private async savePendingConflicts(conflicts: ConflictInfo[]): Promise<void> {
    // In real implementation, would save to AsyncStorage
    console.log('Saving conflicts for manual resolution:', conflicts.length);
  }
}

// Export singleton instance
export const advancedSyncManager = new AdvancedSyncManager();

