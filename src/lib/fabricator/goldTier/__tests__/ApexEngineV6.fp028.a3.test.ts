/**
 * FP-028 / Phase 0 / A3
 *
 * Apex V6 cache must isolate system rules, profiles, quantity, glazing, and revision.
 * No cutting-formula changes in this slice.
 */
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';
import type { WindowUnit } from '@/types/fabricator';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ApexEngineV6,
  buildApexV6CacheKey,
  clearApexV6Cache,
} from '../ApexEngineV6';

const frame: ProfileSpec = {
  code: 'RC-FRAME-01',
  name: 'Frame',
  role: 'frame',
  dimensions: { width: 60 },
  material: 'aluminum',
  standardStockLength: 6000,
  weightPerMeter: 1.2,
  costPerMeter: 15,
};

const sash: ProfileSpec = {
  code: 'RC-SASH-01',
  name: 'Sash',
  role: 'sash',
  dimensions: { width: 72 },
  material: 'aluminum',
  standardStockLength: 6000,
  weightPerMeter: 1.1,
  costPerMeter: 18,
};

function makeSystem(overrides: Partial<FenestrationSystem> = {}): FenestrationSystem {
  const base: FenestrationSystem = {
    id: 'sys-fp028-a3',
    name: 'A3 System',
    manufacturer: 'Test',
    version: '1.0.0',
    region: 'EGY',
    material: 'aluminum',
    category: 'window',
    profiles: { frame, sash },
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
  return {
    ...base,
    ...overrides,
    profiles: overrides.profiles ?? base.profiles,
    fabricationRules: overrides.fabricationRules ?? base.fabricationRules,
  };
}

function makeUnit(overrides: Partial<WindowUnit> = {}): WindowUnit {
  return {
    id: 'fp028-a3-unit',
    orderNumber: 'ORD-A3',
    posNumber: 'L01',
    type: 'window',
    components: [],
    overallWidth: 1210,
    overallHeight: 1550,
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
    grid: {
      rows: 1,
      cols: 2,
      cells: [
        { id: 'cell-slide-L', row: 0, col: 0, type: 'sliding' },
        { id: 'cell-slide-R', row: 0, col: 1, type: 'sliding' },
      ],
      colWidths: [605, 605],
      rowHeights: [1550],
    },
    ...overrides,
  };
}

describe('FP-028 / A3 — Apex V6 cache isolates manufacturing fields', () => {
  afterEach(() => {
    clearApexV6Cache();
  });

  it('changes cache key when quantity, revision, glazing, system rules, or profiles change', () => {
    const system = makeSystem();
    const unit = makeUnit();
    const base = buildApexV6CacheKey(system, unit, 'Miter 45°');

    expect(buildApexV6CacheKey(system, makeUnit({ quantity: 3 }), 'Miter 45°')).not.toBe(base);
    expect(buildApexV6CacheKey(system, makeUnit({ revision: 2 }), 'Miter 45°')).not.toBe(base);
    expect(
      buildApexV6CacheKey(system, makeUnit({ glazing: { type: 'triple', thickness: 36 } }), 'Miter 45°')
    ).not.toBe(base);
    expect(
      buildApexV6CacheKey(
        makeSystem({
          fabricationRules: {
            ...system.fabricationRules,
            assembly: { ...system.fabricationRules.assembly, frameClearance: 8 },
          },
        }),
        unit,
        'Miter 45°'
      )
    ).not.toBe(base);
    expect(
      buildApexV6CacheKey(
        makeSystem({
          profiles: {
            frame: { ...frame, code: 'RC-FRAME-02', standardStockLength: 6500 },
            sash,
          },
        }),
        unit,
        'Miter 45°'
      )
    ).not.toBe(base);
    expect(buildApexV6CacheKey(makeSystem({ id: 'other-system' }), unit, 'Miter 45°')).not.toBe(base);
    expect(buildApexV6CacheKey(system, unit, 'Miter 45°')).toBe(base);
  });

  it('does not serve a cached result across quantity or revision changes', () => {
    const system = makeSystem();
    const unitQ1 = makeUnit({ id: 'fp028-a3-cache-qty', quantity: 1 });

    const first = new ApexEngineV6(system, unitQ1).generate();
    expect(first.performance.cached).toBe(false);

    const secondSame = new ApexEngineV6(system, unitQ1).generate();
    expect(secondSame.performance.cached).toBe(true);

    const unitQ3 = makeUnit({ id: 'fp028-a3-cache-qty', quantity: 3 });
    const thirdQty = new ApexEngineV6(system, unitQ3).generate();
    expect(thirdQty.performance.cached).toBe(false);

    const unitRev2 = makeUnit({ id: 'fp028-a3-cache-qty', quantity: 3, revision: 2 });
    const fourthRev = new ApexEngineV6(system, unitRev2).generate();
    expect(fourthRev.performance.cached).toBe(false);
  });

  it('does not serve a cached result across fabrication rule or profile identity changes', () => {
    const unit = makeUnit({ id: 'fp028-a3-cache-rules' });
    const systemA = makeSystem();
    const first = new ApexEngineV6(systemA, unit).generate();
    expect(first.performance.cached).toBe(false);

    const systemB = makeSystem({
      fabricationRules: {
        ...systemA.fabricationRules,
        cutting: { ...systemA.fabricationRules.cutting, barEndTrim: 2000 },
      },
    });
    const second = new ApexEngineV6(systemB, unit).generate();
    expect(second.performance.cached).toBe(false);

    const systemC = makeSystem({
      profiles: {
        frame,
        sash: { ...sash, code: 'RC-SASH-99', costPerMeter: 22 },
      },
    });
    const third = new ApexEngineV6(systemC, unit).generate();
    expect(third.performance.cached).toBe(false);
  });
});
