// Macro Recording System - Gold-Tier Advanced Feature
// Inspired by AutoCAD's macro recording capabilities

import { Hardener } from '../error/Hardener';

// Macro action types
export type MacroActionType =
  | 'tool.select'
  | 'tool.rectangle'
  | 'tool.circle'
  | 'tool.line'
  | 'tool.dimension'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.delete'
  | 'edit.copy'
  | 'edit.paste'
  | 'view.zoom-in'
  | 'view.zoom-out'
  | 'view.fit'
  | 'view.pan'
  | 'navigate.up'
  | 'navigate.down'
  | 'navigate.left'
  | 'navigate.right'
  | 'custom';

// Recorded action interface
export interface RecordedAction {
  id: string;
  type: MacroActionType;
  timestamp: number;
  data?: Record<string, any>;
  delay?: number; // Delay before next action in ms
}

// Macro definition
export interface Macro {
  id: string;
  name: string;
  description?: string;
  actions: RecordedAction[];
  createdAt: number;
  modifiedAt: number;
  category?: string;
  shortcut?: string;
  isPlaying?: boolean;
  playbackSpeed?: number; // 0.25x to 4x speed
}

// Recording state
export interface RecordingState {
  isRecording: boolean;
  currentMacro: Partial<Macro> | null;
  startTime: number;
  lastActionTime: number;
  actions: RecordedAction[];
}

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  currentMacro: Macro | null;
  currentActionIndex: number;
  startTime: number;
  playbackSpeed: number;
}

// Macro recorder configuration
export interface MacroRecorderConfig {
  maxRecordingTime: number; // Max recording duration in ms
  minActionDelay: number; // Minimum delay between actions in ms
  maxActions: number; // Maximum actions per macro
  enableCompression: boolean; // Compress repeated actions
  autoSave: boolean; // Auto-save recordings
}

// Macro event callbacks
export interface MacroCallbacks {
  onRecordingStart?: () => void;
  onRecordingStop?: (macro: Macro) => void;
  onPlaybackStart?: (macro: Macro) => void;
  onPlaybackComplete?: (macro: Macro) => void;
  onPlaybackError?: (error: Error, macro: Macro) => void;
  onActionRecorded?: (action: RecordedAction) => void;
  onActionExecuted?: (action: RecordedAction) => void;
}

// Main Macro Recorder class
export class MacroRecorder {
  private config: MacroRecorderConfig;
  private recordingState: RecordingState;
  private playbackState: PlaybackState;
  private macros: Map<string, Macro>;
  private callbacks: MacroCallbacks;
  private hardener: Hardener;
  private playbackTimeoutId: NodeJS.Timeout | null = null;

  constructor(
    config: Partial<MacroRecorderConfig> = {},
    callbacks: MacroCallbacks = {}
  ) {
    this.config = {
      maxRecordingTime: 300000, // 5 minutes
      minActionDelay: 50, // 50ms minimum delay
      maxActions: 1000, // 1000 actions max
      enableCompression: true,
      autoSave: true,
      ...config,
    };

    this.callbacks = callbacks;
    this.hardener = new Hardener({ enableLogging: true });

    this.recordingState = {
      isRecording: false,
      currentMacro: null,
      startTime: 0,
      lastActionTime: 0,
      actions: [],
    };

    this.playbackState = {
      isPlaying: false,
      currentMacro: null,
      currentActionIndex: 0,
      startTime: 0,
      playbackSpeed: 1.0,
    };

    this.macros = new Map();

    // Load saved macros from localStorage
    this.loadMacros();
  }

  // Recording methods

