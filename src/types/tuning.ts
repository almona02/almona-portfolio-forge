/**
 * System Tuning Studio Type Definitions
 * 
 * Extends the base SystemPack interface to support mutability, validation,
 * and micron-level parameter tuning for 99.8% accuracy.
 */

import type { SystemPack } from '@/types/fabricator';
import type { Profile } from '@/types/fabricator';

/**
 * Micron-level parameters that control 99.8% manufacturing accuracy
 * These values are tuned per system and affect cutting calculations
 */
export interface MicronParameters {
  /** Saw blade kerf width (mm) - default 4.2mm, range 3.5-5.0mm */
  sawBladeKerf: number;
  /** Bar end trim (mm) - default 15mm, range 10-20mm */
  barEndTrim: number;
  /** Transom milling depth (mm) - default 2.5mm, range 1.0-5.0mm */
  transomMillingDepth: number;
  /** UPVC welding loss per corner (mm) - default 3mm, range 2-5mm (UPVC only) */
  upvcWeldingLoss?: number;
  /** Screen adapter offset (mm) - default 15mm, range 12-18mm (Panda-specific) */
  screenAdapterOffset?: number;
  /** Batch calibration offset (mm) - for machine-specific adjustments */
  batchCalibrationOffset?: number;
}

/**
 * System constraints for validation
 */
export interface SystemConstraints {
  /** Minimum window width (mm) */
  minWidthMm: number;
  /** Maximum window width (mm) */
  maxWidthMm: number;
  /** Minimum window height (mm) */
  minHeightMm: number;
  /** Maximum window height (mm) */
  maxHeightMm: number;
  /** Maximum sash weight (kg) for hardware capacity */
  maxSashWeightKg?: number;
  /** Maximum sash width (mm) for structural integrity */
  maxSashWidthMm?: number;
  /** Maximum sash height (mm) for structural integrity */
  maxSashHeightMm?: number;
}

/**
 * Validation test result for a single window size
 */
export interface ValidationTestResult {
  /** Test dimensions */
  dimensions: { width: number; height: number };
  /** Test result */
  passed: boolean;
  /** Error codes if failed */
  errors?: Array<{ code: string; message: string; messageArabic: string }>;
  /** Warning codes if warnings */
  warnings?: Array<{ code: string; message: string; messageArabic: string }>;
}

/**
 * Complete validation report from sandbox testing
 */
export interface ValidationReport {
  /** Total tests run */
  totalTests: number;
  /** Number of passed tests */
  passedTests: number;
  /** Number of failed tests */
  failedTests: number;
  /** Pass rate percentage (target: 99.8%+) */
  passRate: number;
  /** Failed test cases */
  failures: ValidationTestResult[];
  /** Edge cases that passed but are close to limits */
  edgeCases: ValidationTestResult[];
  /** Recommendations for constraint adjustments */
  recommendations: string[];
  /** Overall validation status */
  status: 'pending' | 'running' | 'passed' | 'failed' | 'needs_adjustment';
  /** Timestamp of validation run */
  validatedAt?: Date;
}

/**
 * Tuning session state
 */
export type TuningStatus = 
  | 'draft'           // Initial creation, not yet tuned
  | 'tuned'           // Micron parameters set, not yet validated
  | 'validated'       // Passed sandbox testing (99.8%+)
  | 'published'       // Live in Gallery/Pilot
  | 'archived';       // Deprecated/removed

/**
 * Mutable System Pack - editable version for tuning studio
 */
export interface MutableSystemPack extends Omit<SystemPack, 'meta'> {
  /** System pack metadata (editable) */
  meta: SystemPack['meta'] & {
    /** Tuning status */
    tuningStatus: TuningStatus;
    /** Created by (manufacturer/maalem ID) */
    createdBy?: string;
    /** Last modified by */
    modifiedBy?: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Last modification timestamp */
    updatedAt: Date;
    /** Gold Tier verification status */
    goldTierVerified?: boolean;
    /** Verification date */
    verifiedAt?: Date;
  };
  
  /** Micron-level parameters for 99.8% accuracy */
  micronConfig: MicronParameters;
  
  /** System constraints for validation */
  constraints: SystemConstraints;
  
  /** Validation report from sandbox testing */
  validationReport?: ValidationReport;
  
  /** Profiles in this system (editable list) */
  profiles: Array<Profile & {
    /** Role assignment status */
    roleAssigned: boolean;
    /** Tuning status for this profile */
    tuningStatus?: 'untuned' | 'in_progress' | 'tuned';
  }>;
  
  /** Linked hardware IDs */
  hardwareIds: string[];
  
  /** Machining zones (for router/pantograph operations) */
  machiningZones?: Array<{
    id: string;
    profileId: string;
    zoneType: 'slot' | 'pocket' | 'drill' | 'counterbore';
    dimensions: { width: number; height: number; depth: number };
    position: { x: number; y: number };
  }>;
}

/**
 * Tuning session state (UI state management)
 */
export interface TuningSession {
  /** Current system pack being tuned */
  systemPack: MutableSystemPack | null;
  
  /** Selected profile ID for editing */
  selectedProfileId: string | null;
  
  /** Active tab/panel in workbench */
  activePanel: 'inventory' | 'canvas' | 'properties' | 'validation';
  
  /** Unsaved changes flag */
  hasUnsavedChanges: boolean;
  
  /** Validation in progress */
  isValidating: boolean;
  
  /** Save in progress */
  isSaving: boolean;
}

/**
 * Default micron parameters by system category
 */
export const DEFAULT_MICRON_PARAMS: Record<'aluminum' | 'upvc', MicronParameters> = {
  aluminum: {
    sawBladeKerf: 4.2,
    barEndTrim: 15,
    transomMillingDepth: 2.5,
    screenAdapterOffset: 15, // Panda-specific, optional
    batchCalibrationOffset: 0,
  },
  upvc: {
    sawBladeKerf: 4.2,
    barEndTrim: 15,
    transomMillingDepth: 2.5,
    upvcWeldingLoss: 3,
    batchCalibrationOffset: 0,
  },
};

/**
 * Default system constraints
 */
export const DEFAULT_CONSTRAINTS: SystemConstraints = {
  minWidthMm: 400,
  maxWidthMm: 3000,
  minHeightMm: 400,
  maxHeightMm: 3000,
  maxSashWeightKg: 80,
  maxSashWidthMm: 2000,
  maxSashHeightMm: 2500,
};

