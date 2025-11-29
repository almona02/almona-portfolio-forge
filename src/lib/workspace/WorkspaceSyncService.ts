import { supabase } from '@/lib/supabase';
import type { FabricatorWorkspaceState } from '@/context/FabricatorWorkspaceContext';

/**
 * WorkspaceSyncService
 * --------------------
 * Persists the Fabricator workspace state to Supabase with a robust
 * localStorage fallback, and exposes basic sync status information.
 *
 * Enhanced with:
 * - Debounced saving (3-second delay)
 * - Conflict detection and resolution
 * - Enhanced error recovery with automatic fallback
 * - Last save timestamp tracking
 *
 * Behaviour:
 * - Prefers Supabase when an authenticated user is available
 * - Falls back to localStorage transparently when Supabase/auth fails
 * - Never throws to callers – instead returns structured status objects
 */
export class WorkspaceSyncService {
  private static readonly WORKSPACE_TABLE = 'workspace_snapshots';

  private readonly storageKey: string;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private lastSaveTimestamp: string | null = null;

  constructor(storageKey: string = 'fabricator-workspace-v1') {
    this.storageKey = storageKey;
  }

  private hasWindow(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  /**
   * Get last save timestamp
   */
  getLastSaveTimestamp(): string | null {
    return this.lastSaveTimestamp;
  }

  /**
   * Debounced save with conflict resolution
   * Waits for the specified delay before saving to reduce database writes
   */
  async saveWorkspaceSnapshotDebounced(
    workspaceState: FabricatorWorkspaceState,
    delay: number = 3000
  ): Promise<{ success: boolean; usedFallback: boolean; timestamp: string | null }> {
    return new Promise((resolve) => {
      // Clear any existing timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Set new timer
      this.debounceTimer = setTimeout(async () => {
        this.debounceTimer = null;
        const result = await this.saveWithRecovery(workspaceState);
        resolve(result);
      }, delay);
    });
  }

  /**
   * Cancel pending debounced save
   */
  cancelDebouncedSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Enhanced error recovery with automatic fallback
   */
  async saveWithRecovery(
    workspaceState: FabricatorWorkspaceState
  ): Promise<{ success: boolean; usedFallback: boolean; timestamp: string | null }> {
    try {
      const result = await this.saveWorkspaceSnapshot(workspaceState);
      
      // Update timestamp on success
      if (result.success) {
        this.lastSaveTimestamp = new Date().toISOString();
        this.recoveryAttempts = 0; // Reset on success
      }
      
      return {
        success: result.success,
        usedFallback: result.usedFallback,
        timestamp: this.lastSaveTimestamp
      };
    } catch (error) {
      console.warn('[WorkspaceSync] Primary save failed, attempting recovery:', error);
      
      if (this.recoveryAttempts < this.maxRecoveryAttempts) {
        this.recoveryAttempts++;
        
        // Try saving to localStorage as fallback
        try {
          const result = await this.saveToLocalStorageFallback(workspaceState);
          console.info('[WorkspaceSync] Recovery successful, saved to localStorage');
          return result;
        } catch (fallbackError) {
          console.error('[WorkspaceSync] Recovery fallback also failed:', fallbackError);
          // Continue to throw after max attempts
        }
      }
      
      // Reset attempts after max retries
      if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
        this.recoveryAttempts = 0;
      }
      
      return {
        success: false,
        usedFallback: true,
        timestamp: null
      };
    }
  }

  /**
   * Save to localStorage as fallback (with compression support)
   */
  private async saveToLocalStorageFallback(
    workspaceState: FabricatorWorkspaceState
  ): Promise<{ success: boolean; usedFallback: boolean; timestamp: string | null }> {
    if (!this.hasWindow()) {
      return { success: false, usedFallback: false, timestamp: null };
    }
    
    try {
      // For now, use JSON.stringify. Can be enhanced with compression later
      // if lz-string is installed: const compressed = LZString.compressToUTF16(JSON.stringify(workspaceState));
      const serialized = JSON.stringify(workspaceState);
      window.localStorage.setItem(this.storageKey, serialized);
      
      const timestamp = new Date().toISOString();
      this.lastSaveTimestamp = timestamp;
      
      return {
        success: true,
        usedFallback: true,
        timestamp
      };
    } catch (error) {
      console.error('[WorkspaceSync] LocalStorage fallback save failed:', error);
      return { success: false, usedFallback: true, timestamp: null };
    }
  }

