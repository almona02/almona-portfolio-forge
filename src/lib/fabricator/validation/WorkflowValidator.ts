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
}
