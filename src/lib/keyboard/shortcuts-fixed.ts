/**
 * Gold-Tier Keyboard Shortcuts System
 * AutoCAD/Blender-inspired comprehensive shortcuts
 * Context-aware, customizable, conflict-free
 */

import { KeyboardEvent } from 'react';

// Shortcut action types
export type ShortcutAction =
  // Tools
  | 'tool.select' | 'tool.rectangle' | 'tool.circle' | 'tool.line' | 'tool.dimension'
  | 'tool.text' | 'tool.pan' | 'tool.zoom' | 'tool.measure'

  // Navigation
  | 'navigate.up' | 'navigate.down' | 'navigate.left' | 'navigate.right'
  | 'navigate.pan' | 'navigate.zoom-in' | 'navigate.zoom-out' | 'navigate.fit'
  | 'navigate.center' | 'navigate.previous' | 'navigate.next'

  // Operations
  | 'edit.undo' | 'edit.redo' | 'edit.cut' | 'edit.copy' | 'edit.paste'
  | 'edit.delete' | 'edit.select-all' | 'edit.deselect' | 'edit.duplicate'
  | 'edit.group' | 'edit.ungroup' | 'edit.lock' | 'edit.unlock'

  // View
  | 'view.zoom-in' | 'view.zoom-out' | 'view.zoom-fit' | 'view.zoom-selection'
  | 'view.pan' | 'view.rotate' | 'view.reset' | 'view.fullscreen'
  | 'view.grid-toggle' | 'view.snap-toggle' | 'view.guides-toggle'

  // File operations
  | 'file.new' | 'file.open' | 'file.save' | 'file.export' | 'file.print'
  | 'file.import' | 'file.close' | 'file.quit'

  // Application
  | 'app.preferences' | 'app.help' | 'app.about' | 'app.quit'
  | 'app.command-palette' | 'app.quick-search' | 'app.shortcuts-help'

  // Context-specific
  | 'context.menu' | 'context.properties' | 'context.delete'
  | 'context.copy-style' | 'context.paste-style';

// Shortcut definition
export interface ShortcutDefinition {
  key: string;
  action: ShortcutAction;
  description: string;
  category: 'tools' | 'navigation' | 'operations' | 'view' | 'file' | 'application' | 'context';
  context?: string[]; // Contexts where this shortcut is active
  platform?: 'all' | 'mac' | 'windows' | 'linux';
}