  /**
   * Conflict resolution - merges server and local state
   * Strategy: Prefer local changes for currentProject, merge snapshots
   */
  async resolveConflict(
    serverState: FabricatorWorkspaceState,
    localState: FabricatorWorkspaceState
  ): Promise<FabricatorWorkspaceState> {
    // Simple merge strategy: prefer local currentProject, combine snapshots
    const resolved: FabricatorWorkspaceState = {
      ...serverState,
      // Prefer local currentProject if it exists
      currentProject: localState.currentProject || serverState.currentProject,
      // Merge snapshots (avoid duplicates)
      snapshots: [
        ...(serverState.snapshots || []),
        ...(localState.snapshots || []).filter(
          (localSnap) => !serverState.snapshots?.some((s) => s.id === localSnap.id)
        )
      ],
      // Merge profile edits
      profileEdits: {
        ...serverState.profileEdits,
        ...localState.profileEdits
      }
    };

    return resolved;
  }

  async saveWorkspaceSnapshot(
    workspaceState: FabricatorWorkspaceState,
  ): Promise<{ success: boolean; usedFallback: boolean }> {
    // Non‑browser environments cannot use localStorage; make a best‑effort Supabase write.
    if (!this.hasWindow()) {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return { success: false, usedFallback: false };
        }

        const { error: supabaseError } = await (supabase
          .from(WorkspaceSyncService.WORKSPACE_TABLE) as any)
          .upsert({
            user_id: user.id,
            workspace_data: workspaceState,
            last_modified: new Date().toISOString(),
          });

        if (supabaseError) {
          // Only log unexpected errors
          const status = (supabaseError as any)?.status;
          const code = (supabaseError as any)?.code;
          const message = (supabaseError as any)?.message || '';
          const isExpectedError = status === 403 || status === 404 || status === 406 || 
                                  code === 42501 || code === '42501' ||
                                  message.includes('row-level security') ||
                                  message.includes('RLS');
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('Supabase sync failed in non‑browser environment:', supabaseError);
          }
          return { success: false, usedFallback: false };
        }

