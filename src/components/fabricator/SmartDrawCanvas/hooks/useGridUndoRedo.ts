/**
 * useGridUndoRedo Hook
 * 
 * React hook for managing undo/redo state for WindowGrid.
 * Provides undo/redo functionality with 50-state history limit.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { WindowGrid } from '@/types/fabricator';
import { GridUndoRedoManager } from '../utils/GridUndoRedoManager';

export interface UseGridUndoRedoReturn {
  /** Current grid state */
  grid: WindowGrid;
  /** Update grid state (automatically pushes to history) */
  setGrid: (grid: WindowGrid) => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Check if undo is available */
  canUndo: boolean;
  /** Check if redo is available */
  canRedo: boolean;
  /** Clear history */
  clearHistory: () => void;
}

/**
 * Hook for managing grid undo/redo state
 * 
 * @param initialGrid - Initial grid state
 * @returns Undo/redo controls and current grid state
 */
export function useGridUndoRedo(initialGrid: WindowGrid): UseGridUndoRedoReturn {
  const [grid, setGridState] = useState<WindowGrid>(initialGrid);
  const managerRef = useRef<GridUndoRedoManager>(new GridUndoRedoManager());
  const isUndoRedoOperationRef = useRef(false);

  // Initialize manager with initial grid
  useEffect(() => {
    managerRef.current.initialize(initialGrid);
  }, [initialGrid]);

  /**
   * Update grid state (pushes to history unless it's an undo/redo operation)
   */
  const setGrid = useCallback((newGrid: WindowGrid) => {
    setGridState(newGrid);
    
    // Only push to history if it's not an undo/redo operation
    if (!isUndoRedoOperationRef.current) {
      managerRef.current.push(newGrid);
    }
    isUndoRedoOperationRef.current = false;
  }, []);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    const previousGrid = managerRef.current.undo();
    if (previousGrid) {
      isUndoRedoOperationRef.current = true;
      setGridState(previousGrid);
    }
  }, []);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    const nextGrid = managerRef.current.redo();
    if (nextGrid) {
      isUndoRedoOperationRef.current = true;
      setGridState(nextGrid);
    }
  }, []);

  /**
   * Check if undo/redo is available (reactive)
   */
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update canUndo/canRedo when grid changes
  useEffect(() => {
    setCanUndo(managerRef.current.canUndo());
    setCanRedo(managerRef.current.canRedo());
  }, [grid]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    managerRef.current.clear();
    managerRef.current.push(grid);
    setCanUndo(false);
    setCanRedo(false);
  }, [grid]);

  return {
    grid,
    setGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
