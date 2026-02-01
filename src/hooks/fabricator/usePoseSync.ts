/**
 * Constitutional Position State Sync Hook
 * 
 * Provides easy integration with Constitutional State Sync Service
 * for React components.
 * 
 * @tier Tier 3 Protected
 * @constitutional_compliance AICS-001 §9.3
 */

import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import {
  positionStateSync,
  type ConstitutionalMetadata
} from '@/lib/constitutional/PositionStateSyncService';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export interface UsePoseSyncOptions {
  poseId: string;
  mode: 'smartdraw' | 'drafting';
  currentState: any;
  debounceMs?: number;  // Default 500ms
  autoSync?: boolean;   // Default true
}

export interface UsePoseSyncReturn {
  saveState: (state?: any) => Promise<void>;
  restoreState: () => Promise<any | null>;
  clearState: () => Promise<void>;
  hasUnsavedChanges: boolean;
  isSyncing: boolean;
  lastSyncTimestamp: string | null;
  metadata: ConstitutionalMetadata | null;
}

/**
 * Hook for constitutional position state synchronization
 * 
 * Usage:
 * ```tsx
 * const { saveState, hasUnsavedChanges } = usePoseSync({
 *   poseId: project.id,
 *   mode: 'smartdraw',
 *   currentState: localState
 * });
 * ```
 */
export function usePoseSync(options: UsePoseSyncOptions): UsePoseSyncReturn {
  const { poseId, mode, currentState, debounceMs = 500, autoSync = true } = options;
  const { state, dispatch } = useFabricatorWorkspace();
  
  const isSyncing = useRef(false);
  const lastSyncTimestamp = useRef<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Get stored state from workspace
  const storedState = state.projectDraftStates[poseId]?.[mode];
  const metadata = storedState?.metadata || null;
  
  // Check for unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!storedState || !currentState) return false;
    
    try {
      const currentHash = JSON.stringify(currentState, Object.keys(currentState || {}).sort());
      const storedHash = JSON.stringify(storedState.state, Object.keys(storedState.state || {}).sort());
      return currentHash !== storedHash;
    } catch {
      return false;
    }
  }, [currentState, storedState]);
  
  /**
   * Save current state with constitutional guarantees
   */
  const saveState = useCallback(async (stateToSave?: any) => {
    const finalState = stateToSave || currentState;
    
    if (!poseId || !finalState) {
      console.warn('[usePoseSync] Cannot save: missing poseId or state');
      return;
    }
    
    try {
      isSyncing.current = true;
      
      // Sync with constitutional service
      const result = await positionStateSync.syncStateWithGuarantees(
        poseId,
        mode,
        finalState
      );
      
      // Update workspace context
      dispatch({
        type: 'UPDATE_POSE_DRAFT_STATE',
        payload: {
          poseId,
          mode,
          state: finalState,
          metadata: result.metadata
        }
      });
      
      // Update audit trail
      dispatch({
        type: 'APPEND_CONSTITUTIONAL_AUDIT',
        payload: {
          timestamp: result.timestamp,
          poseId,
          operation: 'STATE_SYNC',
          hash: result.hash,
          tier: 'Tier 3',
          compliance: 'AICS-001 §9.3'
        }
      });
      
      lastSyncTimestamp.current = result.timestamp;
    } catch (error) {
      console.error('[usePoseSync] Save failed:', error);
    } finally {
      isSyncing.current = false;
    }
  }, [poseId, mode, currentState, dispatch]);
  
  /**
   * Restore state with verification
   */
  const restoreState = useCallback(async () => {
    if (!poseId) return null;
    
    try {
      const restored = await positionStateSync.restoreStateWithVerification(
        poseId,
        mode
      );
      
      return restored.state;
    } catch (error) {
      console.error('[usePoseSync] Restore failed:', error);
      return null;
    }
  }, [poseId, mode]);
  
  /**
   * Clear saved state
   */
  const clearState = useCallback(async () => {
    if (!poseId) return;
    
    try {
      await positionStateSync.clearPoseState(poseId, mode);
      
      dispatch({
        type: 'CLEAR_POSE_DRAFT_STATE',
        payload: { poseId, mode }
      });
    } catch (error) {
      console.error('[usePoseSync] Clear failed:', error);
    }
  }, [poseId, mode, dispatch]);
  
  /**
   * Auto-sync on state change (debounced)
   */
  useEffect(() => {
    if (!autoSync || !currentState || !poseId) return;
    
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer
    debounceTimer.current = setTimeout(() => {
      saveState(currentState);
    }, debounceMs);
    
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [currentState, autoSync, poseId, debounceMs, saveState]);
  
  return {
    saveState,
    restoreState,
    clearState,
    hasUnsavedChanges,
    isSyncing: isSyncing.current,
    lastSyncTimestamp: lastSyncTimestamp.current,
    metadata
  };
}

/**
 * Hook for mode switching with constitutional preservation
 * 
 * Usage:
 * ```tsx
 * const { switchMode, isSwitching } = useModeSwitch({
 *   poseId: project.id,
 *   currentMode: 'smartdraw',
 *   currentState: localState
 * });
 * 
 * await switchMode('drafting');
 * ```
 */
export interface UseModeSwitchOptions {
  poseId: string;
  currentMode: 'smartdraw' | 'drafting';
  currentState: any;
  onModeChanged?: (newMode: 'smartdraw' | 'drafting') => void;
}

export interface UseModeSwitchReturn {
  switchMode: (newMode: 'smartdraw' | 'drafting') => Promise<void>;
  isSwitching: boolean;
}

export function useModeSwitch(options: UseModeSwitchOptions): UseModeSwitchReturn {
  const { poseId, currentMode, currentState, onModeChanged } = options;
  const isSwitching = useRef(false);
  
  const switchMode = useCallback(async (newMode: 'smartdraw' | 'drafting') => {
    if (!poseId || newMode === currentMode) return;
    
    try {
      isSwitching.current = true;
      
      // Preserve current mode state (§9.3.I)
      await positionStateSync.preserveBeforeModeSwitch(
        poseId,
        currentMode,
        newMode,
        currentState
      );
      
      // Notify parent to switch mode
      onModeChanged?.(newMode);
      
    } catch (error) {
      console.error('[useModeSwitch] Mode switch failed:', error);
    } finally {
      isSwitching.current = false;
    }
  }, [poseId, currentMode, currentState, onModeChanged]);
  
  return {
    switchMode,
    isSwitching: isSwitching.current
  };
}
