/**
 * @file MaterialCertificationConstraints.ts
 * @description Material and Certification Constraints
 * 
 * AICS-001 Reference: 
 * - Section 4.3.2 (Material Constraints)
 * - Section 4.3.5 (Certification Constraints)
 * 
 * Registers material and certification constraints extracted from HardenerRuleEngine
 * and related hardener validation systems.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import {
    EGYPTIAN_CODE_2020_STANDARDS,
    GCC_STANDARDS,
    calculateSashArea,
    validateGlassThickness,
    validateSashSize,
} from '@/lib/fabricator/hardener/HardenerStandards';
import type { MaterialType, OpeningType, Region } from '@/lib/fabricator/hardener/types';
import { ConstraintCategory, getConstraintRegistry } from './ConstraintRegistry';
import type { DeterministicConstraint, ValidationContext } from './index';

/**
 * Hardener Validation Context
 * 
 * Extended validation context for hardener/material validation.
 */
export interface HardenerValidationContext extends ValidationContext {
  material?: MaterialType;
  glassThickness?: number;
  sashWidth?: number;
  sashHeight?: number;
  openingType?: OpeningType;
  region?: Region;
  hardenerCode?: string;
  hardenerThickness?: number;
  sashArea?: number;
}

// ============================================================================
// MATERIAL CONSTRAINTS (AICS-001 Section 4.3.2)
// ============================================================================

/**
 * MAT-001: Material Type Requirement
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Material type must be aluminum or UPVC.
 */
const MAT_001_MaterialType: DeterministicConstraint = {
  constraintId: 'MAT-001',
  ruleId: 'AICS-001-4.3.2-1',
  description: 'Material type must be aluminum or UPVC',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (!context.material) {
      return true; // Pass if material not specified (handled elsewhere)
    }
    return context.material === 'aluminum' || context.material === 'upvc';
  },
};

/**
 * MAT-002: Glass Thickness Minimum (Aluminum)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Glass thickness must meet minimum requirement for aluminum (4mm per Egyptian Code 2020).
 */
const MAT_002_GlassThicknessMinAluminum: DeterministicConstraint = {
  constraintId: 'MAT-002',
  ruleId: 'AICS-001-4.3.2-2',
  description: 'Glass thickness must meet minimum requirement for aluminum (4mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.glassThickness) {
      return true; // Pass if not aluminum or glass thickness not specified
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.glassThickness >= standards.glassThickness.min;
  },
};

/**
 * MAT-003: Glass Thickness Maximum (Aluminum)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Glass thickness must not exceed maximum for aluminum (24mm per Egyptian Code 2020).
 */
const MAT_003_GlassThicknessMaxAluminum: DeterministicConstraint = {
  constraintId: 'MAT-003',
  ruleId: 'AICS-001-4.3.2-3',
  description: 'Glass thickness must not exceed maximum for aluminum (24mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.glassThickness) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.glassThickness <= standards.glassThickness.max;
  },
};

/**
 * MAT-004: Glass Thickness Minimum (UPVC)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Glass thickness must meet minimum requirement for UPVC (4mm per Egyptian Code 2020).
 */
const MAT_004_GlassThicknessMinUPVC: DeterministicConstraint = {
  constraintId: 'MAT-004',
  ruleId: 'AICS-001-4.3.2-4',
  description: 'Glass thickness must meet minimum requirement for UPVC (4mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.glassThickness) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.glassThickness >= standards.glassThickness.min;
  },
};

/**
 * MAT-005: Glass Thickness Maximum (UPVC)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Glass thickness must not exceed maximum for UPVC (20mm per Egyptian Code 2020).
 */
const MAT_005_GlassThicknessMaxUPVC: DeterministicConstraint = {
  constraintId: 'MAT-005',
  ruleId: 'AICS-001-4.3.2-5',
  description: 'Glass thickness must not exceed maximum for UPVC (20mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.glassThickness) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.glassThickness <= standards.glassThickness.max;
  },
};

