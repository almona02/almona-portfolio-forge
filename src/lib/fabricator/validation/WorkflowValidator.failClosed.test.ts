import { describe, expect, it } from 'vitest';
import type { OptimizationResult, Profile, WindowUnit } from '@/types/fabricator';
import { validateOptimizationInputs, validateOptimizationResult, validateStepTransition, WorkflowValidator } from './WorkflowValidator';

const profile = { id: 'profile-1' } as Profile;
const validResult: OptimizationResult = {
  materialUsage: 1000, wastePercentage: 5, estimatedProductionTime: 10, nestingEfficiency: 95,
  cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 300, utilization: 95, cuts: [{ length: 1000, angle: 45, componentId: 'component-1', waste: 0 }] }],
  costBreakdown: { materialCost: 1, laborCost: 1, hardwareCost: 0, glazingCost: 0, totalCost: 2 },
};
const project = { id: 'position-1', systemPackId: 'pack-1', components: [{ id: 'component-1', profile, quantity: 1, cuttingLengths: [1000] }] } as WindowUnit;

describe('workflow fail-closed validation', () => {
  it('rejects missing profiles and non-finite component lengths', () => {
    const invalid = { ...project, components: [{ ...project.components[0], profile: {} as Profile, cuttingLengths: [Number.NaN] }] };
    expect(validateOptimizationInputs(invalid).errors.map(issue => issue.code)).toEqual(expect.arrayContaining(['UNRESOLVED_PROFILE', 'INVALID_COMPONENT_VALUES']));
  });

  it('rejects empty and non-finite solver results consistently', () => {
    const empty = { ...validResult, cuttingPlan: [] };
    const nonFinite = { ...validResult, materialUsage: Number.POSITIVE_INFINITY };
    expect(validateOptimizationResult(empty).valid).toBe(false);
    expect(validateOptimizationResult(nonFinite).valid).toBe(false);
    expect(WorkflowValidator.validateOptimizationToCommercial(empty).passed).toBe(false);
    expect(validateStepTransition({ measurementData: null, currentProject: project, bom: null, optimizationResult: empty }, 'commercial').valid).toBe(false);
  });

  it('accepts a finite nonempty cutting result', () => {
    expect(validateOptimizationResult(validResult).valid).toBe(true);
  });
});
