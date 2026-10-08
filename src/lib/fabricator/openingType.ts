/**
 * Normalize opening-type vocabulary across measuring, drafting, hardener, and BOM.
 * AICS-001: deterministic string/grid rules only — no ML.
 *
 * Multi-cell sash layouts are NOT treated as sliding unless the type string or
 * cell type explicitly says sliding (review: two sash cells ≠ sliding proof).
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

  const cells = grid?.cells ?? [];
  if (cells.length > 0) {
    const cellTypes = cells.map((c) => (c.type ?? '').toLowerCase());
    if (cellTypes.some((t) => t.includes('sliding') || t.includes('slide'))) {
      return 'sliding';
    }
    if (cellTypes.every((t) => t === 'fixed' || t === 'transom' || t === 'mullion')) {
      return 'fixed';
    }
    if (cellTypes.some((t) => t.includes('tilt'))) return 'tilt-turn';
    if (cellTypes.some((t) => t.includes('casement'))) return 'casement';
    // Bare "sash" cells stay casement unless the type string already said sliding.
    if (cellTypes.some((t) => t === 'sash' || t.includes('casement'))) return 'casement';
  }

  if (!typeLower || typeLower === 'window' || typeLower === 'generic') {
    return 'casement';
  }

  return 'casement';
}
