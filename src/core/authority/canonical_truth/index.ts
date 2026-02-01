/**
 * @file canonical_truth/index.ts
 * @description Canonical Truth Services - Re-export for backward compatibility
 * 
 * This file provides a unified export point for canonical truth services.
 * It re-exports from the constitution layer to maintain backward compatibility
 * with existing imports that use @/core/authority/canonical_truth.
 * 
 * AICS-001 Reference: Section 6.3 (Canonical Truth Domains)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

// Re-export all truth domain types from constitution layer
export type {
  GeometryTruth,
  GeometrySchema,
  GeometryValidationRule,
  GeometryProvenance,
  MaterialTruth,
  MaterialSchema,
  MaterialValidationRule,
  MaterialProvenance,
  MachineTruth,
  MachineSchema,
  MachineValidationRule,
  MachineProvenance,
  ProcessTruth,
  ProcessSchema,
  ProcessValidationRule,
  ProcessProvenance,
  CertificationTruth,
  CertificationSchema,
  CertificationValidationRule,
  CertificationRequirement,
  CertificationValidity,
} from '../constitution/canonical_truth';

// Re-export operational services from constitution layer
export {
  BaseTruthService,
  GeometryTruthService,
  MaterialTruthService,
  MachineTruthService,
  ProcessTruthService,
  CertificationTruthService,
  getGeometryTruthService,
  getMaterialTruthService,
  getMachineTruthService,
  getProcessTruthService,
  getCertificationTruthService,
  resetGeometryTruthService,
  resetMaterialTruthService,
  resetMachineTruthService,
  resetProcessTruthService,
  resetCertificationTruthService,
  type TruthDomain,
  type ReferenceRecord,
  type TruthVersion,
} from '../constitution/canonical_truth';

