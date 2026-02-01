/**
 * Import Bridge Types
 * 
 * Type definitions for import bridges (DXF, CSV, LogiKal, KLAES).
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * All imports require Tier 3 validation and human verification.
 * 
 * @since Phase 4: Precision Upgrade Plan (January 2026)
 */

import type { WindowUnit } from '@/types/fabricator';

/**
 * Import Source Format
 */
export type ImportSourceFormat = 'dxf' | 'csv' | 'logikal' | 'klaes' | 'ercom';

/**
 * Import Target Format
 */
export type ImportTargetFormat = 'WindowUnit' | 'CutList' | 'BOM';

/**
 * Import Validation Result
 */
export interface ImportValidationResult {
  /** Is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Missing required fields */
  missing: string[];
  /** Mismatched fields */
  mismatched: string[];
}

/**
 * Import Result
 */
export interface ImportResult {
  /** Success */
  success: boolean;
  /** Imported window unit (if successful) */
  windowUnit?: WindowUnit;
  /** Validation result */
  validation: ImportValidationResult;
  /** Constitutional note */
  constitutionalNote: string;
  /** Import metadata */
  metadata: {
    sourceFormat: ImportSourceFormat;
    targetFormat: ImportTargetFormat;
    importedAt: Date;
    importedBy: string;
    fileHash?: string;
  };
}

/**
 * Import Bridge Configuration
 */
export interface ImportBridgeConfig {
  /** Source format */
  sourceFormat: ImportSourceFormat;
  /** Target format */
  targetFormat: ImportTargetFormat;
  /** Field mappings */
  fieldMappings: Record<string, string>;
  /** Required fields */
  requiredFields: string[];
  /** Optional fields */
  optionalFields: string[];
  /** Validation constraints */
  constraints: ImportConstraint[];
  /** Default values */
  defaults: Record<string, any>;
}

/**
 * Import Constraint
 */
export interface ImportConstraint {
  /** Field name */
  field: string;
  /** Constraint type */
  type: 'min' | 'max' | 'range' | 'enum' | 'regex' | 'required';
  /** Constraint value */
  value: any;
  /** Error message */
  errorMessage: string;
}

/**
 * DXF Import Options
 */
export interface DXFImportOptions {
  /** Scale factor */
  scaleFactor?: number;
  /** Unit conversion (mm, cm, m, inch) */
  unit?: 'mm' | 'cm' | 'm' | 'inch';
  /** Layer filter */
  layerFilter?: string[];
  /** Entity types to import */
  entityTypes?: ('line' | 'arc' | 'circle' | 'polyline')[];
}

/**
 * CSV Import Options
 */
export interface CSVImportOptions {
  /** Delimiter */
  delimiter?: string;
  /** Has header row */
  hasHeader?: boolean;
  /** Encoding */
  encoding?: 'utf-8' | 'latin1' | 'windows-1256';
  /** Skip rows */
  skipRows?: number;
}

/**
 * LogiKal Import Options
 */
export interface LogiKalImportOptions {
  /** Allow partial import */
  allowPartial?: boolean;
  /** Require validation */
  requireValidation?: boolean;
  /** Map only validated fields */
  mapOnlyValidated?: boolean;
}

/**
 * KLAES Import Options
 */
export interface KLAESImportOptions {
  /** Allow partial import */
  allowPartial?: boolean;
  /** Require validation */
  requireValidation?: boolean;
  /** Map only validated fields */
  mapOnlyValidated?: boolean;
}

