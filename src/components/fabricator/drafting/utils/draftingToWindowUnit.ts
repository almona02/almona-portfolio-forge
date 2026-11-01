/**
 * draftingToWindowUnit - Convert drafting state to WindowUnit for 3D preview.
 *
 * Builds from the first material-aware window (defined frame) with optional grid and
 * per-cell glazing. When the saved (authoritative) position is supplied, its identity,
 * finish, system pack and saved component ledger are carried into the preview unit so
 * the 3D view can name exact parts. The preview unit is a *read model*: nothing here
 * writes back to the design, BOM or stock (AICS-001 Tier 0 drafting purity).
 */

import { normalizeOpeningType } from '@/lib/fabricator/openingType';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import type { MaterialAwareRectangle } from '../types/materialAware';

export interface DraftingStateSnapshot {
  getGeometry: () => { rectangles: unknown[] };
  getMaterialAwareWindows: () => MaterialAwareRectangle[];
  getMaterialWindowGrids: () => Record<string, WindowGrid>;
  getMaterialWindowGlazing?: () => Record<string, Record<string, { type: 'single' | 'double'; color?: string; georgianBars?: boolean }>>;
}

/** Why the saved component ledger was or was not carried into the preview. */
export type PreviewLedgerBinding =
  | 'bound'            // saved components carried; grid + dimensions still match the saved revision
  | 'design_edited'    // drafting no longer matches the saved revision; ledger withheld
  | 'no_saved_ledger'  // saved position has no components (never generated / legacy)
  | 'no_authority';    // no saved position supplied (free drafting)

export interface PreviewWindowUnit extends WindowUnit {
  /** Preview-only provenance; never persisted. */
  previewLedgerBinding: PreviewLedgerBinding;
}

/**
 * Normalize grid so rows/cols match cell count and colWidths/rowHeights are valid proportions.
 * Prevents corrupted 3D when e.g. 2 sashes are added (grid must match cells).
 */