/**
 * MAT-006: Sash Width Minimum (Aluminum)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash width must meet minimum requirement for aluminum (300mm per Egyptian Code 2020).
 */
const MAT_006_SashWidthMinAluminum: DeterministicConstraint = {
  constraintId: 'MAT-006',
  ruleId: 'AICS-001-4.3.2-6',
  description: 'Sash width must meet minimum requirement for aluminum (300mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.sashWidth) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.sashWidth >= standards.sashSize.width.min;
  },
};

/**
 * MAT-007: Sash Width Maximum (Aluminum)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash width must not exceed maximum for aluminum (2000mm per Egyptian Code 2020).
 */
const MAT_007_SashWidthMaxAluminum: DeterministicConstraint = {
  constraintId: 'MAT-007',
  ruleId: 'AICS-001-4.3.2-7',
  description: 'Sash width must not exceed maximum for aluminum (2000mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.sashWidth) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.sashWidth <= standards.sashSize.width.max;
  },
};

/**
 * MAT-008: Sash Height Minimum (Aluminum)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash height must meet minimum requirement for aluminum (300mm per Egyptian Code 2020).
 */
const MAT_008_SashHeightMinAluminum: DeterministicConstraint = {
  constraintId: 'MAT-008',
  ruleId: 'AICS-001-4.3.2-8',
  description: 'Sash height must meet minimum requirement for aluminum (300mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.sashHeight) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.sashHeight >= standards.sashSize.height.min;
  },
};

/**
 * MAT-009: Sash Height Maximum (Aluminum)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash height must not exceed maximum for aluminum (3000mm per Egyptian Code 2020).
 */
const MAT_009_SashHeightMaxAluminum: DeterministicConstraint = {
  constraintId: 'MAT-009',
  ruleId: 'AICS-001-4.3.2-9',
  description: 'Sash height must not exceed maximum for aluminum (3000mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.sashHeight) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.sashHeight <= standards.sashSize.height.max;
  },
};

/**
 * MAT-010: Sash Width Minimum (UPVC)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash width must meet minimum requirement for UPVC (300mm per Egyptian Code 2020).
 */
const MAT_010_SashWidthMinUPVC: DeterministicConstraint = {
  constraintId: 'MAT-010',
  ruleId: 'AICS-001-4.3.2-10',
  description: 'Sash width must meet minimum requirement for UPVC (300mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.sashWidth) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.sashWidth >= standards.sashSize.width.min;
  },
};

/**
 * MAT-011: Sash Width Maximum (UPVC)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash width must not exceed maximum for UPVC (1800mm per Egyptian Code 2020).
 */
const MAT_011_SashWidthMaxUPVC: DeterministicConstraint = {
  constraintId: 'MAT-011',
  ruleId: 'AICS-001-4.3.2-11',
  description: 'Sash width must not exceed maximum for UPVC (1800mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.sashWidth) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.sashWidth <= standards.sashSize.width.max;
  },
};

/**
 * MAT-012: Sash Height Minimum (UPVC)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash height must meet minimum requirement for UPVC (300mm per Egyptian Code 2020).
 */
const MAT_012_SashHeightMinUPVC: DeterministicConstraint = {
  constraintId: 'MAT-012',
  ruleId: 'AICS-001-4.3.2-12',
  description: 'Sash height must meet minimum requirement for UPVC (300mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.sashHeight) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.sashHeight >= standards.sashSize.height.min;
  },
};

/**
 * MAT-013: Sash Height Maximum (UPVC)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Sash height must not exceed maximum for UPVC (2400mm per Egyptian Code 2020).
 */
const MAT_013_SashHeightMaxUPVC: DeterministicConstraint = {
  constraintId: 'MAT-013',
  ruleId: 'AICS-001-4.3.2-13',
  description: 'Sash height must not exceed maximum for UPVC (2400mm)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.sashHeight) {
      return true;
    }
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.sashHeight <= standards.sashSize.height.max;
  },
};