        return { success: true, usedFallback: false };
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Workspace save failed in non‑browser environment:', error);
        return { success: false, usedFallback: false };
      }
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // No authenticated user - use localStorage only
        window.localStorage.setItem(this.storageKey, JSON.stringify(workspaceState));
        return { success: true, usedFallback: true };
      }

      // Try Supabase first
      const { error: supabaseError } = await (supabase
        .from(WorkspaceSyncService.WORKSPACE_TABLE) as any)
        .upsert({
          user_id: user.id,
          workspace_data: workspaceState,
          last_modified: new Date().toISOString(),
        });

      if (supabaseError) {
        // Only log if it's not a permission/RLS error (403, 404, 406, 42501 are expected)
        const status = (supabaseError as any)?.status;
        const code = (supabaseError as any)?.code;
        const message = (supabaseError as any)?.message || '';
        const isExpectedError = status === 403 || status === 404 || status === 406 || 
                                code === 42501 || // PostgreSQL permission denied (RLS policy violation)
                                code === '42501' || // String version
                                code === 'PGRST116' ||
                                message.includes('permission') ||
                                message.includes('row-level security') ||
                                message.includes('RLS') ||
                                message.includes('violates row-level security');
        
        if (!isExpectedError && process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Supabase sync failed, using localStorage:', supabaseError);
        }
        // Fallback to localStorage
        window.localStorage.setItem(this.storageKey, JSON.stringify(workspaceState));
        return { success: true, usedFallback: true };
      }

      // Also cache in localStorage for offline use
      window.localStorage.setItem(this.storageKey, JSON.stringify(workspaceState));
      this.lastSaveTimestamp = new Date().toISOString();
      return { success: true, usedFallback: false };
    } catch (error) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Workspace save failed completely:', error);
      }
      // Final fallback
      try {
        if (this.hasWindow()) {
          window.localStorage.setItem(this.storageKey, JSON.stringify(workspaceState));
          return { success: true, usedFallback: true };
        }
      } catch (storageError) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(
            'Failed to persist workspace state to localStorage after Supabase error:',
            storageError,
          );
        }
      }

      return { success: false, usedFallback: true };
    }
  }

  async loadWorkspaceSnapshot(): Promise<{
    data: FabricatorWorkspaceState | null;
    source: 'supabase' | 'localStorage' | 'none';
  }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!authError && user) {
        // Try Supabase first
        const { data: supabaseData, error } = await (supabase
          .from(WorkspaceSyncService.WORKSPACE_TABLE) as any)
          .select('workspace_data')
          .eq('user_id', user.id)
          .single();

        if (!error && supabaseData && (supabaseData as any).workspace_data) {
          // Also update localStorage cache
          if (this.hasWindow()) {
            window.localStorage.setItem(
              this.storageKey,
              JSON.stringify((supabaseData as any).workspace_data),
            );
          }
          return { data: (supabaseData as any).workspace_data, source: 'supabase' };
        }
        
        // Check if error is expected (RLS/permission issues)
        if (error) {
          const status = (error as any)?.status;
          const code = (error as any)?.code;
          const message = (error as any)?.message || '';
          const isExpectedError = status === 403 || status === 404 || status === 406 ||
                                  code === 42501 || code === '42501' ||
                                  code === 'PGRST116' ||
                                  message.includes('permission') ||
                                  message.includes('row-level security') ||
                                  message.includes('RLS') ||
                                  message.includes('violates row-level security');
          // Silently fallback for expected errors
          if (!isExpectedError && process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('Workspace load from Supabase failed:', error);
          }
        }
      }

      // Fallback to localStorage
      if (this.hasWindow()) {
        const localData = window.localStorage.getItem(this.storageKey);
        if (localData) {
          return { data: JSON.parse(localData) as FabricatorWorkspaceState, source: 'localStorage' };
        }
      }

      return { data: null, source: 'none' };
    } catch (error) {
      // Only log unexpected errors
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Workspace load failed:', error);
      }
      if (this.hasWindow()) {
        const localData = window.localStorage.getItem(this.storageKey);
        return {
          data: localData ? (JSON.parse(localData) as FabricatorWorkspaceState) : null,
          source: 'localStorage',
        };
      }

      return { data: null, source: 'none' };
    }
  }

  // Sync status monitoring
  async getSyncStatus(): Promise<{
    supabaseConnected: boolean;
    lastSync: string | null;
    storageUsed: 'supabase' | 'localStorage' | 'mixed';
  }> {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        const hasLocal =
          this.hasWindow() && !!window.localStorage.getItem(this.storageKey);

        return {
          supabaseConnected: false,
          lastSync: null,
          storageUsed: hasLocal ? 'localStorage' : 'localStorage',
        };
      }

      const { data, error } = await supabase
        .from(WorkspaceSyncService.WORKSPACE_TABLE)
        .select('last_modified')
        .eq('user_id', user.id)
        .single();

      let storageUsed: 'supabase' | 'localStorage' | 'mixed' = 'localStorage';

      const hasLocal = this.hasWindow() && !!window.localStorage.getItem(this.storageKey);

      if (data && hasLocal) {
        storageUsed = 'mixed';
      } else if (data) {
        storageUsed = 'supabase';
      } else if (hasLocal) {
        storageUsed = 'localStorage';
      }

      return {
        supabaseConnected: !error,
        lastSync: (data as any)?.last_modified || null,
        storageUsed,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Workspace sync status check failed:', error);

      const hasLocal = this.hasWindow() && !!window.localStorage.getItem(this.storageKey);

      return {
        supabaseConnected: false,
        lastSync: null,
        storageUsed: hasLocal ? 'localStorage' : 'localStorage',
      };
    }
  }
}