// Default shortcuts inspired by AutoCAD, Blender, and industry standards
export const defaultShortcuts: Record<string, ShortcutDefinition> = {
  // Tool shortcuts (single keys)
  's': {
    key: 's',
    action: 'tool.select',
    description: 'Select Tool',
    category: 'tools',
  },
  'r': {
    key: 'r',
    action: 'tool.rectangle',
    description: 'Rectangle Tool',
    category: 'tools',
  },
  'c': {
    key: 'c',
    action: 'tool.circle',
    description: 'Circle Tool',
    category: 'tools',
  },
  'l': {
    key: 'l',
    action: 'tool.line',
    description: 'Line Tool',
    category: 'tools',
  },
  'd': {
    key: 'd',
    action: 'tool.dimension',
    description: 'Dimension Tool',
    category: 'tools',
  },
  't': {
    key: 't',
    action: 'tool.text',
    description: 'Text Tool',
    category: 'tools',
  },
  'm': {
    key: 'm',
    action: 'tool.measure',
    description: 'Measure Tool',
    category: 'tools',
  },

  // Navigation (arrow keys)
  'arrow-up': {
    key: 'arrow-up',
    action: 'navigate.up',
    description: 'Pan Up',
    category: 'navigation',
  },
  'arrow-down': {
    key: 'arrow-down',
    action: 'navigate.down',
    description: 'Pan Down',
    category: 'navigation',
  },
  'arrow-left': {
    key: 'arrow-left',
    action: 'navigate.left',
    description: 'Pan Left',
    category: 'navigation',
  },
  'arrow-right': {
    key: 'arrow-right',
    action: 'navigate.right',
    description: 'Pan Right',
    category: 'navigation',
  },

  // Standard shortcuts (Ctrl/Cmd)
  'ctrl+z': {
    key: 'ctrl+z',
    action: 'edit.undo',
    description: 'Undo',
    category: 'operations',
  },
  'ctrl+y': {
    key: 'ctrl+y',
    action: 'edit.redo',
    description: 'Redo',
    category: 'operations',
  },
  'ctrl+a': {
    key: 'ctrl+a',
    action: 'edit.select-all',
    description: 'Select All',
    category: 'operations',
  },
  'delete': {
    key: 'delete',
    action: 'edit.delete',
    description: 'Delete Selection',
    category: 'operations',
  },
  'backspace': {
    key: 'backspace',
    action: 'edit.delete',
    description: 'Delete Selection',
    category: 'operations',
  },

  // View shortcuts
  'ctrl+0': {
    key: 'ctrl+0',
    action: 'view.zoom-fit',
    description: 'Zoom to Fit',
    category: 'view',
  },
  'ctrl+plus': {
    key: 'ctrl+=',
    action: 'view.zoom-in',
    description: 'Zoom In',
    category: 'view',
  },
  'ctrl+minus': {
    key: 'ctrl+-',
    action: 'view.zoom-out',
    description: 'Zoom Out',
    category: 'view',
  },

  // Application shortcuts
  'ctrl+k': {
    key: 'ctrl+k',
    action: 'app.command-palette',
    description: 'Command Palette',
    category: 'application',
  },
  'f1': {
    key: 'f1',
    action: 'app.help',
    description: 'Help',
    category: 'application',
  },
  'ctrl+comma': {
    key: 'ctrl+,',
    action: 'app.preferences',
    description: 'Preferences',
    category: 'application',
  },

  // Context menu
  'context-menu': {
    key: 'context-menu',
    action: 'context.menu',
    description: 'Context Menu',
    category: 'context',
  },
};

// Platform-specific shortcuts
export const platformShortcuts: Record<string, Partial<typeof defaultShortcuts>> = {
  mac: {
    'cmd+z': {
      key: 'cmd+z',
      action: 'edit.undo',
      description: 'Undo',
      category: 'operations',
      platform: 'mac',
    },
    'cmd+shift+z': {
      key: 'cmd+shift+z',
      action: 'edit.redo',
      description: 'Redo',
      category: 'operations',
      platform: 'mac',
    },
  },
};

// Shortcut categories for organization
export const shortcutCategories = {
  tools: {
    label: 'Tools',
    description: 'Drawing and selection tools',
    icon: 'pen',
  },
  navigation: {
    label: 'Navigation',
    description: 'Canvas navigation and view controls',
    icon: 'move',
  },
  operations: {
    label: 'Operations',
    description: 'Edit, copy, paste, and transform operations',
    icon: 'edit',
  },
  view: {
    label: 'View',
    description: 'Zoom, pan, and display options',
    icon: 'eye',
  },
  file: {
    label: 'File',
    description: 'File operations and management',
    icon: 'file',
  },
  application: {
    label: 'Application',
    description: 'Application-wide commands',
    icon: 'settings',
  },
  context: {
    label: 'Context',
    description: 'Context-sensitive operations',
    icon: 'menu',
  },
} as const;

