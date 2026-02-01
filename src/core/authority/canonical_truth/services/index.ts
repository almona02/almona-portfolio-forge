/**
 * @file services/index.ts
 * @description Truth Domain Services - Operational Services Exports
 * 
 * AICS-001 Reference: Section 6 (Canonical Source of Truth)
 * 
 * Exports all operational truth domain services.
 * Location: Core Authority Layer (constitutional, immutable)
 */

// Export Base Truth Service
export {
  BaseTruthService,
  type TruthDomain,
  type ReferenceRecord,
  type TruthVersion,
} from '../BaseTruthService';

// Export Geometry Truth Service
export {
  GeometryTruthService,
  getGeometryTruthService,
  resetGeometryTruthService,
} from '../GeometryTruthService';

// Export Material Truth Service
export {
  MaterialTruthService,
  getMaterialTruthService,
  resetMaterialTruthService,
} from '../MaterialTruthService';

// Export Machine Truth Service
export {
  MachineTruthService,
  getMachineTruthService,
  resetMachineTruthService,
} from '../MachineTruthService';

// Export Process Truth Service
export {
  ProcessTruthService,
  getProcessTruthService,
  resetProcessTruthService,
} from '../ProcessTruthService';

// Export Certification Truth Service
export {
  CertificationTruthService,
  getCertificationTruthService,
  resetCertificationTruthService,
} from '../CertificationTruthService';


