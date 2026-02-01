/**
 * SmartDrawCanvas Utilities
 * 
 * Utility functions and classes for grid editing enhancements.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 */

export { GridUndoRedoManager } from './GridUndoRedoManager';
export {
  getCellById,
  getCellsByIds,
  cloneCells,
  copyCellConfiguration,
  mirrorGridHorizontally,
  mirrorGridVertically,
  calculateCellDimensions,
  isPointInCell,
  findCellAtPoint,
} from './gridCellUtils';
export {
  copyCellsToClipboard,
  getGridClipboardData,
  clearGridClipboard,
  hasGridClipboardData,
  pasteCellsIntoGrid,
  type GridClipboardData,
} from './gridClipboardUtils';
