/**
 * Data Replication for Offline Capability
 * Handles data synchronization when offline
 */

export interface ReplicationRecord {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  timestamp: Date;
  synced: boolean;
  syncTimestamp?: Date;
  conflictResolution?: 'local' | 'remote' | 'merge';
}

export interface ReplicationStatus {
  pendingRecords: number;
  syncedRecords: number;
  failedRecords: number;
  lastSync: Date | null;
  syncInProgress: boolean;
}

export interface ConflictResolution {
  recordId: string;
  localVersion: ReplicationRecord;
  remoteVersion: ReplicationRecord;
  resolution: 'local' | 'remote' | 'merge';
  mergedData?: any;
}

export class DataReplication {
  private pendingRecords: Map<string, ReplicationRecord> = new Map();
  private syncedRecords: ReplicationRecord[] = [];
  private isOnline: boolean = true;

  /**
   * Set online/offline status
   */
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
    if (online) {
      // Attempt to sync pending records
      this.syncPendingRecords();
    }
  }

  /**
   * Check if online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Queue record for replication
   */
  queueRecord(record: ReplicationRecord): void {
    this.pendingRecords.set(record.id, record);

    // If online, attempt immediate sync
    if (this.isOnline) {
      this.syncRecord(record);
    }
  }

  /**
   * Sync single record
   */
  private async syncRecord(record: ReplicationRecord): Promise<boolean> {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 100));

      record.synced = true;
      record.syncTimestamp = new Date();
      this.pendingRecords.delete(record.id);
      this.syncedRecords.push(record);

      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }

  /**
   * Sync all pending records
   */
  async syncPendingRecords(): Promise<ReplicationStatus> {
    if (!this.isOnline) {
      return {
        pendingRecords: this.pendingRecords.size,
        syncedRecords: this.syncedRecords.length,
        failedRecords: 0,
        lastSync: null,
        syncInProgress: false,
      };
    }

    const records = Array.from(this.pendingRecords.values());
    let synced = 0;
    let failed = 0;

    for (const record of records) {
      const success = await this.syncRecord(record);
      if (success) {
        synced++;
      } else {
        failed++;
      }
    }

    return {
      pendingRecords: this.pendingRecords.size,
      syncedRecords: this.syncedRecords.length,
      failedRecords: failed,
      lastSync: new Date(),
      syncInProgress: false,
    };
  }

  /**
   * Get replication status
   */
  getStatus(): ReplicationStatus {
    return {
      pendingRecords: this.pendingRecords.size,
      syncedRecords: this.syncedRecords.length,
      failedRecords: 0,
      lastSync:
        this.syncedRecords.length > 0
          ? this.syncedRecords[this.syncedRecords.length - 1].syncTimestamp ||
            null
          : null,
      syncInProgress: false,
    };
  }

  /**
   * Resolve conflict
   */
  resolveConflict(resolution: ConflictResolution): void {
    const record = this.pendingRecords.get(resolution.recordId);
    if (!record) return;

    if (resolution.resolution === 'local') {
      record.data = resolution.localVersion.data;
    } else if (resolution.resolution === 'remote') {
      record.data = resolution.remoteVersion.data;
    } else if (resolution.resolution === 'merge' && resolution.mergedData) {
      record.data = resolution.mergedData;
    }

    record.conflictResolution = resolution.resolution;
    this.syncRecord(record);
  }

  /**
   * Get pending records
   */
  getPendingRecords(): ReplicationRecord[] {
    return Array.from(this.pendingRecords.values());
  }

  /**
   * Clear synced records (cleanup)
   */
  clearSyncedRecords(olderThanDays: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    this.syncedRecords = this.syncedRecords.filter(
      (r) => r.syncTimestamp && r.syncTimestamp > cutoffDate
    );
  }
}

