/**
 * Enhanced State Persistence System
 * 
 * Gold-tier state persistence with versioning, auto-save intervals,
 * crash recovery, and session restoration for the Drafting Workbench.
 * 
 * Constitutional: Deterministic persistence, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { SafeLocalStorage, debounceWithMaxWait, safeJsonParse } from './securityUtils';

export interface DraftVersion {
  /** Version ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** State snapshot */
  state: unknown;
  /** Version label (user-defined or auto) */
  label?: string;
  /** Is this a checkpoint (major save) */
  isCheckpoint: boolean;
  /** Size in bytes */
  size: number;
}

export interface PersistenceConfig {
  /** Auto-save interval in milliseconds (default: 30000 = 30s) */
  autoSaveInterval?: number;
  /** Maximum versions to keep (default: 50) */
  maxVersions?: number;
  /** Debounce delay for state changes (default: 2000 = 2s) */
  debounceDelay?: number;
  /** Maximum wait before forcing save (default: 10000 = 10s) */
  maxWait?: number;
  /** Enable versioning (default: true) */
  enableVersioning?: boolean;
  /** Enable crash recovery (default: true) */
  enableRecovery?: boolean;
}

const DEFAULT_CONFIG: Required<PersistenceConfig> = {
  autoSaveInterval: 30000, // 30 seconds
  maxVersions: 50,
  debounceDelay: 2000, // 2 seconds
  maxWait: 10000, // 10 seconds
  enableVersioning: true,
  enableRecovery: true,
};

/** Version metadata stored in versions list (state loaded on demand) */
interface StoredVersionMetadata {
  id: string;
  timestamp: number;
  label?: string;
  isCheckpoint: boolean;
  size: number;
}

const STORAGE_KEYS = {
  CURRENT_DRAFT: 'draft-current',
  VERSIONS: 'draft-versions',
  RECOVERY: 'draft-recovery',
  SESSION: 'draft-session',
  CHECKPOINT: 'draft-checkpoint',
} as const;

/**
 * Enhanced State Persistence Manager
 */
export class StatePersistenceManager {
  private config: Required<PersistenceConfig>;
  private versions: DraftVersion[] = [];
  private currentVersionId: string | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private debouncedSave: (state: unknown) => void;
  private sessionId: string;

  constructor(config: PersistenceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create debounced save function
    this.debouncedSave = debounceWithMaxWait(
      (state: unknown) => this.saveVersion(state, false),
      this.config.debounceDelay,
      this.config.maxWait
    );

    // Load existing versions
    this.loadVersions();

    // Setup auto-save timer
    if (this.config.autoSaveInterval > 0) {
      this.startAutoSave();
    }

    // Setup crash recovery
    if (this.config.enableRecovery) {
      this.setupCrashRecovery();
    }
  }

  /**
   * Save state (debounced for frequent changes, immediate for checkpoints)
   */
  saveState(state: unknown, isCheckpoint: boolean = false): void {
    if (isCheckpoint) {
      // Immediate save for checkpoints
      this.saveVersion(state, true);
    } else {
      // Debounced save for regular changes
      this.debouncedSave(state);
    }
  }

  /**
   * Save a version
   */
  private saveVersion(state: unknown, isCheckpoint: boolean): void {
    try {
      const stateString = JSON.stringify(state);
      const size = new Blob([stateString]).size;
      
      const version: DraftVersion = {
        id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        state: state,
        isCheckpoint,
        size,
      };

      // Add to versions array
      this.versions.push(version);
      this.currentVersionId = version.id;

      // Keep only maxVersions
      if (this.versions.length > this.config.maxVersions) {
        const removed = this.versions.shift();
        if (removed) {
          SafeLocalStorage.removeItem(`version-${removed.id}`);
        }
      }

      // Save current draft
      SafeLocalStorage.setItem(STORAGE_KEYS.CURRENT_DRAFT, stateString);

      // Save versions metadata
      this.saveVersionsMetadata();

      // Save individual version if versioning enabled
      if (this.config.enableVersioning && isCheckpoint) {
        SafeLocalStorage.setItem(`version-${version.id}`, stateString);
      }

      // Save recovery point
      if (this.config.enableRecovery) {
        this.saveRecoveryPoint(state);
      }

      // Save session info
      this.saveSessionInfo();
    } catch (error) {
      console.error('Failed to save version:', error);
    }
  }

  /**
   * Load current draft
   */
  loadCurrentDraft(): unknown {
    try {
      const stateString = SafeLocalStorage.getItem(STORAGE_KEYS.CURRENT_DRAFT);
      if (!stateString) return null;
      
      return safeJsonParse<unknown>(stateString);
    } catch (error) {
      // Clear corrupted data if prototype pollution detected
      if (error instanceof Error && error.message === 'Prototype pollution detected') {
        console.warn('Clearing corrupted current draft due to prototype pollution');
        SafeLocalStorage.removeItem(STORAGE_KEYS.CURRENT_DRAFT);
      }
      console.error('Failed to load current draft:', error);
      return null;
    }
  }

  /**
   * Load a specific version
   */
  loadVersion(versionId: string): unknown {
    try {
      const version = this.versions.find(v => v.id === versionId);
      if (!version) return null;

      if (this.config.enableVersioning) {
        const stateString = SafeLocalStorage.getItem(`version-${versionId}`);
        if (stateString) {
          return safeJsonParse<unknown>(stateString);
        }
      }

      // Fallback to version metadata
      return version.state;
    } catch (error) {
      console.error('Failed to load version:', error);
      return null;
    }
  }

  /**
   * Get all versions
   */
  getVersions(): DraftVersion[] {
    return [...this.versions];
  }

