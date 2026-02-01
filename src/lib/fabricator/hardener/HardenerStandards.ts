/**
 * HardenerStandards - Egyptian and GCC Standards Mapping
 * 
 * Defines hardener code standards for Egyptian Code 2020 and GCC standards.
 * This module is Tier 3 deterministic - no ML, no supplier data dependencies.
 * 
 * Constitutional Compliance: AICS-001 §4.3.5 (Certification Constraints)
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

/**
 * Egyptian Code 2020 Hardener Standards
 */
export const EGYPTIAN_CODE_2020_STANDARDS = {
  /**
   * Aluminum profile hardener requirements
   */
  aluminum: {
    /**
     * Minimum hardener thickness based on sash size
     */
    minThickness: {
      small: 1.4,    // mm - Sash < 1.5m²
      medium: 1.6,   // mm - Sash 1.5-2.5m²
      large: 2.0,    // mm - Sash > 2.5m²
    },
    /**
     * Glass thickness requirements
     */
    glassThickness: {
      min: 4,        // mm
      max: 24,       // mm
    },
    /**
     * Sash size limits
     */
    sashSize: {
      width: { min: 300, max: 2000 },   // mm
      height: { min: 300, max: 3000 },  // mm
    },
  },
  /**
   * UPVC profile hardener requirements
   */
  upvc: {
    minThickness: {
      small: 1.2,    // mm - Sash < 1.5m²
      medium: 1.4,   // mm - Sash 1.5-2.5m²
      large: 1.8,    // mm - Sash > 2.5m²
    },
    glassThickness: {
      min: 4,        // mm
      max: 20,       // mm
    },
    sashSize: {
      width: { min: 300, max: 1800 },   // mm
      height: { min: 300, max: 2400 },  // mm
    },
  },
} as const;

/**
 * GCC Standards (UAE, Saudi, Kuwait, Qatar)
 */
export const GCC_STANDARDS = {
  uae: {
    standard: 'UAE-ES-2020',
    aluminum: {
      minThickness: {
        small: 1.4,
        medium: 1.6,
        large: 2.0,
      },
      glassThickness: {
        min: 4,
        max: 24,
      },
      sashSize: {
        width: { min: 300, max: 2000 },
        height: { min: 300, max: 3000 },
      },
    },
    upvc: {
      minThickness: {
        small: 1.2,
        medium: 1.4,
        large: 1.8,
      },
      glassThickness: {
        min: 4,
        max: 20,
      },
      sashSize: {
        width: { min: 300, max: 1800 },
        height: { min: 300, max: 2400 },
      },
    },
  },
  saudi: {
    standard: 'SA-SASO-2021',
    aluminum: {
      minThickness: {
        small: 1.4,
        medium: 1.6,
        large: 2.0,
      },
      glassThickness: {
        min: 4,
        max: 24,
      },
      sashSize: {
        width: { min: 300, max: 2000 },
        height: { min: 300, max: 3000 },
      },
    },
    upvc: {
      minThickness: {
        small: 1.2,
        medium: 1.4,
        large: 1.8,
      },
      glassThickness: {
        min: 4,
        max: 20,
      },
      sashSize: {
        width: { min: 300, max: 1800 },
        height: { min: 300, max: 2400 },
      },
    },
  },
  kuwait: {
    standard: 'KW-KS-2020',
    aluminum: {
      minThickness: {
        small: 1.4,
        medium: 1.6,
        large: 2.0,
      },
      glassThickness: {
        min: 4,
        max: 24,
      },
      sashSize: {
        width: { min: 300, max: 2000 },
        height: { min: 300, max: 3000 },
      },
    },
    upvc: {
      minThickness: {
        small: 1.2,
        medium: 1.4,
        large: 1.8,
      },
      glassThickness: {
        min: 4,
        max: 20,
      },
      sashSize: {
        width: { min: 300, max: 1800 },
        height: { min: 300, max: 2400 },
      },
    },
  },
  qatar: {
    standard: 'QA-QCS-2021',
    aluminum: {
      minThickness: {
        small: 1.4,
        medium: 1.6,
        large: 2.0,
      },
      glassThickness: {
        min: 4,
        max: 24,
      },
      sashSize: {
        width: { min: 300, max: 2000 },
        height: { min: 300, max: 3000 },
      },
    },
    upvc: {
      minThickness: {
        small: 1.2,
        medium: 1.4,
        large: 1.8,
      },
      glassThickness: {
        min: 4,
        max: 20,
      },
      sashSize: {
        width: { min: 300, max: 1800 },
        height: { min: 300, max: 2400 },
      },
    },
  },
} as const;

/**
 * Calculate sash area in m²
 */
export function calculateSashArea(width: number, height: number): number {
  return (width * height) / 1_000_000; // Convert mm² to m²
}

/**
 * Determine hardener thickness category based on sash area
 */
export function getThicknessCategory(area: number): 'small' | 'medium' | 'large' {
  if (area < 1.5) return 'small';
  if (area <= 2.5) return 'medium';
  return 'large';
}

/**
 * Validate glass thickness against standards
 */
export function validateGlassThickness(
  thickness: number,
  material: 'aluminum' | 'upvc',
  region: 'egypt' | 'uae' | 'saudi' | 'kuwait' | 'qatar' = 'egypt'
): { valid: boolean; reason?: string } {
  const standards = region === 'egypt' 
    ? EGYPTIAN_CODE_2020_STANDARDS[material]
    : GCC_STANDARDS[region][material];

  if (thickness < standards.glassThickness.min) {
    return {
      valid: false,
      reason: `Glass thickness ${thickness}mm is below minimum ${standards.glassThickness.min}mm for ${material} (${region})`,
    };
  }

  if (thickness > standards.glassThickness.max) {
    return {
      valid: false,
      reason: `Glass thickness ${thickness}mm exceeds maximum ${standards.glassThickness.max}mm for ${material} (${region})`,
    };
  }

  return { valid: true };
}

/**
 * Validate sash size against standards
 */
export function validateSashSize(
  width: number,
  height: number,
  material: 'aluminum' | 'upvc',
  region: 'egypt' | 'uae' | 'saudi' | 'kuwait' | 'qatar' = 'egypt'
): { valid: boolean; reason?: string } {
  const standards = region === 'egypt'
    ? EGYPTIAN_CODE_2020_STANDARDS[material]
    : GCC_STANDARDS[region][material];

  if (width < standards.sashSize.width.min || width > standards.sashSize.width.max) {
    return {
      valid: false,
      reason: `Sash width ${width}mm is outside allowed range ${standards.sashSize.width.min}-${standards.sashSize.width.max}mm for ${material} (${region})`,
    };
  }

  if (height < standards.sashSize.height.min || height > standards.sashSize.height.max) {
    return {
      valid: false,
      reason: `Sash height ${height}mm is outside allowed range ${standards.sashSize.height.min}-${standards.sashSize.height.max}mm for ${material} (${region})`,
    };
  }

  return { valid: true };
}

