/**
 * KeyboardShortcuts - Keyboard Shortcut System for Expert Fabricators
 * 
 * Provides keyboard shortcuts for common operations:
 * - Project creation (Ctrl+N)
 * - Template selection (Ctrl+T)
 * - Quick save (Ctrl+S)
 * - Bulk operations (Ctrl+B)
 * - Export (Ctrl+E)
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

export type ShortcutAction = 
  | 'new_project'
  | 'load_template'
  | 'save_template'
  | 'quick_save'
  | 'bulk_operations'
  | 'export_bom'
  | 'export_cutlist'
  | 'duplicate'
  | 'delete'
  | 'next_tab'
  | 'prev_tab';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: ShortcutAction;
  description: string;
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'n',
    ctrl: true,
    action: 'new_project',
    description: 'New Project'
  },
  {
    key: 't',
    ctrl: true,
    action: 'load_template',
    description: 'Load Template'
  },
  {
    key: 's',
    ctrl: true,
    shift: true,
    action: 'save_template',
    description: 'Save as Template'
  },
  {
    key: 's',
    ctrl: true,
    action: 'quick_save',
    description: 'Quick Save'
  },
  {
    key: 'b',
    ctrl: true,
    action: 'bulk_operations',
    description: 'Bulk Operations'
  },
  {
    key: 'e',
    ctrl: true,
    action: 'export_bom',
    description: 'Export BOM'
  },
  {
    key: 'e',
    ctrl: true,
    shift: true,
    action: 'export_cutlist',
    description: 'Export Cut List'
  },
  {
    key: 'd',
    ctrl: true,
    action: 'duplicate',
    description: 'Duplicate Project'
  },
  {
    key: 'Delete',
    action: 'delete',
    description: 'Delete Selected'
  },
  {
    key: 'Tab',
    ctrl: true,
    action: 'next_tab',
    description: 'Next Tab'
  },
  {
    key: 'Tab',
    ctrl: true,
    shift: true,
    action: 'prev_tab',
    description: 'Previous Tab'
  }
];

/**
 * KeyboardShortcuts - Shortcut management and handling
 */
export class KeyboardShortcuts {
  private shortcuts: Map<string, ShortcutAction> = new Map();
  private handlers: Map<ShortcutAction, () => void> = new Map();
  private enabled: boolean = true;

  constructor(customShortcuts?: KeyboardShortcut[]) {
    const shortcuts = customShortcuts || DEFAULT_SHORTCUTS;
    this.registerShortcuts(shortcuts);
    this.setupEventListeners();
  }

  /**
   * Register shortcuts
   */
  private registerShortcuts(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut.action);
    });
  }

  /**
   * Get shortcut key string
   */
  private getShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Setup keyboard event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return;

      const key = this.getEventKey(event);
      const action = this.shortcuts.get(key);

      if (action) {
        event.preventDefault();
        event.stopPropagation();
        this.handleAction(action);
      }
    });
  }

  /**
   * Get key string from keyboard event
   */
  private getEventKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Handle shortcut action
   */
  private handleAction(action: ShortcutAction): void {
    const handler = this.handlers.get(action);
    if (handler) {
      handler();
    }
  }

  /**
   * Register handler for action
   */
  on(action: ShortcutAction, handler: () => void): void {
    this.handlers.set(action, handler);
  }

  /**
   * Unregister handler
   */
  off(action: ShortcutAction): void {
    this.handlers.delete(action);
  }

  /**
   * Enable shortcuts
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Disable shortcuts
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    const shortcuts: KeyboardShortcut[] = [];
    this.shortcuts.forEach((action, key) => {
      const [ctrl, shift, alt, keyName] = key.split('+');
      shortcuts.push({
        key: keyName,
        ctrl: ctrl === 'ctrl',
        shift: shift === 'shift',
        alt: alt === 'alt',
        action,
        description: this.getActionDescription(action)
      });
    });
    return shortcuts;
  }

  /**
   * Get action description
   */
  private getActionDescription(action: ShortcutAction): string {
    const descriptions: Record<ShortcutAction, string> = {
      new_project: 'Create new project',
      load_template: 'Load template',
      save_template: 'Save as template',
      quick_save: 'Quick save',
      bulk_operations: 'Bulk operations',
      export_bom: 'Export BOM',
      export_cutlist: 'Export cut list',
      duplicate: 'Duplicate project',
      delete: 'Delete selected',
      next_tab: 'Next tab',
      prev_tab: 'Previous tab'
    };
    return descriptions[action] || action;
  }
}

/**
 * Create global keyboard shortcuts instance
 */
let globalShortcuts: KeyboardShortcuts | null = null;

export function getGlobalShortcuts(): KeyboardShortcuts {
  if (!globalShortcuts) {
    globalShortcuts = new KeyboardShortcuts();
  }
  return globalShortcuts;
}


