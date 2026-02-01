/**
 * Hardener Types - TypeScript Definitions
 * 
 * Type definitions for hardener code selection system.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

/**
 * Hardener Code (e.g., "HX-14-A-C")
 */
export type HardenerCode = string;

/**
 * Material Type
 */
export type MaterialType = 'aluminum' | 'upvc';

/**
 * Opening Type
 */
export type OpeningType = 'casement' | 'tilt-turn' | 'sliding' | 'fixed' | 'pivot';

/**
 * Region
 */
export type Region = 'egypt' | 'uae' | 'saudi' | 'kuwait' | 'qatar';

/**
 * Hardener Code Specification
 */
export interface HardenerCodeSpec {
  /** Hardener code (e.g., "HX-14-A-C") */
  code: HardenerCode;
  /** Human-readable name */
  name: string;
  /** Hardener thickness in mm */
  thickness: number;
  /** Material type */
  material: MaterialType;
  /** Supported opening types */
  openingTypes: OpeningType[];
  /** Sash area range in m² */
  sashArea: { min: number; max: number };
  /** Glass thickness range in mm */
  glassThickness: { min: number; max: number };
  /** Egyptian Code 2020 compliance */
  egyptianCodeCompliant: boolean;
  /** GCC standards compliance */
  gccStandards: string[];
}

/**
 * Hardener Selection Context
 */
export interface HardenerSelectionContext {
  /** Profile system ID */
  profileSystem: string;
  /** Material type */
  material: MaterialType;
  /** Glass thickness in mm */
  glassThickness: number;
  /** Sash width in mm */
  sashWidth: number;
  /** Sash height in mm */
  sashHeight: number;
  /** Opening type */
  openingType: OpeningType;
  /** Region */
  region?: Region;
}

/**
 * Hardener Selection Result
 */
export interface HardenerSelectionResult {
  /** Tier 3 compliance */
  tier: 'Tier 3';
  /** Deterministic flag */
  deterministic: true;
  /** Selected hardener code */
  hardenerCode: HardenerCode;
  /** Rule ID that selected this hardener */
  ruleId: string;
  /** Validation status */
  validation: 'PASS' | 'FAIL' | 'WARNING';
  /** Validation details */
  validationDetails: {
    profileSystemMatch: boolean;
    glassThicknessMatch: boolean;
    sashSizeMatch: boolean;
    openingTypeMatch: boolean;
    egyptianCodeCompliant: boolean;
    constraintViolations: string[];
  };
  /** Human-readable justification */
  justification: string;
  /** Constitutional disclaimer */
  constitutionalDisclaimer: string;
  /** System stop required */
  systemStopRequired: boolean;
  /** Requires human intervention */
  requiresHumanIntervention: boolean;
}

/**
 * Hardener Rule
 */
export interface HardenerRule {
  /** Rule ID (e.g., "HD-EG-ALU-12") */
  ruleId: string;
  /** Profile system */
  profileSystem: string;
  /** Material type */
  material: MaterialType;
  /** Glass thickness range */
  glassThickness: { min: number; max: number };
  /** Sash size range */
  sashSize: {
    width: { min: number; max: number };
    height: { min: number; max: number };
  };
  /** Opening types */
  openingType: OpeningType[];
  /** Hardener code */
  hardenerCode: HardenerCode;
  /** Human-readable justification */
  justification: string;
  /** Egyptian Code compliance */
  egyptianCodeCompliant: boolean;
  /** GCC standards */
  gccStandards?: string[];
}

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Is valid */
  isValid: boolean;
  /** System stop required */
  systemStop?: boolean;
  /** Reason for failure */
  reason?: string;
  /** Constitutional note */
  constitutionalNote?: string;
  /** Requires human intervention */
  requiresHumanIntervention?: boolean;
  /** Warnings */
  warnings?: string[];
  /** Hardener code (if valid) */
  hardenerCode?: HardenerCode;
  /** Rule ID (if valid) */
  ruleId?: string;
}

