/**
 * @file AICSIntegrationService.ts
 * @description AICS Integration Service - Unified Integration Point for All AICS-001 Systems
 *
 * AICS-001 Reference: Sections 4.4, 7.4, 7.5 (Unified Integration)
 *
 * Unified integration service that coordinates all AICS-001 systems:
 * - ValidationEnvelope: Constraint validation
 * - DeterministicReplayEngine: Replay tracking
 * - TruthVersionTracker: Truth version tracking
 * - AuditTrailService: Audit trail recording
 *
 * Purpose: Auto-record audit trail for all certified actions with complete metadata
 *
 * Location: Core Authority Layer (constitutional, immutable)
 *
 * Enhanced with performance tracking (target: <100ms for audit recording)
 */

import { getValidationEnvelope } from '../validation_envelopes';
import type { ValidationEnvelopeResult } from '../validation_envelopes/ValidationEnvelope';
import { getAuditTrailService, type AuditRecordRequest, type AuditReplayMetadata, type OperationMode } from './AuditTrailService';
import type { ComputationResult, ReplayMetadata } from './DeterministicReplayEngine';
import { TruthVersionTracker } from './TruthVersionTracker';

/**
 * Audit Recording Result with Performance Metrics
 */
export interface AuditRecordingResult {
  anchorId: string;
  performanceMs: number;
  cached: boolean;
}

/**
 * Certified Action Context
 *
 * Context for a certified action that requires audit trail recording.
 */
export interface CertifiedActionContext {
  /**
   * Who: Initiator of the action (user ID or system identifier)
   */
  who: string;

  /**
   * What: Description of the action
   */
  what: string;

  /**
   * Decision: What decision was made
   */
  decision: string;

  /**
   * Why: Rationale for the decision
   */
  why: string;

  /**
   * Operation mode
   */
  mode: OperationMode;

  /**
   * Optional: Input hash (for deterministic replay)
   */
  inputHash?: string;

  /**
   * Optional: Certification seal ID
   */
  sealId?: string;
}

/**
 * Design Validation Audit Context
 *
 * Context for design validation action with constraint results.
 */
export interface DesignValidationAuditContext extends CertifiedActionContext {
  /**
   * Constraint validation results
   */
  validationEnvelopeResult: ValidationEnvelopeResult;

  /**
   * Design context that was validated
   */
  designContext: unknown;
}

/**
 * BOM Generation Audit Context
 *
 * Context for BOM generation action with replay metadata.
 */
export interface BOMGenerationAuditContext extends CertifiedActionContext {
  /**
   * Replay metadata from BOM generation
   */
  replayMetadata: ReplayMetadata;

  /**
   * BOM computation result
   */
  computationResult: ComputationResult<unknown>;
}

/**
 * Optimization Selection Audit Context
 *
 * Context for optimization selection action with tier decision.
 */
export interface OptimizationSelectionAuditContext extends CertifiedActionContext {
  /**
   * Tier classification
   */
  tier: 'T1' | 'T2' | 'T3';

  /**
   * Intelligence system used (if any)
   */
  intelligenceSystem?: 'YDT' | 'TensorFlow' | 'none';

  /**
   * Optimization result summary
   */
  optimizationSummary: string;
}

/**
 * AICS Integration Service
 *
 * Unified integration point for all AICS-001 systems.
 * Auto-records audit trail for all certified actions.
 *
 * Enhanced with performance tracking and caching.
 */
export class AICSIntegrationService {
  private auditService = getAuditTrailService();
  
  // Cache for recent audit recordings (to avoid duplicate recordings)
  private auditCache = new Map<string, { anchorId: string; timestamp: number }>();
  private readonly AUDIT_CACHE_TTL = 1000; // 1 second cache TTL

  /**
   * Record audit trail for design validation
   *
   * Records audit trail with constraint validation results.
   *
   * AICS-001 Section 7.4: Auto-record audit trail for certified actions
   *
   * Enhanced with performance tracking (target: <100ms)
   *
   * @param context - Design validation audit context
   * @returns Audit recording result with performance metrics
   */
  async recordDesignValidationAudit(context: DesignValidationAuditContext): Promise<string> {
    const result = await this.recordDesignValidationAuditWithPerformance(context);
    return result.anchorId;
  }

  /**
   * Record audit trail for design validation with performance tracking
   *
   * @param context - Design validation audit context
   * @returns Audit recording result with performance metrics
   */
  async recordDesignValidationAuditWithPerformance(context: DesignValidationAuditContext): Promise<AuditRecordingResult> {
    const startTime = performance.now();
    
    // Create cache key from context
    const cacheKey = JSON.stringify({
      who: context.who,
      what: context.what,
      inputHash: context.inputHash,
      validationComplies: context.validationEnvelopeResult.complies,
      timestamp: context.validationEnvelopeResult.timestamp.getTime(),
    });
    
    // Check cache (1 second TTL to avoid duplicate recordings)
    const cached = this.auditCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.AUDIT_CACHE_TTL) {
      const performanceMs = performance.now() - startTime;
      return {
        anchorId: cached.anchorId,
        performanceMs,
        cached: true,
      };
    }
    
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();
    const envelope = getValidationEnvelope();
    const errorReport = context.validationEnvelopeResult.complies 
      ? [] 
      : envelope.getErrorReport(context.validationEnvelopeResult);