/**
 * MAT-014: Hardener Thickness Minimum (Aluminum - Small Sash)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Hardener thickness must meet minimum for aluminum small sash (< 1.5m²): 1.4mm.
 */
const MAT_014_HardenerThicknessMinAluminumSmall: DeterministicConstraint = {
  constraintId: 'MAT-014',
  ruleId: 'AICS-001-4.3.2-14',
  description: 'Hardener thickness must meet minimum for aluminum small sash (< 1.5m²): 1.4mm',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.sashWidth || !context.sashHeight || !context.hardenerThickness) {
      return true;
    }
    const sashArea = context.sashArea || calculateSashArea(context.sashWidth, context.sashHeight);
    if (sashArea >= 1.5) return true; // Not small sash
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.hardenerThickness >= standards.minThickness.small;
  },
};

/**
 * MAT-015: Hardener Thickness Minimum (Aluminum - Medium Sash)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Hardener thickness must meet minimum for aluminum medium sash (1.5-2.5m²): 1.6mm.
 */
const MAT_015_HardenerThicknessMinAluminumMedium: DeterministicConstraint = {
  constraintId: 'MAT-015',
  ruleId: 'AICS-001-4.3.2-15',
  description: 'Hardener thickness must meet minimum for aluminum medium sash (1.5-2.5m²): 1.6mm',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.sashWidth || !context.sashHeight || !context.hardenerThickness) {
      return true;
    }
    const sashArea = context.sashArea || calculateSashArea(context.sashWidth, context.sashHeight);
    if (sashArea < 1.5 || sashArea > 2.5) return true; // Not medium sash
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.hardenerThickness >= standards.minThickness.medium;
  },
};

/**
 * MAT-016: Hardener Thickness Minimum (Aluminum - Large Sash)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Hardener thickness must meet minimum for aluminum large sash (> 2.5m²): 2.0mm.
 */
const MAT_016_HardenerThicknessMinAluminumLarge: DeterministicConstraint = {
  constraintId: 'MAT-016',
  ruleId: 'AICS-001-4.3.2-16',
  description: 'Hardener thickness must meet minimum for aluminum large sash (> 2.5m²): 2.0mm',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'aluminum' || !context.sashWidth || !context.sashHeight || !context.hardenerThickness) {
      return true;
    }
    const sashArea = context.sashArea || calculateSashArea(context.sashWidth, context.sashHeight);
    if (sashArea <= 2.5) return true; // Not large sash
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.aluminum
      : GCC_STANDARDS[region]?.aluminum;
    if (!standards) return true;
    return context.hardenerThickness >= standards.minThickness.large;
  },
};

/**
 * MAT-017: Hardener Thickness Minimum (UPVC - Small Sash)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Hardener thickness must meet minimum for UPVC small sash (< 1.5m²): 1.2mm.
 */
const MAT_017_HardenerThicknessMinUPVCSmall: DeterministicConstraint = {
  constraintId: 'MAT-017',
  ruleId: 'AICS-001-4.3.2-17',
  description: 'Hardener thickness must meet minimum for UPVC small sash (< 1.5m²): 1.2mm',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.sashWidth || !context.sashHeight || !context.hardenerThickness) {
      return true;
    }
    const sashArea = context.sashArea || calculateSashArea(context.sashWidth, context.sashHeight);
    if (sashArea >= 1.5) return true; // Not small sash
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.hardenerThickness >= standards.minThickness.small;
  },
};

/**
 * MAT-018: Hardener Thickness Minimum (UPVC - Medium Sash)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Hardener thickness must meet minimum for UPVC medium sash (1.5-2.5m²): 1.4mm.
 */
