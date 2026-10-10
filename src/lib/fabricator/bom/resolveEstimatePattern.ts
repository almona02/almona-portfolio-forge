import { EGYPTIAN_PATTERNS, type EgyptianPattern } from '@/data/egyptian-window-patterns';
import { normalizeOpeningType } from '@/lib/fabricator/openingType';
import { leafOpeningOp, type LeafOpeningOp } from '@/lib/fabricator/bom/leafOpening';
import type { WindowUnit } from '@/types/fabricator';

type GridCell = NonNullable<WindowUnit['grid']>['cells'][number];

function isOperativeCell(cell: GridCell): boolean {
  const op = leafOpeningOp(cell);
  return op === 'side-hung' || op === 'top-hung' || op === 'tilt-turn' || op === 'sliding';
}

function isFixedCell(cell: GridCell): boolean {
  return leafOpeningOp(cell) === 'fixed';
}

function assertCompleteRectangularGrid(position: WindowUnit): NonNullable<WindowUnit['grid']> {
  const grid = position.grid;
  if (!grid) throw new Error('Save a design grid or select a preset before calculating BOM.');
  if (!Number.isSafeInteger(grid.rows) || !Number.isSafeInteger(grid.cols) ||
      grid.rows < 1 || grid.cols < 1 || grid.cells.length !== grid.rows * grid.cols ||
      grid.manualMullions?.length) {
    throw new Error('Manual estimate requires a complete rectangular grid without extra drawn dividers.');
  }
  for (const [values, count] of [[grid.colWidths, grid.cols], [grid.rowHeights, grid.rows]] as const) {
    if (values && (values.length !== count || values.some(value => !Number.isFinite(value) || value <= 0))) {
      throw new Error('Saved grid proportions must be positive and match its dimensions.');
    }
  }
  return grid;
}

function assertUniqueInBoundsCells(grid: NonNullable<WindowUnit['grid']>): void {
  const coordinates = new Set<string>();
  for (const cell of grid.cells) {
    if ((cell.rowSpan ?? 1) !== 1 || (cell.colSpan ?? 1) !== 1 ||
        !Number.isSafeInteger(cell.row) || !Number.isSafeInteger(cell.col) ||
        cell.row < 0 || cell.row >= grid.rows || cell.col < 0 || cell.col >= grid.cols) {
      throw new Error('Manual estimate currently requires unmerged cells; select a supported preset for other openings.');
    }
    const key = `${cell.row}:${cell.col}`;
    if (coordinates.has(key)) throw new Error('Saved grid contains duplicate cells.');
    coordinates.add(key);
  }
}

function assertSupportedLeafOps(cells: readonly GridCell[]): void {
  for (const cell of cells) {
    const op = leafOpeningOp(cell);
    if (op === 'unsupported') {
      throw new Error(`Manual estimate does not support cell type "${cell.type}"; select a supported preset.`);
    }
  }
}

function dominantOperativeMechanism(
  cells: readonly GridCell[],
  opening: ReturnType<typeof normalizeOpeningType>,
): EgyptianPattern['openingMechanism'] {
  if (opening === 'tilt-turn') return { type: 'tilt-turn' };
  if (opening === 'sliding') return { type: 'sliding' };
  const ops = new Set<LeafOpeningOp>(cells.map(leafOpeningOp));
  if (ops.has('tilt-turn')) return { type: 'tilt-turn' };
  if (ops.has('sliding') && !ops.has('side-hung') && !ops.has('top-hung')) {
    return { type: 'sliding' };
  }
  return { type: 'casement' };
}

function withStructuralDividers(
  grid: NonNullable<WindowUnit['grid']>,
): Pick<EgyptianPattern, 'mullions' | 'transoms'> {
  return {
    mullions: Array.from({ length: grid.cols - 1 }, (_, position) => ({
      position,
      type: 'standard' as const,
    })),
    transoms: Array.from({ length: grid.rows - 1 }, (_, position) => ({
      position,
      type: 'standard' as const,
    })),
  };
}

