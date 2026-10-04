/**
 * FP-028 / Phase 0 / A8
 *
 * Pane, gasket, profile, and unit quantities do not reconcile.
 * Characterization only — no BOM formula rewrite in this slice.
 */
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { describe, expect, it, vi } from 'vitest';
import { ApexEngineV2 } from '../ApexEngineV2';
import { inspectApexV2QuantityReconciliation } from '../apexV2QuantityReconciliation';
import { createValidSystem } from './testFixtures';

vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn().mockReturnValue('test-id'),
  },
}));

vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

/** F1 — 1×2 sliding */
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

/** F3 — 2×2 mixed, quantity 3 */
const F3_GRID: WindowGrid = {
  rows: 2,
  cols: 2,
  cells: [
    { id: '0-0', row: 0, col: 0, type: 'fixed' },
    { id: '0-1', row: 0, col: 1, type: 'sash', openingDirection: 'right' },
    { id: '1-0', row: 1, col: 0, type: 'sash', openingDirection: 'left' },
    { id: '1-1', row: 1, col: 1, type: 'fixed' },
  ],
  colWidths: [900, 900],
  rowHeights: [1050, 1050],
};

function makeUnit(
  grid: WindowGrid,
  width: number,
  height: number,
  id: string,
  quantity = 1
): WindowUnit {
  return {
    id,
    orderNumber: 'ORD-FP028-A8',
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
    quantity,
    grid,
  };
}

describe('FP-028 / A8 — Apex V2 quantity reconciliation', () => {
  it('documents defect: F1 emits 1 glazing and 1 gasket for 2 sliding cells', () => {
    const unit = makeUnit(F1_GRID, 1210, 1550, 'fp028-a8-f1');
    const result = new ApexEngineV2(createValidSystem(), unit).generateAssembly();
    const report = inspectApexV2QuantityReconciliation(unit, result.fabricationData);

    expect(report.expectation.operableCellCount).toBe(2);
    expect(report.expectation.expectedPaneCount).toBe(2);
    expect(report.actual.bomGlazingEntries).toBe(1);
    expect(report.actual.bomGasketEntries).toBe(1);
    expect(report.defects.some((d) => d.startsWith('glazing_count'))).toBe(true);
    expect(report.defects.some((d) => d.startsWith('gasket_count'))).toBe(true);
    expect(report.reconciles).toBe(false);
  });

  it('documents defect: F3 quantity=3 does not scale panes or cut list', () => {
    const unit = makeUnit(F3_GRID, 1800, 2100, 'fp028-a8-f3', 3);
    const result = new ApexEngineV2(createValidSystem(), unit).generateAssembly();
    const report = inspectApexV2QuantityReconciliation(unit, result.fabricationData);

    expect(report.expectation.unitQuantity).toBe(3);
    expect(report.expectation.operableCellCount).toBe(2);
    expect(report.expectation.expectedPaneCount).toBe(6);
    expect(report.actual.bomGlazingEntries).toBe(1);
    expect(report.defects.some((d) => d.startsWith('unit_quantity'))).toBe(true);
    expect(report.defects.some((d) => d.startsWith('glazing_count'))).toBe(true);
    expect(report.reconciles).toBe(false);
  });

  it('documents defect: cut list uses one row per component with perimeter length, not 4 side pieces', () => {
    const unit = makeUnit(F1_GRID, 1210, 1550, 'fp028-a8-cuts');
    const result = new ApexEngineV2(createValidSystem(), unit).generateAssembly();
    const report = inspectApexV2QuantityReconciliation(unit, result.fabricationData);

    // Expectation: 4 frame + 4×2 sash = 12 side pieces for qty 1
    expect(report.expectation.expectedFrameSidePieces).toBe(4);
    expect(report.expectation.expectedSashSidePieces).toBe(8);
    expect(report.actual.cutListPieceCount).toBeLessThan(12);
    expect(report.defects.some((d) => d.startsWith('cut_list_pieces'))).toBe(true);

    // Profile BOM counts component nodes (frame + 2 sashes + mullion), not side pieces
    const sashProfile = result.fabricationData.bom.profiles.find((p) => p.role === 'sash');
    expect(sashProfile?.quantity).toBe(2); // two sash nodes, each holding 4-side summed cutLength
  });

  /**
   * Phase 4 acceptance lock. Remove `.fails` when BOM/cutList conserve
   * panes, gaskets, and side pieces with unit.quantity.
   */
  it.fails('A8 acceptance: F1 and F3 quantities reconcile exactly', () => {
    const system = createValidSystem();

    const f1 = makeUnit(F1_GRID, 1210, 1550, 'fp028-a8-accept-f1');
    const f1Report = inspectApexV2QuantityReconciliation(
      f1,
      new ApexEngineV2(system, f1).generateAssembly().fabricationData
    );
    expect(f1Report.reconciles).toBe(true);
    expect(f1Report.defects).toEqual([]);

    const f3 = makeUnit(F3_GRID, 1800, 2100, 'fp028-a8-accept-f3', 3);
    const f3Report = inspectApexV2QuantityReconciliation(
      f3,
      new ApexEngineV2(system, f3).generateAssembly().fabricationData
    );
    expect(f3Report.reconciles).toBe(true);
    expect(f3Report.expectation.expectedPaneCount).toBe(6);
  });
});
