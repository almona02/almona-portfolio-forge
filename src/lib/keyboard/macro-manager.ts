import { MacroRecorder } from './MacroRecorder';
import { ShortcutAction, shortcutManager } from './shortcuts';

/**
 * Macro Manager - Singleton to bridge ShortcutManager and MacroRecorder
 * Ensures recorded actions are captured from global shortcuts.
 */
class MacroManager {
  public recorder: MacroRecorder;

  constructor() {
    this.recorder = new MacroRecorder({
        autoSave: true,
        enableCompression: true
    });

    this.initialize();
  }

  private initialize() {
    // Hook into ShortcutManager
    shortcutManager.addHook((action: ShortcutAction, event: KeyboardEvent) => {
        if (this.recorder.isRecording()) {
            // Map ShortcutAction to MacroActionType or 'custom'
            // We need to cast or map appropriately.
            // For now, we rely on the fact that strings might match or we use 'custom'
            
            // Simple mapping strategy: Use the raw action string as custom type if not standard
            this.recorder.recordAction('custom', {
                shortcutAction: action,
                key: event.key,
                ctrlKey: event.ctrlKey,
                shiftKey: event.shiftKey,
                altKey: event.altKey,
                metaKey: event.metaKey
            });
        }
    });

    // Also support playing macros by triggering shortcuts?
    // Not directly supported by ShortcutManager (it consumes events), 
    // but the MacroRecorder can execute actions.
  }
}

export const macroManager = new MacroManager();
export const macroRecorder = macroManager.recorder;
