/**
 * Gate 2 — FP-016 Option B + FP-017 physical-cut QC identity
 *
 * Behavioral tests (not source-string scans):
 * - Genetic remains advisory-only
 * - Advisory → Tier-3 authorization fails closed
 * - AdaptiveSolver / Enhanced path never execute genetic
 * - Identical Tier-3 inputs → equivalent cutting plans
 * - QC distinguishes duplicate componentId physical cuts
 * - CutSheet preserves cutId for production→QC traceability
 */
import { AdaptiveSolver, type JobComplexity } from '@/algorithms/adaptiveSolver';
import { EnhancedAdaptiveSolver } from '@/algorithms/EnhancedAdaptiveSolver';
import { GeneticOptimizer } from '@/algorithms/geneticOptimization';
import { algorithmSelector } from '@/lib/fabricator/AlgorithmSelector';
import {
  assertTier3ManufacturingAlgorithm,
  ManufacturingAuthorityError,
} from '@/lib/fabricator/manufacturingAuthority';
import { generateCutSheets } from '@/lib/fabricator/production/CutSheetGenerator';
import { qualityVerificationEngine } from '@/lib/fabricator/QualityVerificationEngine';
import type {
  AdaptiveSolverConfig,
  Cut,
  CuttingPlan,
  Profile,
  WindowComponent,
} from '@/types/fabricator';
import { describe, expect, it, vi } from 'vitest';

function complexity(totalCuts: number): JobComplexity {
  return {
    totalCuts,
    uniqueProfiles: 1,
    averageCutLength: 1000,
    maxCutLength: 2000,
    stockLengthConstraints: [6000],
    complexityScore: Math.min(100, totalCuts / 10),
  };
}

function mockProfile(id = 'p1'): Profile {
  return {
    id,
    name: 'Test',
    material: 'aluminum',
    width: 50,
    height: 20,
    thickness: 1.4,
    color: 'White',
    costPerMeter: 10,
    cuttingAllowance: 0,
    stockQuantity: 100,
    minStockLevel: 10,
    supplier: 'T',
    specifications: { stockLengthMm: 6000 },
  };
}

function mockComponent(profile: Profile, id: string, lengths: number[]): WindowComponent {
  return {
    id,
    type: 'frame',
    profile,
    width: lengths[0] ?? 500,
    height: lengths[1] ?? 500,
    quantity: 1,
    cuttingLengths: lengths,
    angles: lengths.map(() => 90),
    machiningOperations: [],
    glazingType: 'double',
    hardware: [],
  };
}

const defaultConfig: AdaptiveSolverConfig = {
  maxSolvingTime: 30,
  complexityThresholds: { simple: 50, medium: 500 },
  timeConstraint: 'fast',
  optimalityTarget: 'balanced',
};

