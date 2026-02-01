/**
 * KeyboardShortcutsModal Component
 * 
 * Phase 2 Implementation - Keyboard Shortcuts & Accessibility
 * Displays all keyboard shortcuts in a searchable, categorized modal.
 * Opens via ? key (global, not while typing).
 * 
 * Gold Tier Implementation:
 * - Market-leading UX inspired by VS Code, AutoCAD, Figma
 * - ARIA compliant (WCAG 2.1 AA)
 * - Platform-aware (Ctrl vs Cmd)
 * - Printable cheat sheet support
 * - Performance optimized
 */

import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { Keyboard, Printer, Search } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

export interface KeyboardShortcutsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
}

interface ShortcutCategory {
  id: string;
  name: string;
  shortcuts: ShortcutItem[];
}

interface ShortcutItem {
  id: string;
  key: string;
  description: string;
  context?: string;
  platform?: 'windows' | 'macos' | 'both';
}

/**
 * Detect current platform for display
 */
function detectPlatform(): 'windows' | 'macos' | 'linux' {
  if (typeof window === 'undefined') return 'windows';
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('win')) return 'windows';
  return 'linux';
}

/**
 * Format shortcut key for display (platform-aware)
 */
function formatShortcut(key: string, platform: 'windows' | 'macos' | 'linux' = 'windows'): string {
  if (platform === 'macos') {
    return key
      .replace(/Ctrl\+/g, '⌘')
      .replace(/Cmd\+/g, '⌘')
      .replace(/Shift\+/g, '⇧')
      .replace(/Alt\+/g, '⌥')
      .replace(/\+/g, '');
  }
  return key
    .replace(/Ctrl\+/g, 'Ctrl+')
    .replace(/Cmd\+/g, 'Ctrl+')
    .replace(/Shift\+/g, 'Shift+')
    .replace(/Alt\+/g, 'Alt+');
}

/**
 * All keyboard shortcuts organized by category
 * Based on KEYBOARD_SHORTCUTS.md specification
 */
