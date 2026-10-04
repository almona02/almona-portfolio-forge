// src/components/fabricator/drafting/utils/draftingToWindowGrid.ts
import type { GridCell, WindowGrid } from '@/types/fabricator';
import type { EgyptianTemplate, Geometry2D } from '../types/drafting';

export class DraftingGridConversionError extends Error {
  readonly code = 'MISSING_AUTHORITATIVE_CELL_METADATA';

  constructor(message: string) {
    super(message);
    this.name = 'DraftingGridConversionError';
  }
}

/**
 * Convert drafting geometry to ALMONA WindowGrid format
 * Constitutional: Deterministic conversion, no ML
 */
export function convertDraftingToWindowGrid(
  geometry: Geometry2D,
  template: EgyptianTemplate
): WindowGrid {
  const cells: GridCell[] = [];
  const templateCellCount = template.rows * template.cols;
  const colRatios = normalizeRatios(template.colWidthRatios, template.cols);
  const rowRatios = normalizeRatios(template.rowHeightRatios, template.rows);

  // If a single rectangle represents the overall window, expand to template grid
  if (
    geometry.rectangles.length === 1 &&
    templateCellCount > 1 &&
    !geometry.rectangles[0].sourceCellId
  ) {
    const rect = geometry.rectangles[0];
    const colWidths = colRatios.map(ratio => rect.width * ratio);
    const rowHeights = rowRatios.map(ratio => rect.height * ratio);

    for (let row = 0; row < template.rows; row++) {
      for (let col = 0; col < template.cols; col++) {
        const templateCellType = template.cellTypes?.[row]?.[col];
        cells.push({
          id: `${row}-${col}`,
          row,
          col,
          type: mapDraftingTypeToGridType(templateCellType),
        });
      }
    }

    return {
      rows: template.rows,
      cols: template.cols,
      cells,
      colWidths,
      rowHeights,
    };
  }
  
  const authoritativeRects = geometry.rectangles.filter((rect) =>
    rect.sourceCellId && rect.sourceCellType && Number.isSafeInteger(rect.sourceRow) && Number.isSafeInteger(rect.sourceCol)
  );
  if (authoritativeRects.length !== geometry.rectangles.length || authoritativeRects.length === 0) {
    throw new DraftingGridConversionError(
      'Drafting geometry lacks authoritative source-cell metadata; WindowGrid conversion is blocked.'
    );
  }

  const columnBoundaries = new Map<number, number>();
  const rowBoundaries = new Map<number, number>();
  const occupiedSlots = new Set<string>();
  const sourceCellIds = new Set<string>();
  const setBoundary = (boundaries: Map<number, number>, index: number, value: number, axis: string): void => {
    const existing = boundaries.get(index);
    if (existing !== undefined && Math.abs(existing - value) > 0.000001) {
      throw new DraftingGridConversionError(`Conflicting authoritative ${axis} boundary at index ${index}.`);
    }
    boundaries.set(index, value);
  };
  for (const rect of authoritativeRects) {
    const row = rect.sourceRow as number;
    const col = rect.sourceCol as number;
    const rowSpan = rect.sourceRowSpan ?? 1;
    const colSpan = rect.sourceColSpan ?? 1;
    if (
      !Number.isFinite(rect.x) || !Number.isFinite(rect.y) ||
      !Number.isFinite(rect.width) || !Number.isFinite(rect.height) ||
      rect.width <= 0 || rect.height <= 0
    ) {
      throw new DraftingGridConversionError(`Source cell ${rect.sourceCellId} has invalid millimetre bounds.`);
    }
    if (!Number.isSafeInteger(rowSpan) || !Number.isSafeInteger(colSpan) || row < 0 || col < 0 || rowSpan < 1 || colSpan < 1 || row + rowSpan > template.rows || col + colSpan > template.cols) {
      throw new DraftingGridConversionError(`Source cell ${rect.sourceCellId} exceeds template bounds.`);
    }
    if (sourceCellIds.has(rect.sourceCellId as string)) {
      throw new DraftingGridConversionError(`Source cell ID ${rect.sourceCellId} is duplicated.`);
    }
    sourceCellIds.add(rect.sourceCellId as string);
    for (let occupiedRow = row; occupiedRow < row + rowSpan; occupiedRow += 1) {
      for (let occupiedCol = col; occupiedCol < col + colSpan; occupiedCol += 1) {
        const slot = `${occupiedRow}:${occupiedCol}`;
        if (occupiedSlots.has(slot)) {
          throw new DraftingGridConversionError(`Authoritative source cells overlap at ${slot}.`);
        }
        occupiedSlots.add(slot);
      }
    }
    setBoundary(columnBoundaries, col, rect.x, 'column');
    setBoundary(columnBoundaries, col + colSpan, rect.x + rect.width, 'column');
    setBoundary(rowBoundaries, row, rect.y, 'row');
    setBoundary(rowBoundaries, row + rowSpan, rect.y + rect.height, 'row');
    cells.push({
      id: rect.sourceCellId as string,
      row,
      col,
      ...(rowSpan > 1 ? { rowSpan } : {}),
      ...(colSpan > 1 ? { colSpan } : {}),
      type: rect.sourceCellType as GridCell['type'],
      ...(rect.sourceOpeningDirection ? { openingDirection: rect.sourceOpeningDirection } : {}),
    });
  }
  if (occupiedSlots.size !== template.rows * template.cols) {
    throw new DraftingGridConversionError('Authoritative source cells do not cover every template slot.');
  }
  const toSegments = (boundaries: Map<number, number>, count: number, axis: string): number[] => {
    const values = Array.from({ length: count + 1 }, (_, index) => boundaries.get(index));
    if (values.some((value) => value === undefined || !Number.isFinite(value))) {
      throw new DraftingGridConversionError(`Authoritative ${axis} boundaries are incomplete.`);
    }
    return values.slice(0, -1).map((value, index) => {
      const length = (values[index + 1] as number) - (value as number);
      if (length <= 0) throw new DraftingGridConversionError(`Authoritative ${axis} boundaries are not increasing.`);
      return length;
    });
  };
  const colWidths = toSegments(columnBoundaries, template.cols, 'column');
  const rowHeights = toSegments(rowBoundaries, template.rows, 'row');
  cells.sort((left, right) => left.row - right.row || left.col - right.col || left.id.localeCompare(right.id));
  return {
    rows: template.rows,
    cols: template.cols,
    cells,
    colWidths,
    rowHeights,
  };
}

function normalizeRatios(ratios: number[] | undefined, count: number): number[] {
  if (!ratios || ratios.length !== count) {
    return Array.from({ length: count }, () => 1 / Math.max(count, 1));
  }

  const normalized = ratios.map(value => (typeof value === 'number' && isFinite(value) && value > 0 ? value : 0));
  const sum = normalized.reduce((total, value) => total + value, 0);

  if (sum <= 0) {
    return Array.from({ length: count }, () => 1 / Math.max(count, 1));
  }

  return normalized.map(value => value / sum);
}

/**
 * Map drafting cell type to WindowGrid cell type
 */
function mapDraftingTypeToGridType(
  draftingType?: string
): 'fixed' | 'sash' | 'panel' | 'empty' | 'sliding' {
  switch (draftingType) {
    case 'casement':
    case 'tilt-turn':
    case 'pivot':
      return 'sash';
    case 'sliding':
      return 'sliding';
    case 'panel':
      return 'panel';
    case 'fixed':
    default:
      return 'fixed';
  }
}

