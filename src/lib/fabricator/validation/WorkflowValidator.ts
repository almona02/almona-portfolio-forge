/**
 * Fabricator Workflow Validator
 *
 * Validates pose-centric pipeline state for step transitions.
 * Phase 3.1: Inter-Step Validation (IMPROVEMENT_PLAN.md).
 *
 * Checks: Measuring→Design, Design→Optimization, Optimization→Commercial, Commercial→Production
 */

import type { MeasurementData, OptimizationResult, WindowUnit } from '@/types/fabricator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';

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
}
