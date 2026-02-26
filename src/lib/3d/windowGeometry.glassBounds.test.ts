import { describe, expect, it } from 'vitest';
import { calculateGlassBounds, type ProfileCrossSection } from './windowGeometry';

const frameProfile: ProfileCrossSection = {
  shape: [],
  width: 0.05,
  depth: 0.05,
  material: 'aluminum',
  glassPocket: {
    width: 0.01,
    depth: 0.02,
    offsetZ: 0,
  },
};

describe('calculateGlassBounds', () => {
  it('uses half structural inset on shared internal dividers', () => {
    const windowUnit = {
      grid: {
        rows: 1,
        cols: 2,
        cells: [
          { id: 'left', row: 0, col: 0, type: 'fixed' },
          { id: 'right', row: 0, col: 1, type: 'fixed' },
        ],
      },
      presetData: {},
    } as any;

    const left = calculateGlassBounds(
      { row: 0, col: 0, colSpan: 1, rowSpan: 1 },
      -0.25,
      0,
      0.5,
      1,
      windowUnit,
      frameProfile,
      0.002,
    );

    const right = calculateGlassBounds(
      { row: 0, col: 1, colSpan: 1, rowSpan: 1 },
      0.25,
      0,
      0.5,
      1,
      windowUnit,
      frameProfile,
      0.002,
    );

    expect(left.width).toBeCloseTo(0.421, 6);
    expect(right.width).toBeCloseTo(0.421, 6);
    expect(left.x).toBeCloseTo(-0.2375, 6);
    expect(right.x).toBeCloseTo(0.2375, 6);
  });

  it('keeps full frame inset on outer edges for spanning cells', () => {
    const windowUnit = {
      grid: {
        rows: 1,
        cols: 2,
        cells: [{ id: 'wide', row: 0, col: 0, colSpan: 2, type: 'fixed' }],
      },
      presetData: {},
    } as any;

    const wide = calculateGlassBounds(
      { row: 0, col: 0, colSpan: 2, rowSpan: 1 },
      0,
      0,
      1,
      1,
      windowUnit,
      frameProfile,
      0.002,
    );

    expect(wide.width).toBeCloseTo(0.896, 6);
    expect(wide.x).toBeCloseTo(0, 6);
  });
});