function normalizeGrid(grid: WindowGrid): WindowGrid {
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

/** Structural signature used to decide whether saved components still describe this grid. */
export function gridLedgerSignature(grid: WindowGrid | undefined, width: number, height: number): string {
  if (!grid) return `none|${width}|${height}`;
  const cells = [...(grid.cells ?? [])]
    .map((cell) => `${cell.id}:${cell.row}:${cell.col}:${cell.rowSpan ?? 1}:${cell.colSpan ?? 1}:${cell.type}`)
    .sort();
  const weights = (values: number[] | undefined, count: number) =>
    values?.length === count ? values.map((v) => Number(v.toFixed(6))).join(',') : 'equal';
  return [
    grid.rows,
    grid.cols,
    weights(grid.colWidths, grid.cols),
    weights(grid.rowHeights, grid.rows),
    cells.join(';'),
    width,
    height,
  ].join('|');
}

function hasValidAuthority(unit: WindowUnit | null | undefined): unit is WindowUnit {
  return Boolean(
    unit &&
    Number.isFinite(unit.overallWidth) && unit.overallWidth > 0 &&
    Number.isFinite(unit.overallHeight) && unit.overallHeight > 0,
  );
}

function bindAuthority(
  unit: WindowUnit,
  authoritative: WindowUnit | null | undefined,
  structuralMatch: boolean,
): PreviewWindowUnit {
  if (!authoritative) {
    return { ...unit, previewLedgerBinding: 'no_authority' };
  }
  const savedComponents = authoritative.components ?? [];
  const binding: PreviewLedgerBinding = savedComponents.length === 0
    ? 'no_saved_ledger'
    : structuralMatch ? 'bound' : 'design_edited';
  return {
    ...unit,
    // Identity and finish come from the saved position so the preview matches the
    // constitutional top bar; geometry stays whatever the drafting currently shows.
    id: authoritative.id ?? unit.id,
    projectId: authoritative.projectId,
    orderNumber: authoritative.orderNumber || unit.orderNumber,
    posNumber: authoritative.posNumber || unit.posNumber,
    revision: authoritative.revision,
    color: authoritative.color || unit.color,
    systemPackId: unit.systemPackId ?? authoritative.systemPackId,
    systemProfileSelections: authoritative.systemProfileSelections,
    hardware: Array.isArray(authoritative.hardware) ? authoritative.hardware : unit.hardware,
    glazing: Object.keys(unit.glazing ?? {}).length > 0 ? unit.glazing : (authoritative.glazing ?? {}),
    presetId: authoritative.presetId,
    components: binding === 'bound' ? savedComponents : [],
    previewLedgerBinding: binding,
  };
}

/**
 * Build a WindowUnit from the drafting state for Window3DGenerator.
 *
 * Priority:
 * 1. Defined material-aware frame in the drafting (operator drew/defined it).
 * 2. Saved authoritative position with a grid (hydrated pose that has not been
 *    re-defined as a frame yet) — this is the reload path for saved poses.
 * 3. null → caller falls back to the plain rectangle preview.
 */
export function draftingToWindowUnit(
  drafting: DraftingStateSnapshot,
  authoritative?: WindowUnit | null,
): PreviewWindowUnit | null {
  const materialAware = drafting.getMaterialAwareWindows?.() ?? [];
  const grids = drafting.getMaterialWindowGrids?.() ?? {};
  const glazingByFrame = drafting.getMaterialWindowGlazing?.() ?? {};
  const authority = hasValidAuthority(authoritative) ? authoritative : null;
  const now = new Date();

  if (materialAware.length === 0) {
    if (!authority) return null;
    // Authoritative hydration keeps the saved grid under the position id.
    const rawGrid = grids[authority.id] ?? authority.grid;
    if (!rawGrid?.cells?.length) return null;
    const grid = normalizeGrid(rawGrid);
    const structuralMatch =
      gridLedgerSignature(grid, authority.overallWidth, authority.overallHeight) ===
      gridLedgerSignature(authority.grid ? normalizeGrid(authority.grid) : undefined, authority.overallWidth, authority.overallHeight);
    const unit: WindowUnit = {
      id: authority.id,
      orderNumber: authority.orderNumber || '1',
      posNumber: authority.posNumber || '1',
      type: normalizeOpeningType(authority.type, grid),
      components: [],
      overallWidth: authority.overallWidth,
      overallHeight: authority.overallHeight,
      color: authority.color || '#ffffff',
      glazing: authority.glazing ?? {},
      hardware: [],
      status: 'design',
      optimization: null,
      createdAt: now,
      updatedAt: now,
      systemPackId: authority.systemPackId,
      grid,
    };
    return bindAuthority(unit, authority, structuralMatch);
  }

  const frame = materialAware[0];
  const rawGrid = frame.id ? grids[frame.id] : undefined;
  const glazingByCell = frame.id ? glazingByFrame[frame.id] : undefined;

  const overallWidth =
    typeof frame.width === 'number' && frame.width > 0 ? frame.width : 600;
  const overallHeight =
    typeof frame.height === 'number' && frame.height > 0 ? frame.height : 1200;
  const grid =
    rawGrid && rawGrid.cells?.length > 0 ? normalizeGrid(rawGrid) : rawGrid;

  const inferredType = normalizeOpeningType(
    (frame as { openingType?: string; windowType?: string }).openingType
      ?? (frame as { windowType?: string }).windowType
      ?? authority?.type
      ?? frame.systemPackId,
    grid,
  );
  const unit: WindowUnit = {
    id: frame.id ?? `draft-${now.getTime()}`,
    orderNumber: frame.id ?? '1',
    posNumber: '1',
    type: inferredType,
    components: [],
    overallWidth,
    overallHeight,
    color: '#ffffff',
    glazing: glazingByCell ?? {},
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: now,
    updatedAt: now,
    systemPackId: frame.systemPackId,
    grid,
  };
  const structuralMatch = Boolean(
    authority &&
    gridLedgerSignature(grid, overallWidth, overallHeight) ===
      gridLedgerSignature(authority.grid ? normalizeGrid(authority.grid) : undefined, authority.overallWidth, authority.overallHeight) &&
    (!frame.systemPackId || !authority.systemPackId || frame.systemPackId === authority.systemPackId),
  );
  return bindAuthority(unit, authority, structuralMatch);
}