  /**
   * Get recovery point
   */
  getRecoveryPoint(): { state: unknown; timestamp?: number; sessionId?: string } | null {
    try {
      const recoveryString = SafeLocalStorage.getItem(STORAGE_KEYS.RECOVERY);
      if (!recoveryString) return null;
      
      return safeJsonParse<{ state: unknown; timestamp?: number; sessionId?: string }>(recoveryString);
    } catch (error) {
      // Clear corrupted data if prototype pollution detected
      if (error instanceof Error && error.message === 'Prototype pollution detected') {
        console.warn('Clearing corrupted recovery point due to prototype pollution');
        SafeLocalStorage.removeItem(STORAGE_KEYS.RECOVERY);
      }
      console.error('Failed to load recovery point:', error);
      return null;
    }
  }

  /**
   * Check if recovery is available
   */
  hasRecoveryPoint(): boolean {
    return SafeLocalStorage.getItem(STORAGE_KEYS.RECOVERY) !== null;
  }

  /**
   * Clear recovery point (after successful recovery)
   */
  clearRecoveryPoint(): void {
    SafeLocalStorage.removeItem(STORAGE_KEYS.RECOVERY);
  }

  /**
   * Restore from recovery point: get state, clear recovery, return for application
   */
  restoreFromRecovery(): unknown {
    const recovery = this.getRecoveryPoint();
    if (!recovery || typeof recovery !== 'object' || !('state' in recovery)) return null;
    this.clearRecoveryPoint();
    return (recovery as { state: unknown }).state;
  }

  /** Alias for clearRecoveryPoint (discard without restoring) */
  discardRecoveryPoint(): void {
    this.clearRecoveryPoint();
  }

  /**
   * Create a user checkpoint (immediate save with label)
   */
  createCheckpoint(state: unknown, _label: string): void {
    this.saveState(state, true);
  }

  /**
   * Delete a version
   */
  deleteVersion(versionId: string): boolean {
    try {
      const index = this.versions.findIndex(v => v.id === versionId);
      if (index === -1) return false;

      const _version = this.versions[index];
      this.versions.splice(index, 1);

      // Remove from storage
      SafeLocalStorage.removeItem(`version-${versionId}`);
      this.saveVersionsMetadata();

      return true;
    } catch (error) {
      console.error('Failed to delete version:', error);
      return false;
    }
  }

  /**
   * Load versions metadata
   */
  private loadVersions(): void {
    try {
      const metadataString = SafeLocalStorage.getItem(STORAGE_KEYS.VERSIONS);
      if (!metadataString) {
        this.versions = [];
        return;
      }

      const metadata = safeJsonParse<{ versions: StoredVersionMetadata[]; currentVersionId: string | null }>(metadataString);
      this.versions = (metadata.versions || []).map(v => ({ ...v, state: undefined as unknown }));
      this.currentVersionId = metadata.currentVersionId || null;
    } catch (error) {
      // Clear corrupted data if prototype pollution detected
      if (error instanceof Error && error.message === 'Prototype pollution detected') {
        console.warn('Clearing corrupted versions metadata due to prototype pollution');
        SafeLocalStorage.removeItem(STORAGE_KEYS.VERSIONS);
      }
      console.error('Failed to load versions metadata:', error);
      this.versions = [];
    }
  }

  /**
   * Save versions metadata
   */
  private saveVersionsMetadata(): void {
    try {
      const metadata = {
        versions: this.versions.map(v => ({
          id: v.id,
          timestamp: v.timestamp,
          label: v.label,
          isCheckpoint: v.isCheckpoint,
          size: v.size,
          // Don't store full state in metadata
        })),
        currentVersionId: this.currentVersionId,
      };
      
      SafeLocalStorage.setItem(STORAGE_KEYS.VERSIONS, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save versions metadata:', error);
    }
  }

  /**
   * Save recovery point
   */
  private saveRecoveryPoint(state: unknown): void {
    try {
      const recoveryData = {
        state,
        timestamp: Date.now(),
        sessionId: this.sessionId,
      };
      
      SafeLocalStorage.setItem(STORAGE_KEYS.RECOVERY, JSON.stringify(recoveryData));
    } catch (error) {
      console.error('Failed to save recovery point:', error);
    }
  }

  /**
   * Save session info
   */
  private saveSessionInfo(): void {
    try {
      const sessionInfo = {
        sessionId: this.sessionId,
        lastSave: Date.now(),
        versionCount: this.versions.length,
      };
      
      SafeLocalStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionInfo));
    } catch (error) {
      console.error('Failed to save session info:', error);
    }
  }

  /**
   * Setup crash recovery
   */
  private setupCrashRecovery(): void {
    // Save recovery point on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        // This is a best-effort save - may not always work
        const currentState = this.loadCurrentDraft();
        if (currentState) {
          this.saveRecoveryPoint(currentState);
        }
      });
    }
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      const currentState = this.loadCurrentDraft();
      if (currentState) {
        this.saveVersion(currentState, false);
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoSave();
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalVersions: number;
    totalSize: number;
    checkpointCount: number;
    oldestVersion: DraftVersion | null;
    newestVersion: DraftVersion | null;
  } {
    const checkpoints = this.versions.filter(v => v.isCheckpoint);
    const totalSize = this.versions.reduce((sum, v) => sum + v.size, 0);
    
    return {
      totalVersions: this.versions.length,
      totalSize,
      checkpointCount: checkpoints.length,
      oldestVersion: this.versions[0] || null,
      newestVersion: this.versions[this.versions.length - 1] || null,
    };
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format timestamp for display
 */
export function formatVersionTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

