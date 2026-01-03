/**
 * @file CertificationSeal.ts
 * @description Certification Seal Interface
 * 
 * AICS-001 Reference: Section 7.6.3 (Certified Mode)
 * 
 * Defines the interface for certification seals that provide
 * cryptographic verification of outputs.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 * 
 * Implementation: To be completed in Week 2-4
 */

export interface CertificationSeal {
  sealId: string; // Cryptographic hash of output + truth versions
  outputType: 'CutList' | 'Geometry' | 'MaterialPlan' | 'MachineInstruction';
  
  // Canonical truth versions used
  canonicalTruthVersions: {
    geometry: string;
    material: string;
    machine: string;
    process: string;
    certification: string;
  };
  
  validationEnvelopeId: string;
  tierDecisions: CertificationTierDecision[];
  auditAnchorId: string; // Links to immutable audit trail
  
  timestamp: Date;
  mode: 'sandbox' | 'production' | 'certified';
  
  // Optional: Time-bound certifications
  expiration?: Date;
  
  // Cryptographic signature
  signature: string;
}

export interface CertificationTierDecision {
  tier: 1 | 2 | 3;
  decisionId: string;
  reasoning: string;
  timestamp: Date;
}

export interface CertificationAuthority {
  /**
   * Issues a certification seal for an output
   * AICS-001 Section 7.6.3
   */
  issueSeal(output: unknown, context: CertificationContext): CertificationSeal;
  
  /**
   * Verifies a certification seal
   * External systems call this to verify any Almona output
   */
  verifySeal(sealId: string): VerificationResult;
}

export interface CertificationContext {
  output: unknown;
  mode: 'sandbox' | 'production' | 'certified';
  workshopId?: string;
  truthVersions: {
    geometry: string;
    material: string;
    machine: string;
    process: string;
    certification: string;
  };
}

export interface VerificationResult {
  valid: boolean;
  truthVersions: {
    geometry: string;
    material: string;
    machine: string;
    process: string;
    certification: string;
  };
  tierCompliance: {
    tier1: boolean;
    tier2: boolean;
    tier3: boolean;
  };
  timestamp: Date;
  seal?: CertificationSeal;
  error?: string;
}

