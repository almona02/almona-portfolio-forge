/**
 * FP-028 / P4.5 — Batch optimization requires approved contracts; no catalog invention.
 */
import {
  createManufacturingDesignContract,
  type ManufacturingDesignContractInput,
} from '@/lib/fabricator/manufacturing/ManufacturingDesignContract';
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';
import { describe, expect, it } from 'vitest';
import {
  ApexManufacturingBoundaryError,
  type ApprovedApexSystemSnapshot,
} from '../../goldTier/ApexManufacturingEngine';
import {
  BatchOptimizationAuthorityError,
  runBatchOptimization,
} from '../BatchOptimizationService';

const profile = (role: ProfileSpec['role'], code: string): ProfileSpec => ({
  code,
  name: code,
  role,
  dimensions: { width: 60 },
  material: 'aluminum',
  standardStockLength: 6000,
  weightPerMeter: 1,
  costPerMeter: 1,
});

const system: FenestrationSystem = {
  id: 'rock60-approved',
  name: 'ROCK 60',
  manufacturer: 'Test',
  version: '1',
  region: 'EGY',
  material: 'aluminum',
  category: 'window',
  profiles: {
    frame: profile('frame', 'R60-F'),
    sash: profile('sash', 'R60-S'),
    mullion: profile('mullion', 'R60-M'),
    transom: profile('transom', 'R60-T'),
    glazingBead: profile('glazingBead', 'R60-G'),
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
    maxHeight: 3000,
    maxSashArea: 9,
    maxSashWeight: 200,
    minSashWidth: 200,
    aspectRatio: { min: 0.1, max: 10 },
    windLoadClass: 'C3',
    requiresReinforcement: () => false,
  },
  regionalPhysics: {},
  metadata: { createdAt: '', updatedAt: '', validationStatus: 'validated' },
};

function makeInput(positionId: string, revision: number): ManufacturingDesignContractInput {
  return {
    identity: {
      ownerId: 'owner-a',
      projectId: 'project-a',
      positionId,
      source: 'db',
      revision,
    },
    overallWidthMm: 1210,
    overallHeightMm: 1550,
    quantity: 1,
    cells: [
      {
        id: 'left',
        row: 0,
        col: 0,
        type: 'sliding',
        openingDirection: 'right',
        bounds: { xMm: 0, yMm: 0, widthMm: 605, heightMm: 1550 },
      },
      {
        id: 'right',
        row: 0,
        col: 1,
        type: 'sliding',
        openingDirection: 'left',
        bounds: { xMm: 605, yMm: 0, widthMm: 605, heightMm: 1550 },
      },
    ],
    systemPack: {
      id: system.id,
      revision: 1,
      evidenceStatus: 'approved',
      approvalId: 'pack-approval',
    },
    profiles: [
      {
        role: 'frame',
        profileId: 'R60-F',
        stockLengthMm: 6000,
        evidenceStatus: 'approved',
        approvalId: 'frame-approval',
      },
      {
        role: 'sash',
        profileId: 'R60-S',
        stockLengthMm: 6000,
        evidenceStatus: 'approved',
        approvalId: 'sash-approval',
      },
    ],
    cuttingRules: [
      { ruleId: 'cut-rule', revision: 1, evidenceStatus: 'approved', approvalId: 'cut-approval' },
    ],
    toleranceRule: {
      ruleId: 'tol-rule',
      revision: 1,
      evidenceStatus: 'approved',
      approvalId: 'tol-approval',
    },
    glazingSelections: [
      {
        sourceCellId: 'left',
        glazingId: 'glass-24',
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: 'glass-left',
      },
      {
        sourceCellId: 'right',
        glazingId: 'glass-24',
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: 'glass-right',
      },
    ],
    hardware: {
      mode: 'not_required',
      rule: {
        ruleId: 'no-hardware',
        revision: 1,
        evidenceStatus: 'approved',
        approvalId: 'hardware-approval',
      },
    },
  };
}

function makeJob(positionId: string, revision: number) {
  const contract = createManufacturingDesignContract(makeInput(positionId, revision));
  const snapshot: ApprovedApexSystemSnapshot = {
    system,
    systemPack: contract.systemPack,
    profiles: contract.profiles,
    cuttingRules: contract.cuttingRules,
    toleranceRule: contract.toleranceRule,
  };
  return { contract, snapshot };
}

describe('FP-028 / P4.5 — BatchOptimizationService authority', () => {
  it('fails closed with no jobs (no SYSTEM_PACK / unit-only path)', () => {
    try {
      runBatchOptimization([]);
      throw new Error('Expected missing-jobs rejection.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BatchOptimizationAuthorityError);
      expect(error).toMatchObject({ code: 'MISSING_JOBS', blocking: true });
    }
  });

  it('fails closed when a job lacks contract or snapshot', () => {
    expect(() =>
      runBatchOptimization([
        { contract: undefined as never, snapshot: undefined as never },
      ])
    ).toThrow(BatchOptimizationAuthorityError);
  });

  it('rejects duplicate position identities', () => {
    const job = makeJob('position-a', 1);
    expect(() => runBatchOptimization([job, job])).toThrow(BatchOptimizationAuthorityError);
  });

  it('aggregates approved F1 jobs without inventing stock length', () => {
    const result = runBatchOptimization([
      makeJob('position-a', 1),
      makeJob('position-b', 1),
    ]);

    expect(result.perUnitResults.size).toBe(2);
    expect(result.frameStock.barsCount).toBeGreaterThan(0);
    expect(result.sashStock.barsCount).toBeGreaterThan(0);

    for (const manufacturing of result.perUnitResults.values()) {
      expect(manufacturing.linearPieces.every((p) => p.profile.stockLength.value === 6000)).toBe(
        true
      );
      expect(manufacturing.linearPieces.every((p) => p.cutLength.unit === 'mm')).toBe(true);
    }
  });

  it('propagates Apex authority mismatch from generateApexManufacturing', () => {
    const job = makeJob('position-a', 1);
    const badSnapshot: ApprovedApexSystemSnapshot = {
      ...job.snapshot,
      systemPack: { ...job.snapshot.systemPack, approvalId: 'wrong-approval' },
    };
    expect(() =>
      runBatchOptimization([{ contract: job.contract, snapshot: badSnapshot }])
    ).toThrow(ApexManufacturingBoundaryError);
  });
});