  /**
   * Start recording a new macro
   */
  startRecording(name: string, description?: string, category?: string): boolean {
    if (this.recordingState.isRecording) {
      console.warn('MacroRecorder: Already recording');
      return false;
    }

    if (this.playbackState.isPlaying) {
      console.warn('MacroRecorder: Cannot record while playing');
      return false;
    }

    this.recordingState = {
      isRecording: true,
      currentMacro: {
        id: this.generateId(),
        name: this.hardener.guardString(name, 'Untitled Macro'),
        description,
        category,
        actions: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      },
      startTime: Date.now(),
      lastActionTime: Date.now(),
      actions: [],
    };

    this.callbacks.onRecordingStart?.();
    console.log('MacroRecorder: Started recording', this.recordingState.currentMacro.name);

    return true;
  }

  /**
   * Stop recording and save the macro
   */
  stopRecording(): Macro | null {
    if (!this.recordingState.isRecording) {
      console.warn('MacroRecorder: Not currently recording');
      return null;
    }

    const macro = this.finalizeMacro();
    if (macro) {
      this.macros.set(macro.id, macro);
      this.saveMacros();
      this.callbacks.onRecordingStop?.(macro);
      console.log('MacroRecorder: Stopped recording', macro.name, `${macro.actions.length} actions`);
    }

    this.recordingState = {
      isRecording: false,
      currentMacro: null,
      startTime: 0,
      lastActionTime: 0,
      actions: [],
    };

    return macro;
  }

  /**
   * Record an action
   */
  recordAction(type: MacroActionType, data?: Record<string, any>): boolean {
    if (!this.recordingState.isRecording) {
      return false;
    }

    const now = Date.now();
    const timeSinceStart = now - this.recordingState.startTime;
    const timeSinceLastAction = now - this.recordingState.lastActionTime;

    // Check recording limits
    if (timeSinceStart > this.config.maxRecordingTime) {
      console.warn('MacroRecorder: Recording time limit exceeded');
      this.stopRecording();
      return false;
    }

    if (this.recordingState.actions.length >= this.config.maxActions) {
      console.warn('MacroRecorder: Maximum actions limit exceeded');
      this.stopRecording();
      return false;
    }

    // Skip actions that are too close together (debounce)
    if (timeSinceLastAction < this.config.minActionDelay) {
      return false;
    }

    const action: RecordedAction = {
      id: this.generateId(),
      type,
      timestamp: now,
      data,
      delay: timeSinceLastAction,
    };

    this.recordingState.actions.push(action);
    this.recordingState.lastActionTime = now;

    this.callbacks.onActionRecorded?.(action);

    return true;
  }

  /**
   * Cancel current recording
   */
  cancelRecording(): void {
    if (!this.recordingState.isRecording) {
      return;
    }

    console.log('MacroRecorder: Recording cancelled');
    this.recordingState = {
      isRecording: false,
      currentMacro: null,
      startTime: 0,
      lastActionTime: 0,
      actions: [],
    };
  }

  // Playback methods

  /**
   * Play a macro
   */
  async playMacro(
    macroId: string,
    playbackSpeed: number = 1.0,
    onActionExecute?: (action: RecordedAction) => Promise<void>
  ): Promise<boolean> {
    const macro = this.macros.get(macroId);
    if (!macro) {
      console.error('MacroRecorder: Macro not found', macroId);
      return false;
    }

    if (this.playbackState.isPlaying) {
      console.warn('MacroRecorder: Already playing a macro');
      return false;
    }

    if (this.recordingState.isRecording) {
      console.warn('MacroRecorder: Cannot play while recording');
      return false;
    }

    this.playbackState = {
      isPlaying: true,
      currentMacro: macro,
      currentActionIndex: 0,
      startTime: Date.now(),
      playbackSpeed: Math.max(0.25, Math.min(4.0, playbackSpeed)), // Clamp to 0.25x - 4x
    };

    this.callbacks.onPlaybackStart?.(macro);

    try {
      await this.executePlayback(onActionExecute);
      this.callbacks.onPlaybackComplete?.(macro);
      return true;
    } catch (error) {
      this.callbacks.onPlaybackError?.(error as Error, macro);
      return false;
    } finally {
      this.resetPlayback();
    }
  }