const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    id: 'drawing',
    name: 'Drawing Tools',
    shortcuts: [
      { id: 'rect', key: 'R', description: 'Rectangle tool', context: 'Workspace' },
      { id: 'circle', key: 'C', description: 'Circle tool', context: 'Workspace' },
      { id: 'line', key: 'L', description: 'Line tool', context: 'Workspace' },
      { id: 'arc', key: 'A', description: 'Arc tool', context: 'Workspace' },
      { id: 'polygon', key: 'P', description: 'Polygon tool', context: 'Workspace' },
      { id: 'material', key: 'M', description: 'Material selector', context: 'Workspace' },
      { id: 'hardware', key: 'H', description: 'Hardware tool', context: 'Workspace' },
      { id: 'structural', key: 'S', description: 'Structural tool', context: 'Workspace' },
      { id: 'transform', key: 'T', description: 'Transform tool', context: 'Workspace' },
    ],
  },
  {
    id: 'edit',
    name: 'Edit Operations',
    shortcuts: [
      { id: 'undo', key: 'Ctrl+Z', description: 'Undo', context: 'Global/Workspace' },
      { id: 'redo', key: 'Ctrl+Y', description: 'Redo', context: 'Global/Workspace' },
      { id: 'redo-alt', key: 'Ctrl+Shift+Z', description: 'Redo (alternate)', context: 'Global/Workspace' },
      { id: 'cut', key: 'Ctrl+X', description: 'Cut', context: 'Focus-aware' },
      { id: 'copy', key: 'Ctrl+C', description: 'Copy', context: 'Focus-aware' },
      { id: 'paste', key: 'Ctrl+V', description: 'Paste', context: 'Focus-aware' },
      { id: 'delete', key: 'Delete', description: 'Delete selected', context: 'Workspace' },
      { id: 'backspace', key: 'Backspace', description: 'Delete selected', context: 'Workspace' },
      { id: 'select-all', key: 'Ctrl+A', description: 'Select All', context: 'Workspace/List' },
      { id: 'deselect', key: 'Ctrl+D', description: 'Deselect', context: 'Workspace' },
    ],
  },
  {
    id: 'view',
    name: 'View Operations',
    shortcuts: [
      { id: 'zoom-fit', key: 'Home', description: 'Zoom to fit', context: 'Workspace' },
      { id: 'zoom-reset', key: 'Ctrl+0', description: 'Reset zoom', context: 'Workspace' },
      { id: 'zoom-in', key: '+ / =', description: 'Zoom in', context: 'Workspace' },
      { id: 'zoom-out', key: '-', description: 'Zoom out', context: 'Workspace' },
      { id: 'pan', key: 'Space + Drag', description: 'Pan canvas', context: 'Workspace' },
      { id: 'zoom-wheel', key: 'Ctrl + Mouse Wheel', description: 'Zoom (mouse wheel)', context: 'Workspace' },
    ],
  },
  {
    id: 'project',
    name: 'Project Operations',
    shortcuts: [
      { id: 'new', key: 'Ctrl+N', description: 'New project', context: 'Global' },
      { id: 'open', key: 'Ctrl+O', description: 'Open project', context: 'Global' },
      { id: 'save', key: 'Ctrl+S', description: 'Save', context: 'Global' },
      { id: 'save-as', key: 'Ctrl+Shift+S', description: 'Save As', context: 'Global' },
      { id: 'print', key: 'Ctrl+P', description: 'Print / Export', context: 'Global' },
    ],
  },
  {
    id: 'navigation',
    name: 'Selection & Navigation',
    shortcuts: [
      { id: 'nudge', key: 'Arrow Keys', description: 'Nudge selection', context: 'Workspace' },
      { id: 'nudge-large', key: 'Shift+Arrow', description: 'Nudge (large step)', context: 'Workspace' },
      { id: 'tab-next', key: 'Tab', description: 'Cycle forward', context: 'Workspace' },
      { id: 'tab-prev', key: 'Shift+Tab', description: 'Cycle backward', context: 'Workspace' },
      { id: 'group', key: 'G', description: 'Group selection', context: 'Workspace' },
      { id: 'ungroup', key: 'U', description: 'Ungroup selection', context: 'Workspace' },
    ],
  },
  {
    id: 'transform',
    name: 'Transform Operations',
    shortcuts: [
      { id: 'flip-h', key: 'F', description: 'Flip horizontally', context: 'Workspace' },
      { id: 'flip-v', key: 'Shift+F', description: 'Flip vertically', context: 'Workspace' },
      { id: 'mirror', key: 'M', description: 'Mirror across axis', context: 'Workspace' },
      { id: 'rename', key: 'Ctrl+R', description: 'Rename selected', context: 'Workspace' },
      { id: 'reset-transform', key: 'Ctrl+Shift+R', description: 'Reset transforms', context: 'Workspace' },
    ],
  },
  {
    id: 'properties',
    name: 'Properties & Measurement',
    shortcuts: [
      { id: 'edit-props', key: 'E', description: 'Edit properties', context: 'Workspace' },
      { id: 'confirm', key: 'Enter', description: 'Confirm edits', context: 'Properties Panel' },
      { id: 'cancel', key: 'Esc', description: 'Cancel operation', context: 'Global/Workspace' },
    ],
  },
  {
    id: 'search',
    name: 'Search & Filters',
    shortcuts: [
      { id: 'focus-search', key: '/', description: 'Focus search bar', context: 'Projects Page' },
      { id: 'app-search', key: 'Ctrl+F', description: 'Open in-page search', context: 'Global (not in inputs)' },
      { id: 'execute-search', key: 'Enter', description: 'Execute search', context: 'Search' },
      { id: 'clear-search', key: 'Esc', description: 'Clear search', context: 'Search' },
    ],
  },
  {
    id: 'bulk',
    name: 'Bulk Operations',
    shortcuts: [
      { id: 'range-select', key: 'Shift+Click', description: 'Range select', context: 'List/Grid' },
      { id: 'toggle-select', key: 'Ctrl+Click', description: 'Toggle select', context: 'List/Grid' },
      { id: 'bulk-edit', key: 'Ctrl+E', description: 'Bulk edit dialog', context: 'List/Grid' },
      { id: 'bulk-export', key: 'Ctrl+Shift+E', description: 'Bulk export dialog', context: 'List/Grid' },
    ],
  },
  {
    id: 'help',
    name: 'Help & Meta',
    shortcuts: [
      { id: 'shortcuts', key: '?', description: 'Keyboard shortcuts (this modal)', context: 'Global' },
      { id: 'context-help', key: 'F1', description: 'Context help', context: 'Global' },
      { id: 'command-palette', key: 'Ctrl+/', description: 'Command palette (optional)', context: 'Global' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory] = useState<string>('all');
  const platform = useMemo(() => detectPlatform(), []);

  // Filter shortcuts based on search and category
  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    return SHORTCUT_CATEGORIES
      .map(category => {
        const filteredShortcuts = category.shortcuts.filter(shortcut => {
          if (query.length === 0) return true;
          return (
            shortcut.key.toLowerCase().includes(query) ||
            shortcut.description.toLowerCase().includes(query) ||
            (shortcut.context && shortcut.context.toLowerCase().includes(query))
          );
        });

        return {
          ...category,
          shortcuts: filteredShortcuts,
        };
      })
      .filter(category => {
        if (selectedCategory !== 'all' && category.id !== selectedCategory) return false;
        return category.shortcuts.length > 0;
      });
  }, [searchQuery, selectedCategory]);

  // Handle print (printable cheat sheet)
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handle search input
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-4xl bg-slate-950 border-amber-600/30 text-slate-200 max-h-[90vh] flex flex-col p-0"
        aria-labelledby="keyboard-shortcuts-title"
        aria-describedby="keyboard-shortcuts-description"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-amber-600/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Keyboard className="h-6 w-6 text-amber-400" aria-hidden="true" />
              <div>
                <DialogTitle 
                  id="keyboard-shortcuts-title"
                  className="text-2xl font-bold text-slate-200"
                >
                  Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription 
                  id="keyboard-shortcuts-description"
                  className="text-slate-400 mt-1"
                >
                  All available keyboard shortcuts for ALMONA. Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono">?</kbd> to open this modal.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                aria-label="Print keyboard shortcuts cheat sheet"
              >
                <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-6 py-4 border-b border-amber-600/30 bg-slate-900/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
            <Input
              type="text"
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9 bg-slate-900 border-amber-600/30 text-slate-200 placeholder:text-slate-500"
              aria-label="Search keyboard shortcuts"
            />
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-8">
            {filteredCategories.map((category) => (
              <div key={category.id} className="space-y-3">
                <h3 className="text-lg font-semibold text-amber-400 border-b border-amber-600/20 pb-2">
                  {category.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {category.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-start justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800 hover:border-amber-600/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 mb-1">
                          {shortcut.description}
                        </div>
                        {shortcut.context && (
                          <div className="text-xs text-slate-500 mb-2">
                            {shortcut.context}
                          </div>
                        )}
                      </div>
                      <kbd className="ml-4 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-amber-300 whitespace-nowrap flex-shrink-0">
                        {formatShortcut(shortcut.key, platform)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No shortcuts found. Try a different search.
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-amber-600/30 bg-slate-900/30 text-xs text-slate-400">
          <p>
            <strong className="text-slate-300">Platform:</strong> {platform === 'macos' ? 'macOS (⌘ = Command)' : platform === 'windows' ? 'Windows/Linux (Ctrl = Control)' : 'Linux (Ctrl = Control)'}
          </p>
          <p className="mt-1">
            Shortcuts are context-aware. Some shortcuts may be disabled in text inputs or modals.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
