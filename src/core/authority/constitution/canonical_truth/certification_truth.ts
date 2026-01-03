/**
 * @file certification_truth.ts
 * @description Certification Truth Domain
 * 
 * AICS-001 Reference: Section 6.3.5
 * 
 * Defines the compliance requirements, regulatory obligations, and contractual specifications.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export interface CertificationTruth {
  version: string;
  schema: CertificationSchema;
  validationRules: CertificationValidationRule[];
  provenance: CertificationProvenance;
  aics001Reference: 'AICS-001 Section 6.3.5';
}

export interface CertificationSchema {
  certificationId: string;
  name: string;
  type: 'regulatory' | 'contractual' | 'standard' | 'custom';
  jurisdiction: string[]; // e.g., ["Egypt", "GCC", "EU"]
  requirements: CertificationRequirement[];
  validity: CertificationValidity;
}

export interface CertificationRequirement {
  requirementId: string;
  description: string;
  category: 'geometry' | 'material' | 'process' | 'quality' | 'safety';
  mandatory: boolean;
  standard?: string; // e.g., "Egyptian Building Code", "ISO 9001"
  validation: (input: unknown) => boolean;
}

export interface CertificationValidity {
  startDate: Date;
  endDate?: Date;
  renewable: boolean;
  conditions: string[];
}

export interface CertificationValidationRule {
  ruleId: string;
  description: string;
  deterministic: boolean;
  source: 'AICS-001' | 'Regulatory' | 'Contract';
  constraint: (certification: CertificationSchema, input: unknown) => boolean;
}

export interface CertificationProvenance {
  source: 'Regulatory' | 'Contract' | 'Standard Body';
  timestamp: Date;
  validator: string;
  authority: string; // Issuing authority
  document?: string; // Reference document
}

