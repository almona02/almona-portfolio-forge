import type { WindowGrid } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import {
  buildGridTrackMetrics,
  computeActiveDividerBoundaries,
  getCellBoundsFromTracks,
  getRenderableGridCells,
} from './gridGeometry';

describe('gridGeometry', () => {
  it('builds proportional tracks from col/row weights', () => {
    const grid: WindowGrid = {
      rows: 2,
      cols: 3,
      cells: [],
      colWidths: [1, 2, 1],
      rowHeights: [3, 1],
    };

    const tracks = buildGridTrackMetrics(grid, 4000, 2000);
    expect(tracks.colSizes).toEqual([1000, 2000, 1000]);
    expect(tracks.rowSizes).toEqual([1500, 500]);
    expect(tracks.colOffsets).toEqual([0, 1000, 3000]);
    expect(tracks.rowOffsets).toEqual([0, 1500]);
  });

  it('computes bounds with row/col spans', () => {
    const grid: WindowGrid = {
      rows: 2,
      cols: 3,
      cells: [
        { id: 'a', row: 0, col: 0, type: 'fixed', colSpan: 2 },
        { id: 'b', row: 1, col: 2, type: 'sash' },
      ],
      colWidths: [1, 2, 1],
      rowHeights: [1, 1],
    };

    const tracks = buildGridTrackMetrics(grid, 4000, 2000);
    const cell = getCellBoundsFromTracks(grid.cells[0], tracks, grid);
    expect(cell).not.toBeNull();
    expect(cell?.width).toBe(3000);
    expect(cell?.height).toBe(1000);
    expect(cell?.x).toBe(0);
    expect(cell?.y).toBe(0);
  });

  it('filters out overlapped non-top-left cells for spanned regions', () => {
    const grid: WindowGrid = {
      rows: 1,
      cols: 3,
      cells: [
        { id: 'wide', row: 0, col: 0, type: 'fixed', colSpan: 2 },
        { id: 'covered', row: 0, col: 1, type: 'sash' },
        { id: 'right', row: 0, col: 2, type: 'sash' },
      ],
    };

    const renderable = getRenderableGridCells(grid);
    expect(renderable.map((cell) => cell.id)).toEqual(['wide', 'right']);
  });

  it('computes active divider boundaries from occupied neighbors', () => {
    const grid: WindowGrid = {
      rows: 2,
      cols: 3,
      cells: [
        { id: 'top-wide', row: 0, col: 0, colSpan: 2, type: 'fixed' },
        { id: 'top-right', row: 0, col: 2, type: 'fixed' },
        { id: 'bottom-left', row: 1, col: 0, type: 'fixed' },
        { id: 'bottom-mid', row: 1, col: 1, type: 'fixed' },
        { id: 'bottom-right', row: 1, col: 2, type: 'fixed' },
      ],
    };

    const boundaries = computeActiveDividerBoundaries(grid);
    expect(boundaries.verticalBoundaries).toEqual([1, 2]);
    expect(boundaries.horizontalBoundaries).toEqual([1]);
  });

  it('does not create divider boundaries against empty cells', () => {
    const grid: WindowGrid = {
      rows: 1,
      cols: 2,
      cells: [
        { id: 'left', row: 0, col: 0, type: 'fixed' },
        { id: 'right-empty', row: 0, col: 1, type: 'empty' },
      ],
    };

    const boundaries = computeActiveDividerBoundaries(grid);
    expect(boundaries.verticalBoundaries).toEqual([]);
    expect(boundaries.horizontalBoundaries).toEqual([]);
  });
});
