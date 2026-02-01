import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ShortcutDefinition, ShortcutUtils, shortcutCategories } from '../../lib/keyboard/shortcuts';
import { ShortcutConflictDialog } from '../ui/ShortcutConflictDialog';

export const KeyboardShortcutsPanel: React.FC = () => {
  const { shortcuts, updateShortcut, manager } = useKeyboardShortcuts();
  const [activeCategory, setActiveCategory] = useState<string>('tools');
  const [editingAction, setEditingAction] = useState<string | null>(null);
  
  // Conflict state
  const [conflictState, setConflictState] = useState<{
    isOpen: boolean;
    key: string;
    existing: ShortcutDefinition | null;
    pendingAction: string | null;
  }>({ isOpen: false, key: '', existing: null, pendingAction: null });

  const filteredShortcuts = shortcuts.filter(
    (s) => s.category === activeCategory
  );

  const startEditing = (action: string) => {
    setEditingAction(action);
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Ignore modifier-only presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const newKey = ShortcutUtils.eventToShortcut(e.nativeEvent);
    
    // Check for conflicts
    const conflict = manager.getAllShortcuts().find(s => s.key === newKey && s.action !== action);
    
    if (conflict) {
      setConflictState({
        isOpen: true,
        key: newKey,
        existing: conflict,
        pendingAction: action
      });
      setEditingAction(null); // Stop editing to show dialog
      return;
    }

    updateShortcut(action as any, newKey);
    setEditingAction(null);
  };

  const resolveConflict = () => {
    if (conflictState.pendingAction && conflictState.key) {
      // In a real implementation we would unset the old one first
      // but for now updateShortcut handles the logic
      updateShortcut(conflictState.pendingAction as any, conflictState.key);
    }
    setConflictState({ isOpen: false, key: '', existing: null, pendingAction: null });
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="mb-6 ">
        <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
        <p className="mt-1 text-slate-400">Customize your workflow bindings</p>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/30 p-2">
          {Object.entries(shortcutCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeCategory === key
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {/* Icon placeholder since we don't have the icon set imported */}
              <div className={`h-2 w-2 rounded-full ${activeCategory === key ? 'bg-amber-500' : 'bg-slate-700'}`} />
              
              <div className="flex flex-col items-start  ">
                  <span>{category.label}</span>
                  <span className='text-[10px] font-normal text-slate-500 line-clamp-1 text-left'>{category.description}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="space-y-2">
            {filteredShortcuts.map((shortcut) => (
              <motion.div
                layoutId={shortcut.action}
                key={shortcut.action}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  editingAction === shortcut.action
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-slate-800 bg-slate-800/30 hover:bg-slate-800/60'
                }`}
              >
                <div>
                  <div className="font-medium text-slate-200">{shortcut.description}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{shortcut.action}</div>
                </div>

                <div 
                  className="relative"
                  onClick={() => startEditing(shortcut.action)}
                >
                  {editingAction === shortcut.action ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-pulse text-xs text-amber-500 font-medium">Press keys...</span>
                      <input
                        autoFocus
                        onBlur={() => setEditingAction(null)}
                        onKeyDown={(e) => handleKeyDown(e, shortcut.action)}
                        className="h-8 w-32 rounded border border-amber-500 bg-slate-900 px-2 text-center text-sm text-white focus:outline-none"
                      />
                    </div>
                  ) : (
                    <button className="flex h-8 min-w-[3rem] items-center justify-center rounded border border-slate-700 bg-slate-800 px-3 font-mono text-xs font-bold text-slate-300 hover:border-amber-500/50 hover:text-amber-500 transition-colors">
                      {ShortcutUtils.getPlatformKeyDisplay(shortcut.key)}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <ShortcutConflictDialog 
        isOpen={conflictState.isOpen}
        conflictKey={conflictState.key}
        existingShortcut={conflictState.existing!}
        newShortcutAction={conflictState.pendingAction!}
        onCancel={() => setConflictState(prev => ({ ...prev, isOpen: false }))}
        onOverwrite={resolveConflict}
      />
    </div>
  );
};
