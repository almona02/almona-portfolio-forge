/**
 * Explicit opening-type mutation for SmartDraw (not selection).
 * Ordinary click must not call this — use Alt+click or inspector apply.
 */

import type { GridCell } from '@/types/fabricator';

const OPENING_CYCLE = ['fixed', 'sash-left', 'sash-right', 'sliding', 'panel', 'empty'] as const;

export function cycleCellOpeningType(cell: GridCell): GridCell {
  const currentKey =
    cell.type === 'sash' && cell.openingDirection === 'right'
      ? 'sash-right'
      : cell.type === 'sash'
        ? 'sash-left'
        : (cell.type as (typeof OPENING_CYCLE)[number]);
  const currentIndex = OPENING_CYCLE.indexOf(currentKey as (typeof OPENING_CYCLE)[number]);
  const nextKey = OPENING_CYCLE[(currentIndex === -1 ? 0 : currentIndex + 1) % OPENING_CYCLE.length];

  if (nextKey === 'sash-left') {
    return { ...cell, type: 'sash', openingDirection: 'left' };
  }
  if (nextKey === 'sash-right') {
    return { ...cell, type: 'sash', openingDirection: 'right' };
  }
  const validType =
    nextKey === 'fixed' || nextKey === 'sliding' || nextKey === 'panel' || nextKey === 'empty'
      ? nextKey
      : 'fixed';
  return { ...cell, type: validType, openingDirection: undefined };
}

export function cycleGridCellOpening(
  cells: readonly GridCell[],
  cellId: string,
): GridCell[] {
  return cells.map((cell) => (cell.id === cellId ? cycleCellOpeningType(cell) : cell));
}
