/**
 * Yilmaz Machine Validator
 * Validates cutting plans against Yilmaz machine specifications
 * Provides safety checks and automatic operation adjustments
 */

import { Cut, CuttingPlan, Profile } from '@/types/fabricator';
import { MACHINE_SPECS, YilmazMachineModel, YilmazMachineSpecs } from './YilmazGCodeGenerator';

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  affectedCuts?: number[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: ValidationError[];
}

export interface SafetyZone {
  x: { min: number; max: number };
  y: { min: number; max: number };
  z: { min: number; max: number };
}

export class MachineValidator {
  private specs: YilmazMachineSpecs;
  private safetyZones: SafetyZone[];

  constructor(machineModel: YilmazMachineModel) {
    this.specs = MACHINE_SPECS[machineModel];
    this.safetyZones = this.calculateSafetyZones();
  }

  /**
   * Validate cutting plan against machine capabilities
   */
  validateCuttingPlan(cuttingPlans: CuttingPlan[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: ValidationError[] = [];

    cuttingPlans.forEach((plan, planIndex) => {
      // Validate profile dimensions
      const profileErrors = this.validateProfile(plan.profile, planIndex);
      errors.push(...profileErrors.filter(e => e.severity === 'error'));
      warnings.push(...profileErrors.filter(e => e.severity === 'warning'));

      // Validate each cut
      plan.cuts.forEach((cut, cutIndex) => {
        const cutErrors = this.validateCut(cut, plan, planIndex, cutIndex);
        errors.push(...cutErrors.filter(e => e.severity === 'error'));
        warnings.push(...cutErrors.filter(e => e.severity === 'warning'));
        suggestions.push(...cutErrors.filter(e => e.severity === 'info'));
      });

      // Validate stock length
      const stockErrors = this.validateStockLength(plan);
      errors.push(...stockErrors.filter(e => e.severity === 'error'));
      warnings.push(...stockErrors.filter(e => e.severity === 'warning'));
    });

    // Check for collision zones
    const collisionWarnings = this.checkCollisions(cuttingPlans);
    warnings.push(...collisionWarnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate profile against machine capabilities
   */
  private validateProfile(profile: Profile, planIndex: number): ValidationError[] {
    const errors: ValidationError[] = [];
    const width = profile.width || 0;
    const height = profile.height || 50;
    const _thickness = profile.thickness || 10;

    // Check width
    if (width > this.specs.maxWidth) {
      errors.push({
        code: 'PROFILE_WIDTH_EXCEEDED',
        message: `Profile width ${width}mm exceeds maximum ${this.specs.maxWidth}mm for ${this.specs.model}`,
        severity: 'error',
        suggestion: `Reduce profile width to ${this.specs.maxWidth}mm or less`,
        affectedCuts: [planIndex]
      });
    }

    // Check height
    if (height > this.specs.maxHeight) {
      errors.push({
        code: 'PROFILE_HEIGHT_EXCEEDED',
        message: `Profile height ${height}mm exceeds maximum ${this.specs.maxHeight}mm for ${this.specs.model}`,
        severity: 'error',
        suggestion: `Reduce profile height to ${this.specs.maxHeight}mm or less`,
        affectedCuts: [planIndex]
      });
    }

    // Check material support
    const materialLower = profile.material.toLowerCase();
    const supportedMaterials = ['aluminum', 'alüminyum', 'upvc', 'pvc', 'wood', 'ahşap'];
    if (!supportedMaterials.some(mat => materialLower.includes(mat))) {
      errors.push({
        code: 'MATERIAL_NOT_VERIFIED',
        message: `Material "${profile.material}" not in standard supported list`,
        severity: 'warning',
        suggestion: 'Verify material compatibility with machine specifications',
        affectedCuts: [planIndex]
      });
    }

    return errors;
  }

  /**
   * Validate individual cut
   */
  private validateCut(
    cut: Cut,
    plan: CuttingPlan,
    planIndex: number,
    cutIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const suggestions: ValidationError[] = [];

    // Check cut length
    if (cut.length < this.specs.minCutLength) {
      errors.push({
        code: 'CUT_TOO_SHORT',
        message: `Cut length ${cut.length}mm is below minimum ${this.specs.minCutLength}mm`,
        severity: 'error',
        suggestion: `Increase cut length to at least ${this.specs.minCutLength}mm`,
        affectedCuts: [cutIndex]
      });
    }

    if (cut.length > this.specs.maxCutLength) {
      errors.push({
        code: 'CUT_TOO_LONG',
        message: `Cut length ${cut.length}mm exceeds maximum ${this.specs.maxCutLength}mm`,
        severity: 'error',
        suggestion: `Split cut into multiple pieces or reduce length to ${this.specs.maxCutLength}mm`,
        affectedCuts: [cutIndex]
      });
    }

    // Check angle support
    const supportedAngle = this.specs.supportedAngles.find(
      angle => Math.abs(angle - cut.angle) < 0.1
    );

    if (!supportedAngle) {
      // Find nearest supported angle
      const nearestAngle = this.findNearestSupportedAngle(cut.angle);
      const angleDiff = Math.abs(nearestAngle - cut.angle);

      if (angleDiff < 1) {
        suggestions.push({
          code: 'ANGLE_ADJUSTMENT',
          message: `Angle ${cut.angle}° adjusted to nearest supported angle ${nearestAngle}°`,
          severity: 'info',
          suggestion: `Using ${nearestAngle}° instead of ${cut.angle}°`,
          affectedCuts: [cutIndex]
        });
      } else {
        warnings.push({
          code: 'ANGLE_NOT_SUPPORTED',
          message: `Angle ${cut.angle}° is not directly supported`,
          severity: 'warning',
          suggestion: `Nearest supported angle is ${nearestAngle}° (difference: ${angleDiff.toFixed(1)}°)`,
          affectedCuts: [cutIndex]
        });
      }
    }

    // Check if cut exceeds stock length
    if (cut.length > plan.stockLength) {
      errors.push({
        code: 'CUT_EXCEEDS_STOCK',
        message: `Cut length ${cut.length}mm exceeds stock length ${plan.stockLength}mm`,
        severity: 'error',
        suggestion: `Use longer stock or split the cut`,
        affectedCuts: [cutIndex]
      });
    }

    // Check precision requirements
    const precisionRequired = this.calculatePrecisionRequired(cut, plan.profile);
    if (precisionRequired < this.specs.precision) {
      warnings.push({
        code: 'PRECISION_WARNING',
        message: `Cut may require precision better than machine capability (${this.specs.precision}mm)`,
        severity: 'warning',
        suggestion: 'Consider manual finishing or higher precision machine',
        affectedCuts: [cutIndex]
      });
    }

    return [...errors, ...warnings, ...suggestions];
  }

  /**
   * Validate stock length
   */
  private validateStockLength(plan: CuttingPlan): ValidationError[] {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check if stock length exceeds machine capacity
    if (plan.stockLength > this.specs.maxLength) {
      errors.push({
        code: 'STOCK_TOO_LONG',
        message: `Stock length ${plan.stockLength}mm exceeds machine maximum ${this.specs.maxLength}mm`,
        severity: 'error',
        suggestion: `Use stock length of ${this.specs.maxLength}mm or less`
      });
    }

    // Check utilization
    const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
    const utilization = (totalCutLength / plan.stockLength) * 100;

    if (utilization < 50) {
      warnings.push({
        code: 'LOW_UTILIZATION',
        message: `Stock utilization is only ${utilization.toFixed(1)}%`,
        severity: 'warning',
        suggestion: 'Consider using shorter stock to reduce waste'
      });
    }

    return [...errors, ...warnings];
  }

  /**
   * Check for potential collisions
   */
  private checkCollisions(cuttingPlans: CuttingPlan[]): ValidationError[] {
    const warnings: ValidationError[] = [];

    // Simple collision detection: check if cuts overlap in space
    // This is a simplified version - real collision detection would be more complex
    cuttingPlans.forEach((plan, _planIndex) => {
      for (let i = 0; i < plan.cuts.length; i++) {
        for (let j = i + 1; j < plan.cuts.length; j++) {
          const cut1 = plan.cuts[i];
          const cut2 = plan.cuts[j];

          // Check if cuts might overlap (simplified check)
          if (this.cutsMightOverlap(cut1, cut2, plan.stockLength)) {
            warnings.push({
              code: 'POTENTIAL_COLLISION',
              message: `Cuts ${i + 1} and ${j + 1} may overlap in cutting sequence`,
              severity: 'warning',
              suggestion: 'Review cutting sequence or adjust positions',
              affectedCuts: [i, j]
            });
          }
        }
      }
    });

    return warnings;
  }

  /**
   * Check if two cuts might overlap
   */
  private cutsMightOverlap(cut1: Cut, cut2: Cut, stockLength: number): boolean {
    // Simplified overlap detection
    // In reality, this would need to consider actual positions and angles
    const totalLength = cut1.length + cut2.length;
    return totalLength > stockLength * 0.9; // If cuts take up >90% of stock, might overlap
  }

  /**
   * Find nearest supported angle
   */
  private findNearestSupportedAngle(angle: number): number {
    let nearest = this.specs.supportedAngles[0];
    let minDiff = Math.abs(angle - nearest);

    this.specs.supportedAngles.forEach((supportedAngle) => {
      const diff = Math.abs(angle - supportedAngle);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = supportedAngle;
      }
    });

    return nearest;
  }

  /**
   * Calculate precision required for cut
   */
  private calculatePrecisionRequired(cut: Cut, _profile: Profile): number {
    // Simplified precision calculation
    // Real calculation would consider angle, material, tool, etc.
    const basePrecision = 0.1;
    const angleFactor = cut.angle !== 90 ? 1.5 : 1.0;
    return basePrecision * angleFactor;
  }

  /**
   * Calculate safety zones for machine
   */
  private calculateSafetyZones(): SafetyZone[] {
    // Define safety zones (areas to avoid)
    const zones: SafetyZone[] = [
      // Clamp zones (typically at ends)
      {
        x: { min: -50, max: 50 },
        y: { min: -50, max: 50 },
        z: { min: -100, max: 100 }
      },
      {
        x: { min: this.specs.maxLength - 50, max: this.specs.maxLength + 50 },
        y: { min: -50, max: 50 },
        z: { min: -100, max: 100 }
      }
    ];

    return zones;
  }

  /**
   * Check if position is in safety zone
   */
  isInSafetyZone(x: number, y: number, z: number): boolean {
    return this.safetyZones.some(zone => {
      return (
        x >= zone.x.min && x <= zone.x.max &&
        y >= zone.y.min && y <= zone.y.max &&
        z >= zone.z.min && z <= zone.z.max
      );
    });
  }

  /**
   * Get automatic adjustment suggestions
   */
  getAdjustmentSuggestions(cuttingPlans: CuttingPlan[]): Array<{
    planIndex: number;
    cutIndex: number;
    original: Cut;
    adjusted: Cut;
    reason: string;
  }> {
    const suggestions: Array<{
      planIndex: number;
      cutIndex: number;
      original: Cut;
      adjusted: Cut;
      reason: string;
    }> = [];

    cuttingPlans.forEach((plan, planIndex) => {
      plan.cuts.forEach((cut, cutIndex) => {
        // Adjust angle if not supported
        const supportedAngle = this.specs.supportedAngles.find(
          angle => Math.abs(angle - cut.angle) < 0.1
        );

        if (!supportedAngle) {
          const nearestAngle = this.findNearestSupportedAngle(cut.angle);
          if (Math.abs(nearestAngle - cut.angle) < 5) {
            suggestions.push({
              planIndex,
              cutIndex,
              original: cut,
              adjusted: { ...cut, angle: nearestAngle },
              reason: `Angle adjusted from ${cut.angle}° to nearest supported ${nearestAngle}°`
            });
          }
        }

        // Adjust length if too short
        if (cut.length < this.specs.minCutLength) {
          suggestions.push({
            planIndex,
            cutIndex,
            original: cut,
            adjusted: { ...cut, length: this.specs.minCutLength },
            reason: `Length increased from ${cut.length}mm to minimum ${this.specs.minCutLength}mm`
          });
        }
      });
    });

    return suggestions;
  }

  /**
   * Get machine specifications
   */
  getMachineSpecs(): YilmazMachineSpecs {
    return { ...this.specs };
  }
}