    const auditRequest: AuditRecordRequest = {
      who: context.who,
      what: context.what,
      truthVersions,
      constraintResults: {
        validationEnvelopeResult: context.validationEnvelopeResult,
        summary: context.validationEnvelopeResult.complies
          ? `All ${context.validationEnvelopeResult.metadata.totalCategories} constraint categories passed`
          : `${context.validationEnvelopeResult.metadata.failedCategories} of ${context.validationEnvelopeResult.metadata.totalCategories} categories failed: ${errorReport.slice(0, 3).join('; ')}`,
      },
      decision: context.decision,
      why: context.why,
      mode: context.mode,
      inputHash: context.inputHash,
      sealId: context.sealId,
    };

    const anchor = await this.auditService.recordAuditTrail(auditRequest);
    const performanceMs = performance.now() - startTime;
    
    // Cache the result
    this.auditCache.set(cacheKey, { anchorId: anchor.anchorId, timestamp: Date.now() });
    
    // Log performance if exceeds target (only in dev)
    if (import.meta.env.DEV && performanceMs > 100) {
      console.warn(`[AICSIntegrationService] Design validation audit recording took ${performanceMs.toFixed(2)}ms (target: <100ms)`);
    }
    
    return {
      anchorId: anchor.anchorId,
      performanceMs,
      cached: false,
    };
  }

  /**
   * Record audit trail for BOM generation
   *
   * Records audit trail with replay metadata.
   *
   * AICS-001 Section 7.4 & 7.5: Auto-record audit trail with replay metadata
   *
   * Enhanced with performance tracking (target: <100ms)
   *
   * @param context - BOM generation audit context
   * @returns Created audit anchor ID
   */
  async recordBOMGenerationAudit(context: BOMGenerationAuditContext): Promise<string> {
    const result = await this.recordBOMGenerationAuditWithPerformance(context);
    return result.anchorId;
  }

  /**
   * Record audit trail for BOM generation with performance tracking
   *
   * @param context - BOM generation audit context
   * @returns Audit recording result with performance metrics
   */
  async recordBOMGenerationAuditWithPerformance(context: BOMGenerationAuditContext): Promise<AuditRecordingResult> {
    const startTime = performance.now();
    
    // Create cache key from context
    const cacheKey = JSON.stringify({
      who: context.who,
      what: context.what,
      computationId: context.replayMetadata.computationId,
      inputHash: context.replayMetadata.inputHash,
    });
    
    // Check cache (1 second TTL to avoid duplicate recordings)
    const cached = this.auditCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.AUDIT_CACHE_TTL) {
      const performanceMs = performance.now() - startTime;
      return {
        anchorId: cached.anchorId,
        performanceMs,
        cached: true,
      };
    }
    
    const truthVersions = context.computationResult.truthVersions;

    // Generate replay verification URL (using computation ID)
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'https://almona.app';
    const replayVerificationUrl = `${baseUrl}/api/v1/replay/verify/${context.replayMetadata.computationId}`;

    const auditRequest: AuditRecordRequest = {
      who: context.who,
      what: context.what,
      truthVersions,
      constraintResults: undefined, // BOM generation doesn't include constraint validation
      replayMetadata: {
        computationId: context.replayMetadata.computationId,
        inputHash: context.replayMetadata.inputHash,
        truthVersionsHash: context.replayMetadata.truthVersionsHash,
        combinedHash: context.replayMetadata.combinedHash,
        resultSignature: context.replayMetadata.resultSignature,
        replayVerificationUrl: replayVerificationUrl,
      },
      decision: context.decision,
      why: context.why,
      mode: context.mode,
      inputHash: context.replayMetadata.inputHash,
      sealId: context.sealId,
    };

    const anchor = await this.auditService.recordAuditTrail(auditRequest);
    const performanceMs = performance.now() - startTime;
    
    // Cache the result
    this.auditCache.set(cacheKey, { anchorId: anchor.anchorId, timestamp: Date.now() });
    
    // Log performance if exceeds target (only in dev)
    if (import.meta.env.DEV && performanceMs > 100) {
      console.warn(`[AICSIntegrationService] BOM generation audit recording took ${performanceMs.toFixed(2)}ms (target: <100ms)`);
    }
    
    return {
      anchorId: anchor.anchorId,
      performanceMs,
      cached: false,
    };
  }

  /**
   * Record audit trail for optimization selection
   *
   * Records audit trail with tier decision.
   *
   * AICS-001 Section 7.4: Auto-record audit trail for tier decisions
   *
   * Enhanced with performance tracking (target: <100ms)
   *
   * @param context - Optimization selection audit context
   * @returns Created audit anchor ID
   */
  async recordOptimizationSelectionAudit(context: OptimizationSelectionAuditContext): Promise<string> {
    const startTime = performance.now();
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();

    const auditRequest: AuditRecordRequest = {
      who: context.who,
      what: context.what,
      truthVersions,
      constraintResults: undefined,
      intelligenceContribution: {
        tier: context.tier,
        intelligenceSystem: context.intelligenceSystem || 'none',
        reasoning: context.optimizationSummary,
      },
      decision: context.decision,
      why: context.why,
      mode: context.mode,
      inputHash: context.inputHash,
      sealId: context.sealId,
    };

    const anchor = await this.auditService.recordAuditTrail(auditRequest);
    const performanceMs = performance.now() - startTime;
    
    // Log performance if exceeds target (only in dev)
    if (import.meta.env.DEV && performanceMs > 100) {
      console.warn(`[AICSIntegrationService] Optimization selection audit recording took ${performanceMs.toFixed(2)}ms (target: <100ms)`);
    }
    
    return anchor.anchorId;
  }

  /**
   * Record generic certified action audit trail
   *
   * Records audit trail with optional constraint results and replay metadata.
   *
   * Enhanced with performance tracking (target: <100ms)
   *
   * @param context - Certified action context
   * @param options - Optional metadata
   * @returns Created audit anchor ID
   */
  async recordCertifiedActionAudit(
    context: CertifiedActionContext,
    options?: {
      constraintResults?: ValidationEnvelopeResult;
      replayMetadata?: ReplayMetadata;
      intelligenceContribution?: {
        tier: 'T1' | 'T2' | 'T3';
        intelligenceSystem?: 'YDT' | 'TensorFlow' | 'none';
        reasoning?: string;
        confidence?: number;
      };
    }
  ): Promise<string> {
    const startTime = performance.now();
    const truthVersions = TruthVersionTracker.getCurrentTruthVersions();

    const constraintResults = options?.constraintResults
      ? {
          validationEnvelopeResult: options.constraintResults,
          summary: options.constraintResults.complies
            ? `All ${options.constraintResults.metadata.totalCategories} constraint categories passed`
            : `${options.constraintResults.metadata.failedCategories} of ${options.constraintResults.metadata.totalCategories} categories failed`,
        }
      : undefined;

    // Generate replay verification URL if replay metadata is provided
    let replayMetadata: AuditReplayMetadata | undefined;
    if (options?.replayMetadata) {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'https://almona.app';
      const replayVerificationUrl = `${baseUrl}/api/v1/replay/verify/${options.replayMetadata.computationId}`;

      replayMetadata = {
        computationId: options.replayMetadata.computationId,
        inputHash: options.replayMetadata.inputHash,
        truthVersionsHash: options.replayMetadata.truthVersionsHash,
        combinedHash: options.replayMetadata.combinedHash,
        resultSignature: options.replayMetadata.resultSignature,
        replayVerificationUrl: replayVerificationUrl,
      };
    }

    const auditRequest: AuditRecordRequest = {
      who: context.who,
      what: context.what,
      truthVersions,
      constraintResults,
      intelligenceContribution: options?.intelligenceContribution,
      decision: context.decision,
      why: context.why,
      mode: context.mode,
      inputHash: context.inputHash || options?.replayMetadata?.inputHash,
      sealId: context.sealId,
      replayMetadata: replayMetadata,
    };

    const anchor = await this.auditService.recordAuditTrail(auditRequest);
    const performanceMs = performance.now() - startTime;
    
    // Log performance if exceeds target (only in dev)
    if (import.meta.env.DEV && performanceMs > 100) {
      console.warn(`[AICSIntegrationService] Certified action audit recording took ${performanceMs.toFixed(2)}ms (target: <100ms)`);
    }
    
    return anchor.anchorId;
  }
}

/**
 * Global AICS Integration Service instance
 */
let globalAICSIntegrationService: AICSIntegrationService | null = null;

/**
 * Get global AICS Integration Service instance
 *
 * @returns Global service instance
 */
export function getAICSIntegrationService(): AICSIntegrationService {
  if (!globalAICSIntegrationService) {
    globalAICSIntegrationService = new AICSIntegrationService();
  }
  return globalAICSIntegrationService;
}

/**
 * Reset global AICS Integration Service (mainly for testing)
 */
export function resetAICSIntegrationService(): void {
  globalAICSIntegrationService = new AICSIntegrationService();
}