describe('Gate 2 FP-016 Option B — genetic excluded from Tier-3', () => {
  it('AlgorithmSelector uses greedy (not genetic) for complex jobs', () => {
    const selection = algorithmSelector.selectByRule(complexity(600));
    expect(selection.algorithm).toBe('greedy');
    expect(selection.advisoryOnly).toBeFalsy();
    expect(selection.ruleId).toBe('rule_1.3_complex_job_greedy');
  });

  it('suggestAdvisoryGenetic is flagged advisoryOnly and can be validated as advisory', () => {
    const advisory = algorithmSelector.suggestAdvisoryGenetic(complexity(600));
    expect(advisory.algorithm).toBe('genetic');
    expect(advisory.advisoryOnly).toBe(true);
    const validation = algorithmSelector.validateSelection(advisory);
    expect(validation.isValid).toBe(true);
  });

  it('genetic without advisoryOnly fails validation', () => {
    const bad = {
      ...algorithmSelector.suggestAdvisoryGenetic(complexity(100)),
      advisoryOnly: false,
    };
    const validation = algorithmSelector.validateSelection(bad);
    expect(validation.isValid).toBe(false);
  });

  it('authorizeForManufacturing rejects advisory genetic (fail closed)', () => {
    const advisory = algorithmSelector.suggestAdvisoryGenetic(complexity(600));
    expect(() => algorithmSelector.authorizeForManufacturing(advisory)).toThrow(
      ManufacturingAuthorityError,
    );
  });

  it('assertTier3ManufacturingAlgorithm rejects genetic', () => {
    expect(() => assertTier3ManufacturingAlgorithm('genetic')).toThrow(
      ManufacturingAuthorityError,
    );
    expect(() => assertTier3ManufacturingAlgorithm('greedy')).not.toThrow();
  });

  it('AdaptiveSolver never selects genetic even when preferred', async () => {
    const profile = mockProfile();
    const config: AdaptiveSolverConfig = {
      ...defaultConfig,
      preferredAlgorithm: 'genetic',
      complexityThresholds: { simple: 50, medium: 100 },
    };

    const solver = new AdaptiveSolver(config);
    const selected = (
      solver as unknown as { selectAlgorithm: (c: JobComplexity) => string }
    ).selectAlgorithm(complexity(600));
    expect(selected).toBe('greedy');
    expect(selected).not.toBe('genetic');

    const result = await solver.solve(
      { components: [mockComponent(profile, 'c0', [500, 500, 500, 500])], profiles: [profile], defaultStockLength: 6000 },
      [profile],
    );
    expect(result.cuttingPlan.length).toBeGreaterThan(0);
  });

  it('AdaptiveSolver.executeOptimization fails closed on genetic bypass', async () => {
    const profile = mockProfile();
    const solver = new AdaptiveSolver(defaultConfig);
    const execute = (
      solver as unknown as {
        executeOptimization: (
          job: { components: WindowComponent[]; profiles: Profile[]; defaultStockLength: number },
          profiles: Profile[],
          algorithm: string,
          complexity: JobComplexity,
        ) => Promise<CuttingPlan[]>;
      }
    ).executeOptimization.bind(solver);

    await expect(
      execute(
        { components: [mockComponent(profile, 'c0', [1000])], profiles: [profile], defaultStockLength: 6000 },
        [profile],
        'genetic',
        complexity(1),
      ),
    ).rejects.toBeInstanceOf(ManufacturingAuthorityError);
  });

  it('EnhancedAdaptiveSolver refinement never returns genetic', () => {
    const solver = new EnhancedAdaptiveSolver(defaultConfig);
    const refine = (
      solver as unknown as {
        selectRefinementAlgorithm: (
          initial: 'greedy' | 'linear',
          c: JobComplexity,
        ) => string;
      }
    ).selectRefinementAlgorithm.bind(solver);

    expect(refine('greedy', complexity(80))).toBe('linear');
    expect(refine('greedy', complexity(600))).toBe('greedy');
    expect(refine('linear', complexity(600))).toBe('linear');
    expect(refine('linear', complexity(80))).not.toBe('genetic');
  });

  it('identical Tier-3 inputs produce equivalent authoritative cutting plans', async () => {
    const profile = mockProfile();
    const components = [
      mockComponent(profile, 'frame-1', [1200, 800, 1200, 800]),
      mockComponent(profile, 'sash-1', [1100, 700, 1100, 700]),
    ];
    const job = { components, profiles: [profile], defaultStockLength: 6000 };
    const solver = new AdaptiveSolver(defaultConfig);

    const a = await solver.solve(job, [profile]);
    const b = await solver.solve(job, [profile]);

    const flatten = (plans: CuttingPlan[]) =>
      plans
        .flatMap((p) =>
          p.cuts.map((c) => `${c.cutId ?? c.componentId}:${c.length}:${c.angle}`),
        )
        .sort();

    expect(flatten(a.cuttingPlan)).toEqual(flatten(b.cuttingPlan));
    expect(a.wastePercentage).toBe(b.wastePercentage);
  });

  it('mocked Math.random cannot alter Tier-3 AdaptiveSolver output', async () => {
    const profile = mockProfile();
    const job = {
      components: [mockComponent(profile, 'c0', [900, 900, 900, 900])],
      profiles: [profile],
      defaultStockLength: 6000,
    };
    const solver = new AdaptiveSolver(defaultConfig);

    const spy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const first = await solver.solve(job, [profile]);
    spy.mockReturnValue(0.01);
    const second = await solver.solve(job, [profile]);
    spy.mockRestore();

    expect(first.cuttingPlan.map((p) => p.cuts.map((c) => c.length))).toEqual(
      second.cuttingPlan.map((p) => p.cuts.map((c) => c.length)),
    );
  });

  it('GeneticOptimizer remains usable in advisory/search context', () => {
    const profile = mockProfile();
    const cuts: Cut[] = [
      { length: 1000, angle: 90, componentId: 'a', cutId: 'a:0', occurrenceIndex: 0, waste: 0 },
      { length: 800, angle: 90, componentId: 'a', cutId: 'a:1', occurrenceIndex: 1, waste: 0 },
    ];
    const optimizer = new GeneticOptimizer(cuts, profile, 6000, {
      populationSize: 10,
      generations: 3,
      mutationRate: 0.2,
      crossoverRate: 0.7,
    });
    const plans = optimizer.optimize();
    expect(plans.length).toBeGreaterThan(0);
  });
});

