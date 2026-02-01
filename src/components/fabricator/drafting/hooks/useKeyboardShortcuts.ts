// src/components/fabricator/drafting/hooks/useKeyboardShortcuts.ts
import { useCallback, useEffect } from 'react';
import type { DraftingContextType, DraftingTool } from '../types/drafting';

interface UseKeyboardShortcutsOptions {
  draftingEngine: DraftingContextType;
  selectedTool: DraftingTool;
  onToolSelect: (tool: DraftingTool) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onHelp?: () => void;
  onViewportNavigate?: (direction: 'left' | 'right' | 'up' | 'down', amount: number) => void;
  enabled?: boolean;
}

/**
 * Hook for managing keyboard shortcuts in the drafting workbench
 * Implements standard CAD-like shortcuts for improved UX
 * 
 * @deprecated Use `useKeyboard` hook and `KeyboardManager` instead.
 * Phase 2 Migration complete.
 */
export const useKeyboardShortcuts = ({
  draftingEngine,
  _selectedTool,
  onToolSelect,
  onUndo,
  onRedo,
  onHelp,
  onViewportNavigate,
  enabled = true,
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Don't process if disabled
      if (!enabled) {
        return;
      }

      // Tool shortcuts (single key, with optional shift modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            if (e.shiftKey) {
              onToolSelect('rotate');
            } else {
              onToolSelect('rectangle');
            }
            break;
          case 'c':
            e.preventDefault();
            onToolSelect('circle');
            break;
          case 'l':
            e.preventDefault();
            onToolSelect('line');
            break;
          case 'd':
            e.preventDefault();
            onToolSelect('dimension');
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) {
              onToolSelect('scale');
            } else {
              onToolSelect('select');
            }
            break;
          case 't':
            e.preventDefault();
            onToolSelect('text');
            break;
          case 'a':
            e.preventDefault();
            onToolSelect('arc');
            break;
          case 'p':
            e.preventDefault();
            onToolSelect('polygon');
            break;
          // Hardware shortcuts
          case 'h':
            e.preventDefault();
            onToolSelect('handle');
            break;
          case 'i':
            e.preventDefault();
            onToolSelect('hinge');
            break;
          case 'k':
            e.preventDefault();
            onToolSelect('lock');
            break;
          // Structural shortcuts
          case 'm':
            e.preventDefault();
            if (e.shiftKey) {
              onToolSelect('mirror');
            } else {
              onToolSelect('mullion');
            }
            break;
          case 'n':
            e.preventDefault();
            onToolSelect('transom');
            break;
          // Pattern shortcuts
          case 'g':
            if (e.shiftKey) {
              e.preventDefault();
              onToolSelect('array-rectangular');
            }
            break;
          // Edit tool shortcuts
          case 'x':
            e.preventDefault();
            onToolSelect('trim');
            break;
          case 'e':
            e.preventDefault();
            onToolSelect('extend');
            break;
          case 'f':
            e.preventDefault();
            onToolSelect('fillet');
            break;
          case 'o':
            if (!e.shiftKey) {
              e.preventDefault();
              onToolSelect('offset');
            }
            break;
        }
      }

      // Modifier key combinations
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+Z or Ctrl+Y for redo
              onRedo?.();
            } else {
              // Ctrl+Z for undo
              onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            // Ctrl+Y for redo
            onRedo?.();
            break;
          case 'a':
            e.preventDefault();
            // Ctrl+A - Select all (future implementation)
            break;
          case 'c':
            e.preventDefault();
            // Ctrl+C - Copy (future implementation)
            break;
          case 'v':
            e.preventDefault();
            // Ctrl+V - Paste (future implementation)
            break;
          case 'd':
            e.preventDefault();
            // Ctrl+D - Duplicate (future implementation)
            break;
          case 'g':
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+G - Ungroup (future implementation)
            } else {
              // Ctrl+G - Group (future implementation)
            }
            break;
        }
      }

      // Delete/Backspace for deleting selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault();
          draftingEngine.deleteSelected();
        }
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        draftingEngine.clearSelection();
      }

      // F1 or ? for help
      if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        onHelp?.();
      }

      // Arrow keys for viewport navigation (when not in input fields and no modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && onViewportNavigate) {
        const navigationAmount = 25; // Default: 25% of viewport
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            onViewportNavigate('left', navigationAmount);
            break;
          case 'ArrowRight':
            e.preventDefault();
            onViewportNavigate('right', navigationAmount);
            break;
          case 'ArrowUp':
            e.preventDefault();
            onViewportNavigate('up', navigationAmount);
            break;
          case 'ArrowDown':
            e.preventDefault();
            onViewportNavigate('down', navigationAmount);
            break;
        }
      }
    },
    [draftingEngine, onToolSelect, onUndo, onRedo, onHelp, onViewportNavigate, enabled]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
};

