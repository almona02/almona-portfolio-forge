/**
 * draftingToWindowUnit - Convert drafting state to WindowUnit for 3D preview and BOM.
 * Builds from first material-aware window (frame) with optional grid and per-cell glazing.
 */

import type { WindowUnit } from '@/types/fabricator';
import type { MaterialAwareRectangle } from '../types/materialAware';

export interface DraftingStateSnapshot {
  getGeometry: () => { rectangles: unknown[] };
  getMaterialAwareWindows: () => MaterialAwareRectangle[];
  getMaterialWindowGrids: () => Record<string, import('@/types/fabricator').WindowGrid>;
  getMaterialWindowGlazing?: () => Record<string, Record<string, { type: 'single' | 'double'; color?: string; georgianBars?: boolean }>>;
}

/**
 * Normalize grid so rows/cols match cell count and colWidths/rowHeights are valid proportions.
 * Prevents corrupted 3D when e.g. 2 sashes are added (grid must match cells).
 */
function normalizeGrid(
  grid: import('@/types/fabricator').WindowGrid
): import('@/types/fabricator').WindowGrid {
  const rows = Math.max(1, grid.rows ?? 1);
  const cols = Math.max(1, grid.cols ?? 1);
  const cells = grid.cells?.filter(
    (c) => c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols
  ) ?? [];
  const colWidths =
    grid.colWidths?.length === cols
      ? grid.colWidths.map((v) => (typeof v === 'number' && v > 0 ? v : 1))
      : Array(cols).fill(1);
  const rowHeights =
    grid.rowHeights?.length === rows
      ? grid.rowHeights.map((v) => (typeof v === 'number' && v > 0 ? v : 1))
      : Array(rows).fill(1);
  return {
    rows,
    cols,
    cells,
    colWidths,
    rowHeights,
    manualMullions: grid.manualMullions,
  };
}

/**
 * Build a WindowUnit from the first material-aware window (defined frame).
 * Used by DraftingPreview3D to drive Window3DGenerator when grid/glazing exist.
 * Validates dimensions and normalizes grid so 2-sash (and other) layouts don't corrupt geometry.
 */
export function draftingToWindowUnit(drafting: DraftingStateSnapshot): WindowUnit | null {
  const materialAware = drafting.getMaterialAwareWindows?.() ?? [];
  if (materialAware.length === 0) return null;
  const frame = materialAware[0];
  const grids = drafting.getMaterialWindowGrids?.() ?? {};
  const glazingByFrame = drafting.getMaterialWindowGlazing?.() ?? {};
  const rawGrid = frame.id ? grids[frame.id] : undefined;
  const glazingByCell = frame.id ? glazingByFrame[frame.id] : undefined;

  const overallWidth =
    typeof frame.width === 'number' && frame.width > 0 ? frame.width : 600;
  const overallHeight =
    typeof frame.height === 'number' && frame.height > 0 ? frame.height : 1200;
  const grid =
    rawGrid && rawGrid.cells?.length > 0 ? normalizeGrid(rawGrid) : rawGrid;

  const now = new Date();
  const unit: WindowUnit = {
    id: frame.id ?? `draft-${now.getTime()}`,
    orderNumber: frame.id ?? '1',
    posNumber: '1',
    type: 'casement',
    components: [],
    overallWidth,
    overallHeight,
    color: '#ffffff',
    glazing: glazingByCell ?? {},
    hardware: [],
    status: 'draft',
    optimization: null,
    createdAt: now,
    updatedAt: now,
    systemPackId: frame.systemPackId,
    grid,
  };
  return unit;
}