describe('Gate 2 FP-017 — QC physical cut identity', () => {
  /** Frozen fixture: pre-FP-017 collapse when both cuts shared componentId measurement key */
  const COLLAPSE_FIXTURE = {
    cuts: [
      {
        length: 1000,
        angle: 45,
        componentId: 'frame_top',
        cutId: 'frame_top:0',
        occurrenceIndex: 0,
        waste: 0,
      },
      {
        length: 1000,
        angle: 45,
        componentId: 'frame_top',
        cutId: 'frame_top:1',
        occurrenceIndex: 1,
        waste: 0,
      },
    ] as Cut[],
    /** Legacy defect: one key for two physical cuts */
    legacyMeasured: { frame_top: 1000 } as Record<string, number>,
    /** Correct physical keys */
    physicalMeasured: {
      'frame_top:0': 1000.1,
      'frame_top:1': 1003.8,
    } as Record<string, number>,
  };

  it('distinguishes two cuts with same componentId via cutId', async () => {
    const result = await qualityVerificationEngine.verifyProfileCuts(
      COLLAPSE_FIXTURE.cuts,
      COLLAPSE_FIXTURE.physicalMeasured,
    );
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('pass');
    expect(result[1].status).toBe('fail');
    expect(result[0].id).toBe('cut-frame_top:0');
    expect(result[1].id).toBe('cut-frame_top:1');
  });

  it('frozen regression: componentId-only map does not satisfy both physical cuts', async () => {
    const result = await qualityVerificationEngine.verifyProfileCuts(
      COLLAPSE_FIXTURE.cuts,
      COLLAPSE_FIXTURE.legacyMeasured,
    );
    expect(result.every((c) => c.status === 'pending')).toBe(true);
  });

  it('PASS on cut A does not satisfy cut B; FAIL on B does not change A', async () => {
    const result = await qualityVerificationEngine.verifyProfileCuts(
      COLLAPSE_FIXTURE.cuts,
      COLLAPSE_FIXTURE.physicalMeasured,
    );
    expect(result[0].status).toBe('pass');
    expect(result[1].status).toBe('fail');
    // Re-verify with only A measured — B stays pending, A still resolvable independently
    const onlyA = await qualityVerificationEngine.verifyProfileCuts(COLLAPSE_FIXTURE.cuts, {
      'frame_top:0': 1000.0,
    });
    expect(onlyA[0].status).toBe('pass');
    expect(onlyA[1].status).toBe('pending');
  });

  it('reordered cut arrays do not change physical identity outcomes', async () => {
    const reordered = [...COLLAPSE_FIXTURE.cuts].reverse();
    const result = await qualityVerificationEngine.verifyProfileCuts(
      reordered,
      COLLAPSE_FIXTURE.physicalMeasured,
    );
    const byId = Object.fromEntries(result.map((r) => [r.id, r.status]));
    expect(byId['cut-frame_top:0']).toBe('pass');
    expect(byId['cut-frame_top:1']).toBe('fail');
  });

  it('unique-component jobs still resolve via cutId or componentId legacy', async () => {
    const cuts: Cut[] = [
      { length: 500, angle: 90, componentId: 'only', cutId: 'only:0', occurrenceIndex: 0, waste: 0 },
    ];
    const byCutId = await qualityVerificationEngine.verifyProfileCuts(cuts, { 'only:0': 500 });
    expect(byCutId[0].status).toBe('pass');

    const legacyCuts: Cut[] = [{ length: 500, angle: 90, componentId: 'only', waste: 0 }];
    const byComponent = await qualityVerificationEngine.verifyProfileCuts(legacyCuts, {
      only: 500,
    });
    expect(byComponent[0].status).toBe('pass');
  });

  it('AdaptiveSolver stamps cutId and CutSheet preserves physical identity', async () => {
    const profile = mockProfile();
    const solver = new AdaptiveSolver(defaultConfig);
    const result = await solver.solve(
      {
        components: [mockComponent(profile, 'frame_top', [1000, 1000, 800, 800])],
        profiles: [profile],
        defaultStockLength: 6000,
      },
      [profile],
    );

    const allCuts = result.cuttingPlan.flatMap((p) => p.cuts);
    expect(allCuts.every((c) => typeof c.cutId === 'string' && c.cutId.includes(':'))).toBe(
      true,
    );
    const cutIds = allCuts.map((c) => c.cutId);
    expect(new Set(cutIds).size).toBe(cutIds.length);

    const sheet = generateCutSheets(result.cuttingPlan, { orderNumber: 'ORD-1' });
    const sheetCutIds = sheet.bars.flatMap((b) => b.cuts.map((c) => c.cutId));
    expect(sheetCutIds.every((id) => typeof id === 'string')).toBe(true);
    expect(sheetCutIds).toEqual(expect.arrayContaining(cutIds));
  });
});
