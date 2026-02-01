/**
 * Offline-first data management for mobile app
 * Queues operations when offline and syncs when connection is restored
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncOperation } from '../types/mobile';
import { supabase } from './supabaseClient';

const SYNC_QUEUE_KEY = '@fabricator:sync_queue';
const MAX_RETRIES = 3;

export class OfflineManager {
  private queue: SyncOperation[] = [];
  private isProcessing = false;
  private listeners: Array<(queueLength: number) => void> = [];

  constructor() {
    this.loadQueue();
  }

  /**
   * Load sync queue from persistent storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  /**
   * Save sync queue to persistent storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Add operation to sync queue
   */
  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const validTypes = ['update_remnant', 'complete_cut', 'update_job_status', 'scan_remnant'];
    if (!validTypes.includes(operation.type)) {
      throw new Error(`Invalid operation type: ${operation.type}`);
    }

    const syncOp: SyncOperation = {
      ...operation,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(syncOp);
    await this.saveQueue();

    // Try to process immediately if online
    if (await this.isOnline()) {
      this.processQueue();
    }

    return syncOp.id;
  }

  /**
   * Process all queued operations
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const online = await this.isOnline();
      if (!online) {
        console.log('Offline - queueing operations');
        return;
      }

      const operationsToProcess = [...this.queue];
      
      for (const operation of operationsToProcess) {
        try {
          await this.processOperation(operation);
          // Remove successful operation
          this.queue = this.queue.filter(op => op.id !== operation.id);
        } catch (error) {
          console.error(`Failed to process operation ${operation.id}:`, error);
          operation.retryCount += 1;
          
          if (operation.retryCount >= MAX_RETRIES) {
            operation.status = 'failed';
            console.error(`Operation ${operation.id} failed after ${MAX_RETRIES} retries`);
            // Keep failed operations for manual review
          } else {
            operation.status = 'pending';
          }
        }
      }

      await this.saveQueue();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';

    switch (operation.type) {
      case 'update_remnant':
        await this.syncRemnantUpdate(operation.payload);
        break;
      case 'complete_cut':
        await this.syncCutCompletion(operation.payload);
        break;
      case 'update_job_status':
        await this.syncJobStatusUpdate(operation.payload);
        break;
      case 'scan_remnant':
        await this.syncRemnantScan(operation.payload);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }

    operation.status = 'completed';
  }

  /**
   * Sync remnant update to Supabase
   */
  private async syncRemnantUpdate(payload: any): Promise<void> {
    const { remnantId, updates } = payload;
    const { error } = await supabase
      .from('fabricator_remnants')
      .update(updates)
      .eq('id', remnantId);

    if (error) throw error;
  }

  /**
   * Sync cut completion to Supabase
   */
  private async syncCutCompletion(payload: any): Promise<void> {
    const { cutId, jobId, completedAt, completedBy } = payload;
    // Update cutting job progress
    const { error } = await supabase
      .from('cutting_jobs')
      .update({
        updated_at: new Date().toISOString(),
        // Add cut completion tracking
      })
      .eq('id', jobId);

    if (error) throw error;
  }

  /**
   * Sync job status update to Supabase
   */
  private async syncJobStatusUpdate(payload: any): Promise<void> {
    const { jobId, status } = payload;
    const { error } = await supabase
      .from('cutting_jobs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) throw error;
  }

  /**
   * Sync remnant scan to Supabase
   */
  private async syncRemnantScan(payload: any): Promise<void> {
    const { remnantId, location, scannedAt, scannedBy } = payload;
    const { error } = await supabase
      .from('fabricator_remnants')
      .update({
        location,
        scanned_at: scannedAt,
        scanned_by: scannedBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', remnantId);

    if (error) throw error;
  }

  /**
   * Check if device is online
   */
  private async isOnline(): Promise<boolean> {
    try {
      const { data } = await supabase.from('_health').select('*').limit(1);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return this.queue.filter(op => op.status === 'pending');
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queueLength: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.queue.length));
  }

  /**
   * Clear completed operations from queue
   */
  async clearCompleted(): Promise<void> {
    this.queue = this.queue.filter(op => op.status !== 'completed');
    await this.saveQueue();
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();

