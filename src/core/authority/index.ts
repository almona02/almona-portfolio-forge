/**
 * CORE AUTHORITY LAYER - PUBLIC API
 * 
 * This is the constitutional core of Almona.
 * Only interfaces and constants are exported here.
 * 
 * Academic: Enables formal verification of constitutional guarantees
 * Legal: Creates clear contractual boundaries for authoritative outputs
 * Institutional: Physical evidence of separation between constitutional core and consumption
 * 
 * AICS-001 Reference: Section 8.3 (Separation of Powers)
 * 
 * IMPORTANT: No implementation details exported.
 * Consumption layer imports only from this file.
 */

// Constitution
export type { OperationMode, AuthorityState } from './constitution/AuthorityContext';
export { AuthorityContext, useAuthority, DEFAULT_AUTHORITY_STATE } from './constitution/AuthorityContext';
export { ACCURACY_CONTRACT } from './constitution/ACCURACY_CONTRACT';

// Truth Domains (AICS-001 Section 6.3)
export type {
  GeometryTruth,
  GeometrySchema,
  GeometryValidationRule,
  GeometryProvenance
} from './constitution/canonical_truth/geometry_truth';

export type {
  MaterialTruth,
  MaterialSchema,
  MaterialValidationRule,
  MaterialProvenance
} from './constitution/canonical_truth/material_truth';

export type {
  MachineTruth,
  MachineSchema,
  MachineValidationRule,
  MachineProvenance
} from './constitution/canonical_truth/machine_truth';

export type {
  ProcessTruth,
  ProcessSchema,
  ProcessValidationRule,
  ProcessProvenance
} from './constitution/canonical_truth/process_truth';

export type {
  CertificationTruth,
  CertificationSchema,
  CertificationValidationRule,
  CertificationProvenance
} from './constitution/canonical_truth/certification_truth';

// Governance Engine (AICS-001 Section 5.10)
export type {
  Tier,
  TierDecision,
  IntelligenceGate,
  DecisionContext
} from './constitution/governance_engine/intelligence_gate';

export type {
  ConstitutionalHealth,
  ConstitutionalViolation
} from './constitution/governance_engine/constitutional_health';

// Validation Envelopes (AICS-001 Section 4.2)
export type {
  DeterministicConstraint,
  ExecutionBoundary,
  ValidationEnvelope
} from './validation_envelopes';

// Certification (AICS-001 Section 7.6.3)
export type {
  CertificationSeal,
  CertificationAuthority,
  VerificationResult
} from './certification/CertificationSeal';

export type {
  AuditAnchor,
  AuditAnchorChain
} from './certification/AuditAnchor';

// Version Lock
export { getConstitutionVersion, getTruthDomainVersion, getVersionLock } from './version_lock';

// AICS-001 Reference
export { AICS001_VERSION, AICS001_PATH, type AICS001Reference } from './constitution/AICS-001';