  /**
   * Stop current playback
   */
  stopPlayback(): void {
    if (!this.playbackState.isPlaying) {
      return;
    }

    if (this.playbackTimeoutId) {
      clearTimeout(this.playbackTimeoutId);
      this.playbackTimeoutId = null;
    }

    console.log('MacroRecorder: Playback stopped');
    this.resetPlayback();
  }

  /**
   * Pause/resume playback
   */
  pausePlayback(): void {
    if (!this.playbackState.isPlaying) {
      return;
    }

    // For simplicity, pause just stops the current playback
    this.stopPlayback();
  }

  // Macro management methods

  /**
   * Get all macros
   */
  getMacros(): Macro[] {
    return Array.from(this.macros.values());
  }

  /**
   * Get macro by ID
   */
  getMacro(id: string): Macro | undefined {
    return this.macros.get(id);
  }

  /**
   * Save macro
   */
  saveMacro(macro: Macro): void {
    macro.modifiedAt = Date.now();
    this.macros.set(macro.id, macro);
    this.saveMacros();
  }

  /**
   * Delete macro
   */
  deleteMacro(id: string): boolean {
    const deleted = this.macros.delete(id);
    if (deleted) {
      this.saveMacros();
    }
    return deleted;
  }

  /**
   * Export macro as JSON
   */
  exportMacro(id: string): string | null {
    const macro = this.macros.get(id);
    if (!macro) return null;

    return JSON.stringify(macro, null, 2);
  }

  /**
   * Import macro from JSON
   */
  importMacro(jsonString: string): Macro | null {
    try {
      const macro = JSON.parse(jsonString) as Macro;

      // Validate macro structure
      if (!macro.id || !macro.name || !Array.isArray(macro.actions)) {
        throw new Error('Invalid macro format');
      }

      // Generate new ID to avoid conflicts
      macro.id = this.generateId();
      macro.createdAt = Date.now();
      macro.modifiedAt = Date.now();

      this.macros.set(macro.id, macro);
      this.saveMacros();

      return macro;
    } catch (error) {
      console.error('MacroRecorder: Failed to import macro', error);
      return null;
    }
  }

  // State getters

  /**
   * Get current recording state
   */
  getRecordingState(): RecordingState {
    return { ...this.recordingState };
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recordingState.isRecording;
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.playbackState.isPlaying;
  }

  // Private methods

  private async executePlayback(
    onActionExecute?: (action: RecordedAction) => Promise<void>
  ): Promise<void> {
    const { currentMacro, playbackSpeed } = this.playbackState;
    if (!currentMacro) return;

    for (let i = 0; i < currentMacro.actions.length; i++) {
      if (!this.playbackState.isPlaying) break;

      const action = currentMacro.actions[i];
      this.playbackState.currentActionIndex = i;

      try {
        // Execute custom action handler if provided
        if (onActionExecute) {
          await onActionExecute(action);
        }

        this.callbacks.onActionExecuted?.(action);

        // Wait for the next action (adjusted for playback speed)
        if (i < currentMacro.actions.length - 1) {
          const nextAction = currentMacro.actions[i + 1];
          const delay = (nextAction.delay || 0) / playbackSpeed;

          await new Promise(resolve => {
            this.playbackTimeoutId = setTimeout(resolve, delay);
          });
        }
      } catch (error) {
        console.error('MacroRecorder: Action execution failed', action, error);
        throw error;
      }
    }
  }

  private finalizeMacro(): Macro | null {
    if (!this.recordingState.currentMacro || this.recordingState.actions.length === 0) {
      return null;
    }

    let actions = [...this.recordingState.actions];

    // Compress repeated actions if enabled
    if (this.config.enableCompression) {
      actions = this.compressActions(actions);
    }

    return {
      ...this.recordingState.currentMacro,
      actions,
      modifiedAt: Date.now(),
    } as Macro;
  }

