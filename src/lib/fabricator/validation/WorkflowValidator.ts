<<<<<<< HEAD
/**
 * Fabricator Workflow Validator
 *
 * Validates pose-centric pipeline state for step transitions.
 * Phase 3.1: Inter-Step Validation (IMPROVEMENT_PLAN.md).
 *
 * Checks: Measuring→Design, Design→Optimization, Optimization→Commercial, Commercial→Production
 */

import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';

export type WorkflowStep =
  | 'measuring'
  | 'design'
  | 'preview3d'
  | 'optimization'
  | 'inventory'
  | 'production'
  | 'quality-control';

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  step?: WorkflowStep;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface WorkflowState {
  measurementData: MeasurementData | null;
  currentProject: WindowUnit | null;
  bom: CompleteBOM | null;
  optimizationResult: OptimizationResult | null;
}

const STEP_ORDER: WorkflowStep[] = [
  'measuring',
  'design',
  'preview3d',
  'optimization',
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
    return { valid: true, errors: [], warnings: [] };
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
    if (!state.currentProject) {
      errors.push({
        type: 'error',
        code: 'MISSING_PROJECT',
        message: 'Design data is required before optimization.',
        step: 'design',
      });
    } else {
      const comps = state.currentProject.components;

      if (!comps || comps.length === 0) {
        errors.push({
          type: 'error',
          code: 'INVALID_DESIGN',
          message: 'Design must have at least one component.',
          step: 'design',
        });
      }

      if (!state.currentProject.systemPackId) {
        warnings.push({
          type: 'warning',
          code: 'NO_SYSTEM_PACK',
          message: 'No system pack selected. BOM may be incomplete.',
          step: 'design',
        });
      }
    }
  }

  // Optimization → Commercial: need optimizationResult (BOM optional but recommended)
  if (targetStep === 'commercial' || targetStep === 'production') {
    if (!state.optimizationResult) {
      errors.push({
        type: 'error',
        code: 'MISSING_OPTIMIZATION',
        message: 'Optimization must be completed before commercial.',
        step: 'optimization',
      });
    } else if (!state.optimizationResult.cuttingPlan?.length) {
      errors.push({
        type: 'error',
        code: 'EMPTY_CUTTING_PLAN',
        message: 'Optimization produced no cutting plan.',
        step: 'optimization',
      });
    }

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
    if (!state.optimizationResult) {
      errors.push({
        type: 'error',
        code: 'MISSING_OPTIMIZATION',
        message: 'Optimization is required before production.',
        step: 'optimization',
      });
    }
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
=======
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';

export interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface ValidationResult {
  passed: boolean;
  issues: ValidationIssue[];
  warnings: ValidationIssue[];
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
      if (!optimization.cuttingPlan || optimization.cuttingPlan.length === 0) {
        issues.push({ code: 'O003', severity: 'warning', message: 'Cutting plan is empty — production documents will have no data' });
      }
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
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity !== 'error');

    return { passed: errors.length === 0, issues: errors, warnings };
  }
>>>>>>> origin/main
}
