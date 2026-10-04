import {
  createManufacturingDesignContract,
  type ManufacturingDesignContractInput,
} from '@/lib/fabricator/manufacturing/ManufacturingDesignContract';
import type { FenestrationSystem, ProfileSpec } from '@/types/fenestration';
import { describe, expect, it } from 'vitest';
import {
  ApexManufacturingBoundaryError,
  generateApexManufacturing,
  type ApprovedApexSystemSnapshot,
} from '../ApexManufacturingEngine';
import { clearApexV6Cache } from '../ApexEngineV6';
import {
  FP028_F2_FIXTURE,
  FP028_F3_FIXTURE,
  type Fp028AcceptanceFixture,
} from '@/lib/fabricator/manufacturing/fp028AcceptanceFixtures';

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
  id: 'rock60-approved', name: 'ROCK 60', manufacturer: 'Test', version: '1',
  region: 'EGY', material: 'aluminum', category: 'window',
  profiles: {
    frame: profile('frame', 'R60-F'), sash: profile('sash', 'R60-S'),
    mullion: profile('mullion', 'R60-M'), transom: profile('transom', 'R60-T'),
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
    cornerKeys: [], drainageCaps: [],
  },
  constraints: {
    maxWidth: 3000, maxHeight: 3000, maxSashArea: 9, maxSashWeight: 200,
    minSashWidth: 200, aspectRatio: { min: 0.1, max: 10 }, windLoadClass: 'C3',
    requiresReinforcement: () => false,
  },
  regionalPhysics: {},
  metadata: { createdAt: '', updatedAt: '', validationStatus: 'validated' },
};

const input: ManufacturingDesignContractInput = {
  identity: { ownerId: 'owner-a', projectId: 'project-a', positionId: 'position-a', source: 'db', revision: 3 },
  overallWidthMm: 1210, overallHeightMm: 1550, quantity: 2,
  cells: [
    { id: 'left', row: 0, col: 0, type: 'sliding', openingDirection: 'right', bounds: { xMm: 0, yMm: 0, widthMm: 605, heightMm: 1550 } },
    { id: 'right', row: 0, col: 1, type: 'sliding', openingDirection: 'left', bounds: { xMm: 605, yMm: 0, widthMm: 605, heightMm: 1550 } },
  ],
  systemPack: { id: system.id, revision: 1, evidenceStatus: 'approved', approvalId: 'pack-approval' },
  profiles: [
    { role: 'frame', profileId: 'R60-F', stockLengthMm: 6000, evidenceStatus: 'approved', approvalId: 'frame-approval' },
    { role: 'sash', profileId: 'R60-S', stockLengthMm: 6000, evidenceStatus: 'approved', approvalId: 'sash-approval' },
  ],
  cuttingRules: [{ ruleId: 'cut-rule', revision: 1, evidenceStatus: 'approved', approvalId: 'cut-approval' }],
  toleranceRule: { ruleId: 'tol-rule', revision: 1, evidenceStatus: 'approved', approvalId: 'tol-approval' },
  glazingSelections: [
    { sourceCellId: 'left', glazingId: 'glass-24', revision: 1, evidenceStatus: 'approved', approvalId: 'glass-left' },
    { sourceCellId: 'right', glazingId: 'glass-24', revision: 1, evidenceStatus: 'approved', approvalId: 'glass-right' },
  ],
  hardware: { mode: 'not_required', rule: { ruleId: 'no-hardware', revision: 1, evidenceStatus: 'approved', approvalId: 'hardware-approval' } },
};

const makeSnapshot = (): ApprovedApexSystemSnapshot => {
  const contract = createManufacturingDesignContract(input);
  return {
    system,
    systemPack: contract.systemPack,
    profiles: contract.profiles,
    cuttingRules: contract.cuttingRules,
    toleranceRule: contract.toleranceRule,
  };
};

