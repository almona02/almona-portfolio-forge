/**
 * FP-028 / Phase 0 / A2
 *
 * Apex V6 must not invent generic manufacturing data for incomplete packs.
 * Missing approved system authority fails closed with a typed error.
 */
import { ROCK60_SYSTEM_PACK } from '@/data/systemPacks';
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { describe, expect, it } from 'vitest';
import {
  ApexEngineV6,
  ApexSystemAuthorityError,
  isAuthoritativeFenestrationSystem,
} from '../ApexEngineV6';

const approvedProfile: ProfileSpec = {
  code: 'RC-6111-8',
  name: 'ROCK 60 Frame',
  role: 'frame',
  dimensions: { width: 60 },
  material: 'aluminum',
  standardStockLength: 6000,
  weightPerMeter: 1.2,
  costPerMeter: 15,
};

const approvedSystem: FenestrationSystem = {
  id: 'rock60-authoritative',
  name: 'ROCK 60 Authoritative',
  manufacturer: 'Test',
  version: '1.0',
  region: 'EGY',
  material: 'aluminum',
  category: 'window',
  profiles: {
    frame: { ...approvedProfile, role: 'frame' },
    sash: { ...approvedProfile, code: 'RC-SASH-01', role: 'sash', dimensions: { width: 72 } },
  },
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

const unit: WindowUnit = {
  id: 'fp028-a2-unit',
  orderNumber: 'ORD-A2',
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
};

describe('FP-028 / A2 — Apex V6 must not invent generic pack data', () => {
  it('treats catalog SystemPack (rock60) as non-authoritative', () => {
    expect(isAuthoritativeFenestrationSystem(ROCK60_SYSTEM_PACK)).toBe(false);
  });

  it('fails closed on incomplete SystemPack instead of inventing GENERIC-60', () => {
    const incompletePack: SystemPack = {
      meta: {
        id: 'incomplete-pack',
        name: 'Incomplete Pack',
        brands: ['test'],
        regions: ['egypt'],
      },
      windowSystemSpec: {},
    };

    expect(() => new ApexEngineV6(incompletePack, unit)).toThrow(ApexSystemAuthorityError);

    try {
      new ApexEngineV6(incompletePack, unit);
    } catch (err) {
      expect(err).toBeInstanceOf(ApexSystemAuthorityError);
      const blocked = err as ApexSystemAuthorityError;
      expect(blocked.code).toBe('INCOMPLETE_SYSTEM_PACK');
      expect(blocked.systemId).toBe('incomplete-pack');
      expect(blocked.missing).toEqual(
        expect.arrayContaining([
          'fenestrationSystem.profiles.frame',
          'fenestrationSystem.profiles.sash',
          'fabricationRules',
          'regionalPhysics',
        ])
      );
      expect(blocked.message).not.toMatch(/GENERIC-60/i);
      expect(blocked.message).toMatch(/forbidden|blocked/i);
    }
  });

  it('fails closed on production rock60 SystemPack (no invented manufacturing identity)', () => {
    expect(() => new ApexEngineV6(ROCK60_SYSTEM_PACK, unit)).toThrow(ApexSystemAuthorityError);
    try {
      new ApexEngineV6(ROCK60_SYSTEM_PACK, unit);
    } catch (err) {
      const blocked = err as ApexSystemAuthorityError;
      expect(blocked.code).toBe('INCOMPLETE_SYSTEM_PACK');
      expect(blocked.systemId).toBe('rock60');
    }
  });

  it('rejects FenestrationSystem that embeds GENERIC profile codes', () => {
    const withGeneric: FenestrationSystem = {
      ...approvedSystem,
      id: 'generic-forbidden',
      profiles: {
        frame: { ...approvedProfile, code: 'GENERIC-60', role: 'frame' },
        sash: { ...approvedProfile, code: 'RC-SASH-01', role: 'sash' },
      },
    };

    expect(() => new ApexEngineV6(withGeneric, unit)).toThrow(ApexSystemAuthorityError);
    try {
      new ApexEngineV6(withGeneric, unit);
    } catch (err) {
      expect((err as ApexSystemAuthorityError).code).toBe('GENERIC_PROFILE_FORBIDDEN');
    }
  });

  it('accepts an approved FenestrationSystem without inventing profiles', () => {
    const engine = new ApexEngineV6(approvedSystem, unit);
    const result = engine.generate();
    expect(result.jobId).toBe(unit.id);
    expect(result.manufacturing.frame.topLength).toBe(1210 * 1000);
    expect(result.strategyUsed).toContain('Miter');
  });
});
