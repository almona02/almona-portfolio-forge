import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';

export interface UseUnsavedChangesOptions {
  isDirty: boolean;
  onSave?: () => Promise<void>;
  message?: string;
}

export interface UseUnsavedChangesReturn {
  showWarning: boolean;
  handleNavigation: (proceed: boolean) => void;
  saveAndNavigate: () => Promise<void>;
  isSaving: boolean;
}

/**
 * Hook for unsaved changes protection
 * 
 * Uses React Router's useBlocker to prevent navigation when there are unsaved changes.
 * Shows warning dialog and handles save/navigation flow.
 */
export const useUnsavedChanges = ({
  isDirty,
  onSave,
  message: _message = 'You have unsaved changes. Are you sure you want to leave?',
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn => {
  const _navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);
  
  // Block navigation when dirty
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return isDirty && currentLocation.pathname !== nextLocation.pathname;
  });

  const [showWarning, setShowWarning] = useState(false);

  // Show warning when navigation is blocked
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowWarning(true);
    }
  }, [blocker.state]);

  // Handle navigation decision
  const handleNavigation = useCallback((proceed: boolean) => {
    if (proceed) {
      blocker.proceed?.();
      setShowWarning(false);
    } else {
      blocker.reset?.();
      setShowWarning(false);
    }
    pendingNavigationRef.current = null;
  }, [blocker]);

  // Save and navigate
  const saveAndNavigate = useCallback(async () => {
    if (!onSave) {
      handleNavigation(true);
      return;
    }

    setIsSaving(true);
    try {
      await onSave();
      handleNavigation(true);
    } catch (error) {
      console.error('Failed to save:', error);
      // Don't navigate on save error
    } finally {
      setIsSaving(false);
    }
  }, [onSave, handleNavigation]);

  return {
    showWarning,
    handleNavigation,
    saveAndNavigate,
    isSaving,
  };
};
