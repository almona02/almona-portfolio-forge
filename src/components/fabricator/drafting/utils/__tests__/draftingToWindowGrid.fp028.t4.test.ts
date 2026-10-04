/**
 * FP-028 / Phase 0 / T4
 *
 * Drafting → WindowGrid conversion uses display-pixel clustering and
 * rectangle array order instead of millimetre proportions / stable cell IDs.
 */
import { describe, expect, it } from 'vitest';
import type { EgyptianTemplate, Geometry2D } from '../../types/drafting';
import { convertDraftingToWindowGrid, DraftingGridConversionError } from '../draftingToWindowGrid';

const TEMPLATE_1X2: EgyptianTemplate = {
  id: 'fp028-t4-1x2',
  name: 'F1 1×2',
  rows: 1,
  cols: 2,
  cellTypes: [['sliding', 'sliding']],
  colWidthRatios: [0.5, 0.5],
  rowHeightRatios: [1],
  constraints: {
    minWidth: 600,
    maxWidth: 3000,
    minHeight: 600,
    maxHeight: 2600,
  },
};

const TEMPLATE_1X2_UNEQUAL: EgyptianTemplate = {
  ...TEMPLATE_1X2,
  id: 'fp028-t4-unequal',
  name: 'F2 unequal',
  cellTypes: [['casement', 'fixed']],
  colWidthRatios: [900 / 1500, 600 / 1500],
};

function emptyGeometry(rectangles: Geometry2D['rectangles']): Geometry2D {
  return {
    rectangles,
    points: [],
    lines: [],
    circles: [],
    arcs: [],
    polygons: [],
    splines: [],
  };
}

