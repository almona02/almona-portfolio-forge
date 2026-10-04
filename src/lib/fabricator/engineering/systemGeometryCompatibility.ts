/**
 * FP-028 / Phase 5 / P5.2 — System ↔ geometry compatibility.
 *
 * Selecting a system never silently replaces saved geometry.
 * When the current grid is incompatible with the pack, callers must
 * present an explicit conversion proposal and wait for confirmation.
 */

import type { SystemPack, WindowGrid } from '@/types/fabricator';

export type GeometryActionKind = 'system_conversion' | 'layout_suggestion';

export interface PendingGeometryAction {
  readonly kind: GeometryActionKind;
  readonly systemPackId: string | null;
  readonly proposedGrid: WindowGrid;
  readonly reasons: readonly string[];
  readonly message: string;
  /** False when incompatible but no authoritative replacement grid exists. */
  readonly canApply: boolean;
}

export interface SystemGeometryCompatibility {
  readonly compatible: boolean;
  readonly reasons: readonly string[];
  readonly proposedGrid: WindowGrid | null;
}

function cellTypeSignature(grid: WindowGrid): string {
  return [...grid.cells]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .map((c) => `${c.row},${c.col}:${c.type}`)
    .join('|');
}

function readConstraints(pack: SystemPack): {
  minWidthMm?: number;
  maxWidthMm?: number;
  minHeightMm?: number;
  maxHeightMm?: number;
} {
  const raw = (pack.windowSystemSpec as { constraints?: Record<string, unknown> } | undefined)
    ?.constraints;
  if (!raw || typeof raw !== 'object') return {};
  const num = (key: string): number | undefined => {
    const value = raw[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  };
  return {
    minWidthMm: num('minWidthMm'),
    maxWidthMm: num('maxWidthMm'),
    minHeightMm: num('minHeightMm'),
    maxHeightMm: num('maxHeightMm'),
  };
}

/** Equal-split millimetre widths/heights that close exactly on overall size. */
export function equalSplitDimensions(
  rows: number,
  cols: number,
  overallWidthMm: number,
  overallHeightMm: number
): { colWidths: number[]; rowHeights: number[] } {
  const safeCols = Math.max(1, cols);
  const safeRows = Math.max(1, rows);
  const baseCol = Math.floor((overallWidthMm / safeCols) * 1000) / 1000;
  const colWidths = Array.from({ length: safeCols }, (_, index) =>
    index === safeCols - 1
      ? Number((overallWidthMm - baseCol * (safeCols - 1)).toFixed(3))
      : baseCol
  );
  const baseRow = Math.floor((overallHeightMm / safeRows) * 1000) / 1000;
  const rowHeights = Array.from({ length: safeRows }, (_, index) =>
    index === safeRows - 1
      ? Number((overallHeightMm - baseRow * (safeRows - 1)).toFixed(3))
      : baseRow
  );
  return { colWidths, rowHeights };
}

/**
 * Build a proposed conversion grid from pack.defaultGrid, preserving overall mm.
 * Returns null when the pack has no default grid (cannot invent geometry).
 */
export function buildProposedConversionGrid(
  pack: SystemPack,
  overallWidthMm: number,
  overallHeightMm: number
): WindowGrid | null {
  const seed = pack.defaultGrid;
  if (!seed || !seed.rows || !seed.cols || !seed.cells?.length) {
    return null;
  }
  const { colWidths, rowHeights } = equalSplitDimensions(
    seed.rows,
    seed.cols,
    overallWidthMm,
    overallHeightMm
  );
  return {
    rows: seed.rows,
    cols: seed.cols,
    cells: seed.cells.map((cell) => ({ ...cell })),
    colWidths,
    rowHeights,
  };
}

/** Canonical AI/layout suggestion used by EngineeringBay (must not apply silently). */
export function buildSuggestedLayoutGrid(
  overallWidthMm: number,
  overallHeightMm: number
): WindowGrid {
  const { colWidths, rowHeights } = equalSplitDimensions(2, 2, overallWidthMm, overallHeightMm);
  return {
    rows: 2,
    cols: 2,
    cells: [
      { id: '0-0', row: 0, col: 0, type: 'fixed' },
      { id: '0-1', row: 0, col: 1, type: 'fixed' },
      { id: '1-0', row: 1, col: 0, type: 'sash' },
      { id: '1-1', row: 1, col: 1, type: 'sash' },
    ],
    colWidths,
    rowHeights,
  };
}

export function gridsStructurallyEqual(left: WindowGrid, right: WindowGrid): boolean {
  return (
    left.rows === right.rows &&
    left.cols === right.cols &&
    cellTypeSignature(left) === cellTypeSignature(right)
  );
}

/**
 * Assess whether current geometry may stay under the selected pack without conversion.
 */
export function assessSystemGeometryCompatibility(
  grid: WindowGrid,
  overallWidthMm: number,
  overallHeightMm: number,
  pack: SystemPack
): SystemGeometryCompatibility {
  const reasons: string[] = [];
  const constraints = readConstraints(pack);

  if (constraints.minWidthMm != null && overallWidthMm < constraints.minWidthMm) {
    reasons.push(
      `overall width ${overallWidthMm} mm is below pack minimum ${constraints.minWidthMm} mm`
    );
  }
  if (constraints.maxWidthMm != null && overallWidthMm > constraints.maxWidthMm) {
    reasons.push(
      `overall width ${overallWidthMm} mm exceeds pack maximum ${constraints.maxWidthMm} mm`
    );
  }
  if (constraints.minHeightMm != null && overallHeightMm < constraints.minHeightMm) {
    reasons.push(
      `overall height ${overallHeightMm} mm is below pack minimum ${constraints.minHeightMm} mm`
    );
  }
  if (constraints.maxHeightMm != null && overallHeightMm > constraints.maxHeightMm) {
    reasons.push(
      `overall height ${overallHeightMm} mm exceeds pack maximum ${constraints.maxHeightMm} mm`
    );
  }

  const proposedGrid = buildProposedConversionGrid(pack, overallWidthMm, overallHeightMm);
  if (proposedGrid && !gridsStructurallyEqual(grid, proposedGrid)) {
    reasons.push(
      `saved grid ${grid.rows}×${grid.cols} (${cellTypeSignature(grid)}) differs from pack default ${proposedGrid.rows}×${proposedGrid.cols} (${cellTypeSignature(proposedGrid)})`
    );
  }

  return {
    compatible: reasons.length === 0,
    reasons,
    proposedGrid,
  };
}

export function createSystemConversionAction(
  pack: SystemPack,
  grid: WindowGrid,
  overallWidthMm: number,
  overallHeightMm: number
): PendingGeometryAction | null {
  const assessment = assessSystemGeometryCompatibility(
    grid,
    overallWidthMm,
    overallHeightMm,
    pack
  );
  if (assessment.compatible) return null;
  if (!assessment.proposedGrid) {
    return {
      kind: 'system_conversion',
      systemPackId: pack.meta.id,
      proposedGrid: grid,
      reasons: assessment.reasons,
      canApply: false,
      message:
        `System ${pack.meta.id} is incompatible with the saved geometry ` +
        `(${assessment.reasons.join('; ')}). No pack default grid is available — geometry was not changed.`,
    };
  }
  return {
    kind: 'system_conversion',
    systemPackId: pack.meta.id,
    proposedGrid: assessment.proposedGrid,
    reasons: assessment.reasons,
    canApply: true,
    message:
      `System ${pack.meta.id} requires explicit geometry conversion. ` +
      `Saved geometry was preserved. Confirm to apply the pack default layout, or keep the current grid.`,
  };
}

export function createLayoutSuggestionAction(
  currentGrid: WindowGrid,
  overallWidthMm: number,
  overallHeightMm: number,
  systemPackId: string | null
): PendingGeometryAction | null {
  const proposedGrid = buildSuggestedLayoutGrid(overallWidthMm, overallHeightMm);
  if (gridsStructurallyEqual(currentGrid, proposedGrid)) {
    return null;
  }
  return {
    kind: 'layout_suggestion',
    systemPackId,
    proposedGrid,
    reasons: ['layout suggestion would replace the current saved grid'],
    canApply: true,
    message:
      'Layout suggestion requires confirmation. Current geometry was not changed.',
  };
}
