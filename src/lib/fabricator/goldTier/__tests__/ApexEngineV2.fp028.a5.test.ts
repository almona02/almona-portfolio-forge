/**
 * FP-028 / Phase 0 / A5
 *
 * Apex V2 must retain source-cell opening direction on visual sashes.
 * Linkage-only fix — does not change cut lengths, positions, or cell sizing (A4).
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

function makeUnit(grid: WindowGrid, width: number, height: number, id: string): WindowUnit {
  return {
    id,
    orderNumber: 'ORD-FP028-A5',
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

describe('FP-028 / A5 — Apex V2 preserves source-cell opening direction', () => {
  it('preserves distinct F1 sliding directions linked to source cell ids', () => {
    const result = new ApexEngineV2(
      createValidSystem(),
      makeUnit(F1_GRID, 1210, 1550, 'fp028-a5-f1')
    ).generateAssembly();

    const byId = Object.fromEntries(
      result.visualGeometry.sashes.map((s) => [s.id, s.openingDirection])
    );

    expect(byId['cell-slide-L']).toBe('right');
    expect(byId['cell-slide-R']).toBe('left');
    expect(result.visualGeometry.sashes.map((s) => s.id).sort()).toEqual([
      'cell-slide-L',
      'cell-slide-R',
    ]);
  });

  it('preserves F2 casement direction and skips fixed cell', () => {
    const result = new ApexEngineV2(
      createValidSystem(),
      makeUnit(F2_GRID, 1500, 1400, 'fp028-a5-f2')
    ).generateAssembly();

    expect(result.visualGeometry.sashes).toHaveLength(1);
    expect(result.visualGeometry.sashes[0].id).toBe('casement-0');
    expect(result.visualGeometry.sashes[0].openingDirection).toBe('left');
  });

  it('maps cell top/bottom directions to visual up/down without inventing values', () => {
    const grid: WindowGrid = {
      rows: 2,
      cols: 1,
      cells: [
        { id: 'vent-top', row: 0, col: 0, type: 'sash', openingDirection: 'top' },
        { id: 'vent-bottom', row: 1, col: 0, type: 'sash', openingDirection: 'bottom' },
      ],
      colWidths: [1000],
      rowHeights: [700, 700],
    };

    const result = new ApexEngineV2(
      createValidSystem(),
      makeUnit(grid, 1000, 1400, 'fp028-a5-vertical')
    ).generateAssembly();

    const byId = Object.fromEntries(
      result.visualGeometry.sashes.map((s) => [s.id, s.openingDirection])
    );
    expect(byId['vent-top']).toBe('up');
    expect(byId['vent-bottom']).toBe('down');
  });

  it('does not claim A4 cell sizing is fixed (positions still origin)', () => {
    const result = new ApexEngineV2(
      createValidSystem(),
      makeUnit(F1_GRID, 1210, 1550, 'fp028-a5-no-a4')
    ).generateAssembly();

    for (const sash of result.visualGeometry.sashes) {
      expect(sash.position.x).toBe(0);
      expect(sash.position.y).toBe(0);
    }
  });
});
