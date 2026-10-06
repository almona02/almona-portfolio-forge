/**
 * Fabricator Workflow Validator
 *
 * Validates pose-centric pipeline state for step transitions.
 * Phase 3.1: Inter-Step Validation (IMPROVEMENT_PLAN.md).
 *
 * Exports both validateStepTransition (for workflow pages) and WorkflowValidator
 * class (for ValidationGate component).
 */

import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { isQualifiedBOM } from '@/lib/fabricator/bom/bomQualification';
import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';

export type WorkflowStep =
  | 'measuring'
  | 'design'
  | 'preview3d'
  | 'bom'
  | 'optimization'
  | 'commercial'
  | 'inventory'
  | 'production'
  | 'quality-control';

export interface ValidationIssue {
  type?: 'error' | 'warning';
  severity?: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  step?: WorkflowStep;
  field?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface WorkflowState {
  measurementData: MeasurementData | null;
  currentProject: WindowUnit | null;
  bom: CompleteBOM | null;
  optimizationResult: OptimizationResult | null;
}

const finitePositive = (value: number): boolean => Number.isFinite(value) && value > 0;
const finiteNonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;

export function bomMatchesPhysicalDesign(bom: CompleteBOM | null, project: WindowUnit | null): boolean {
  if (!bom?.profiles?.length || !project?.components?.length) return false;
  if (bom.profiles.some(profile => !Array.isArray(profile.cuttingLengths) || !Array.isArray(profile.angles)
      || profile.cuttingLengths.length !== profile.angles.length || profile.cuttingLengths.some(length => !finitePositive(length)))) return false;
  const key = (profileId: string, length: number, angle: number) => `${profileId}:${length.toFixed(3)}:${angle}`;
  const expected = project.components.flatMap(component => component.cuttingLengths.map((_, index) => {
    const cut = physicalCutForOccurrence(component, index, component.profile, project.systemPackId);
    return key(component.profile.id, cut.length, cut.angle);
  })).sort();
  const actual = bom.profiles.flatMap(profile => profile.cuttingLengths.map((length, index) =>
    key(profile.profileCode, length, profile.angles[index]))).sort();
  return expected.length === actual.length && expected.every((cut, index) => cut === actual[index]);
}

export function validateOptimizationInputs(project: WindowUnit | null): WorkflowValidationResult {
  const errors: ValidationIssue[] = [];
  if (!project) {
    errors.push({ type: 'error', code: 'MISSING_PROJECT', message: 'Design data is required before optimization.', step: 'design' });
  } else if (!project.components?.length) {
    errors.push({ type: 'error', code: 'INVALID_DESIGN', message: 'Design must have at least one component.', step: 'design' });
  } else {
    const componentIds = new Set<string>();
    project.components.forEach((component, index) => {
      if (!component.id || componentIds.has(component.id)) {
        errors.push({ type: 'error', code: 'INVALID_COMPONENT_IDENTITY', message: `Component ${index + 1} has a missing or duplicate identity.`, step: 'design' });
      }
      componentIds.add(component.id);
      if (!component.profile?.id) errors.push({ type: 'error', code: 'UNRESOLVED_PROFILE', message: `Component ${index + 1} has no resolved profile.`, step: 'design' });
      if (!finitePositive(component.quantity) || !component.cuttingLengths?.length || component.cuttingLengths.some(length => !finitePositive(length))) {
        errors.push({ type: 'error', code: 'INVALID_COMPONENT_VALUES', message: `Component ${index + 1} has invalid manufacturing values.`, step: 'design' });
      }
    });
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

export function validateOptimizationResult(result: OptimizationResult | null): WorkflowValidationResult {
  const errors: ValidationIssue[] = [];
  if (!result) {
    errors.push({ type: 'error', code: 'MISSING_OPTIMIZATION', message: 'Optimization must complete before continuing.', step: 'optimization' });
    return { valid: false, errors, warnings: [] };
  }
  const metrics = [result.materialUsage, result.wastePercentage, result.estimatedProductionTime, result.nestingEfficiency,
    result.costBreakdown?.materialCost, result.costBreakdown?.laborCost, result.costBreakdown?.hardwareCost,
    result.costBreakdown?.glazingCost, result.costBreakdown?.totalCost];
  if (metrics.some(value => typeof value !== 'number' || !finiteNonNegative(value))) {
    errors.push({ type: 'error', code: 'NON_FINITE_OPTIMIZATION', message: 'Optimization contains invalid manufacturing values.', step: 'optimization' });
  }
  if ([result.wastePercentage, result.nestingEfficiency].some(value => value > 100)) {
    errors.push({ type: 'error', code: 'INVALID_OPTIMIZATION_PERCENTAGE', message: 'Optimization percentages must be between zero and 100.', step: 'optimization' });
  }
  if (!result.cuttingPlan?.length) {
    errors.push({ type: 'error', code: 'EMPTY_CUTTING_PLAN', message: 'Optimization produced no cutting plan.', step: 'optimization' });
  } else {
    result.cuttingPlan.forEach((plan, index) => {
      const consumed = (plan.cuts || []).reduce((sum, cut) => sum + cut.length, 0);
      const kerf = Number(plan.profile?.specifications?.sawKerf ?? 0);
      const trim = Number(plan.profile?.specifications?.barEndTrim ?? 0);
      if (![kerf, trim].every(value => Number.isFinite(value) && value >= 0)
          || consumed + kerf * (plan.cuts?.length || 0) + trim * 2 > plan.stockLength + 0.001) {
        errors.push({ type: 'error', code: 'MACHINING_CAPACITY_EXCEEDED', message: `Cutting plan ${index + 1} exceeds stock after kerf and end trim.`, step: 'optimization' });
      }
      if (finitePositive(plan.stockLength) && (Math.abs(plan.stockLength - consumed - plan.totalWaste) > 0.001 || Math.abs(plan.utilization - consumed / plan.stockLength * 100) > 0.011)) {
        errors.push({ type: 'error', code: 'STOCK_LEDGER_MISMATCH', message: `Cutting plan ${index + 1} waste and utilization do not reconcile to its stock bar.`, step: 'optimization' });
      }
      if (plan.utilization > 100 || (plan.cuts || []).reduce((sum, cut) => sum + cut.length, 0) > plan.stockLength + 0.001 || plan.totalWaste > plan.stockLength) {
        errors.push({ type: 'error', code: 'STOCK_CAPACITY_EXCEEDED', message: `Cutting plan ${index + 1} exceeds its physical stock capacity.`, step: 'optimization' });
      }
      if (!plan.profile?.id || !finitePositive(plan.stockLength) || !finiteNonNegative(plan.totalWaste) || !finiteNonNegative(plan.utilization) || !plan.cuts?.length) {
        errors.push({ type: 'error', code: 'INVALID_CUTTING_PLAN', message: `Cutting plan ${index + 1} is incomplete.`, step: 'optimization' });
      } else if (plan.cuts.some(cut => !finitePositive(cut.length) || !Number.isFinite(cut.angle) || !finiteNonNegative(cut.waste) || !cut.componentId)) {
        errors.push({ type: 'error', code: 'INVALID_CUT', message: `Cutting plan ${index + 1} contains an invalid cut.`, step: 'optimization' });
      }
    });
    const stockTotal = result.cuttingPlan.reduce((sum, plan) => sum + plan.stockLength, 0);
    const wasteTotal = result.cuttingPlan.reduce((sum, plan) => sum + plan.totalWaste, 0);
    if (finitePositive(stockTotal) && (Math.abs(result.wastePercentage - wasteTotal / stockTotal * 100) > 0.011 || Math.abs(result.nestingEfficiency - (100 - wasteTotal / stockTotal * 100)) > 0.011)) {
      errors.push({ type: 'error', code: 'OPTIMIZATION_METRIC_MISMATCH', message: 'Optimization percentages do not reconcile to the physical stock ledger.', step: 'optimization' });
    }
  }
  return { valid: errors.length === 0, errors, warnings: [] };
}

export function validateOptimizationReconciliation(
  result: OptimizationResult | null,
  project: WindowUnit | null,
): WorkflowValidationResult {
  const base = validateOptimizationResult(result);
  const input = validateOptimizationInputs(project);
  const errors = [...base.errors, ...input.errors];
  if (!result || !project || input.errors.length > 0 || base.errors.some(error => ['MISSING_OPTIMIZATION', 'EMPTY_CUTTING_PLAN', 'INVALID_CUTTING_PLAN', 'INVALID_CUT'].includes(error.code))) {
    return { valid: false, errors, warnings: [] };
  }

  const expected = new Map(
    project.components.map(component => [
      component.id,
      { count: component.cuttingLengths.length, profileId: component.profile.id,
        cuts: component.cuttingLengths.map((_, index) => physicalCutForOccurrence(component, index, component.profile, project.systemPackId)), used: new Set<number>() },
    ]),
  );
  const actualCounts = new Map<string, number>();
  const physicalCutIds = new Set<string>();

  result.cuttingPlan.forEach((plan, planIndex) => {
    plan.cuts.forEach((cut, cutIndex) => {
      const component = expected.get(cut.componentId);
      if (!component) {
        errors.push({ type: 'error', code: 'UNKNOWN_OPTIMIZED_PIECE', message: `Cut ${planIndex + 1}.${cutIndex + 1} does not belong to the authoritative design.`, step: 'optimization' });
        return;
      }
      if (plan.profile.id !== component.profileId) {
        errors.push({ type: 'error', code: 'OPTIMIZED_PROFILE_MISMATCH', message: `Cut ${planIndex + 1}.${cutIndex + 1} uses the wrong profile.`, step: 'optimization' });
      }
      actualCounts.set(cut.componentId, (actualCounts.get(cut.componentId) ?? 0) + 1);
      const occurrence = cut.occurrenceIndex ?? component.cuts.findIndex((expectedCut, index) =>
        !component.used.has(index) && Math.abs(expectedCut.length - cut.length) <= 0.001 && expectedCut.angle === cut.angle);
      const expectedCut = component.cuts[occurrence];
      if (!expectedCut || !Number.isFinite(expectedCut.length) || Math.abs(expectedCut.length - cut.length) > 0.001 || expectedCut.angle !== cut.angle || component.used.has(occurrence)) {
        errors.push({ type: 'error', code: 'OPTIMIZED_CUT_GEOMETRY_MISMATCH', message: `Cut ${planIndex + 1}.${cutIndex + 1} does not match its manufacturing length and angle.`, step: 'optimization' });
      }
      component.used.add(occurrence);
      if (cut.occurrenceIndex !== undefined) {
        if (!Number.isInteger(cut.occurrenceIndex) || cut.occurrenceIndex < 0 || cut.occurrenceIndex >= component.count) {
          errors.push({ type: 'error', code: 'INVALID_CUT_OCCURRENCE', message: `Cut ${planIndex + 1}.${cutIndex + 1} has an invalid occurrence index.`, step: 'optimization' });
        }
        const expectedCutId = `${cut.componentId}:${cut.occurrenceIndex}`;
        if (cut.cutId !== undefined && cut.cutId !== expectedCutId) {
          errors.push({ type: 'error', code: 'INVALID_CUT_IDENTITY', message: `Cut ${planIndex + 1}.${cutIndex + 1} has inconsistent physical identity.`, step: 'optimization' });
        }
        if (physicalCutIds.has(expectedCutId)) {
          errors.push({ type: 'error', code: 'DUPLICATE_OPTIMIZED_PIECE', message: `Physical cut ${expectedCutId} appears more than once.`, step: 'optimization' });
        }
        physicalCutIds.add(expectedCutId);
      }
    });
  });

  expected.forEach((component, componentId) => {
    if ((actualCounts.get(componentId) ?? 0) !== component.count) {
      errors.push({ type: 'error', code: 'PIECE_RECONCILIATION_FAILED', message: `Component ${componentId} requires ${component.count} cuts but optimization produced ${actualCounts.get(componentId) ?? 0}.`, step: 'optimization' });
    }
  });

  return { valid: errors.length === 0, errors, warnings: [] };
}

const STEP_ORDER: WorkflowStep[] = [
  'measuring',
  'design',
  'preview3d',
  'optimization',
  'commercial',
  'inventory',
  'production',
  'quality-control',
];

/**
 * Validates that the user can proceed from the current state to the target step.
 * Returns errors (blocking) and warnings (non-blocking).
 */
export function validateStepTransition(
  state: WorkflowState,
  targetStep: WorkflowStep
): WorkflowValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const targetIndex = STEP_ORDER.indexOf(targetStep);
  if (targetIndex < 0) {
    return { valid: false, errors: [{ type: 'error', code: 'UNKNOWN_STEP', message: 'Unknown workflow step.' }], warnings: [] };
  }

  // Measuring → Design: need measurementData with width/height
  if (targetStep === 'design') {
    if (!state.measurementData) {
      errors.push({
        type: 'error',
        code: 'MISSING_MEASUREMENT',
        message: 'Measurement data is required before design.',
        step: 'measuring',
      });
    } else {
      const w = state.measurementData.width;
      const h = state.measurementData.height;
      const wNum = typeof w === 'string' ? parseFloat(w) : w;
      const hNum = typeof h === 'string' ? parseFloat(h) : h;
      if (isNaN(wNum) || wNum <= 0) {
        errors.push({
          type: 'error',
          code: 'INVALID_WIDTH',
          message: 'Valid width measurement is required.',
          step: 'measuring',
        });
      }
      if (isNaN(hNum) || hNum <= 0) {
        errors.push({
          type: 'error',
          code: 'INVALID_HEIGHT',
          message: 'Valid height measurement is required.',
          step: 'measuring',
        });
      }
    }
  }

  // Design → Optimization: need currentProject with components
  if (targetStep === 'optimization') {
    errors.push(...validateOptimizationInputs(state.currentProject).errors);
    if (!isQualifiedBOM(state.bom)) {
      errors.push({
        type: 'error',
        code: 'BOM_NOT_QUALIFIED',
        message: state.bom?.qualification?.reasons.join('; ') || 'A manufacturing-qualified BOM is required before optimization.',
        step: 'bom',
      });
    }
    if (state.currentProject && !state.currentProject.systemPackId) {
      errors.push({
        type: 'error',
        code: 'NO_SYSTEM_PACK',
        message: 'A system pack is required to resolve manufacturing profiles.',
        step: 'design',
      });
    }
  }

  // Optimization → Commercial: need optimizationResult (BOM optional but recommended)
  if (targetStep === 'commercial' || targetStep === 'production') {
    errors.push(...validateOptimizationReconciliation(state.optimizationResult, state.currentProject).errors);

    if (targetStep === 'production' && !isQualifiedBOM(state.bom)) {
      errors.push({
        type: 'error',
        code: 'BOM_NOT_QUALIFIED',
        message: 'A manufacturing-qualified BOM is required for production release.',
        step: 'bom',
      });
    }
  }

  // Production → Quality Control: optimization already validated above
  if (targetStep === 'quality-control') {
    errors.push(...validateOptimizationReconciliation(state.optimizationResult, state.currentProject).errors);
  }

  if (['optimization', 'commercial', 'production', 'quality-control'].includes(targetStep)
      && state.bom && !bomMatchesPhysicalDesign(state.bom, state.currentProject)) {
    errors.push({ type: 'error', code: 'BOM_CUT_GEOMETRY_MISMATCH',
      message: 'BOM cuts differ from the physical design. Regenerate and review the BOM before continuing.', step: 'bom' });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates that the user can access a specific step (e.g. when loading a page).
 */
export function validateStepAccess(state: WorkflowState, step: WorkflowStep): WorkflowValidationResult {
  return validateStepTransition(state, step);
}

/**
 * WorkflowValidator — Validates data completeness and feasibility between
 * each workflow step. Prevents invalid data from reaching downstream steps.
 *
 * Inspired by Logikal's continuous plausibility checks.
 *
 * @since Phase 2: Validation Layer
 */
export class WorkflowValidator {
  static validateMeasuringToDesign(
    measurement: MeasurementData | null,
    project: WindowUnit | null,
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!measurement) {
      issues.push({ code: 'M001', severity: 'error', message: 'Measurement data is required', field: 'measurementData' });
    } else {
      const w = Number(measurement.width);
      const h = Number(measurement.height);
      if (!w || w <= 0) issues.push({ code: 'M002', severity: 'error', message: 'Width must be greater than 0', field: 'width' });
      if (!h || h <= 0) issues.push({ code: 'M003', severity: 'error', message: 'Height must be greater than 0', field: 'height' });
      if (w > 6000) issues.push({ code: 'M004', severity: 'warning', message: 'Width exceeds standard stock length (6000mm)', field: 'width' });
      if (h > 3000) issues.push({ code: 'M005', severity: 'warning', message: 'Height exceeds 3000mm — verify structural requirements', field: 'height' });
    }

    if (!project?.systemPackId) {
      issues.push({ code: 'M006', severity: 'error', message: 'System pack selection is required', field: 'systemPackId' });
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity !== 'error');

    return { passed: errors.length === 0, issues: errors, warnings };
  }

  static validateDesignToBOM(project: WindowUnit | null): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!project) {
      issues.push({ code: 'D001', severity: 'error', message: 'Project data is required' });
    } else {
      if (!project.overallWidth || project.overallWidth <= 0) {
        issues.push({ code: 'D002', severity: 'error', message: 'Overall width is missing or invalid', field: 'overallWidth' });
      }
      if (!project.overallHeight || project.overallHeight <= 0) {
        issues.push({ code: 'D003', severity: 'error', message: 'Overall height is missing or invalid', field: 'overallHeight' });
      }
      if (!project.systemPackId) {
        issues.push({ code: 'D004', severity: 'error', message: 'System pack is not selected', field: 'systemPackId' });
      }
      if (!project.grid && !project.presetId) {
        issues.push({ code: 'D005', severity: 'error', message: 'An authoritative grid or preset is required before BOM generation' });
      }
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity !== 'error');

    return { passed: errors.length === 0, issues: errors, warnings };
  }

  static validateBOMToOptimization(bom: CompleteBOM | null): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!bom) {
      issues.push({ code: 'B001', severity: 'error', message: 'BOM must be generated before optimization' });
    } else {
      if (!bom.profiles || bom.profiles.length === 0) {
        issues.push({ code: 'B002', severity: 'error', message: 'BOM has no profiles — cannot optimize an empty cut list' });
      }
      if (bom.confidence < 0.8) {
        issues.push({ code: 'B003', severity: 'warning', message: `BOM confidence is low (${(bom.confidence * 100).toFixed(0)}%) — review before proceeding` });
      }
      if (bom.cost.totalCost <= 0) {
        issues.push({ code: 'B004', severity: 'warning', message: 'Total cost is zero — pricing data may be missing' });
      }
      if (!isQualifiedBOM(bom)) {
        issues.push({
          code: 'B005',
          severity: 'error',
          message: bom.qualification?.reasons.join('; ') || 'BOM lacks manufacturing qualification evidence',
        });
      }
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity !== 'error');

