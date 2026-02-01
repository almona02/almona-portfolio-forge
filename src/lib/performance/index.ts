/**
 * Performance Module - Main Export
 * 
 * Performance tracking and audit utilities for ALMONA workflow.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

export {
    PerformanceCheckpoint, WorkflowPerformanceAudit, clearPerformanceAudit, getPerformanceAudit, type CheckpointMetric,
    type PerformanceAuditResult
} from './WorkflowPerformanceAudit';

export {
    MemoryLeakDetector, clearMemoryLeakDetector, getMemoryLeakDetector, type MemoryCheckpoint,
    type MemoryLeakDetectionResult
} from './MemoryLeakDetector';

export {
    PerformanceMetricsAggregator,
    getPerformanceMetricsAggregator, type DatabaseMetrics, type MemoryStabilityMetrics,
    type NetworkMetrics, type PerformanceAuditMetrics, type UIResponsivenessMetrics, type WorkflowMetrics
} from './PerformanceMetricsAggregator';

// Constitutional Performance Monitoring (January 2026 - Performance Audit Roadmap)
export {
    DeterministicReplayVerifier,
    deterministicVerifier, type DeterministicOperation, type VerificationResult
} from './DeterministicReplayVerifier';

export {
    TierClassificationAuditor,
    tierAuditor, type AuditResult, type ConstitutionalTier,
    type TierBoundaryViolation, type TierClassification
} from './TierClassificationAuditor';

export {
    AuditTrailIntegrityChecker,
    auditTrailChecker,
    type AuditEntry,
    type AuditTrailReport
} from './AuditTrailIntegrityChecker';

export {
    AccuracyBaselineTracker,
    accuracyTracker, type AccuracyReport, type AccuracyTestResult, type GoldenMaster
} from './AccuracyBaselineTracker';

export {
    DeterministicExecutionTracker,
    deterministicExecutionTracker,
    type DeterministicMetric,
    type PerformanceWindow
} from './DeterministicExecutionTracker';

export {
    ConstitutionalProfiler, clearConstitutionalPerformanceData,
    generateConstitutionalPerformanceReport, getConstitutionalPerformanceData, type ConstitutionalPerformanceData, type ConstitutionalProfilerProps
} from './ConstitutionalProfiler';