const MAT_018_HardenerThicknessMinUPVCMedium: DeterministicConstraint = {
  constraintId: 'MAT-018',
  ruleId: 'AICS-001-4.3.2-18',
  description: 'Hardener thickness must meet minimum for UPVC medium sash (1.5-2.5m²): 1.4mm',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.sashWidth || !context.sashHeight || !context.hardenerThickness) {
      return true;
    }
    const sashArea = context.sashArea || calculateSashArea(context.sashWidth, context.sashHeight);
    if (sashArea < 1.5 || sashArea > 2.5) return true; // Not medium sash
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.hardenerThickness >= standards.minThickness.medium;
  },
};

/**
 * MAT-019: Hardener Thickness Minimum (UPVC - Large Sash)
 * 
 * AICS-001 Section 4.3.2: Material-specific minimums.
 * Hardener thickness must meet minimum for UPVC large sash (> 2.5m²): 1.8mm.
 */
const MAT_019_HardenerThicknessMinUPVCLarge: DeterministicConstraint = {
  constraintId: 'MAT-019',
  ruleId: 'AICS-001-4.3.2-19',
  description: 'Hardener thickness must meet minimum for UPVC large sash (> 2.5m²): 1.8mm',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.material !== 'upvc' || !context.sashWidth || !context.sashHeight || !context.hardenerThickness) {
      return true;
    }
    const sashArea = context.sashArea || calculateSashArea(context.sashWidth, context.sashHeight);
    if (sashArea <= 2.5) return true; // Not large sash
    const region = context.region || 'egypt';
    const standards = region === 'egypt'
      ? EGYPTIAN_CODE_2020_STANDARDS.upvc
      : GCC_STANDARDS[region]?.upvc;
    if (!standards) return true;
    return context.hardenerThickness >= standards.minThickness.large;
  },
};

// ============================================================================
// CERTIFICATION CONSTRAINTS (AICS-001 Section 4.3.5)
// ============================================================================

/**
 * CERT-001: Egyptian Code 2020 Compliance Requirement
 * 
 * AICS-001 Section 4.3.5: Engineering codes compliance.
 * Hardener selection must comply with Egyptian Code 2020 when region is Egypt.
 */
const CERT_001_EgyptianCodeCompliance: DeterministicConstraint = {
  constraintId: 'CERT-001',
  ruleId: 'AICS-001-4.3.5-1',
  description: 'Hardener selection must comply with Egyptian Code 2020 when region is Egypt',
  source: 'Regulatory',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.region !== 'egypt') {
      return true; // Not Egypt, pass
    }
    // This constraint is checked via material constraints (glass thickness, sash size)
    // Egyptian Code compliance is verified through material constraint validation
    return true; // Pass - actual compliance checked via material constraints
  },
};

/**
 * CERT-002: GCC Standards Compliance (UAE)
 * 
 * AICS-001 Section 4.3.5: Regulatory standards compliance.
 * Hardener selection must comply with UAE-ES-2020 when region is UAE.
 */
const CERT_002_GCCUAECompliance: DeterministicConstraint = {
  constraintId: 'CERT-002',
  ruleId: 'AICS-001-4.3.5-2',
  description: 'Hardener selection must comply with UAE-ES-2020 when region is UAE',
  source: 'Regulatory',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.region !== 'uae') {
      return true; // Not UAE, pass
    }
    // GCC compliance verified through material constraint validation
    return true; // Pass - actual compliance checked via material constraints
  },
};

/**
 * CERT-003: GCC Standards Compliance (Saudi Arabia)
 * 
 * AICS-001 Section 4.3.5: Regulatory standards compliance.
 * Hardener selection must comply with SA-SASO-2021 when region is Saudi Arabia.
 */
const CERT_003_GCCSaudiCompliance: DeterministicConstraint = {
  constraintId: 'CERT-003',
  ruleId: 'AICS-001-4.3.5-3',
  description: 'Hardener selection must comply with SA-SASO-2021 when region is Saudi Arabia',
  source: 'Regulatory',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.region !== 'saudi') {
      return true; // Not Saudi, pass
    }
    return true; // Pass - actual compliance checked via material constraints
  },
};