    return { passed: errors.length === 0, issues: errors, warnings };
  }

  static validateOptimizationToCommercial(
    optimization: OptimizationResult | null,
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!optimization) {
      issues.push({ code: 'O001', severity: 'error', message: 'Optimization must complete before generating a quote' });
    } else {
      if (optimization.wastePercentage > 30) {
        issues.push({ code: 'O002', severity: 'warning', message: `Waste is ${optimization.wastePercentage.toFixed(1)}% — consider adjusting stock lengths or batching` });
      }
      issues.push(...validateOptimizationResult(optimization).errors.map(issue => ({ ...issue, severity: 'error' as const })));
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity !== 'error');

    return { passed: errors.length === 0, issues: errors, warnings };
  }

  static validateCommercialToProduction(
    optimization: OptimizationResult | null,
    project: WindowUnit | null,
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (!project) {
      issues.push({ code: 'P001', severity: 'error', message: 'Project data is required for production' });
    }
    if (!optimization) {
      issues.push({ code: 'P002', severity: 'error', message: 'Optimization result is required for production' });
    } else {
      issues.push(...validateOptimizationResult(optimization).errors.map(issue => ({ ...issue, severity: 'error' as const })));
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity !== 'error');

    return { passed: errors.length === 0, issues: errors, warnings };
  }
}
