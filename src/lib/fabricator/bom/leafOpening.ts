/**
 * Per-leaf opening operation for estimate / hardware recipes (AICS-001).
 * Deterministic grid rules only — no ML.
 */

import type { GridCell } from '@/types/fabricator';

export type LeafOpeningOp =
  | 'fixed'
  | 'side-hung'
  | 'top-hung'
  | 'tilt-turn'
  | 'sliding'
  | 'empty'
  | 'panel'
  | 'unsupported';

export function leafOpeningOp(cell: Pick<GridCell, 'type' | 'openingDirection'>): LeafOpeningOp {
  const t = String(cell.type ?? '').toLowerCase();
  if (t === 'fixed' || t === 'transom' || t === 'mullion') return 'fixed';
  if (t === 'empty') return 'empty';
  if (t === 'panel') return 'panel';
  if (t.includes('sliding') || t.includes('slide')) return 'sliding';
  if (t.includes('tilt')) return 'tilt-turn';
  if (t === 'sash' || t.includes('casement')) {
    if (cell.openingDirection === 'top' || cell.openingDirection === 'bottom') return 'top-hung';
    return 'side-hung';
  }
  return 'unsupported';
}

export function isOperativeLeaf(op: LeafOpeningOp): boolean {
  return op === 'side-hung' || op === 'top-hung' || op === 'tilt-turn' || op === 'sliding';
}

export function countOperativeLeaves(cells: readonly Pick<GridCell, 'type' | 'openingDirection'>[]): number {
  return cells.filter((cell) => isOperativeLeaf(leafOpeningOp(cell))).length;
}
