import { describe, expect, it } from 'vitest';
import type { OptimizationResult, Profile, WindowUnit } from '@/types/fabricator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { validateOptimizationInputs, validateOptimizationReconciliation, validateOptimizationResult, validateStepTransition, WorkflowValidator } from './WorkflowValidator';

const profile = { id: 'profile-1' } as Profile;
const validResult: OptimizationResult = {
  materialUsage: 1000, wastePercentage: 5000 / 6000 * 100, estimatedProductionTime: 10, nestingEfficiency: 1000 / 6000 * 100,
  cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 5000, utilization: 1000 / 6000 * 100, cuts: [{ length: 1000, angle: 45, componentId: 'component-1', waste: 0 }] }],
  costBreakdown: { materialCost: 1, laborCost: 1, hardwareCost: 0, glazingCost: 0, totalCost: 2 },
};
const project = { id: 'position-1', systemPackId: 'pack-1', components: [{ id: 'component-1', profile, quantity: 1, cuttingLengths: [1000], angles: [45] }] } as WindowUnit;

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
    expect(validateOptimizationReconciliation(validResult, project).valid).toBe(true);
  });

  it('rejects missing, duplicate, unknown and wrong-profile optimized pieces', () => {
    const missing = { ...validResult, cuttingPlan: [{ ...validResult.cuttingPlan[0], cuts: [] }] };
    const duplicate = {
      ...validResult,
      cuttingPlan: [{ ...validResult.cuttingPlan[0], cuts: [
        { ...validResult.cuttingPlan[0].cuts[0], cutId: 'component-1:0', occurrenceIndex: 0 },
        { ...validResult.cuttingPlan[0].cuts[0], cutId: 'component-1:0', occurrenceIndex: 0 },
      ] }],
    };
    const unknown = {
      ...validResult,
      cuttingPlan: [{ ...validResult.cuttingPlan[0], cuts: [{ ...validResult.cuttingPlan[0].cuts[0], componentId: 'other' }] }],
    };
    const wrongProfile = {
      ...validResult,
      cuttingPlan: [{ ...validResult.cuttingPlan[0], profile: { id: 'other-profile' } as Profile }],
    };
    expect(validateOptimizationReconciliation(missing, project).valid).toBe(false);
    expect(validateOptimizationReconciliation(duplicate, project).errors.map(issue => issue.code)).toContain('DUPLICATE_OPTIMIZED_PIECE');
    expect(validateOptimizationReconciliation(unknown, project).errors.map(issue => issue.code)).toContain('UNKNOWN_OPTIMIZED_PIECE');
    expect(validateOptimizationReconciliation(wrongProfile, project).errors.map(issue => issue.code)).toContain('OPTIMIZED_PROFILE_MISMATCH');
  });

  it('blocks BOM generation without authoritative geometry', () => {
    const result = WorkflowValidator.validateDesignToBOM(project);
    expect(result.passed).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain('D005');
  });

  it('blocks an unqualified BOM from optimization', () => {
    const bom = {
      profiles: [{ id: 'frame' }],
      confidence: 1,
      cost: { totalCost: 100 },
      qualification: {
        status: 'estimate',
        unplacedPieceCount: 6,
        reasons: ['Piece ledger mismatch'],
      },
    } as CompleteBOM;
    const result = WorkflowValidator.validateBOMToOptimization(bom);
    expect(result.passed).toBe(false);
    expect(result.issues.map(issue => issue.code)).toContain('B005');
    expect(validateStepTransition({
      measurementData: null,
      currentProject: project,
      bom,
      optimizationResult: null,
    }, 'optimization').errors.map(issue => issue.code)).toContain('BOM_NOT_QUALIFIED');
  });
});