const inputFromFixture = (fixture: Fp028AcceptanceFixture): ManufacturingDesignContractInput => {
  const colWidths = fixture.grid.colWidths!;
  const rowHeights = fixture.grid.rowHeights!;
  const x = [0];
  const y = [0];
  colWidths.forEach((width) => x.push(x[x.length - 1] + width));
  rowHeights.forEach((height) => y.push(y[y.length - 1] + height));
  const cells = fixture.grid.cells.map((cell) => {
    const rowSpan = cell.rowSpan ?? 1;
    const colSpan = cell.colSpan ?? 1;
    return {
      ...cell,
      bounds: {
        xMm: x[cell.col],
        yMm: y[cell.row],
        widthMm: x[cell.col + colSpan] - x[cell.col],
        heightMm: y[cell.row + rowSpan] - y[cell.row],
      },
    };
  });
  return {
    ...input,
    identity: fixture.identity,
    overallWidthMm: fixture.overallWidthMm,
    overallHeightMm: fixture.overallHeightMm,
    quantity: fixture.quantity,
    cells,
    glazingSelections: cells.filter((cell) => cell.type !== 'empty').map((cell) => ({
      sourceCellId: cell.id,
      glazingId: 'glass-24',
      revision: 1,
      evidenceStatus: 'approved' as const,
      approvalId: `glass-${cell.id}`,
    })),
  };
};

