import { supabase } from '@/lib/supabase';
import type { FabricatorWorkspaceState } from '@/context/FabricatorWorkspaceContext';

/**
 * WorkspaceSyncService
 * --------------------
 * Persists the Fabricator workspace state to Supabase with a robust
 * localStorage fallback, and exposes basic sync status information.
 *
 * Behaviour:
 * - Prefers Supabase when an authenticated user is available
 * - Falls back to localStorage transparently when Supabase/auth fails
 * - Never throws to callers – instead returns structured status objects
 */
export class WorkspaceSyncService {
  private static readonly WORKSPACE_TABLE = 'workspace_snapshots';

  private readonly storageKey: string;

  constructor(storageKey: string = 'fabricator-workspace-v1') {
    this.storageKey = storageKey;
  }

  private hasWindow(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
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

        const { error: supabaseError } = await supabase
          .from(WorkspaceSyncService.WORKSPACE_TABLE)
          .upsert({
            user_id: user.id,
            workspace_data: workspaceState,
            last_modified: new Date().toISOString(),
          });

        if (supabaseError) {
          // eslint-disable-next-line no-console
          console.warn('Supabase sync failed in non‑browser environment:', supabaseError);
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
      const { error: supabaseError } = await supabase
        .from(WorkspaceSyncService.WORKSPACE_TABLE)
        .upsert({
          user_id: user.id,
          workspace_data: workspaceState,
          last_modified: new Date().toISOString(),
        });

      if (supabaseError) {
        // eslint-disable-next-line no-console
        console.warn('Supabase sync failed, using localStorage:', supabaseError);
        // Fallback to localStorage
        window.localStorage.setItem(this.storageKey, JSON.stringify(workspaceState));
        return { success: true, usedFallback: true };
      }

      // Also cache in localStorage for offline use
      window.localStorage.setItem(this.storageKey, JSON.stringify(workspaceState));
      return { success: true, usedFallback: false };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Workspace save failed completely:', error);
      // Final fallback
      try {
        if (this.hasWindow()) {
          window.localStorage.setItem(this.storageKey, JSON.stringify(workspaceState));
          return { success: true, usedFallback: true };
        }
      } catch (storageError) {
        // eslint-disable-next-line no-console
        console.error(
          'Failed to persist workspace state to localStorage after Supabase error:',
          storageError,
        );
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
        const { data: supabaseData, error } = await supabase
          .from(WorkspaceSyncService.WORKSPACE_TABLE)
          .select('workspace_data')
          .eq('user_id', user.id)
          .single();

        if (!error && supabaseData?.workspace_data) {
          // Also update localStorage cache
          if (this.hasWindow()) {
            window.localStorage.setItem(
              this.storageKey,
              JSON.stringify(supabaseData.workspace_data),
            );
          }
          return { data: supabaseData.workspace_data, source: 'supabase' };
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
      // eslint-disable-next-line no-console
      console.error('Workspace load failed:', error);
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
