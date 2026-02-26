import { describe, expect, it } from 'vitest';
import {
  inferPreferredPatternTypeFromGrid,
  patternToWindowGrid,
  suggestBestPatternForContext,
  type EgyptianPattern,
} from './presetUtils';

describe('presetUtils deterministic suggestion', () => {
  it('infers preferred pattern type from dominant grid cell type', () => {
    const preferred = inferPreferredPatternTypeFromGrid({
      rows: 1,
      cols: 3,
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'sliding' },
        { id: '0-1', row: 0, col: 1, type: 'sliding' },
        { id: '0-2', row: 0, col: 2, type: 'fixed' },
      ],
    });

    expect(preferred).toBe('sliding');
  });

  it('suggests sliding-3s-center-fixed for matching 1x3 sliding/fixed layout', () => {
    const suggestion = suggestBestPatternForContext({
      overallWidth: 2800,
      overallHeight: 1800,
      systemPackId: 'rock60',
      preferredType: 'sliding',
      existingGrid: {
        rows: 1,
        cols: 3,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sliding' },
          { id: '0-1', row: 0, col: 1, type: 'fixed' },
          { id: '0-2', row: 0, col: 2, type: 'sliding' },
        ],
        colWidths: [1, 1.2, 1],
      },
    });

    expect(suggestion).not.toBeNull();
    expect(suggestion?.pattern.id).toBe('sliding-3s-center-fixed');
  });

  it('filters by compatible systems for door context', () => {
    const suggestion = suggestBestPatternForContext({
      overallWidth: 2400,
      overallHeight: 2200,
      systemPackId: 'ps-9600',
      preferredType: 'door',
    });

    expect(suggestion).not.toBeNull();
    expect(suggestion?.pattern.compatibleSystems).toContain('ps-9600');
    expect(suggestion?.pattern.type).toBe('door');
  });

  it('preserves rowSpan and colSpan when converting pattern to grid', () => {
    const pattern: EgyptianPattern = {
      id: 'test-span-pattern',
      name: 'Test Pattern',
      type: 'mixed',
      layout: 'spanned',
      typicalWidthMm: [1200, 2000],
      typicalHeightMm: [1200, 2200],
      compatibleSystems: ['rock60'],
      gridSpec: {
        rows: 2,
        cols: 2,
        cells: [
          { row: 0, col: 0, type: 'fixed', colSpan: 2 },
          { row: 1, col: 0, type: 'sash' },
          { row: 1, col: 1, type: 'sash' },
        ],
      },
    };

    const grid = patternToWindowGrid(pattern);
    expect(grid.cells[0].colSpan).toBe(2);
    expect(grid.cells[0].rowSpan).toBeUndefined();
  });
});
