import { describe, expect, it } from 'vitest';
import { normalizeOpeningType } from './openingType';
import type { WindowGrid } from '@/types/fabricator';

describe('normalizeOpeningType', () => {
  it('reads sliding from type strings', () => {
    expect(normalizeOpeningType('sliding_window')).toBe('sliding');
    expect(normalizeOpeningType('Sliding Door')).toBe('sliding');
    expect(normalizeOpeningType('sliding_window_2sash')).toBe('sliding');
  });

  it('requires explicit sliding cell type — two sash cells are not enough', () => {
    const grid = {
      cols: 2,
      rows: 1,
      cells: [
        { id: 'a', type: 'sash', colSpan: 1, rowSpan: 1 },
        { id: 'b', type: 'sash', colSpan: 1, rowSpan: 1 },
      ],
    } as WindowGrid;
    expect(normalizeOpeningType('window', grid)).toBe('casement');
    expect(normalizeOpeningType(undefined, grid)).toBe('casement');
  });

  it('infers sliding when a cell is explicitly sliding', () => {
    const grid = {
      cols: 2,
      rows: 1,
      cells: [
        { id: 'a', type: 'sliding', colSpan: 1, rowSpan: 1 },
        { id: 'b', type: 'sliding', colSpan: 1, rowSpan: 1 },
      ],
    } as WindowGrid;
    expect(normalizeOpeningType('window', grid)).toBe('sliding');
  });

  it('infers fixed when every cell is fixed', () => {
    const grid = {
      cols: 1,
      rows: 1,
      cells: [{ id: 'a', type: 'fixed', colSpan: 1, rowSpan: 1 }],
    } as WindowGrid;
    expect(normalizeOpeningType('window', grid)).toBe('fixed');
  });
});