/** Resolve saved geometry for estimates; this supplies no manufacturing authority. */
export function resolveEstimatePattern(position: WindowUnit): EgyptianPattern {
  if (position.presetId) {
    const preset = EGYPTIAN_PATTERNS.find(p => p.id === position.presetId);
    if (!preset) throw new Error(`Unknown saved preset: ${position.presetId}`);
    const grid = position.grid;
    if (!grid || grid.rows !== preset.gridSpec.rows || grid.cols !== preset.gridSpec.cols ||
        grid.cells.length !== preset.gridSpec.cells.length ||
        preset.gridSpec.cells.some(expected => !grid.cells.some(cell =>
          cell.row === expected.row && cell.col === expected.col && cell.type === expected.type &&
          (cell.rowSpan ?? 1) === (expected.rowSpan ?? 1) &&
          (cell.colSpan ?? 1) === (expected.colSpan ?? 1) &&
          cell.openingDirection === expected.openingDirection))) {
      throw new Error('Saved grid does not match its preset. Save the intended design before calculating BOM.');
    }
    return preset;
  }

  const grid = assertCompleteRectangularGrid(position);
  assertUniqueInBoundsCells(grid);
  assertSupportedLeafOps(grid.cells);

  const allFixed = grid.cells.every(isFixedCell);
  const allOperative = grid.cells.every(isOperativeCell);
  const opening = normalizeOpeningType(position.type, position.grid);
  const hasSlidingLeaf = grid.cells.some((cell) => leafOpeningOp(cell) === 'sliding');
  const isSlidingRecipe = opening === 'sliding' || (allOperative && hasSlidingLeaf && !grid.cells.some((c) => {
    const op = leafOpeningOp(c);
    return op === 'side-hung' || op === 'top-hung' || op === 'tilt-turn';
  }));

  // Sliding: interlock/track owned by ProfileBOMCalculator — no synthetic mullion rows.
  if (isSlidingRecipe) {
    if (!allOperative) {
      throw new Error(
        'Manual sliding estimate requires every cell to be an operable sash/sliding cell; select a supported preset for mixed openings.',
      );
    }
    return {
      id: `manual-sliding:${position.id}`,
      name: 'Saved manual sliding grid (estimate)',
      type: 'sliding',
      layout: `${grid.cols} × ${grid.rows} sliding sash cells`,
      typicalWidthMm: [position.overallWidth, position.overallWidth],
      typicalHeightMm: [position.overallHeight, position.overallHeight],
      compatibleSystems: [],
      gridSpec: { ...grid, cells: grid.cells.map(cell => ({ ...cell })) },
      mullions: [],
      transoms: [],
      openingMechanism: { type: 'sliding' },
    };
  }

  if (allFixed) {
    return {
      id: `manual-fixed:${position.id}`,
      name: 'Saved manual fixed grid (estimate)',
      type: 'fixed',
      layout: `${grid.cols} × ${grid.rows} fixed cells`,
      typicalWidthMm: [position.overallWidth, position.overallWidth],
      typicalHeightMm: [position.overallHeight, position.overallHeight],
      compatibleSystems: [],
      gridSpec: { ...grid, cells: grid.cells.map(cell => ({ ...cell })) },
      ...withStructuralDividers(grid),
      openingMechanism: { type: 'fixed' },
    };
  }

  // Casement / tilt-turn / mixed fixed+openable: structural mullions, per-leaf ops in gridSpec.
  const mechanism = dominantOperativeMechanism(grid.cells, opening);
  const patternType: EgyptianPattern['type'] =
    mechanism?.type === 'tilt-turn' ? 'tilt_turn' : 'casement';
  return {
    id: `manual-${patternType}:${position.id}`,
    name: `Saved manual ${patternType} grid (estimate)`,
    type: patternType,
    layout: `${grid.cols} × ${grid.rows} cells (${allOperative ? 'all operative' : 'mixed fixed/openable'})`,
    typicalWidthMm: [position.overallWidth, position.overallWidth],
    typicalHeightMm: [position.overallHeight, position.overallHeight],
    compatibleSystems: [],
    gridSpec: { ...grid, cells: grid.cells.map(cell => ({ ...cell })) },
    ...withStructuralDividers(grid),
    openingMechanism: mechanism,
  };
}
