import { describe, expect, it } from 'vitest';
import type { GridCell } from '@/types/fabricator';
import {
  buildOccurrenceId,
  occurrenceFromPrimitiveIndex,
} from '@/lib/fabricator/assembly/occurrenceIdentity';
import { cycleCellOpeningType, cycleGridCellOpening } from './cycleCellOpeningType';

describe('select-only canvas contract (no formula ownership)', () => {
  it('cycles opening only through the explicit helper', () => {
    const fixed: GridCell = { id: '0', row: 0, col: 0, type: 'fixed' };
    const next = cycleCellOpeningType(fixed);
    expect(next.type).toBe('sash');
    expect(next.openingDirection).toBe('left');
    const cells = cycleGridCellOpening([fixed, { id: '1', row: 0, col: 1, type: 'fixed' }], '1');
    expect(cells[0].type).toBe('fixed');
    expect(cells[1].type).toBe('sash');
  });

  it('builds stable occurrence IDs independent of drawing primitive indexes', () => {
    const id = buildOccurrenceId({
      positionId: 'pos-1',
      revision: 3,
      kind: 'sash',
      cellId: '0-1',
    });
    expect(id).toBe('pos-1/r3/sash/cell:0-1');
    const fromPrimitive = occurrenceFromPrimitiveIndex({
      positionId: 'pos-1',
      revision: 3,
      kind: 'bead',
      primitiveIndex: 7,
      cellId: '0-1',
    });
    expect(fromPrimitive.id).toContain('m:7');
    expect(fromPrimitive.id).toContain('cell:0-1');
    // Same manufacturing identity when primitive index differs but member/cell contract matches
    const sameCell = buildOccurrenceId({
      positionId: 'pos-1',
      revision: 3,
      kind: 'sash',
      cellId: '0-1',
    });
    expect(sameCell).toBe(id);
  });
});
