/**
 * Grid Cell Utilities
 * 
 * Utility functions for grid cell operations including:
 * - Multi-select management
 * - Copy/paste operations
 * - Cell type transformations
 * - Grid symmetry operations
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

import type { GridCell, WindowGrid } from '@/types/fabricator';

/**
 * Get cell by ID
 */
export function getCellById(grid: WindowGrid, cellId: string): GridCell | undefined {
  return grid.cells.find(cell => cell.id === cellId);
}

/**
 * Get cells by IDs (for multi-select)
 */
export function getCellsByIds(grid: WindowGrid, cellIds: string[]): GridCell[] {
  return cellIds
    .map(id => getCellById(grid, id))
    .filter((cell): cell is GridCell => cell !== undefined);
}

/**
 * Clone cells for copy/paste operations
 */
export function cloneCells(cells: GridCell[]): GridCell[] {
  return cells.map(cell => ({
    ...cell,
    id: `${cell.row}-${cell.col}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }));
}

/**
 * Copy cell configuration (for copy/paste)
 */
export function copyCellConfiguration(cell: GridCell): GridCell {
  return {
    ...cell,
    id: `${cell.row}-${cell.col}-${Date.now()}`,
  };
}

/**
 * Mirror grid horizontally
 */
export function mirrorGridHorizontally(grid: WindowGrid): WindowGrid {
  const mirroredCells = grid.cells.map(cell => {
    const newCol = grid.cols - 1 - cell.col;
    const newOpeningDirection = cell.openingDirection === 'left' 
      ? 'right' 
      : cell.openingDirection === 'right' 
      ? 'left' 
      : cell.openingDirection;
    
    return {
      ...cell,
      id: `${cell.row}-${newCol}`,
      col: newCol,
      openingDirection: newOpeningDirection,
    };
  });

  const mirroredColWidths = grid.colWidths 
    ? [...grid.colWidths].reverse()
    : undefined;

  return {
    ...grid,
    cells: mirroredCells,
    colWidths: mirroredColWidths,
  };
}

/**
 * Mirror grid vertically
 */
export function mirrorGridVertically(grid: WindowGrid): WindowGrid {
  const mirroredCells = grid.cells.map(cell => {
    const newRow = grid.rows - 1 - cell.row;
    const newOpeningDirection = cell.openingDirection === 'top' 
      ? 'bottom' 
      : cell.openingDirection === 'bottom' 
      ? 'top' 
      : cell.openingDirection;
    
    return {
      ...cell,
      id: `${newRow}-${cell.col}`,
      row: newRow,
      openingDirection: newOpeningDirection,
    };
  });

  const mirroredRowHeights = grid.rowHeights 
    ? [...grid.rowHeights].reverse()
    : undefined;

  return {
    ...grid,
    cells: mirroredCells,
    rowHeights: mirroredRowHeights,
  };
}

/**
 * Calculate cell dimensions in pixels
 */
export function calculateCellDimensions(
  grid: WindowGrid,
  cell: GridCell,
  totalWidth: number,
  totalHeight: number
): { width: number; height: number; x: number; y: number } {
  const colWeights = grid.colWidths && grid.colWidths.length === grid.cols 
    ? grid.colWidths 
    : Array(grid.cols).fill(1);
  const rowWeights = grid.rowHeights && grid.rowHeights.length === grid.rows 
    ? grid.rowHeights 
    : Array(grid.rows).fill(1);

  const totalColWeight = colWeights.reduce((a, b) => a + b, 0) || grid.cols;
  const totalRowWeight = rowWeights.reduce((a, b) => a + b, 0) || grid.rows;

  const colStart = colWeights.slice(0, cell.col).reduce((a, b) => a + b, 0) / totalColWeight;
  const rowStart = rowWeights.slice(0, cell.row).reduce((a, b) => a + b, 0) / totalRowWeight;

  const colSpan = cell.colSpan || 1;
  const rowSpan = cell.rowSpan || 1;

  const colEnd = colWeights.slice(0, cell.col + colSpan).reduce((a, b) => a + b, 0) / totalColWeight;

  const rowEnd = rowWeights.slice(0, cell.row + rowSpan).reduce((a, b) => a + b, 0) / totalRowWeight;

  return {
    x: colStart * totalWidth,
    y: rowStart * totalHeight,
    width: (colEnd - colStart) * totalWidth,
    height: (rowEnd - rowStart) * totalHeight,
  };
}

/**
 * Check if a point is inside a cell
 */
export function isPointInCell(
  point: { x: number; y: number },
  cellDims: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    point.x >= cellDims.x &&
    point.x <= cellDims.x + cellDims.width &&
    point.y >= cellDims.y &&
    point.y <= cellDims.y + cellDims.height
  );
}

/**
 * Find cell at point
 */
export function findCellAtPoint(
  grid: WindowGrid,
  point: { x: number; y: number },
  totalWidth: number,
  totalHeight: number
): GridCell | null {
  for (const cell of grid.cells) {
    const dims = calculateCellDimensions(grid, cell, totalWidth, totalHeight);
    if (isPointInCell(point, dims)) {
      return cell;
    }
  }
  return null;
}
