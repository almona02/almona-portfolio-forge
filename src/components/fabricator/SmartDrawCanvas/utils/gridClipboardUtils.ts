/**
 * Grid Clipboard Utilities
 * 
 * Provides copy/paste operations for WindowGrid cells.
 * Uses localStorage for clipboard persistence.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

import type { GridCell, WindowGrid } from '@/types/fabricator';
import { cloneCells } from './gridCellUtils';

export interface GridClipboardData {
  cells: GridCell[];
  timestamp: number;
}

const GRID_CLIPBOARD_KEY = 'almona:grid:clipboard';
const CLIPBOARD_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Copy selected cells to clipboard
 */
export function copyCellsToClipboard(cells: GridCell[]): GridClipboardData | null {
  try {
    if (cells.length === 0) {
      return null;
    }

    // Clone cells to avoid reference issues
    const clonedCells = cloneCells(cells);

    const clipboardData: GridClipboardData = {
      cells: clonedCells,
      timestamp: Date.now(),
    };

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(GRID_CLIPBOARD_KEY, JSON.stringify(clipboardData));
    }

    return clipboardData;
  } catch (error) {
    console.error('Error copying cells to clipboard:', error);
    return null;
  }
}

/**
 * Get clipboard data
 */
export function getGridClipboardData(): GridClipboardData | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const data = localStorage.getItem(GRID_CLIPBOARD_KEY);
    if (!data) return null;

    const clipboardData: GridClipboardData = JSON.parse(data);
    
    // Check if clipboard data is expired
    if (Date.now() - clipboardData.timestamp > CLIPBOARD_MAX_AGE) {
      localStorage.removeItem(GRID_CLIPBOARD_KEY);
      return null;
    }

    return clipboardData;
  } catch (error) {
    console.error('Error getting grid clipboard data:', error);
    return null;
  }
}

/**
 * Clear clipboard
 */
export function clearGridClipboard(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GRID_CLIPBOARD_KEY);
  }
}

/**
 * Check if clipboard has data
 */
export function hasGridClipboardData(): boolean {
  return getGridClipboardData() !== null;
}

/**
 * Paste cells into grid at specified position
 * 
 * @param clipboardData - Clipboard data to paste
 * @param targetRow - Target row for paste operation
 * @param targetCol - Target column for paste operation
 * @param grid - Current grid state
 * @returns New grid state with pasted cells, or null if paste fails
 */
export function pasteCellsIntoGrid(
  clipboardData: GridClipboardData,
  targetRow: number,
  targetCol: number,
  grid: WindowGrid
): WindowGrid | null {
  try {
    if (clipboardData.cells.length === 0) {
      return null;
    }

    // Calculate offset from first cell to target position
    const firstCell = clipboardData.cells[0];
    const rowOffset = targetRow - firstCell.row;
    const colOffset = targetCol - firstCell.col;

    // Create new cells with updated positions and IDs
    const pastedCells = clipboardData.cells.map((cell) => {
      const newRow = cell.row + rowOffset;
      const newCol = cell.col + colOffset;

      // Validate position
      if (newRow < 0 || newRow >= grid.rows || newCol < 0 || newCol >= grid.cols) {
        return null;
      }

      return {
        ...cell,
        id: `${newRow}-${newCol}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        row: newRow,
        col: newCol,
      };
    }).filter((cell): cell is GridCell => cell !== null);

    if (pastedCells.length === 0) {
      return null;
    }

    // Merge pasted cells with existing grid
    // Replace existing cells at target positions
    const existingCellIds = new Set(pastedCells.map(c => `${c.row}-${c.col}`));
    const filteredCells = grid.cells.filter(
      cell => !existingCellIds.has(`${cell.row}-${cell.col}`)
    );

    const newCells = [...filteredCells, ...pastedCells];

    return {
      ...grid,
      cells: newCells,
    };
  } catch (error) {
    console.error('Error pasting cells into grid:', error);
    return null;
  }
}