describe('FP-028 / T4 — drafting conversion pixels and array order', () => {
  it('blocks multi-rect geometry without authoritative source metadata', () => {
    // Two cells drawn at unequal display sizes that do NOT sum to opening 1210 mm
    const geometry = emptyGeometry([
      { id: 'L', x: 0, y: 0, width: 400, height: 500, type: 'sliding' },
      { id: 'R', x: 400, y: 0, width: 300, height: 500, type: 'sliding' },
    ]);

    expect(() => convertDraftingToWindowGrid(geometry, TEMPLATE_1X2)).toThrow(DraftingGridConversionError);
  });

  it('documents defect: 25px Y-threshold clusters vertically offset cells into one row', () => {
    const geometry = emptyGeometry([
      { id: 'A', x: 0, y: 0, width: 605, height: 1550, type: 'sliding' },
      // 20px vertical jitter — inside 25px threshold → same semantic row
      { id: 'B', x: 605, y: 20, width: 605, height: 1550, type: 'sliding' },
    ]);

    expect(() => convertDraftingToWindowGrid(geometry, TEMPLATE_1X2)).toThrow(DraftingGridConversionError);
  });

  it('documents defect: cell placement follows sorted array index, not source cell metadata', () => {
    // Rectangles intentionally listed right-then-left; after X-sort L→R becomes col 0,1
    // but if Y order / count mismatches template, index math invents placement
    const geometry = emptyGeometry([
      {
        id: 'right', x: 900, y: 0, width: 600, height: 1400, type: 'fixed',
        sourceCellId: 'cell-fixed', sourceCellType: 'fixed', sourceRow: 0, sourceCol: 1,
      },
      {
        id: 'left', x: 0, y: 0, width: 900, height: 1400, type: 'casement',
        sourceCellId: 'cell-casement', sourceCellType: 'sash', sourceOpeningDirection: 'right', sourceRow: 0, sourceCol: 0,
      },
    ]);

    const grid = convertDraftingToWindowGrid(geometry, TEMPLATE_1X2_UNEQUAL);
    expect(grid.cells.map((c) => c.id)).toEqual(['cell-casement', 'cell-fixed']);
    expect(grid.cells.map((c) => c.type)).toEqual(['sash', 'fixed']);
    expect(grid.colWidths).toEqual([900, 600]);
  });

  it('single overall rectangle expands via template ratios (mm-like when rect is mm)', () => {
    const geometry = emptyGeometry([
      { id: 'overall', x: 0, y: 0, width: 1210, height: 1550, type: 'sliding' },
    ]);
    const grid = convertDraftingToWindowGrid(geometry, TEMPLATE_1X2);
    expect(grid.colWidths).toEqual([605, 605]);
    expect(grid.rowHeights).toEqual([1550]);
    expect(grid.cells.map((c) => c.type)).toEqual(['sliding', 'sliding']);
  });

  /**
   * Phase 3 acceptance lock. Remove `.fails` when conversion is mm-authoritative
   * and preserves stable cell IDs / closed proportions for F1.
   */
  it('T4 acceptance: F1 multi-rect drafting closes to 1210×1550 mm with stable cell IDs', () => {
    const geometry = emptyGeometry([
      {
        id: 'draw-L',
        x: 0,
        y: 0,
        width: 605,
        height: 1550,
        type: 'sliding',
        sourceCellId: 'cell-slide-L',
        sourceCellType: 'sliding',
        sourceOpeningDirection: 'right',
        sourceRow: 0,
        sourceCol: 0,
      },
      {
        id: 'draw-R',
        x: 605,
        y: 0,
        width: 605,
        height: 1550,
        type: 'sliding',
        sourceCellId: 'cell-slide-R',
        sourceCellType: 'sliding',
        sourceOpeningDirection: 'left',
        sourceRow: 0,
        sourceCol: 1,
      },
    ]);

    const grid = convertDraftingToWindowGrid(geometry, TEMPLATE_1X2);
    expect(grid.colWidths!.reduce((a, b) => a + b, 0)).toBe(1210);
    expect(grid.rowHeights!.reduce((a, b) => a + b, 0)).toBe(1550);
    expect(grid.cells.map((c) => c.id)).toEqual(['cell-slide-L', 'cell-slide-R']);
    expect(grid.cells.map((c) => c.openingDirection)).toEqual(['right', 'left']);
  });

  it.each([
    ['duplicate ID', [
      { id: 'a', x: 0, y: 0, width: 605, height: 1550, sourceCellId: 'same', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 0 },
      { id: 'b', x: 605, y: 0, width: 605, height: 1550, sourceCellId: 'same', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 1 },
    ]],
    ['logical overlap', [
      { id: 'a', x: 0, y: 0, width: 1210, height: 1550, sourceCellId: 'span', sourceCellType: 'fixed', sourceRow: 0, sourceCol: 0, sourceColSpan: 2 },
      { id: 'b', x: 605, y: 0, width: 605, height: 1550, sourceCellId: 'right', sourceCellType: 'fixed', sourceRow: 0, sourceCol: 1 },
    ]],
    ['geometry gap', [
      { id: 'a', x: 0, y: 0, width: 605, height: 1550, sourceCellId: 'left', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 0 },
    ]],
    ['conflicting boundary', [
      { id: 'a', x: 0, y: 0, width: 600, height: 1550, sourceCellId: 'left', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 0 },
      { id: 'b', x: 605, y: 0, width: 605, height: 1550, sourceCellId: 'right', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 1 },
    ]],
    ['non-finite bounds', [
      { id: 'a', x: 0, y: 0, width: Number.NaN, height: 1550, sourceCellId: 'left', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 0 },
      { id: 'b', x: 605, y: 0, width: 605, height: 1550, sourceCellId: 'right', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 1 },
    ]],
  ] as const)('rejects %s in authoritative geometry', (_name, rectangles) => {
    expect(() => convertDraftingToWindowGrid(emptyGeometry([...rectangles]), TEMPLATE_1X2)).toThrow(
      DraftingGridConversionError
    );
  });

  it('preserves a spanning 2x2 grid with exact millimetre closure', () => {
    const template: EgyptianTemplate = {
      ...TEMPLATE_1X2,
      id: 'span-2x2',
      rows: 2,
      cols: 2,
      cellTypes: [['fixed', 'fixed'], ['sliding', 'sliding']],
      colWidthRatios: [2, 1],
      rowHeightRatios: [1, 3],
    };
    const geometry = emptyGeometry([
      {
        id: 'top', x: 0, y: 0, width: 1500, height: 350,
        sourceCellId: 'top-span', sourceCellType: 'fixed', sourceRow: 0, sourceCol: 0, sourceColSpan: 2,
      },
      {
        id: 'bottom-left', x: 0, y: 350, width: 1000, height: 1050,
        sourceCellId: 'bottom-left', sourceCellType: 'sliding', sourceOpeningDirection: 'right', sourceRow: 1, sourceCol: 0,
      },
      {
        id: 'bottom-right', x: 1000, y: 350, width: 500, height: 1050,
        sourceCellId: 'bottom-right', sourceCellType: 'sliding', sourceOpeningDirection: 'left', sourceRow: 1, sourceCol: 1,
      },
    ]);
    const grid = convertDraftingToWindowGrid(geometry, template);
    expect(grid.colWidths).toEqual([1000, 500]);
    expect(grid.rowHeights).toEqual([350, 1050]);
    expect(grid.cells[0]).toMatchObject({ id: 'top-span', colSpan: 2 });
  });

  it.each([
    [1210.5, 0.5],
    [1500.25, 0.6],
    [999.99, 1 / 3],
  ])('preserves decimal-mm closure for width %s at ratio %s', (totalWidth, leftRatio) => {
    const leftWidth = totalWidth * leftRatio;
    const rightWidth = totalWidth - leftWidth;
    const geometry = emptyGeometry([
      {
        id: 'left', x: 0, y: 0, width: leftWidth, height: 1400.25,
        sourceCellId: 'left', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 0,
      },
      {
        id: 'right', x: leftWidth, y: 0, width: rightWidth, height: 1400.25,
        sourceCellId: 'right', sourceCellType: 'sliding', sourceRow: 0, sourceCol: 1,
      },
    ]);
    const grid = convertDraftingToWindowGrid(geometry, TEMPLATE_1X2);
    expect(grid.colWidths?.reduce((sum, width) => sum + width, 0)).toBeCloseTo(totalWidth, 9);
    expect(grid.rowHeights?.[0]).toBeCloseTo(1400.25, 9);
  });
});
