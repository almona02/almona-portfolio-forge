/**
 * FP-024A / F04 — Production export gate regression tests.
 *
 * Every machine-file export must refuse incomplete, duplicated, or foreign
 * cut lists, and must refuse unimplemented formats. Conservation uses the
 * same reconciliation as the workflow and pipeline gates.
 */
import { describe, expect, it } from 'vitest';
import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import type { OptimizationResult, Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import { evaluateProductionExportGate } from './machineExportPreflight';

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
  const wastePercentage = (totalWaste / stockLength) * 100;
  return {
    materialUsage: used / stockLength,
    wastePercentage,
    nestingEfficiency: 100 - wastePercentage,
    estimatedProductionTime: 1,
    cuttingPlan: [{ profile, stockLength, cuts, totalWaste, utilization: (used / stockLength) * 100 }],
    costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 },
  };
}

const cut = (component: WindowComponent) => physicalCutForOccurrence(component, 0, profile, 'caluminium-ps');

describe('evaluateProductionExportGate', () => {
  it('allows a complete plan for implemented formats', () => {
    const optimization = resultFor([cut(components[0]), cut(components[1])]);
    expect(evaluateProductionExportGate(project, optimization, 'gcode').allowed).toBe(true);
    expect(evaluateProductionExportGate(project, optimization, 'mdb').allowed).toBe(true);
  });

  it('blocks an incomplete plan and names the mismatch', () => {
    const gated = evaluateProductionExportGate(project, resultFor([cut(components[0])]), 'gcode');
    expect(gated.allowed).toBe(false);
    expect(gated.blockingReasons.join('; ')).toMatch(/does not reconcile/i);
  });

  it('blocks a duplicated occurrence', () => {
    const twice = cut(components[0]);
    const gated = evaluateProductionExportGate(project, resultFor([twice, { ...twice }]), 'mdb');
    expect(gated.allowed).toBe(false);
  });

  it('blocks foreign cuts that do not belong to the design', () => {
    const foreign = { ...cut(components[0]), componentId: 'ghost', cutId: 'ghost:0' };
    const gated = evaluateProductionExportGate(project, resultFor([foreign, cut(components[1])]), 'gcode');
    expect(gated.allowed).toBe(false);
  });

  it('blocks unimplemented formats even for a complete plan', () => {
    const optimization = resultFor([cut(components[0]), cut(components[1])]);
    const gated = evaluateProductionExportGate(project, optimization, 'ncw');
    expect(gated.allowed).toBe(false);
    expect(gated.ncwSupported).toBe(false);
    expect(gated.blockingReasons.join('; ')).toMatch(/unsupported/i);
  });

  it('blocks a missing plan instead of exporting nothing', () => {
    const gated = evaluateProductionExportGate(project, null, 'gcode');
    expect(gated.allowed).toBe(false);
  });
});
