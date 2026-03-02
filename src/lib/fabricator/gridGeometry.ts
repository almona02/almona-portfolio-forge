import type { GridCell, WindowGrid } from '@/types/fabricator';

export interface GridTrackMetrics {
  colSizes: number[];
  rowSizes: number[];
  colOffsets: number[];
  rowOffsets: number[];
}

export interface GridCellBounds {
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeWeights(weights: number[] | undefined, count: number): number[] {
  if (count <= 0) return [];
  if (!weights || weights.length !== count) return Array(count).fill(1);

  const normalized = weights.map((value) => (
    Number.isFinite(value) && value > 0 ? value : 0
  ));
  const total = normalized.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return Array(count).fill(1);

  return normalized;
}

function buildOffsets(sizes: number[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (const size of sizes) {
    offsets.push(cursor);
    cursor += size;
  }
  return offsets;
}

function clampSpan(start: number, span: number | undefined, limit: number): number {
  if (start < 0 || start >= limit) return 0;
  const safeSpan = Number.isFinite(span) && (span ?? 1) > 0 ? Math.floor(span as number) : 1;
  return Math.max(1, Math.min(safeSpan, limit - start));
}

function sumRange(values: number[], start: number, count: number): number {
  let total = 0;
  for (let i = start; i < start + count; i += 1) {
    total += values[i] ?? 0;
  }
  return total;
}

export function buildGridTrackMetrics(
  grid: WindowGrid,
  totalWidth: number,
  totalHeight: number,
): GridTrackMetrics {
  const safeWidth = Number.isFinite(totalWidth) && totalWidth > 0 ? totalWidth : 0;
  const safeHeight = Number.isFinite(totalHeight) && totalHeight > 0 ? totalHeight : 0;

  const colWeights = normalizeWeights(grid.colWidths, grid.cols);
  const rowWeights = normalizeWeights(grid.rowHeights, grid.rows);

  const colWeightTotal = colWeights.reduce((sum, value) => sum + value, 0) || 1;
  const rowWeightTotal = rowWeights.reduce((sum, value) => sum + value, 0) || 1;

  const colSizes = colWeights.map((value) => (value / colWeightTotal) * safeWidth);
  const rowSizes = rowWeights.map((value) => (value / rowWeightTotal) * safeHeight);

  return {
    colSizes,
    rowSizes,
    colOffsets: buildOffsets(colSizes),
    rowOffsets: buildOffsets(rowSizes),
  };
}

export function getRenderableGridCells(grid: WindowGrid): GridCell[] {
  const sorted = [...(grid.cells || [])]
    .filter((cell) => (
      Number.isInteger(cell.row)
      && Number.isInteger(cell.col)
      && cell.row >= 0
      && cell.row < grid.rows
      && cell.col >= 0
      && cell.col < grid.cols
    ))
    .sort((a, b) => (a.row - b.row) || (a.col - b.col));

  const covered = new Set<string>();
  const renderable: GridCell[] = [];

  for (const cell of sorted) {
    const key = `${cell.row}:${cell.col}`;
    if (covered.has(key)) continue;

    const rowSpan = clampSpan(cell.row, cell.rowSpan, grid.rows);
    const colSpan = clampSpan(cell.col, cell.colSpan, grid.cols);
    if (rowSpan <= 0 || colSpan <= 0) continue;

    const normalizedCell: GridCell = {
      ...cell,
      rowSpan,
      colSpan,
    };
    renderable.push(normalizedCell);

    for (let row = cell.row; row < cell.row + rowSpan; row += 1) {
      for (let col = cell.col; col < cell.col + colSpan; col += 1) {
        if (row === cell.row && col === cell.col) continue;
        covered.add(`${row}:${col}`);
      }
    }
  }

  return renderable;
}

export function getCellBoundsFromTracks(
  cell: GridCell,
  tracks: GridTrackMetrics,
  grid: WindowGrid,
): GridCellBounds | null {
  if (cell.row < 0 || cell.col < 0 || cell.row >= grid.rows || cell.col >= grid.cols) {
    return null;
  }

  const rowSpan = clampSpan(cell.row, cell.rowSpan, grid.rows);
  const colSpan = clampSpan(cell.col, cell.colSpan, grid.cols);
  if (rowSpan <= 0 || colSpan <= 0) {
    return null;
  }

  const x = tracks.colOffsets[cell.col] ?? 0;
  const y = tracks.rowOffsets[cell.row] ?? 0;
  const width = sumRange(tracks.colSizes, cell.col, colSpan);
  const height = sumRange(tracks.rowSizes, cell.row, rowSpan);

  return {
    row: cell.row,
    col: cell.col,
    rowSpan,
    colSpan,
    x,
    y,
    width,
    height,
  };
}

export interface ActiveDividerBoundaries {
  verticalBoundaries: number[];
  horizontalBoundaries: number[];
}

export function computeActiveDividerBoundaries(grid: WindowGrid): ActiveDividerBoundaries {
  const renderableCells = getRenderableGridCells(grid);
  const matrix: (GridCell | null)[][] = Array.from({ length: grid.rows }, () => (
    Array.from({ length: grid.cols }, () => null)
  ));

  for (const cell of renderableCells) {
    if (cell.type === 'empty') continue;
    const rowSpan = clampSpan(cell.row, cell.rowSpan, grid.rows);
    const colSpan = clampSpan(cell.col, cell.colSpan, grid.cols);

    for (let row = cell.row; row < cell.row + rowSpan; row += 1) {
      for (let col = cell.col; col < cell.col + colSpan; col += 1) {
        matrix[row][col] = cell;
      }
    }
  }

  const verticalBoundaries: number[] = [];
  for (let boundary = 1; boundary < grid.cols; boundary += 1) {
    let isActive = false;
    for (let row = 0; row < grid.rows; row += 1) {
      const leftCell = matrix[row][boundary - 1];
      const rightCell = matrix[row][boundary];
      if (leftCell && rightCell && leftCell.id !== rightCell.id) {
        isActive = true;
        break;
      }
    }
    if (isActive) verticalBoundaries.push(boundary);
  }

  const horizontalBoundaries: number[] = [];
  for (let boundary = 1; boundary < grid.rows; boundary += 1) {
    let isActive = false;
    for (let col = 0; col < grid.cols; col += 1) {
      const topCell = matrix[boundary - 1][col];
      const bottomCell = matrix[boundary][col];
      if (topCell && bottomCell && topCell.id !== bottomCell.id) {
        isActive = true;
        break;
      }
    }
    if (isActive) horizontalBoundaries.push(boundary);
  }

  return {
    verticalBoundaries,
    horizontalBoundaries,
  };
}