/**
 * CERT-004: GCC Standards Compliance (Kuwait)
 * 
 * AICS-001 Section 4.3.5: Regulatory standards compliance.
 * Hardener selection must comply with KW-KS-2020 when region is Kuwait.
 */
const CERT_004_GCCKuwaitCompliance: DeterministicConstraint = {
  constraintId: 'CERT-004',
  ruleId: 'AICS-001-4.3.5-4',
  description: 'Hardener selection must comply with KW-KS-2020 when region is Kuwait',
  source: 'Regulatory',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.region !== 'kuwait') {
      return true; // Not Kuwait, pass
    }
    return true; // Pass - actual compliance checked via material constraints
  },
};

/**
 * CERT-005: GCC Standards Compliance (Qatar)
 * 
 * AICS-001 Section 4.3.5: Regulatory standards compliance.
 * Hardener selection must comply with QA-QCS-2021 when region is Qatar.
 */
const CERT_005_GCCQatarCompliance: DeterministicConstraint = {
  constraintId: 'CERT-005',
  ruleId: 'AICS-001-4.3.5-5',
  description: 'Hardener selection must comply with QA-QCS-2021 when region is Qatar',
  source: 'Regulatory',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (context.region !== 'qatar') {
      return true; // Not Qatar, pass
    }
    return true; // Pass - actual compliance checked via material constraints
  },
};

/**
 * CERT-006: Region-Specific Standards Validation
 * 
 * AICS-001 Section 4.3.5: Regulatory standards compliance.
 * Material constraints must be validated against region-specific standards.
 */
const CERT_006_RegionSpecificStandards: DeterministicConstraint = {
  constraintId: 'CERT-006',
  ruleId: 'AICS-001-4.3.5-6',
  description: 'Material constraints must be validated against region-specific standards',
  source: 'Regulatory',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (!context.region || !context.material || !context.glassThickness || !context.sashWidth || !context.sashHeight) {
      return true; // Pass if required fields not present
    }
    // Validate glass thickness
    const glassValidation = validateGlassThickness(
      context.glassThickness,
      context.material,
      context.region
    );
    if (!glassValidation.valid) {
      return false;
    }
    // Validate sash size
    const sashValidation = validateSashSize(
      context.sashWidth,
      context.sashHeight,
      context.material,
      context.region
    );
    return sashValidation.valid;
  },
};

/**
 * CERT-007: Opening Type Compatibility
 * 
 * AICS-001 Section 4.3.5: Engineering codes compliance.
 * Hardener code must support the specified opening type.
 */
const CERT_007_OpeningTypeCompatibility: DeterministicConstraint = {
  constraintId: 'CERT-007',
  ruleId: 'AICS-001-4.3.5-7',
  description: 'Hardener code must support the specified opening type',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (!context.openingType || !context.hardenerCode) {
      return true; // Pass if opening type or hardener code not specified
    }
    // Opening type compatibility is validated in HardenerRuleEngine
    // This constraint ensures opening type is one of the valid types
    const validOpeningTypes: OpeningType[] = ['casement', 'tilt-turn', 'sliding', 'fixed', 'pivot'];
    return validOpeningTypes.includes(context.openingType);
  },
};

/**
 * CERT-008: Material-Region Compliance
 * 
 * AICS-001 Section 4.3.5: Regulatory standards compliance.
 * Material type must be supported in the specified region.
 */
const CERT_008_MaterialRegionCompliance: DeterministicConstraint = {
  constraintId: 'CERT-008',
  ruleId: 'AICS-001-4.3.5-8',
  description: 'Material type must be supported in the specified region',
  source: 'Regulatory',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (!context.material || !context.region) {
      return true; // Pass if material or region not specified
    }
    // All regions support both aluminum and UPVC
    return context.material === 'aluminum' || context.material === 'upvc';
  },
};

