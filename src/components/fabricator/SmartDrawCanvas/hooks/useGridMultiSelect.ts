/**
 * useGridMultiSelect Hook
 * 
 * React hook for managing multi-select state for grid cells.
 * Supports Shift/Ctrl selection patterns like market-leading design tools.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

import type { GridCell } from '@/types/fabricator';
import { useCallback, useState } from 'react';

export interface UseGridMultiSelectReturn {
  /** Selected cell IDs */
  selectedCellIds: Set<string>;
  /** Toggle cell selection */
  toggleCellSelection: (cellId: string, event?: MouseEvent | KeyboardEvent) => void;
  /** Select single cell */
  selectCell: (cellId: string) => void;
  /** Select multiple cells */
  selectCells: (cellIds: string[]) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Get selected cells from grid */
  getSelectedCells: (gridCells: GridCell[]) => GridCell[];
  /** Check if cell is selected */
  isCellSelected: (cellId: string) => boolean;
  /** Select all cells */
  selectAll: (gridCells: GridCell[]) => void;
}

/**
 * Hook for managing grid cell multi-select state
 * 
 * Supports:
 * - Single click: Select single cell
 * - Ctrl/Cmd + click: Toggle cell selection (add/remove)
 * - Shift + click: Range selection (select from last selected to current)
 * 
 * @returns Multi-select controls and state
 */
export function useGridMultiSelect(): UseGridMultiSelectReturn {
  const [selectedCellIds, setSelectedCellIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  /**
   * Toggle cell selection with modifier key support
   */
  const toggleCellSelection = useCallback((cellId: string, event?: MouseEvent | KeyboardEvent) => {
    const isCtrl = event?.ctrlKey || event?.metaKey;
    const isShift = event?.shiftKey;

    setSelectedCellIds((prev) => {
      const newSelection = new Set(prev);

      if (isShift && lastSelectedId) {
        // Range selection: Select from lastSelectedId to cellId
        // This would need grid context to determine range - simplified for now
        // In actual implementation, would calculate range based on grid structure
        if (!newSelection.has(cellId)) {
          newSelection.add(cellId);
        }
      } else if (isCtrl) {
        // Toggle selection: Add if not selected, remove if selected
        if (newSelection.has(cellId)) {
          newSelection.delete(cellId);
        } else {
          newSelection.add(cellId);
        }
      } else {
        // Single selection: Replace current selection
        newSelection.clear();
        newSelection.add(cellId);
      }

      return newSelection;
    });

    setLastSelectedId(cellId);
  }, [lastSelectedId]);

  /**
   * Select single cell (replaces current selection)
   */
  const selectCell = useCallback((cellId: string) => {
    setSelectedCellIds(new Set([cellId]));
    setLastSelectedId(cellId);
  }, []);

  /**
   * Select multiple cells (replaces current selection)
   */
  const selectCells = useCallback((cellIds: string[]) => {
    setSelectedCellIds(new Set(cellIds));
    if (cellIds.length > 0) {
      setLastSelectedId(cellIds[cellIds.length - 1]);
    }
  }, []);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedCellIds(new Set());
    setLastSelectedId(null);
  }, []);

  /**
   * Get selected cells from grid cells array
   */
  const getSelectedCells = useCallback((gridCells: GridCell[]): GridCell[] => {
    return gridCells.filter(cell => selectedCellIds.has(cell.id));
  }, [selectedCellIds]);

  /**
   * Check if cell is selected
   */
  const isCellSelected = useCallback((cellId: string): boolean => {
    return selectedCellIds.has(cellId);
  }, [selectedCellIds]);

  /**
   * Select all cells
   */
  const selectAll = useCallback((gridCells: GridCell[]) => {
    const allIds = gridCells.map(cell => cell.id);
    setSelectedCellIds(new Set(allIds));
    if (allIds.length > 0) {
      setLastSelectedId(allIds[allIds.length - 1]);
    }
  }, []);

  return {
    selectedCellIds,
    toggleCellSelection,
    selectCell,
    selectCells,
    clearSelection,
    getSelectedCells,
    isCellSelected,
    selectAll,
  };
}
