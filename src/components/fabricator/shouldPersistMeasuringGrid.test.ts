import { describe, expect, it } from 'vitest';
import { shouldPersistMeasuringGrid } from './shouldPersistMeasuringGrid';

describe('shouldPersistMeasuringGrid', () => {
  it('persists when Multi-pane is on', () => {
    expect(shouldPersistMeasuringGrid(undefined, true)).toBe(true);
  });

  it('persists multi-cell grids when Multi-pane is off', () => {
    const grid = {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sliding' as const },
        { id: '0-1', row: 0, col: 1, type: 'sliding' as const },
      ],
    };
    expect(shouldPersistMeasuringGrid(grid, false)).toBe(true);
  });

  it('does not persist empty/single-cell when Multi-pane is off', () => {
    expect(shouldPersistMeasuringGrid(undefined, false)).toBe(false);
    expect(
      shouldPersistMeasuringGrid(
        { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] },
        false,
      ),
    ).toBe(false);
  });
});
