/**
 * @file certification/index.ts
 * @description Certification Module Exports
 * 
 * AICS-001 Reference: Section 7 (Certification, Auditability & Prestige Guarantees)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

// Export AuditAnchor
export type {
    AuditAnchor,
    HashedInputs,
    StructuredReasoning
} from './AuditAnchor';

export {
    createAuditAnchor,
    verifyAuditChain
} from './AuditAnchor';

// Export CertificationSeal
export type {
    CertificationSeal,
    CertificationTierDecision
} from './CertificationSeal';

// Export DeterministicReplayEngine
export {
    DeterministicReplayEngine,
    type ComputationResult,
    type ReplayMetadata,
    type ReplayRequest,
    type ReplayResult
} from './DeterministicReplayEngine';

// Export InputHashingService
export {
    InputHashingService,
    type InputHashResult
} from './InputHashingService';

// Export TruthVersionTracker
export {
    TruthVersionTracker,
    type TruthDomain,
    type TruthVersionRecord,
    type TruthVersionSet
} from './TruthVersionTracker';

// Export Audit Trail System
export {
    AuditTrailService,
    getAuditTrailService,
    resetAuditTrailService, type AuditRecordRequest,
    type AuditReplayMetadata, type ConstraintResults, type IntelligenceContribution, type OperationMode
} from './AuditTrailService';

// Export AICS Integration Service
export {
    AICSIntegrationService,
    getAICSIntegrationService,
    resetAICSIntegrationService, type AuditRecordingResult, type BOMGenerationAuditContext, type CertifiedActionContext,
    type DesignValidationAuditContext, type OptimizationSelectionAuditContext
} from './AICSIntegrationService';

export {
    AuditAnchorChain,
    type ChainIntegrityResult
} from './AuditAnchorChain';

export {
    CryptographicLinker,
    type CryptographicLinkData,
    type CryptographicLinkResult
} from './CryptographicLinker';

