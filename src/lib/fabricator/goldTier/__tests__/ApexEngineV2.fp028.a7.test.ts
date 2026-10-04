/**
 * FP-028 / Phase 0 / A7
 *
 * Thermal expansion has the wrong stored unit and is not applied to cuts.
 * Characterization only — Phase 4 forbids applying thermal compensation
 * until coefficient units and formula evidence are approved.
 */
import type { WindowUnit } from '@/types/fabricator';
import { describe, expect, it, vi } from 'vitest';
import { ApexEngineV2, inspectThermalExpansionComputation } from '../ApexEngineV2';
import { createValidSystem } from './testFixtures';

vi.mock('../PerformanceMonitor', () => ({
  GoldTierPerformanceMonitor: {
    record: vi.fn().mockReturnValue('test-id'),
  },
}));

vi.mock('@/lib/audit/fabricatorAudit', () => ({
  logFabricatorAudit: vi.fn().mockResolvedValue(undefined),
}));

function baseUnit(): WindowUnit {
  return {
    id: 'fp028-a7-unit',
    orderNumber: 'ORD-A7',
    posNumber: 'L01',
    type: 'window',
    components: [],
    overallWidth: 1200,
    overallHeight: 1500,
    color: 'white',
    glazing: { type: 'double', thickness: 24 },
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date('2026-10-04T00:00:00.000Z'),
    updatedAt: new Date('2026-10-04T00:00:00.000Z'),
    revision: 1,
    quantity: 1,
    grid: {
      rows: 1,
      cols: 1,
      cells: [{ id: '0-0', row: 0, col: 0, type: 'sash', openingDirection: 'right' }],
    },
  };
}

function frameCutSignature(result: ReturnType<ApexEngineV2['generateAssembly']>): number[] {
  return result.fabricationData.cutList
    .filter((c) => c.role === 'frame')
    .map((c) => c.cutLength)
    .sort((a, b) => a - b);
}

describe('FP-028 / A7 — thermal expansion unit mismatch and not applied', () => {
  it('documents defect: stored value is mm-scale when α is mm/°C/m, not microns', () => {
    // PatternMigrationService documents GCC α as mm/°C/m (e.g. 0.023)
    const inspection = inspectThermalExpansionComputation({
      overallWidthMm: 1200,
      thermalExpansionCoefficient: 0.023,
      operatingTemperatureRange: { min: 0, max: 55 },
    });

    // ΔT = 55 - 20 = 35; L_m = 1.2; stored = 1.2 * 0.023 * 35 = 0.966
    expect(inspection.tempDeltaC).toBe(35);
    expect(inspection.storedValue).toBeCloseTo(0.966, 6);
    expect(inspection.claimedUnit).toBe('microns');
    expect(inspection.actualUnitIfAlphaIsMmPerMPerC).toBe('mm');

    // If it were truly microns, aluminum expansion ~1 mm would be ~1000 µm — not 0.966 µm
    expect(inspection.storedValue).toBeLessThan(10);
    expect(inspection.storedValueAsMicronsIfMm).toBeCloseTo(966, 0);
  });

  it('documents defect: invents 25°C ΔT when operating range is missing', () => {
    const inspection = inspectThermalExpansionComputation({
      overallWidthMm: 1200,
      thermalExpansionCoefficient: 0.023,
    });
    expect(inspection.usedInventedTempDefaults).toBe(true);
    expect(inspection.tempDeltaC).toBe(25);
  });

  it('documents defect: thermal coefficient does not change manufacturing cut lengths', () => {
    const unit = baseUnit();
    const plain = createValidSystem();
    const withThermal = {
      ...plain,
      region: 'GCC' as const,
      regionalPhysics: {
        ...plain.regionalPhysics,
        thermalExpansionCoefficient: 0.023,
        operatingTemperatureRange: { min: 0, max: 55 },
      },
    };

    const without = new ApexEngineV2(
      { ...plain, regionalPhysics: { thermalExpansionCoefficient: 0 } },
      unit
    ).generateAssembly();
    const withGcc = new ApexEngineV2(withThermal, unit).generateAssembly();

    expect(frameCutSignature(withGcc)).toEqual(frameCutSignature(without));
  });

  /**
   * Phase 4 acceptance lock. Do not remove `.fails` until:
   * - α unit is evidence-backed,
   * - stored compensation is true microns,
   * - cuts apply the approved formula (or an explicit approved non-apply policy).
   */
  it.fails(
    'A7 acceptance: thermal compensation must be micron-true and applied only with evidence',
    () => {
      const inspection = inspectThermalExpansionComputation({
        overallWidthMm: 1200,
        thermalExpansionCoefficient: 0.023,
        operatingTemperatureRange: { min: 0, max: 55 },
      });

      // Acceptance requires stored microns on the order of ~10²–10³ for this fixture
      expect(inspection.claimedUnit).toBe('microns');
      expect(inspection.storedValue).toBeGreaterThan(100);
      expect(inspection.usedInventedTempDefaults).toBe(false);

      const unit = baseUnit();
      const plain = createValidSystem();
      const withThermal = {
        ...plain,
        region: 'GCC' as const,
        regionalPhysics: {
          ...plain.regionalPhysics,
          thermalExpansionCoefficient: 0.023,
          operatingTemperatureRange: { min: 0, max: 55 },
        },
      };
      const without = new ApexEngineV2(
        { ...plain, regionalPhysics: { thermalExpansionCoefficient: 0 } },
        unit
      ).generateAssembly();
      const withGcc = new ApexEngineV2(withThermal, unit).generateAssembly();

      // When approved for application, cuts must differ; until then this remains failed
      expect(frameCutSignature(withGcc)).not.toEqual(frameCutSignature(without));
    }
  );
});
