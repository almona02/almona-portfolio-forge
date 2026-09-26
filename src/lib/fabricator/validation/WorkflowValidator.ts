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
import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';

export type WorkflowStep =
  | 'measuring'
  | 'design'
  | 'preview3d'
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

export function validateOptimizationInputs(project: WindowUnit | null): WorkflowValidationResult {
  const errors: ValidationIssue[] = [];
  if (!project) {
    errors.push({ type: 'error', code: 'MISSING_PROJECT', message: 'Design data is required before optimization.', step: 'design' });
  } else if (!project.components?.length) {
    errors.push({ type: 'error', code: 'INVALID_DESIGN', message: 'Design must have at least one component.', step: 'design' });
  } else {
    project.components.forEach((component, index) => {
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
  if (!result.cuttingPlan?.length) {
    errors.push({ type: 'error', code: 'EMPTY_CUTTING_PLAN', message: 'Optimization produced no cutting plan.', step: 'optimization' });
  } else {
    result.cuttingPlan.forEach((plan, index) => {
      if (!plan.profile?.id || !finitePositive(plan.stockLength) || !finiteNonNegative(plan.totalWaste) || !finiteNonNegative(plan.utilization) || !plan.cuts?.length) {
        errors.push({ type: 'error', code: 'INVALID_CUTTING_PLAN', message: `Cutting plan ${index + 1} is incomplete.`, step: 'optimization' });
      } else if (plan.cuts.some(cut => !finitePositive(cut.length) || !Number.isFinite(cut.angle) || !finiteNonNegative(cut.waste) || !cut.componentId)) {
        errors.push({ type: 'error', code: 'INVALID_CUT', message: `Cutting plan ${index + 1} contains an invalid cut.`, step: 'optimization' });
      }
    });
  }
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
    errors.push(...validateOptimizationResult(state.optimizationResult).errors);

    if (targetStep === 'production' && !state.bom) {
      warnings.push({
        type: 'warning',
        code: 'NO_BOM',
        message: 'BOM not generated. Assembly sequence may be unavailable.',
        step: 'optimization',
      });
    }
  }

  // Production → Quality Control: optimization already validated above
  if (targetStep === 'quality-control') {
    errors.push(...validateOptimizationResult(state.optimizationResult).errors);
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
        issues.push({ code: 'D005', severity: 'warning', message: 'No grid layout or preset pattern defined — BOM will use defaults' });
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
