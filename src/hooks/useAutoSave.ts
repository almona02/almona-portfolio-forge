import { useState, useEffect, useCallback, useRef } from 'react';

export interface AutoSaveOptions {
  delay?: number;
  enabled?: boolean;
  onSave?: (result: { success: boolean; usedFallback: boolean; timestamp: string | null }) => void;
  onError?: (error: Error) => void;
}

export interface AutoSaveResult {
  isSaving: boolean;
  lastSaved: string | null;
  hasUnsavedChanges: boolean;
  manualSave: () => Promise<void>;
  error: Error | null;
}

/**
 * React hook for debounced auto-save with status tracking
 * 
 * @param data - The data to auto-save
 * @param saveFunction - Async function that saves the data
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const { isSaving, lastSaved, manualSave } = useAutoSave(
 *   workspaceData,
 *   async (data) => {
 *     const service = new WorkspaceSyncService();
 *     return await service.saveWorkspaceSnapshotDebounced(data);
 *   },
 *   { delay: 3000 }
 * );
 * ```
 */
export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<{ success: boolean; usedFallback: boolean; timestamp: string | null }>,
  options: AutoSaveOptions = {}
): AutoSaveResult {
  const {
    delay = 3000,
    enabled = true,
    onSave,
    onError
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousDataRef = useRef<T>(data);
  const isInitialMountRef = useRef(true);

  // Check for unsaved changes
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousDataRef.current = data;
      return;
    }

    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    setHasUnsavedChanges(hasChanged);
    previousDataRef.current = data;
  }, [data]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSaving(true);
    setError(null);

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const result = await saveFunction(data);
        
        if (result.success) {
          setLastSaved(result.timestamp || new Date().toISOString());
          setHasUnsavedChanges(false);
          onSave?.(result);
        } else {
          throw new Error('Save operation failed');
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error during save');
        setError(error);
        onError?.(error);
      } finally {
        setIsSaving(false);
        debounceTimerRef.current = null;
      }
    }, delay);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, delay, enabled, hasUnsavedChanges, saveFunction, onSave, onError]);

  // Manual save function
  const manualSave = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setIsSaving(true);
    setError(null);

    try {
      const result = await saveFunction(data);
      
      if (result.success) {
        setLastSaved(result.timestamp || new Date().toISOString());
        setHasUnsavedChanges(false);
        onSave?.(result);
      } else {
        throw new Error('Manual save operation failed');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error during manual save');
      setError(error);
      onError?.(error);
    } finally {
      setIsSaving(false);
    }
  }, [data, saveFunction, onSave, onError]);

  // Before-unload warning for unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    manualSave,
    error
  };
}

