/**
 * Supplier Pack Types - TypeScript Definitions
 * 
 * Type definitions for supplier pack system (Phase 2: Precision Upgrade Plan).
 * Supplier packs are Tier 2 advisory data - never authoritative.
 * 
 * Constitutional Compliance: AICS-001 §5.2 (Principle of Subordination)
 * Constitutional Lock: Supplier packs may NOT define constraints (AICS-001 §4.6, §6.2)
 * 
 * @since Phase 2: Precision Upgrade Plan (January 2026)
 */

/**
 * Supplier Metadata
 */
export interface SupplierMetadata {
  /** Supplier unique identifier */
  supplierId: string;
  /** Supplier name */
  name: string;
  /** Supplier region(s) */
  regions: ('egypt' | 'uae' | 'saudi' | 'kuwait' | 'qatar')[];
  /** Supplier contact information */
  contact: {
    email: string;
    phone?: string;
    website?: string;
  };
  /** Supplier tier (priority) */
  tier: 'Tier 1' | 'Tier 2' | 'Tier 3';
  /** Volume classification */
  volume: 'high' | 'medium' | 'low';
  /** Predictability rating (price stability, delivery reliability) */
  predictability: 'high' | 'medium' | 'low';
  /** Certifications held */
  certifications: string[];
}

/**
 * Supplier Profile Reference
 * 
 * References a profile from the supplier catalog.
 * Note: This is advisory data, not a constraint definition.
 */
export interface SupplierProfileReference {
  /** Profile ID in supplier catalog */
  profileId: string;
  /** Supplier part number */
  partNumber: string;
  /** Profile name */
  name: string;
  /** Material type */
  material: 'aluminum' | 'upvc';
  /** Compatible system pack IDs (references only) */
  compatibleSystemPacks: string[];
  /** Price reference (advisory, can change) */
  priceReference?: {
    unitPrice: number;
    currency: string;
    lastUpdated: string;
  };
  /** Availability status (advisory) */
  availability?: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';
  /** Lead time in days (advisory) */
  leadTime?: number;
}

/**
 * Supplier Hardware Reference
 * 
 * References hardware from the supplier catalog.
 * Note: This is advisory data, not a constraint definition.
 */
export interface SupplierHardwareReference {
  /** Hardware ID in supplier catalog */
  hardwareId: string;
  /** Supplier part number */
  partNumber: string;
  /** Hardware name */
  name: string;
  /** Hardware category */
  category: 'hinge' | 'lock' | 'handle' | 'roller' | 'corner_key' | 'gasket' | 'drainage_cap';
  /** Compatible system pack IDs (references only) */
  compatibleSystemPacks: string[];
  /** Price reference (advisory, can change) */
  priceReference?: {
    unitPrice: number;
    currency: string;
    lastUpdated: string;
  };
  /** Availability status (advisory) */
  availability?: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';
  /** Lead time in days (advisory) */
  leadTime?: number;
}

/**
 * Price Reference
 * 
 * Advisory pricing information (Tier 2, mutable).
 */