describe('FP-028 / P4.1 canonical Apex manufacturing boundary', () => {
  it('binds generation to the complete validated contract identity', () => {
    const contract = createManufacturingDesignContract(input);
    const result = generateApexManufacturing(contract, makeSnapshot());

    expect(result.identity).toBe(contract.identity);
    expect(result.contract).toBe(contract);
    expect(result.contractKey).toBe(JSON.stringify(contract));
    expect(result.apex.jobId).toBe('position-a');
    expect(result.apex.manufacturing.sashes).toMatchObject([
      {
        sourceCellId: 'left',
        openingDirection: 'right',
        boundsMm: { xMm: 0, yMm: 0, widthMm: 605, heightMm: 1550 },
        topLength: 595000,
        leftLength: 1540000,
      },
      {
        sourceCellId: 'right',
        openingDirection: 'left',
        boundsMm: { xMm: 605, yMm: 0, widthMm: 605, heightMm: 1550 },
        topLength: 595000,
        leftLength: 1540000,
      },
    ]);
    expect(result.physicalAssembly.cells).toMatchObject([
      {
        sourceCellId: 'left',
        glazing: { glazingId: 'glass-24', cutDimensionsStatus: 'blocked_pending_approved_formula' },
      },
      {
        sourceCellId: 'right',
        glazing: { glazingId: 'glass-24', cutDimensionsStatus: 'blocked_pending_approved_formula' },
      },
    ]);
    expect(result.physicalAssembly.dividers).toEqual([
      {
        id: 'mullion:left:right',
        role: 'mullion',
        sourceCellIds: ['left', 'right'],
        axisPositionMm: 605,
        spanStartMm: 0,
        spanEndMm: 1550,
      },
    ]);
    expect(result.linearPieces).toHaveLength(12);
    expect(result.linearPieces.every((piece) => piece.totalQuantity === 2)).toBe(true);
    expect(result.linearPieces.every((piece) => piece.cutLength.unit === 'mm')).toBe(true);
    expect(result.linearPieces.every((piece) => piece.profile.stockLength.value === 6000)).toBe(true);
    expect(result.linearPieces.every((piece) => piece.profile.stockLength.unit === 'mm')).toBe(true);
    expect(result.linearPieces.map((piece) => piece.pieceId)).toEqual(
      [...result.linearPieces.map((piece) => piece.pieceId)].sort()
    );
    expect(result.blockedComponents).toEqual([
      { componentId: 'mullion:left:right', role: 'mullion', reason: 'approved_cut_formula_required' },
      { componentId: 'glazing:left', role: 'glazing', reason: 'approved_cut_formula_required' },
      { componentId: 'glazing:right', role: 'glazing', reason: 'approved_cut_formula_required' },
    ]);
    expect(result.bom.linearPieces.map((piece) => piece.pieceId)).toEqual(
      result.requiredPieceManifest.map((piece) => piece.pieceId)
    );
    const optimizedIds = result.optimization
      .flatMap((group) => group.result.stockUsed.flatMap((bar) => bar.cuts.map((cut) => cut.id)))
      .sort();
    const requiredIds = result.requiredPieceManifest
      .flatMap((piece) => Array.from({ length: piece.totalQuantity }, (_, index) => `${piece.pieceId}-${index}`))
      .sort();
    expect(optimizedIds).toEqual(requiredIds);
    expect(optimizedIds).toHaveLength(24);
  });

  it('rejects a system snapshot from another approved pack', () => {
    const contract = createManufacturingDesignContract(input);
    const snapshot = { ...makeSnapshot(), system: { ...system, id: 'other-system' } };

    expect(() => generateApexManufacturing(contract, snapshot)).toThrowError(ApexManufacturingBoundaryError);
    try {
      generateApexManufacturing(contract, snapshot);
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: 'SYSTEM_AUTHORITY_MISMATCH', blocking: true });
    }
  });

  it('rejects altered profile stock authority', () => {
    const contract = createManufacturingDesignContract(input);
    const snapshot = makeSnapshot();
    const altered = {
      ...snapshot,
      system: {
        ...snapshot.system,
        profiles: {
          ...snapshot.system.profiles,
          sash: { ...snapshot.system.profiles.sash, standardStockLength: 6500 },
        },
      },
    };

    try {
      generateApexManufacturing(contract, altered);
      throw new Error('Expected profile authority rejection.');
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: 'PROFILE_AUTHORITY_MISMATCH', blocking: true });
    }
  });

  it('rejects cutting-rule authority from another revision', () => {
    const contract = createManufacturingDesignContract(input);
    const snapshot = makeSnapshot();
    const altered = {
      ...snapshot,
      cuttingRules: [{ ...snapshot.cuttingRules[0], revision: 2 }],
    };

    try {
      generateApexManufacturing(contract, altered);
      throw new Error('Expected rule authority rejection.');
    } catch (error: unknown) {
      expect(error).toMatchObject({ code: 'RULE_AUTHORITY_MISMATCH', blocking: true });
    }
  });

  it('isolates hot-cache results by the full owner/project/source/revision contract', () => {
    clearApexV6Cache();
    const contractA = createManufacturingDesignContract(input);
    const first = generateApexManufacturing(contractA, makeSnapshot());
    const retry = generateApexManufacturing(contractA, makeSnapshot());
    const contractB = createManufacturingDesignContract({
      ...input,
      identity: { ...input.identity, ownerId: 'owner-b' },
    });
    const switchedOwner = generateApexManufacturing(contractB, {
      ...makeSnapshot(),
      systemPack: contractB.systemPack,
      profiles: contractB.profiles,
      cuttingRules: contractB.cuttingRules,
      toleranceRule: contractB.toleranceRule,
    });

    expect(first.apex.performance.cached).toBe(false);
    expect(retry.apex.performance.cached).toBe(true);
    expect(switchedOwner.apex.performance.cached).toBe(false);
    expect(switchedOwner.contractKey).not.toBe(first.contractKey);
  });

  it.each([FP028_F2_FIXTURE, FP028_F3_FIXTURE])(
    'preserves $id cells, operable sashes, quantity and continuous dividers',
    (fixture) => {
      clearApexV6Cache();
      const fixtureInput = inputFromFixture(fixture);
      const contract = createManufacturingDesignContract(fixtureInput);
      const snapshot = {
        ...makeSnapshot(),
        systemPack: contract.systemPack,
        profiles: contract.profiles,
        cuttingRules: contract.cuttingRules,
        toleranceRule: contract.toleranceRule,
      };
      const result = generateApexManufacturing(contract, snapshot);
      const operableCount = fixture.grid.cells.filter((cell) => cell.type === 'sash' || cell.type === 'sliding').length;

      expect(result.physicalAssembly.cells.map((cell) => cell.sourceCellId)).toEqual(
        fixture.grid.cells.filter((cell) => cell.type !== 'empty').map((cell) => cell.id)
      );
      expect(result.apex.manufacturing.sashes).toHaveLength(operableCount);
      expect(result.linearPieces).toHaveLength(4 + operableCount * 4);
      expect(result.linearPieces.every((piece) => piece.totalQuantity === fixture.quantity)).toBe(true);
      expect(result.optimization.flatMap((group) => group.result.stockUsed.flatMap((bar) => bar.cuts))).toHaveLength(
        (4 + operableCount * 4) * fixture.quantity
      );
      expect(result.physicalAssembly.dividers.map((divider) => divider.role).sort()).toEqual(
        fixture.id === 'F3' ? ['mullion', 'transom'] : ['mullion']
      );
    }
  );
});