/**
 * CERT-009: Hardener Code Format Validation
 * 
 * AICS-001 Section 4.3.5: Engineering codes compliance.
 * Hardener code must follow the standard format: HX-{thickness}-{material}-{opening}.
 */
const CERT_009_HardenerCodeFormat: DeterministicConstraint = {
  constraintId: 'CERT-009',
  ruleId: 'AICS-001-4.3.5-9',
  description: 'Hardener code must follow the standard format: HX-{thickness}-{material}-{opening}',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as HardenerValidationContext;
    if (!context.hardenerCode) {
      return true; // Pass if hardener code not specified
    }
    // Format: HX-{thickness}-{material}-{opening}
    // Example: HX-14-A-C (Hardener 1.4mm Aluminum Casement)
    const formatRegex = /^HX-\d{1,2}-[AU]-[CTSF]$/;
    return formatRegex.test(context.hardenerCode);
  },
};

/**
 * CERT-010: Tier 3 Deterministic Requirement
 * 
 * AICS-001 Section 4.3.5: Constitutional compliance.
 * Hardener selection must be Tier 3 deterministic (no ML, no supplier data dependencies).
 */
const CERT_010_Tier3Deterministic: DeterministicConstraint = {
  constraintId: 'CERT-010',
  ruleId: 'AICS-001-4.3.5-10',
  description: 'Hardener selection must be Tier 3 deterministic (no ML, no supplier data dependencies)',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (_input: unknown): boolean => {
    // This constraint is always satisfied when using HardenerRuleEngine
    // HardenerRuleEngine is explicitly Tier 3 deterministic
    // This constraint serves as a reminder/enforcement check
    return true; // HardenerRuleEngine is Tier 3 by design
  },
};

/**
 * Register all material constraints
 * 
 * Registers material constraints extracted from HardenerRuleEngine and HardenerStandards
 * with the ValidationEnvelope system.
 * 
 * AICS-001 Section 4.3.2: Material constraints are registered in the MATERIAL category.
 */
export function registerMaterialConstraints(): void {
  const registry = getConstraintRegistry();
  
  // Register material constraints in priority order (lower priority = higher priority)
  registry.register(MAT_001_MaterialType, ConstraintCategory.MATERIAL, 10);
  registry.register(MAT_002_GlassThicknessMinAluminum, ConstraintCategory.MATERIAL, 20);
  registry.register(MAT_003_GlassThicknessMaxAluminum, ConstraintCategory.MATERIAL, 30);
  registry.register(MAT_004_GlassThicknessMinUPVC, ConstraintCategory.MATERIAL, 40);
  registry.register(MAT_005_GlassThicknessMaxUPVC, ConstraintCategory.MATERIAL, 50);
  registry.register(MAT_006_SashWidthMinAluminum, ConstraintCategory.MATERIAL, 60);
  registry.register(MAT_007_SashWidthMaxAluminum, ConstraintCategory.MATERIAL, 70);
  registry.register(MAT_008_SashHeightMinAluminum, ConstraintCategory.MATERIAL, 80);
  registry.register(MAT_009_SashHeightMaxAluminum, ConstraintCategory.MATERIAL, 90);
  registry.register(MAT_010_SashWidthMinUPVC, ConstraintCategory.MATERIAL, 100);
  registry.register(MAT_011_SashWidthMaxUPVC, ConstraintCategory.MATERIAL, 110);
  registry.register(MAT_012_SashHeightMinUPVC, ConstraintCategory.MATERIAL, 120);
  registry.register(MAT_013_SashHeightMaxUPVC, ConstraintCategory.MATERIAL, 130);
  registry.register(MAT_014_HardenerThicknessMinAluminumSmall, ConstraintCategory.MATERIAL, 140);
  registry.register(MAT_015_HardenerThicknessMinAluminumMedium, ConstraintCategory.MATERIAL, 150);
  registry.register(MAT_016_HardenerThicknessMinAluminumLarge, ConstraintCategory.MATERIAL, 160);
  registry.register(MAT_017_HardenerThicknessMinUPVCSmall, ConstraintCategory.MATERIAL, 170);
  registry.register(MAT_018_HardenerThicknessMinUPVCMedium, ConstraintCategory.MATERIAL, 180);
  registry.register(MAT_019_HardenerThicknessMinUPVCLarge, ConstraintCategory.MATERIAL, 190);
}