export interface PriceReference {
  /** Profile prices by profile ID */
  profiles: Record<string, {
    unitPrice: number;
    currency: string;
    lastUpdated: string;
    minOrderQuantity?: number;
  }>;
  /** Hardware prices by hardware ID */
  hardware: Record<string, {
    unitPrice: number;
    currency: string;
    lastUpdated: string;
    minOrderQuantity?: number;
  }>;
  /** Currency used */
  currency: string;
  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * Supplier Pack Certification
 * 
 * Certification metadata for supplier pack validation.
 */
export interface SupplierPackCertification {
  /** Pack ID */
  packId: string;
  /** Pack version */
  version: string;
  /** Supplier ID */
  supplierId: string;
  /** Certification status */
  certificationStatus: 'pending' | 'certified' | 'rejected' | 'superseded';
  /** Certification date */
  certificationDate: string;
  /** Certified by (human certifier ID) */
  certifiedBy: string;
  /** Validation results */
  validationResults: {
    geometryCompatibility: {
      status: 'PASS' | 'FAIL' | 'WARNING';
      violations: string[];
      compatibleProfiles: string[];
    };
    constraintCompliance: {
      status: 'PASS' | 'FAIL' | 'WARNING';
      violations: string[];
      compliantConstraints: string[];
      /** Referenced Tier 3 constraint IDs (not definitions) */
      referencedConstraints: string[];
    };
    versionLock: {
      status: 'PASS' | 'FAIL';
      hash: string; // SHA-256 of pack contents
      immutable: boolean;
    };
  };
  /** Constitutional metadata */
  constitutionalMetadata: {
    tier: 'Tier 2'; // Advisory only
    deterministic: false; // Prices can change
    mutable: false; // Pack itself is immutable (new version required)
    authority: 'advisory'; // Never authoritative
  };
}

/**
 * Supplier Pack
 * 
 * Tier 2 advisory data structure.
 * Constitutional Lock: May NOT define constraints, only reference Tier 3 constraints.
 */
export interface SupplierPack {
  /** Pack metadata */
  metadata: SupplierMetadata;
  /** Profile references (advisory) */
  profiles: SupplierProfileReference[];
  /** Hardware references (advisory) */
  hardware: SupplierHardwareReference[];
  /** Price reference (advisory, mutable) */
  priceReference: PriceReference;
  /** Certification information */
  certification: SupplierPackCertification;
  
  // ❌ FORBIDDEN: Constraint definitions
  // constraints?: Constraint[];  // ❌ FORBIDDEN
  // requirements?: Requirement[]; // ❌ FORBIDDEN
  // rules?: Rule[];              // ❌ FORBIDDEN
}

/**
 * Profile Suggestion
 * 
 * Tier 2 advisory suggestion that must pass Tier 3 validation.
 */
export interface ProfileSuggestion {
  /** Profile ID */
  profileId: string;
  /** Supplier ID */
  supplier: string;
  /** Price (advisory) */
  price?: number;
  /** Currency */
  currency?: string;
  /** Tier classification */
  tier: 'Tier 2';
  /** Deterministic flag (always false for Tier 2) */
  deterministic: false;
  /** Confidence level (advisory flag, not ML confidence) */
  confidence: 'advisory';
  /** Availability status */
  availability?: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued';
  /** Lead time in days */
  leadTime?: number;
}

/**
 * Profile Suggestions Result
 */
export interface ProfileSuggestionsResult {
  /** Suggestions (Tier 2 advisory) */
  suggestions: ProfileSuggestion[];
  /** Constitutional note */
  constitutionalNote: string;
  /** Requires Tier 3 validation */
  requiresTier3Validation: true;
}

/**
 * Tier 3 Validation Result
 */
export interface Tier3ValidationResult {
  /** Is valid */
  isValid: boolean;
  /** Tier classification */
  tier: 'Tier 3';
  /** Deterministic flag */
  deterministic: true;
  /** Reason for failure (if invalid) */
  reason?: string;
  /** System stop required */
  systemStop?: boolean;
  /** Profile ID (if valid) */
  profileId?: string;
}

/**
 * Supplier Pack Validation Result
 */
export interface SupplierPackValidationResult {
  /** Is valid */
  isValid: boolean;
  /** Error code */
  error?: 'CONSTITUTIONAL_VIOLATION' | 'GEOMETRY_INCOMPATIBLE' | 'CONSTRAINT_VIOLATION' | 'VERSION_LOCK_FAILED';
  /** Error message */
  message?: string;
  /** Requires system stop */
  requiresSystemStop?: boolean;
  /** Validation details */
  details?: {
    hasConstraintDefinitions?: boolean;
    geometryCompatibility?: {
      status: 'PASS' | 'FAIL' | 'WARNING';
      violations: string[];
    };
    constraintCompliance?: {
      status: 'PASS' | 'FAIL' | 'WARNING';
      violations: string[];
      referencedConstraints: string[];
    };
    versionLock?: {
      status: 'PASS' | 'FAIL';
      hash: string;
    };
  };
}

