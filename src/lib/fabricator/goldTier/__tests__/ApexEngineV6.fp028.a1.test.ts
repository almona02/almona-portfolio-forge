/**
 * FP-028 / Phase 0 / A1
 *
 * Apex V6 produces one frame and one sash regardless of grid.
 * Characterization only — no formula changes in this slice.
 * Phase 4 acceptance is locked via it.fails until per-cell generation lands.
 */
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';
import type { WindowGrid, WindowUnit } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import { ApexEngineV6 } from '../ApexEngineV6';
import { inspectApexV6Pieces } from '../apexV6PieceInspection';

const mockProfile: ProfileSpec = {
  code: 'p1',
  name: 'Frame',
  role: 'frame',
  dimensions: { width: 50 },
  material: 'aluminum',
  standardStockLength: 6000,
  weightPerMeter: 0,
  costPerMeter: 10,
};

/** Approved-shape system fixture for characterization (not a manufacturing pack claim). */
const mockSystem: FenestrationSystem = {
  id: 'sys-fp028-a1',
  name: 'FP-028 A1 Characterization System',
  manufacturer: 'Test',
  version: '1.0',
  region: 'EGY',
  material: 'aluminum',
  category: 'window',
  profiles: { frame: mockProfile, sash: mockProfile },
  fabricationRules: {
    connectionType: 'miter',
    cutting: { sawKerf: 0, miterAllowance: 0, barEndTrim: 0, cuttingTolerance: 0 },
    welding: { burnOff: 0, coolingFactor: 0, temperature: 0 },
    assembly: { frameClearance: 5, mullionDeduction: 0, glazingClearance: 0 },
  },
  hardwareKit: {
    hinges: {} as FenestrationSystem['hardwareKit']['hinges'],
    lockingSystem: {} as FenestrationSystem['hardwareKit']['lockingSystem'],
    handle: {} as FenestrationSystem['hardwareKit']['handle'],
    gaskets: {
      glazingGasket: {} as FenestrationSystem['hardwareKit']['gaskets']['glazingGasket'],
      weatherSeal: {} as FenestrationSystem['hardwareKit']['gaskets']['weatherSeal'],
    },
    cornerKeys: [],
    drainageCaps: [],
  },
  constraints: {
    maxWidth: 3000,
    maxHeight: 2600,
    maxSashArea: 6,
    maxSashWeight: 150,
    minSashWidth: 400,
    aspectRatio: { min: 0.3, max: 3 },
    windLoadClass: 'C3',
    requiresReinforcement: () => false,
  },
  regionalPhysics: { thermalExpansionCoefficient: 0.000023 },
  metadata: { createdAt: '', updatedAt: '', validationStatus: 'validated' },
};

/** F1 — ROCK 60 sliding shape: 1210×1550, 1×2 sliding, exact column sum */
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

const F1_SINGLE_CELL: WindowGrid = {
  rows: 1,
  cols: 1,
  cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }],
  colWidths: [1210],
  rowHeights: [1550],
};

function makeUnit(id: string, grid: WindowGrid): WindowUnit {
  return {
    id,
    orderNumber: 'ORD-FP028-A1',
    posNumber: 'L01',
    type: 'window',
    components: [],
    overallWidth: 1210,
    overallHeight: 1550,
    color: 'white',
    glazing: {},
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

describe('FP-028 / A1 — Apex V6 per-cell sash generation', () => {
  it('emits one deterministic sash assembly per operable F1 cell', () => {
    const unit = makeUnit('fp028-a1-f1', F1_GRID);
    const result = new ApexEngineV6(mockSystem, unit).generate();
    const inspection = inspectApexV6Pieces(result, unit.grid);

    expect(inspection.operableCellCount).toBe(2);
    expect(inspection.frameAssemblyCount).toBe(1);
    expect(inspection.sashAssemblyCount).toBe(2);
    expect(inspection.hasPerCellSashLinkage).toBe(true);

    expect(inspection.sashAssemblies.map((sash) => sash.sourceCellId)).toEqual([
      'cell-slide-L',
      'cell-slide-R',
    ]);
    for (const sash of inspection.sashAssemblies) {
      expect(sash.topLengthMicrons / 1000).toBe(595);
      expect(sash.leftLengthMicrons / 1000).toBe(1540);
    }
  });

  it('documents defect: 1×2 sliding and 1×1 fixed produce identical sash cut lengths', () => {
    const multi = new ApexEngineV6(mockSystem, makeUnit('fp028-a1-multi', F1_GRID)).generate();
    const single = new ApexEngineV6(mockSystem, makeUnit('fp028-a1-single', F1_SINGLE_CELL)).generate();

    expect(multi.manufacturing.sash.topLength).toBe(single.manufacturing.sash.topLength);
    expect(multi.manufacturing.sash.leftLength).toBe(single.manufacturing.sash.leftLength);
    expect(multi.manufacturing.frame.topLength).toBe(single.manufacturing.frame.topLength);
  });

  /**
   * Phase 4 acceptance lock. Passes today because the assertion fails (defect present).
   * When per-cell sash generation lands, remove `.fails` and keep the assertion.
   */
  it(
    'A1 acceptance: F1 must emit two sash assemblies linked to source cell IDs',
    () => {
      const unit = makeUnit('fp028-a1-acceptance', F1_GRID);
      const result = new ApexEngineV6(mockSystem, unit).generate();
      const inspection = inspectApexV6Pieces(result, unit.grid);

      expect(inspection.sashAssemblyCount).toBe(2);
      expect(inspection.hasPerCellSashLinkage).toBe(true);
      expect(
        inspection.sashAssemblies
          .map((s) => s.sourceCellId)
          .filter(Boolean)
          .sort()
      ).toEqual(['cell-slide-L', 'cell-slide-R']);

      // Each sash width must reflect cell bounds (~605 mm), not full 1210 mm opening
      for (const sash of inspection.sashAssemblies) {
        const topMm = sash.topLengthMicrons / 1000;
        expect(topMm).toBeLessThan(700);
        expect(topMm).toBeGreaterThan(500);
      }
    }
  );
});
