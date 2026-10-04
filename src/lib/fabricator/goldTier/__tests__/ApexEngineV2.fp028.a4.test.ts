/**
 * FP-028 / Phase 0 / A4
 *
 * Apex V2 gives every operable cell full-opening dimensions at 0,0.
 * Characterization only — no formula changes in this slice.
 * Phase 4 acceptance locked via it.fails.
 */
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { describe, expect, it, vi } from 'vitest';
import { ApexEngineV2 } from '../ApexEngineV2';
import { createValidSystem } from './testFixtures';

vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn().mockReturnValue('test-id'),
  },
}));

vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

/** F2 — unequal casement/fixed: 1500×1400, widths 900/600 */
const F2_GRID: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'casement-0', row: 0, col: 0, type: 'sash', openingDirection: 'left' },
    { id: 'fixed-1', row: 0, col: 1, type: 'fixed' },
  ],
  colWidths: [900, 600],
  rowHeights: [1400],
};

/** F1-shaped — two sliding cells with equal 605 mm columns */
const F1_GRID: WindowGrid = {
  rows: 1,
  cols: 2,
  cells: [
    { id: 'cell-slide-L', row: 0, col: 0, type: 'sliding', openingDirection: 'right' },
    { id: 'cell-slide-R', row: 0, col: 1, type: 'sliding', openingDirection: 'left' },
  ],
  colWidths: [605, 605],
  rowHeights: [1550],
};

function makeUnit(grid: WindowGrid, width: number, height: number, id: string): WindowUnit {
  return {
    id,
    orderNumber: 'ORD-FP028-A4',
    posNumber: 'L01',
    type: 'window',
    components: [],
    overallWidth: width,
    overallHeight: height,
    color: 'white',
    glazing: { type: 'double', thickness: 24 },
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date('2026-10-04T00:00:00.000Z'),
    updatedAt: new Date('2026-10-04T00:00:00.000Z'),
    systemPackId: 'rock60',
    revision: 1,
    quantity: 1,
    grid,
  };
}

function sashWidthMm(sash: { outline: Array<{ x: number; y: number }> }): number {
  return sash.outline[1].x - sash.outline[0].x;
}

function sashHeightMm(sash: { outline: Array<{ x: number; y: number }> }): number {
  return sash.outline[2].y - sash.outline[0].y;
}

describe('FP-028 / A4 — Apex V2 operable cells use full opening at 0,0', () => {
  it('documents defect: F2 casement sash is full-opening size at origin, not 900 mm cell width', () => {
    const system = createValidSystem();
    const unit = makeUnit(F2_GRID, 1500, 1400, 'fp028-a4-f2');
    const result = new ApexEngineV2(system, unit).generateAssembly();
    const sashes = result.visualGeometry.sashes;

    expect(sashes).toHaveLength(1);

    const sash = sashes[0];
    expect(sash.position.x).toBe(0);
    expect(sash.position.y).toBe(0);

    const widthMm = sashWidthMm(sash);
    const heightMm = sashHeightMm(sash);
    // Full-opening sash (~1500 minus clearance), not 900 mm cell
    expect(widthMm).toBeGreaterThan(1400);
    expect(widthMm).not.toBe(900);
    expect(heightMm).toBeGreaterThan(1300);
  });

  it('documents defect: F1 both sliding sashes share identical full-opening size and 0,0 position', () => {
    const system = createValidSystem();
    const unit = makeUnit(F1_GRID, 1210, 1550, 'fp028-a4-f1');
    const result = new ApexEngineV2(system, unit).generateAssembly();
    const sashes = result.visualGeometry.sashes;

    expect(sashes).toHaveLength(2);

    for (const sash of sashes) {
      expect(sash.position.x).toBe(0);
      expect(sash.position.y).toBe(0);
    }

    expect(sashWidthMm(sashes[0])).toBe(sashWidthMm(sashes[1]));
    expect(sashHeightMm(sashes[0])).toBe(sashHeightMm(sashes[1]));

    const widthMm = sashWidthMm(sashes[0]);
    expect(widthMm).toBeGreaterThan(1100); // full opening, not ~605 cell
    expect(widthMm).toBeLessThanOrEqual(1210);
  });

  /**
   * Phase 4 acceptance lock. Passes today because assertions fail (defect present).
   * Source-cell ids are linked by A5; bounds/positions remain A4.
   * Remove `.fails` when per-cell bounds and positions are implemented.
   */
  it.fails(
    'A4 acceptance: operable sashes must use cell bounds and non-overlapping positions',
    () => {
      const system = createValidSystem();
      const f1 = new ApexEngineV2(
        system,
        makeUnit(F1_GRID, 1210, 1550, 'fp028-a4-acceptance-f1')
      ).generateAssembly();
      const f1Sashes = f1.visualGeometry.sashes;

      expect(f1Sashes).toHaveLength(2);
      expect(f1Sashes[0].position.x).not.toBe(f1Sashes[1].position.x);
      expect(sashWidthMm(f1Sashes[0])).toBeLessThan(700);
      expect(sashWidthMm(f1Sashes[1])).toBeLessThan(700);

      const f2 = new ApexEngineV2(
        system,
        makeUnit(F2_GRID, 1500, 1400, 'fp028-a4-acceptance-f2')
      ).generateAssembly();
      expect(f2.visualGeometry.sashes).toHaveLength(1);
      expect(sashWidthMm(f2.visualGeometry.sashes[0])).toBeGreaterThan(800);
      expect(sashWidthMm(f2.visualGeometry.sashes[0])).toBeLessThan(950);
    }
  );
});
