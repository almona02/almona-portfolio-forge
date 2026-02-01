
export type KeyHandler = (e: KeyboardEvent) => void;

export interface ShortcutConfig {
  id: string;
  keys: string; // "ctrl+s", "l", "p l" (sequence)
  action: KeyHandler;
  description: string;
  context?: string; // "global", "drafting", "modal"
  preventRepeat?: boolean;
}

class KeyboardManager {
  private static instance: KeyboardManager;
  private shortcuts: Map<string, ShortcutConfig[]> = new Map(); // Context -> Shortcuts
  private activeContexts: Set<string> = new Set(['global']);
  private buffer: string[] = [];
  private bufferTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly SEQUENCE_TIMEOUT = 800; // ms to wait for next key in sequence
  private debug: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      // Clear buffer on click to avoid accidental sequence firing
      window.addEventListener('mousedown', this.clearBuffer);
    }
  }

  public static getInstance(): KeyboardManager {
    if (!KeyboardManager.instance) {
      KeyboardManager.instance = new KeyboardManager();
    }
    return KeyboardManager.instance;
  }

  public register(config: ShortcutConfig): () => void {
    const context = config.context || 'global';
    if (!this.shortcuts.has(context)) {
      this.shortcuts.set(context, []);
    }
    
    // Normalize keys
    const normalizedConfig = {
        ...config,
        keys: config.keys.toLowerCase().trim()
    };

    this.shortcuts.get(context)?.push(normalizedConfig);

    if (this.debug) console.log(`[KeyboardManager] Registered: ${normalizedConfig.keys} in ${context}`);

    // Return unregister function
    return () => {
      const shortcuts = this.shortcuts.get(context);
      if (shortcuts) {
        this.shortcuts.set(context, shortcuts.filter(s => s.id !== config.id));
      }
    };
  }

  public setContext(context: string, active: boolean) {
    if (active) {
      this.activeContexts.add(context);
    } else {
      this.activeContexts.delete(context);
    }
    if (this.debug) console.log(`[KeyboardManager] Contexts:`, Array.from(this.activeContexts));
  }

  private clearBuffer = () => {
    this.buffer = [];
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
  }

  private isInputActive(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;
    return (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // 1. Ignore modifiers only (Wait for actual key)
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    // 2. Input Safety
    if (this.isInputActive(e)) return;

    // 3. Construct Key String
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey && e.key.length > 1) parts.push('shift'); // Only add shift for non-printable or if purely modified
    // For characters, "Shift+l" produces "L". We usually want "l".
    // If we bind "shift+l", we expect user to hold shift.
    
    // Simplification: Use e.key.toLowerCase()
    // Ctrl+S -> "ctrl+s"
    // L -> "l"
    // Shift+L -> "L" -> toLowerCase -> "l"
    // So "Shift+L" logic needs care.
    // If user wants to bind "Shift+R", they register "shift+r".
    // Event: key="R", shift=true.
    if (e.shiftKey && parts.indexOf('shift') === -1) parts.push('shift');
    
    parts.push(e.key.toLowerCase());
    const currentKeyCombo = parts.join('+');

    // 4. Update Buffer
    this.buffer.push(currentKeyCombo);
    
    // Clear buffer after timeout
    if (this.bufferTimeout) clearTimeout(this.bufferTimeout);
    this.bufferTimeout = setTimeout(() => {
        // If buffer has content that wasn't matched (and executed), check for single key match?
        // Actually, logic is: Try to match longest sequence first.
        this.processBuffer(); 
    }, this.SEQUENCE_TIMEOUT);

    // 5. Try to match immediately (Greedy match for modifiers or single keys if no longer sequence exists)
    // We need to know if "current buffer" is a PREFIX of any command.
    const potentialMatches = this.findMatches(this.buffer.join(' '));
    const exactMatches = potentialMatches.filter(s => s.keys === this.buffer.join(' '));
    const isPrefix = potentialMatches.length > exactMatches.length;

    if (exactMatches.length > 0) {
        if (!isPrefix) {
            // Unambiguous match
            this.execute(exactMatches[0], e);
        } else {
             // Ambiguous (Prefix of a longer command). 
             // E.g. Typed "r", matches "Rotate", but also prefix of "r e c" (Rec).
             // Wait for timeout OR next key.
             // BUT, for UX, if I type "Ctrl+S", I want validation NOW.
             // Modifiers usually don't form sequences like "Ctrl+S Ctrl+C".
             // So if it contains 'ctrl' or 'alt', execute immediately.
             if (currentKeyCombo.includes('ctrl') || currentKeyCombo.includes('alt')) {
                 this.execute(exactMatches[0], e);
             } else {
                 // Wait.
             }
        }
    } else {
        // No exact match yet.
        if (potentialMatches.length === 0) {
             // Buffer is invalid path.
             // Maybe the LAST key is a valid single key?
             // e.g. Typed "p" (valid prefix).. then "x" (invalid).
             // "p x" is invalid. But "x" might be valid?
             // For simplify: Clear buffer and retry with just current key
             if (this.buffer.length > 1) {
                 this.buffer = [currentKeyCombo];
                 // Retry match
                 const retryConfig = this.findMatches(currentKeyCombo);
                 const retryExact = retryConfig.filter(s => s.keys === currentKeyCombo);
                 if (retryExact.length > 0) {
                     this.execute(retryExact[0], e);
                 }
             }
        }
    }
  }

  private processBuffer() {
      // Called on timeout. 
      // Execute the best match we have for the current buffer.
      const combo = this.buffer.join(' ');
      const matches = this.findMatches(combo).filter(s => s.keys === combo);
      
      if (matches.length > 0) {
          // If we had a single key like "r" waiting for "rect", and timeout hit,
          // execute "r" (rotate).
          // We assume the event object is lost/stale, but we saved the handler.
          // Note: We can't pass the original event perfectly if verified async.
          // But 'action' usually just needs to fire. We'll pass a mock or the stored last event?
          // For now, pass cached event? No, pass undefined or check handler signature?
          // Let's passed a partial event or null. 
          // However, most handlers just `preventDefault`.
          matches[0].action({ key: matches[0].keys } as any); 
          
          if (this.debug) console.log(`[KeyboardManager] Executed delayed: ${matches[0].keys}`);
      }
      this.clearBuffer();
  }

  private findMatches(sequence: string): ShortcutConfig[] {
      // Search all active contexts
      const candidates: ShortcutConfig[] = [];
      
      // Global always active? Yes.
      // Active contexts
      const contextsToCheck = Array.from(this.activeContexts);
      
      for (const ctx of contextsToCheck) {
          const shortcuts = this.shortcuts.get(ctx) || [];
          for (const s of shortcuts) {
              if (s.keys === sequence || s.keys.startsWith(sequence + ' ')) {
                  candidates.push(s);
              }
          }
      }
      
      // Sort: Exact matches first?
      return candidates;
  }

  private execute(shortcut: ShortcutConfig, e: KeyboardEvent) {
      e.preventDefault();
      e.stopPropagation();
      shortcut.action(e);
      if (this.debug) console.log(`[KeyboardManager] Executed: ${shortcut.keys}`);
      this.clearBuffer(); // Valid command executed, reset.
  }
}

export const keyboardManager = KeyboardManager.getInstance();