// Utility functions
export class ShortcutUtils {
  /**
   * Normalize key combination for cross-platform support
   */
  static normalizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace('cmd', 'meta')
      .replace('command', 'meta')
      .replace('control', 'ctrl');
  }

  /**
   * Check if two shortcuts conflict
   */
  static shortcutsConflict(shortcut1: string, shortcut2: string): boolean {
    const normalized1 = this.normalizeKey(shortcut1);
    const normalized2 = this.normalizeKey(shortcut2);
    return normalized1 === normalized2;
  }

  /**
   * Get platform-specific key display
   */
  static getPlatformKeyDisplay(key: string): string {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    return key
      .replace('meta', isMac ? '⌘' : 'Ctrl')
      .replace('ctrl', isMac ? '⌃' : 'Ctrl')
      .replace('alt', isMac ? '⌥' : 'Alt')
      .replace('shift', '⇧')
      .replace('arrow-up', '↑')
      .replace('arrow-down', '↓')
      .replace('arrow-left', '←')
      .replace('arrow-right', '→')
      .toUpperCase();
  }

  /**
   * Parse keyboard event into shortcut string
   */
  static eventToShortcut(event: KeyboardEvent): string {
    const parts: string[] = [];

    if (event.metaKey || event.ctrlKey) {
      parts.push('ctrl');
    }
    if (event.altKey) {
      parts.push('alt');
    }
    if (event.shiftKey) {
      parts.push('shift');
    }

    // Handle special keys
    const specialKeys: Record<string, string> = {
      ' ': 'space',
      'ArrowUp': 'arrow-up',
      'ArrowDown': 'arrow-down',
      'ArrowLeft': 'arrow-left',
      'ArrowRight': 'arrow-right',
      'Delete': 'delete',
      'Backspace': 'backspace',
      'Enter': 'enter',
      'Escape': 'escape',
      'Tab': 'tab',
      'ContextMenu': 'context-menu',
    };

    const key = specialKeys[event.key] || event.key.toLowerCase();
    parts.push(key);

    return parts.join('+');
  }

  /**
   * Validate shortcut format
   */
  static isValidShortcut(shortcut: string): boolean {
    // Basic validation - should contain at least one key
    const parts = shortcut.split('+');
    return parts.length > 0 && parts.every(part => part.length > 0);
  }
}

// Shortcut manager class
export class ShortcutManager {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private handlers: Map<ShortcutAction, ((event: KeyboardEvent) => void)[]> = new Map();
  // private conflicts: Set<string> = new Set();

  constructor() {
    this.loadDefaults();
  }

  /**
   * Load default shortcuts
   */
  private loadDefaults(): void {
    // Load base shortcuts
    Object.values(defaultShortcuts).forEach(shortcut => {
      this.shortcuts.set(shortcut.key, shortcut);
    });

    // Load platform-specific shortcuts
    const platform = navigator.platform.toLowerCase();
    const isMac = platform.includes('mac');
    // const isWindows = platform.includes('win');
    // const isLinux = platform.includes('linux');

    if (isMac && platformShortcuts.mac) {
      Object.values(platformShortcuts.mac).forEach(shortcut => {
        if (shortcut) this.shortcuts.set(shortcut.key, shortcut);
      });
    }
  }

  /**
   * Register a shortcut handler
   */
  register(action: ShortcutAction, handler: (event: KeyboardEvent) => void): void {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, []);
    }
    this.handlers.get(action)!.push(handler);
  }

  /**
   * Unregister a shortcut handler
   */
  unregister(action: ShortcutAction, handler: (event: KeyboardEvent) => void): void {
    const handlers = this.handlers.get(action);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    const shortcut = ShortcutUtils.eventToShortcut(event);
    const definition = this.shortcuts.get(shortcut);

    if (definition) {
      const handlers = this.handlers.get(definition.action);
      if (handlers && handlers.length > 0) {
        // Prevent default browser behavior
        event.preventDefault();
        event.stopPropagation();

        // Call all handlers
        handlers.forEach(handler => handler(event));
        return true;
      }
    }

    return false;
  }

  /**
   * Get all shortcuts
   */
  getAllShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: keyof typeof shortcutCategories): ShortcutDefinition[] {
    return this.getAllShortcuts().filter(shortcut => shortcut.category === category);
  }

  /**
   * Check for conflicts
   */
  checkConflicts(): string[] {
    const _conflicts: string[] = [];
    const usedKeys = new Set<string>();

    this.shortcuts.forEach((_shortcut, key) => {
      if (usedKeys.has(key)) {
        _conflicts.push(key);
      }
      usedKeys.add(key);
    });

    return _conflicts;
  }

  /**
   * Get shortcut display text
   */
  getShortcutDisplay(action: ShortcutAction): string | null {
    for (const [key, definition] of this.shortcuts) {
      if (definition.action === action) {
        return ShortcutUtils.getPlatformKeyDisplay(key);
      }
    }
    return null;
  }
}

// Global shortcut manager instance
export const shortcutManager = new ShortcutManager();