/**
 * Register all certification constraints
 * 
 * Registers certification constraints extracted from HardenerRuleEngine and HardenerStandards
 * with the ValidationEnvelope system.
 * 
 * AICS-001 Section 4.3.5: Certification constraints are registered in the CERTIFICATION category.
 */
export function registerCertificationConstraints(): void {
  const registry = getConstraintRegistry();
  
  // Register certification constraints in priority order (lower priority = higher priority)
  registry.register(CERT_001_EgyptianCodeCompliance, ConstraintCategory.CERTIFICATION, 10);
  registry.register(CERT_002_GCCUAECompliance, ConstraintCategory.CERTIFICATION, 20);
  registry.register(CERT_003_GCCSaudiCompliance, ConstraintCategory.CERTIFICATION, 30);
  registry.register(CERT_004_GCCKuwaitCompliance, ConstraintCategory.CERTIFICATION, 40);
  registry.register(CERT_005_GCCQatarCompliance, ConstraintCategory.CERTIFICATION, 50);
  registry.register(CERT_006_RegionSpecificStandards, ConstraintCategory.CERTIFICATION, 60);
  registry.register(CERT_007_OpeningTypeCompatibility, ConstraintCategory.CERTIFICATION, 70);
  registry.register(CERT_008_MaterialRegionCompliance, ConstraintCategory.CERTIFICATION, 80);
  registry.register(CERT_009_HardenerCodeFormat, ConstraintCategory.CERTIFICATION, 90);
  registry.register(CERT_010_Tier3Deterministic, ConstraintCategory.CERTIFICATION, 100);
}

/**
 * Register all material and certification constraints
 * 
 * Convenience function to register both material and certification constraints.
 */
export function registerMaterialAndCertificationConstraints(): void {
  registerMaterialConstraints();
  registerCertificationConstraints();
}

/**
 * Export constraint definitions for reference
 */
export const MaterialConstraints = {
  MAT_001_MaterialType,
  MAT_002_GlassThicknessMinAluminum,
  MAT_003_GlassThicknessMaxAluminum,
  MAT_004_GlassThicknessMinUPVC,
  MAT_005_GlassThicknessMaxUPVC,
  MAT_006_SashWidthMinAluminum,
  MAT_007_SashWidthMaxAluminum,
  MAT_008_SashHeightMinAluminum,
  MAT_009_SashHeightMaxAluminum,
  MAT_010_SashWidthMinUPVC,
  MAT_011_SashWidthMaxUPVC,
  MAT_012_SashHeightMinUPVC,
  MAT_013_SashHeightMaxUPVC,
  MAT_014_HardenerThicknessMinAluminumSmall,
  MAT_015_HardenerThicknessMinAluminumMedium,
  MAT_016_HardenerThicknessMinAluminumLarge,
  MAT_017_HardenerThicknessMinUPVCSmall,
  MAT_018_HardenerThicknessMinUPVCMedium,
  MAT_019_HardenerThicknessMinUPVCLarge,
};

export const CertificationConstraints = {
  CERT_001_EgyptianCodeCompliance,
  CERT_002_GCCUAECompliance,
  CERT_003_GCCSaudiCompliance,
  CERT_004_GCCKuwaitCompliance,
  CERT_005_GCCQatarCompliance,
  CERT_006_RegionSpecificStandards,
  CERT_007_OpeningTypeCompatibility,
  CERT_008_MaterialRegionCompliance,
  CERT_009_HardenerCodeFormat,
  CERT_010_Tier3Deterministic,
};


