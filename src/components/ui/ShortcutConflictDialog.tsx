import React from 'react';
import { ShortcutDefinition } from '../../lib/keyboard/shortcuts';

interface ShortcutConflictDialogProps {
  isOpen: boolean;
  conflictKey: string;
  existingShortcut: ShortcutDefinition;
  newShortcutAction: string;
  onCancel: () => void;
  onOverwrite: () => void;
}

export const ShortcutConflictDialog: React.FC<ShortcutConflictDialogProps> = ({
  isOpen,
  conflictKey,
  existingShortcut,
  newShortcutAction,
  onCancel,
  onOverwrite,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="bg-background/50 p-6">
          <h3 className="text-xl font-bold text-foreground">Shortcut Conflict</h3>
          <p className="mt-2 text-foreground">
            The key combination <span className="rounded bg-muted px-2 py-0.5 font-mono text-foreground">{conflictKey}</span> is already used by:
          </p>
          
          <div className="mt-4 rounded-lg bg-red-900/20 border border-red-900/50 p-4">
            <div className="font-medium text-red-200">{existingShortcut.description}</div>
            <div className="text-sm text-destructive">Action: {existingShortcut.action}</div>
          </div>

          <p className="mt-4 text-foreground">
            Do you want to overwrite it with <span className="font-semibold text-amber-400">{newShortcutAction}</span>?
          </p>
        </div>

        <div className="flex justify-end gap-3 bg-background p-4">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-card hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onOverwrite}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors shadow-lg shadow-amber-900/20"
          >
            Overwrite
          </button>
        </div>
      </div>
    </div>
  );
};