  private compressActions(actions: RecordedAction[]): RecordedAction[] {
    const compressed: RecordedAction[] = [];
    let currentGroup: RecordedAction[] = [];

    for (const action of actions) {
      if (currentGroup.length === 0) {
        currentGroup.push(action);
      } else {
        const lastAction = currentGroup[currentGroup.length - 1];

        // Check if this action can be grouped with the previous one
        if (this.canCompressActions(lastAction, action)) {
          currentGroup.push(action);
        } else {
          // Finalize the current group
          if (currentGroup.length > 1) {
            compressed.push(this.createCompressedAction(currentGroup));
          } else {
            compressed.push(currentGroup[0]);
          }
          currentGroup = [action];
        }
      }
    }

    // Finalize the last group
    if (currentGroup.length > 1) {
      compressed.push(this.createCompressedAction(currentGroup));
    } else if (currentGroup.length === 1) {
      compressed.push(currentGroup[0]);
    }

    return compressed;
  }

  private canCompressActions(action1: RecordedAction, action2: RecordedAction): boolean {
    // Only compress identical actions that are very close in time
    return (
      action1.type === action2.type &&
      action2.timestamp - action1.timestamp < 100 && // Within 100ms
      JSON.stringify(action1.data) === JSON.stringify(action2.data)
    );
  }

  private createCompressedAction(actions: RecordedAction[]): RecordedAction {
    return {
      id: this.generateId(),
      type: actions[0].type,
      timestamp: actions[0].timestamp,
      data: {
        ...actions[0].data,
        compressed: true,
        count: actions.length,
      },
      delay: actions[0].delay,
    };
  }

  private resetPlayback(): void {
    this.playbackState = {
      isPlaying: false,
      currentMacro: null,
      currentActionIndex: 0,
      startTime: 0,
      playbackSpeed: 1.0,
    };
  }

  private generateId(): string {
    return `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveMacros(): void {
    if (!this.config.autoSave) return;

    try {
      const macrosArray = Array.from(this.macros.values());
      localStorage.setItem('almona_macros', JSON.stringify(macrosArray));
    } catch (error) {
      console.error('MacroRecorder: Failed to save macros', error);
    }
  }

  private loadMacros(): void {
    try {
      const saved = localStorage.getItem('almona_macros');
      if (saved) {
        const macrosArray = JSON.parse(saved) as Macro[];
        this.macros = new Map(macrosArray.map(macro => [macro.id, macro]));
      }
    } catch (error) {
      console.error('MacroRecorder: Failed to load macros', error);
    }
  }
}

// Utility functions for common macro operations

export const macroUtils = {
  /**
   * Create a macro from a series of actions
   */
  createMacroFromActions(
    name: string,
    actions: Omit<RecordedAction, 'id' | 'timestamp'>[],
    description?: string,
    category?: string
  ): Macro {
    const now = Date.now();
    const fullActions: RecordedAction[] = actions.map((action, index) => ({
      ...action,
      id: `action_${now}_${index}`,
      timestamp: now + index * 100, // Space actions 100ms apart
    }));

    return {
      id: `macro_${now}`,
      name,
      description,
      category,
      actions: fullActions,
      createdAt: now,
      modifiedAt: now,
    };
  },

  /**
   * Validate macro structure
   */
  validateMacro(macro: any): macro is Macro {
    return (
      typeof macro === 'object' &&
      typeof macro.id === 'string' &&
      typeof macro.name === 'string' &&
      Array.isArray(macro.actions) &&
      typeof macro.createdAt === 'number' &&
      typeof macro.modifiedAt === 'number'
    );
  },

  /**
   * Get macro statistics
   */
  getMacroStats(macro: Macro) {
    const totalDuration = macro.actions.length > 1
      ? macro.actions[macro.actions.length - 1].timestamp - macro.actions[0].timestamp
      : 0;

    const actionTypes = macro.actions.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActions: macro.actions.length,
      totalDuration,
      averageDelay: macro.actions.length > 1
        ? totalDuration / (macro.actions.length - 1)
        : 0,
      actionTypes,
      mostCommonAction: Object.entries(actionTypes)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
    };
  },
};
