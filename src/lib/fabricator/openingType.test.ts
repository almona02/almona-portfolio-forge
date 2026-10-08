import { describe, expect, it } from 'vitest';
import { normalizeOpeningType, shouldPersistMeasuringGrid } from './openingType';
import type { WindowGrid } from '@/types/fabricator';

describe('normalizeOpeningType', () => {
  it('maps sliding_window and sliding strings', () => {
    expect(normalizeOpeningType('sliding_window')).toBe('sliding');
    expect(normalizeOpeningType('Sliding Door')).toBe('sliding');
  });

  it('does not force casement for generic window when grid implies sliding', () => {
    const grid: WindowGrid = {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' },
        { id: '0-1', row: 0, col: 1, type: 'sash' },
      ],
    };
    expect(normalizeOpeningType('window', grid)).toBe('sliding');
    expect(normalizeOpeningType(undefined, grid)).toBe('sliding');
  });

  it('infers fixed from all-fixed cells', () => {
    const grid: WindowGrid = {
      rows: 1,
      cols: 1,
      cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }],
    };
    expect(normalizeOpeningType('window', grid)).toBe('fixed');
  });
});

describe('shouldPersistMeasuringGrid', () => {
  it('persists multi-cell predicted grids even when grid mode is off', () => {
    const grid: WindowGrid = {
      rows: 1,
      cols: 2,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sash' },
        { id: '0-1', row: 0, col: 1, type: 'sash' },
      ],
    };
    expect(shouldPersistMeasuringGrid(false, grid)).toBe(true);
    expect(shouldPersistMeasuringGrid(true, grid)).toBe(true);
  });

  it('does not persist empty 1x1 when mode is off', () => {
    const grid: WindowGrid = {
      rows: 1,
      cols: 1,
      cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }],
    };
    expect(shouldPersistMeasuringGrid(false, grid)).toBe(false);
  });
});
