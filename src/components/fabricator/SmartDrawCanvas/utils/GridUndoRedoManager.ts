/**
 * Grid Undo/Redo Manager
 * 
 * Manages undo/redo history for WindowGrid state.
 * Supports up to 50 history states for optimal performance.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

import type { WindowGrid } from '@/types/fabricator';

/**
 * Undo/Redo manager for WindowGrid state
 */
export class GridUndoRedoManager {
  private history: WindowGrid[] = [];
  private currentIndex: number = -1;
  private readonly maxHistorySize: number = 50;

  /**
   * Push a new grid state to the history
   * Removes any redo history when a new action is taken
   */
  push(grid: WindowGrid): void {
    // Remove any redo history when new action is taken
    this.history = this.history.slice(0, this.currentIndex + 1);
    
    // Deep clone the grid to avoid reference issues
    const clonedGrid = this.deepClone(grid);
    
    this.history.push(clonedGrid);
    this.currentIndex++;

    // Limit history size to prevent memory issues
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  /**
   * Undo the last action
   * @returns Previous grid state or null if no undo available
   */
  undo(): WindowGrid | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.deepClone(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * Redo the last undone action
   * @returns Next grid state or null if no redo available
   */
  redo(): WindowGrid | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.deepClone(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current grid state
   */
  getCurrentState(): WindowGrid | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.deepClone(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Initialize with an initial grid state
   */
  initialize(initialGrid: WindowGrid): void {
    this.clear();
    this.push(initialGrid);
  }

  /**
   * Deep clone a WindowGrid to avoid reference issues
   */
  private deepClone(grid: WindowGrid): WindowGrid {
    return JSON.parse(JSON.stringify(grid)) as WindowGrid;
  }

  /**
   * Get history size (for debugging/monitoring)
   */
  getHistorySize(): number {
    return this.history.length;
  }
}
