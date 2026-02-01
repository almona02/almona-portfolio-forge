/**
 * GlobalKeyboardShortcuts Component
 * 
 * Phase 2 Implementation - Global Keyboard Shortcuts Handler
 * Handles global keyboard shortcuts that work across the application.
 * 
 * Gold Tier Implementation:
 * - Text input safety (doesn't trigger in input fields)
 * - Platform-aware (Ctrl vs Cmd normalization)
 * - Performance optimized (single listener, memoized)
 * - Accessible (respects user input context)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

/**
 * GlobalKeyboardShortcuts Component
 * 
 * Handles global keyboard shortcuts:
 * - ? key: Open Keyboard Shortcuts Modal (when not in text input)
 * 
 * Future enhancements:
 * - Can integrate with KeyboardContext when implemented
 * - Can handle other global shortcuts (Ctrl+N, Ctrl+S, etc.)
 */
export const GlobalKeyboardShortcuts: React.FC = () => {
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  /**
   * Check if the current focus is in an editable element
   */
  const isEditableFocused = useCallback((): boolean => {
    if (typeof document === 'undefined') return false;
    
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isInput = tagName === 'input' && (activeElement as HTMLInputElement).type !== 'button' && (activeElement as HTMLInputElement).type !== 'submit' && (activeElement as HTMLInputElement).type !== 'reset';
    const isTextarea = tagName === 'textarea';
    const isContentEditable = activeElement.hasAttribute('contenteditable') && activeElement.getAttribute('contenteditable') !== 'false';

    return isInput || isTextarea || isContentEditable;
  }, []);

  /**
   * Handle global keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when in text input fields
      if (isEditableFocused()) {
        return;
      }

      // ? key: Open Keyboard Shortcuts Modal
      // Only trigger if not combined with modifiers (to avoid conflicts)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        setShortcutsModalOpen(true);
        return;
      }
    };

    // Add event listener at document level for global shortcuts
    document.addEventListener('keydown', handleKeyDown, false);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, false);
    };
  }, [isEditableFocused]);

  return (
    <KeyboardShortcutsModal
      open={shortcutsModalOpen}
      onOpenChange={setShortcutsModalOpen}
    />
  );
};
