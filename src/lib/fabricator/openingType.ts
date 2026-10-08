/**
 * Normalize opening-type vocabulary across measuring, drafting, hardener, and BOM.
 * AICS-001: deterministic string/grid rules only — no ML.
 */

import type { WindowGrid } from '@/types/fabricator';

export type NormalizedOpeningType =
  | 'casement'
  | 'tilt-turn'
  | 'sliding'
  | 'fixed'
  | 'pivot';

/** Infer opening type from free-form window type strings (measuring / WindowUnit.type). */
export function normalizeOpeningType(
  raw: string | undefined | null,
  grid?: WindowGrid | null,
): NormalizedOpeningType {
  const typeLower = (raw ?? '').toLowerCase().trim();

  if (typeLower.includes('tilt') || typeLower.includes('turn')) return 'tilt-turn';
  if (typeLower.includes('sliding') || typeLower.includes('slide')) return 'sliding';
  if (typeLower.includes('fixed')) return 'fixed';
  if (typeLower.includes('pivot')) return 'pivot';
  if (typeLower.includes('casement')) return 'casement';

  // Generic "window" / empty — infer from grid cell types when present
  const cells = grid?.cells ?? [];
  if (cells.length > 0) {
    const cellTypes = cells.map((c) => (c.type ?? '').toLowerCase());
    if (cellTypes.some((t) => t.includes('sliding') || t.includes('slide'))) {
      return 'sliding';
    }
    // Multi-cell predicted layouts (Egyptian sliding) use sash cells in a row
    if ((grid?.cols ?? 1) >= 2 && cellTypes.some((t) => t === 'sash')) {
      return 'sliding';
    }
    if (cellTypes.every((t) => t === 'fixed' || t === 'transom' || t === 'mullion')) {
      return 'fixed';
    }
    if (cellTypes.some((t) => t.includes('tilt'))) return 'tilt-turn';
    if (cellTypes.some((t) => t.includes('casement') || t === 'sash')) return 'casement';
  }

  if (!typeLower || typeLower === 'window' || typeLower === 'generic') {
    return 'casement';
  }

  return 'casement';
}

/** True when a measuring grid should be persisted into Design even if grid-mode UI is off. */
export function shouldPersistMeasuringGrid(
  isGridMode: boolean,
  grid: WindowGrid | null | undefined,
): boolean {
  if (isGridMode && grid) return true;
  if (!grid) return false;
  const rows = Number(grid.rows) || 0;
  const cols = Number(grid.cols) || 0;
  const cells = grid.cells?.length ?? 0;
  return rows > 1 || cols > 1 || cells > 1;
}
