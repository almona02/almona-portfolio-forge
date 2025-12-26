/**
 * BendRadiusValidator - Material Bend Limit Checking
 * 
 * Validates if a profile can be bent based on:
 * - Material properties
 * - Profile dimensions
 * - Workshop capabilities
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 23)
 */

export interface BendValidation {
  isBendable: boolean;
  minBendRadius: number; // mm
  maxBendRadius: number; // mm
  recommendedRadius: number; // mm
  bendAllowance: number; // mm
  warnings: string[];
}

/**
 * BendRadiusValidator - Validates bend feasibility
 */
export class BendRadiusValidator {
  /**
   * Material bend limits (minimum bend radius in mm)
   */
  private readonly MATERIAL_LIMITS: Record<string, {
    minBendRadius: number;
    maxBendRadius: number;
    bendAllowance: number; // mm per degree
  }> = {
    aluminum: {
      minBendRadius: 800, // 800mm minimum for 70mm profile
      maxBendRadius: 5000,
      bendAllowance: 0.5
    },
    upvc: {
      minBendRadius: 2000, // UPVC is harder to bend
      maxBendRadius: 10000,
      bendAllowance: 1.0
    }
  };

  /**
   * Workshop capabilities (by region)
   */
  private readonly WORKSHOP_CAPABILITIES: Record<string, {
    maxBendRadius: number;
    canContinuousBend: boolean;
    canSegmentedBend: boolean;
  }> = {
    cairo_standard: {
      maxBendRadius: 1500,
      canContinuousBend: true,
      canSegmentedBend: true
    },
    alexandria_coastal: {
      maxBendRadius: 2000,
      canContinuousBend: true,
      canSegmentedBend: true
    },
    new_cairo_premium: {
      maxBendRadius: 3000,
      canContinuousBend: true,
      canSegmentedBend: true
    },
    upper_egypt: {
      maxBendRadius: 1200,
      canContinuousBend: false,
      canSegmentedBend: true
    }
  };

  /**
   * Validate bend feasibility
   */
  validateBend(
    radius: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number,
    profileDepth: number,
    workshopId?: string
  ): BendValidation {
    const materialLimits = this.MATERIAL_LIMITS[material];
    const warnings: string[] = [];

    // Adjust minimum radius based on profile width
    const adjustedMinRadius = materialLimits.minBendRadius * (profileWidth / 70); // Base on 70mm profile

    // Check if radius is within material limits
    const isBendable = radius >= adjustedMinRadius && radius <= materialLimits.maxBendRadius;

    if (!isBendable) {
      warnings.push(`Radius ${radius}mm is outside material limits for ${material}`);
    }

    // Check workshop capabilities
    if (workshopId) {
      const workshop = this.WORKSHOP_CAPABILITIES[workshopId];
      if (workshop && radius > workshop.maxBendRadius) {
        warnings.push(`Radius ${radius}mm exceeds workshop capability (max: ${workshop.maxBendRadius}mm)`);
      }
    }

    // Calculate bend allowance
    const bendAllowance = materialLimits.bendAllowance * (profileWidth / 70);

    return {
      isBendable,
      minBendRadius: adjustedMinRadius,
      maxBendRadius: materialLimits.maxBendRadius,
      recommendedRadius: Math.max(adjustedMinRadius, radius),
      bendAllowance,
      warnings
    };
  }

  /**
   * Get minimum bend radius for material and profile
   */
  getMinimumBendRadius(
    material: 'aluminum' | 'upvc',
    profileWidth: number
  ): number {
    const materialLimits = this.MATERIAL_LIMITS[material];
    return materialLimits.minBendRadius * (profileWidth / 70);
  }

  /**
   * Check if continuous bend is possible
   */
  canContinuousBend(
    radius: number,
    material: 'aluminum' | 'upvc',
    profileWidth: number,
    workshopId?: string
  ): boolean {
    const validation = this.validateBend(radius, material, profileWidth, 50, workshopId);
    
    if (!validation.isBendable) {
      return false;
    }

    if (workshopId) {
      const workshop = this.WORKSHOP_CAPABILITIES[workshopId];
      if (workshop && !workshop.canContinuousBend) {
        return false;
      }
    }

    return true;
  }
}

