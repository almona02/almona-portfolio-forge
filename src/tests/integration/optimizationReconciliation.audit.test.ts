/** Regression acceptance for defects reproduced during the live workflow audit. */
import { describe, expect, it } from 'vitest';
import { validateOptimizationReconciliation } from '@/lib/fabricator/validation/WorkflowValidator';
import type { OptimizationResult, Profile, WindowUnit } from '@/types/fabricator';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';

const profile = { id: 'audit-profile' } as Profile;
const project = {
  id: 'audit-position', systemPackId: 'audit-pack',
  components: [{ id: 'audit-component', profile, quantity: 1, cuttingLengths: [1000] }],
} as WindowUnit;
const result: OptimizationResult = {
  materialUsage: 1, wastePercentage: 5000 / 6000 * 100, estimatedProductionTime: 1, nestingEfficiency: 1000 / 6000 * 100,
  cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 5000, utilization: 1000 / 6000 * 100,
    cuts: [{ length: 1000, angle: 90, componentId: 'audit-component',
      cutId: 'audit-component:0', occurrenceIndex: 0, waste: 0 }] }],
  costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 },
};

describe('optimization rejects physically invalid results', () => {
  it('the solver itself rejects an overlength piece instead of returning an invalid fallback', async () => {
    const stockProfile = { ...profile, cuttingAllowance: 0, costPerMeter: 12, specifications: { stockLengthMm: 6000 } } as Profile;
    const components = [{ ...project.components[0], profile: stockProfile, cuttingLengths: [6500], angles: [90] }];
    await expect(new AdaptiveSolver({ maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } }).solve({ components, profiles: [stockProfile], defaultStockLength: 6000 }, [stockProfile])).rejects.toThrow();
  });
  it('accepts actual deterministic solver output including profile allowance', async () => {
    const ownedProfile = { ...profile, cuttingAllowance: 3, costPerMeter: 12, specifications: { stockLengthMm: 6000 } } as Profile;
    const design = { ...project, components: [{ ...project.components[0], profile: ownedProfile, angles: [90] }] } as WindowUnit;
    const solved = await new AdaptiveSolver({ maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } }).solve({ components: design.components, profiles: [ownedProfile], defaultStockLength: 6000, systemPackId: design.systemPackId }, [ownedProfile]);
    expect(solved.cuttingPlan[0].cuts[0].length).toBe(1003);
    expect(validateOptimizationReconciliation(solved, design).valid).toBe(true);
  });

  it('rejects an altered cut angle', () => {
    const changed = structuredClone(result);
    changed.cuttingPlan[0].cuts[0].angle = 45;
    expect(validateOptimizationReconciliation(changed, project).valid).toBe(false);
  });
  it('rejects a cut with the right ID but wrong length', () => {
    const changed = structuredClone(result);
    changed.cuttingPlan[0].cuts[0].length = 100;
    expect(validateOptimizationReconciliation(changed, project).valid).toBe(false);
  });
  it('rejects a cut longer than its entire stock bar', () => {
    const changed = structuredClone(result);
    changed.cuttingPlan[0].stockLength = 500;
    expect(validateOptimizationReconciliation(changed, project).valid).toBe(false);
  });
  it('rejects impossible percentage metrics', () => {
    const changed = structuredClone(result);
    changed.wastePercentage = 101;
    changed.nestingEfficiency = 101;
    changed.cuttingPlan[0].utilization = 101;
    expect(validateOptimizationReconciliation(changed, project).valid).toBe(false);
  });
});
