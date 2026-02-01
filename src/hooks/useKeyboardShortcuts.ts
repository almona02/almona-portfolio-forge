import { useCallback, useState } from 'react';
import { ShortcutAction, ShortcutDefinition, shortcutManager } from '../lib/keyboard/shortcuts';

/**
 * Hook to use keyboard shortcuts in components
 */
export function useKeyboardShortcuts() {
  // Local state to force re-renders when shortcuts change
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(
    shortcutManager.getAllShortcuts()
  );

  // Re-fetch shortcuts when needed
  const refreshShortcuts = useCallback(() => {
    setShortcuts(shortcutManager.getAllShortcuts());
  }, []);

  // Get display string for an action
  const getShortcutDisplay = useCallback((action: ShortcutAction) => {
    return shortcutManager.getShortcutDisplay(action);
  }, []);

  // Update a shortcut binding
  const updateShortcut = useCallback(
    (action: ShortcutAction, newKey: string) => {
      // TODO: This would need a method on shortcutManager to update keys
      // For now we'll just log it as the manager might be read-only in this version
      console.log('Update shortcut request:', action, newKey);
      
      // Force update local state
      setShortcuts(shortcutManager.getAllShortcuts());
    },
    []
  );

  return {
    shortcuts,
    getShortcutDisplay,
    updateShortcut,
    refreshShortcuts,
    manager: shortcutManager
  };
}
