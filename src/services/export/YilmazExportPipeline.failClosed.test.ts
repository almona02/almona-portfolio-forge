/**
 * Yilmaz export fail-closed recheck (Batch 6): an incomplete, duplicated or
 * foreign cut list never passes pre-flight, regardless of machine constraints.
 * AICS-001 Tier 3 — the saved design ledger is the authority for the machine file.
 */
import { describe, expect, it } from 'vitest';
import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import type { OptimizationResult, Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import { YilmazExportPipeline } from './YilmazExportPipeline';

const profile: Profile = {
  id: 'PS-6601-FRAME', name: 'Frame', material: 'aluminum', width: 97.15, color: '#fff', costPerMeter: 10,
  cuttingAllowance: 3, stockQuantity: 0, minStockLevel: 0, supplier: 'x', profileRole: 'frame',
  specifications: { sawKerf: 3, barEndTrim: 0 },
} as Profile;

const components: WindowComponent[] = [
  { id: 'frame_top', type: 'frame', profile, quantity: 1, cuttingLengths: [1500], angles: [45] },
  { id: 'frame_bottom', type: 'frame', profile, quantity: 1, cuttingLengths: [1500], angles: [45] },
] as unknown as WindowComponent[];

const project = { id: 'pose', systemPackId: 'caluminium-ps', components } as unknown as WindowUnit;

function resultFor(cuts: ReturnType<typeof physicalCutForOccurrence>[]): OptimizationResult {
  const used = cuts.reduce((sum, cut) => sum + cut.length, 0);
  const stockLength = 6000;
  const totalWaste = stockLength - used;
  const wastePercentage = totalWaste / stockLength * 100;
  return {
    materialUsage: used / stockLength, wastePercentage, nestingEfficiency: 100 - wastePercentage, estimatedProductionTime: 1,
    cuttingPlan: [{ profile, stockLength, cuts, totalWaste, utilization: used / stockLength * 100 }],
    costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 },
  };
}

const cut = (component: WindowComponent) => physicalCutForOccurrence(component, 0, profile, 'caluminium-ps');

describe('YilmazExportPipeline pre-flight — design ledger completeness', () => {
  const pipeline = new YilmazExportPipeline({ machineModel: 'AIM-3410', format: 'all' });

  it('accepts a complete plan (every occurrence exactly once)', () => {
    const result = pipeline.preFlight(project, resultFor([cut(components[0]), cut(components[1])]));
    expect(result.issues.filter((issue) => issue.code.startsWith('INCOMPLETE_CUT_LEDGER'))).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects an incomplete plan (one occurrence missing)', () => {
    const result = pipeline.preFlight(project, resultFor([cut(components[0])]));
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain('INCOMPLETE_CUT_LEDGER:PIECE_RECONCILIATION_FAILED');
  });

  it('rejects a duplicated occurrence even when dimensions match another piece', () => {
    const twice = cut(components[0]);
    const result = pipeline.preFlight(project, resultFor([twice, { ...twice }]));
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'INCOMPLETE_CUT_LEDGER:DUPLICATE_OPTIMIZED_PIECE',
      'INCOMPLETE_CUT_LEDGER:PIECE_RECONCILIATION_FAILED',
    ]));
  });

  it('rejects cuts that do not belong to the saved design or carry the wrong physical length', () => {
    const foreign = { ...cut(components[0]), componentId: 'ghost', cutId: 'ghost:0' };
    const foreignResult = pipeline.preFlight(project, resultFor([foreign, cut(components[1])]));
    expect(foreignResult.issues.map((issue) => issue.code)).toContain('INCOMPLETE_CUT_LEDGER:UNKNOWN_OPTIMIZED_PIECE');

    const raw = { ...cut(components[0]), length: 1500 }; // design length without the 3 mm allowance
    const rawResult = pipeline.preFlight(project, resultFor([raw, cut(components[1])]));
    expect(rawResult.valid).toBe(false);
    expect(rawResult.issues.map((issue) => issue.code)).toContain('INCOMPLETE_CUT_LEDGER:OPTIMIZED_CUT_GEOMETRY_MISMATCH');
  });

  it('execute() refuses to produce machine files for an incomplete plan', async () => {
    const exported = await pipeline.execute(project, resultFor([cut(components[0])]));
    expect(exported.success).toBe(false);
    expect(exported.files).toEqual({ gcode: null, csv: null, mdb: null, manifest: null });
  });
});
