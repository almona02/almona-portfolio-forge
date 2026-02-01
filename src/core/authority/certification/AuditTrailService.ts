/**
 * @file AuditTrailService.ts
 * @description Audit Trail Service - Unified Audit Trail System
 * 
 * AICS-001 Reference: Section 7.4 (Audit Trail Doctrine)
 * 
 * Unified audit trail service that generates immutable audit records for all certified actions.
 * 
 * Requirements:
 * - Every certified action generates immutable audit record
 * - Must contain: Who, What, Which truths, Which constraints, Which intelligence, Decision, Why, When, Mode
 * - Records are: Append-only, Cryptographically linked, Time-stamped, Tamper-evident
 * 
 * Integration:
 * - IntelligenceGate: Tier decisions
 * - ValidationEnvelope: Constraint results
 * - TruthVersionTracker: Truth references
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type { ValidationEnvelopeResult } from '../validation_envelopes/ValidationEnvelope';
import type { AuditAnchor, HashedInputs, StructuredReasoning } from './AuditAnchor';
import { AuditAnchorChain } from './AuditAnchorChain';
import type { TruthVersionSet } from './TruthVersionTracker';

/**
 * Operation Mode
 * 
 * AICS-001 Section 7.6: Modes of Operation
 */
export type OperationMode = 'sandbox' | 'production' | 'certified';

/**
 * Intelligence Contribution
 * 
 * Records intelligence system contributions to the decision.
 */
export interface IntelligenceContribution {
  /**
   * Tier classification (T1, T2, T3)
   */
  tier: 'T1' | 'T2' | 'T3';
  
  /**
   * Intelligence system used (if any)
   */
  intelligenceSystem?: 'YDT' | 'TensorFlow' | 'none';
  
  /**
   * Intelligence reasoning (if applicable)
   */
  reasoning?: string;
  
  /**
   * Confidence level (if applicable)
   */
  confidence?: number;
}

/**
 * Replay Metadata
 * 
 * Records deterministic replay metadata for computation tracking.
 * 
 * AICS-001 Section 7.5: Replay metadata for deterministic replay guarantee
 */
export interface AuditReplayMetadata {
  /**
   * Computation ID (unique identifier)
   */
  computationId: string;
  
  /**
   * Input hash
   */
  inputHash: string;
  
  /**
   * Truth versions hash (canonical representation)
   */
  truthVersionsHash: string;
  
  /**
   * Combined hash (input + truth versions)
   */
  combinedHash: string;
  
  /**
   * Result signature
   */
  resultSignature: string;
  
  /**
   * Replay verification URL (if available)
   */
  replayVerificationUrl?: string;
}

/**
 * Constraint Results
 * 
 * Records constraint validation results.
 * 
 * AICS-001 Section 7.4: "Which constraints" - Records all constraint validation results
 */
export interface ConstraintResults {
  /**
   * Validation envelope result (if validation was performed)
   * 
   * Full ValidationEnvelopeResult from constraint validation.
   */
  validationEnvelopeResult?: ValidationEnvelopeResult;
  
  /**
   * Constraint summary (human-readable)
   */
  summary: string;
  
  /**
   * Cryptographic hash of constraint results (for integrity verification)
   * 
   * AICS-001 Section 7.4: "Tamper-evident" - Hash ensures constraint results integrity
   */
  constraintResultsHash?: string;
}

/**
 * Audit Record Request
 * 
 * Request to create an audit record.
 * 
 * AICS-001 Section 7.4: Must contain all required fields
 */
export interface AuditRecordRequest {
  /**
   * Who: Initiator of the action
   */
  who: string; // User ID or system identifier
  
  /**
   * What: Description of the action
   */
  what: string;
  
  /**
   * Which truths: Truth versions used
   */
  truthVersions: TruthVersionSet;
  
  /**
   * Which constraints: Constraint validation results
   */
  constraintResults?: ConstraintResults;
  
  /**
   * Which intelligence: Intelligence system contributions
   */
  intelligenceContribution?: IntelligenceContribution;
  
  /**
   * Replay metadata (for deterministic replay guarantee)
   * 
   * AICS-001 Section 7.5: Records replay metadata for deterministic replay
   */
  replayMetadata?: AuditReplayMetadata;
  
  /**
   * Decision: What decision was made
   */
  decision: string;
  
  /**
   * Why: Rationale for the decision
   */
  why: string;
  
  /**
   * When: Timestamp (defaults to now)
   */
  when?: Date;
  
  /**
   * Mode: Operation mode
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
 * Audit Trail Service
 * 
 * Unified audit trail service for certified actions.
 * 
 * AICS-001 Section 7.4: Every certified action generates an immutable audit record.
 */
export class AuditTrailService {
  private chain: AuditAnchorChain = new AuditAnchorChain();
  private initialized: boolean = false;

  /**
   * Initialize audit trail service
   * 
   * Creates genesis anchor if chain is empty.
   */
  async initialize(): Promise<void> {
    if (!this.initialized) {
      const lastAnchor = this.chain.getLastAnchor();
      if (!lastAnchor) {
        await this.chain.createGenesisAnchor();
      }
      this.initialized = true;
    }
  }

  /**
   * Record audit trail
   * 
   * Creates an immutable audit record for a certified action.
   * 
   * AICS-001 Section 7.4: Every certified action generates an immutable audit record.
   * 
   * @param request - Audit record request
   * @returns Created audit anchor
   */
  async recordAuditTrail(request: AuditRecordRequest): Promise<AuditAnchor> {
    // Ensure initialized
    await this.initialize();
    
    // Create hashed inputs
    const hashedInputs: HashedInputs = {
      hash: request.inputHash || this.computeInputHash(request),
      inputType: request.what,
      timestamp: request.when || new Date(),
    };
    
    // Create structured reasoning
    const reasoning: StructuredReasoning = {
      decision: request.decision,
      rationale: request.why,
      alternatives: [],
      confidence: request.intelligenceContribution?.confidence,
    };
    
    // Create decision context
    const decisionContext: AuditAnchor['decisionContext'] = {
      inputs: hashedInputs,
      canonicalTruthVersions: {
        geometry: request.truthVersions.geometry,
        material: request.truthVersions.material,
        machine: request.truthVersions.machine,
        process: request.truthVersions.process,
        certification: request.truthVersions.certification,
      },
      validationResults: await this.buildValidationResults(request),
      tierClassification: request.intelligenceContribution?.tier || 'T3',
      reasoning,
    };
    
    // Create anchor data
    const anchorData = {
      timestamp: request.when || new Date(),
      decisionContext,
      sealId: request.sealId,
    };
    
    // Append to chain
    const anchor = await this.chain.appendAnchor(anchorData);
    
    return anchor;
  }

  /**
   * Build validation results object (includes constraint results and replay metadata)
   * 
   * @param request - Audit record request
   * @returns Validation results object
   */
  private async buildValidationResults(request: AuditRecordRequest): Promise<Record<string, unknown>> {
    const validationResults: Record<string, unknown> = {};
    
    // Add constraint results if provided
    if (request.constraintResults) {
      const serialized = await this.serializeConstraintResults(request.constraintResults);
      Object.assign(validationResults, serialized);
    }
    
    // Add replay metadata if provided
    if (request.replayMetadata) {
      validationResults.replayMetadata = {
        computationId: request.replayMetadata.computationId,
        inputHash: request.replayMetadata.inputHash,
        truthVersionsHash: request.replayMetadata.truthVersionsHash,
        combinedHash: request.replayMetadata.combinedHash,
        resultSignature: request.replayMetadata.resultSignature,
        replayVerificationUrl: request.replayMetadata.replayVerificationUrl,
      };
    }
    
    return validationResults;
  }

  /**
   * Serialize constraint results for audit storage
   * 
   * Converts ValidationEnvelopeResult (with Map types) to serializable format
   * and includes cryptographic hash for integrity verification.
   * 
   * @param constraintResults - Constraint validation results
   * @returns Serialized constraint results for audit storage
   */
  private async serializeConstraintResults(constraintResults: ConstraintResults): Promise<Record<string, unknown>> {
    const serialized: Record<string, unknown> = {
      summary: constraintResults.summary,
    };

    if (constraintResults.validationEnvelopeResult) {
      const envelopeResult = constraintResults.validationEnvelopeResult;
      
      // Serialize ValidationEnvelopeResult (convert Map to object)
      const serializedEnvelope: Record<string, unknown> = {
        complies: envelopeResult.complies,
        failedCategories: envelopeResult.failedCategories,
        allConstraintResults: envelopeResult.allConstraintResults,
        timestamp: envelopeResult.timestamp.toISOString(),
        metadata: envelopeResult.metadata,
        // Convert Map<ConstraintCategory, CategoryValidationResult> to object
        categoryResults: this.serializeCategoryResultsMap(envelopeResult.categoryResults),
      };

      serialized.validationEnvelope = serializedEnvelope;

      // Compute cryptographic hash of constraint results (if not already provided)
      if (!constraintResults.constraintResultsHash) {
        const hashData = JSON.stringify({
          validationEnvelope: serializedEnvelope,
          summary: constraintResults.summary,
        });
        
        // Use same hash algorithm as CryptographicLinker (SHA-256 via Web Crypto API)
        serialized.constraintResultsHash = await this.computeConstraintResultsHash(hashData);
      } else {
        serialized.constraintResultsHash = constraintResults.constraintResultsHash;
      }
    }

    return serialized;
  }

  /**
   * Compute cryptographic hash of constraint results
   * 
   * Uses same algorithm as CryptographicLinker for consistency.
   * 
   * @param data - Data to hash
   * @returns SHA-256 hash (hex string)
   */
  private async computeConstraintResultsHash(data: string): Promise<string> {
    // Use Web Crypto API if available (same as CryptographicLinker)
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
      } catch (error) {
        // Fall back to simple hash if Web Crypto fails
        console.warn('Web Crypto API failed for constraint results hash, using fallback:', error);
        return this.simpleHash(data);
      }
    }
    
    // Fallback: Simple hash (deterministic but not cryptographically secure)
    return this.simpleHash(data);
  }

  /**
   * Simple hash fallback
   * 
   * Not cryptographically secure, but deterministic.
   * Used as fallback when Web Crypto API is unavailable.
   * 
   * @param data - Data to hash
   * @returns Hash string (hex)
   */
  private simpleHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to 64-character hex string (padded)
    return Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
  }

  /**
   * Serialize category results map
   * 
   * Converts Map<ConstraintCategory, CategoryValidationResult> to serializable object.
   * 
   * @param categoryResults - Category results map
   * @returns Serialized category results object
   */
  private serializeCategoryResultsMap(
    categoryResults: Map<string, unknown>
  ): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};
    
    categoryResults.forEach((value, key) => {
      // Value is CategoryValidationResult
      const categoryResult = value as {
        category: string;
        passed: boolean;
        constraintResults: unknown[];
        errorCount: number;
        totalConstraints: number;
      };
      
      serialized[key] = {
        category: categoryResult.category,
        passed: categoryResult.passed,
        constraintResults: categoryResult.constraintResults,
        errorCount: categoryResult.errorCount,
        totalConstraints: categoryResult.totalConstraints,
      };
    });
    
    return serialized;
  }

  /**
   * Compute input hash
   * 
   * Computes hash from request data (for deterministic replay).
   * Uses synchronous simple hash for consistency with existing code.
   * 
   * @param request - Audit record request
   * @returns Input hash
   */
  private computeInputHash(request: AuditRecordRequest): string {
    // Create canonical representation
    const canonical = {
      what: request.what,
      who: request.who,
      mode: request.mode,
      decision: request.decision,
    };
    
    const serialized = JSON.stringify(canonical);
    
    // Use simple hash (synchronous, deterministic)
    // Note: For cryptographic security, consider making this async and using SHA-256
    return this.simpleHash(serialized);
  }

  /**
   * Verify chain integrity
   * 
   * Verifies the cryptographic integrity of the audit chain.
   * 
   * AICS-001 Section 7.4: "Tamper-evident" - Chain verification detects tampering
   * 
   * @returns Chain integrity result
   */
  async verifyChainIntegrity() {
    return await this.chain.verifyChainIntegrity();
  }

  /**
   * Get chain
   * 
   * Returns all audit anchors in the chain (read-only).
   * 
   * @returns Array of audit anchors
   */
  getChain(): readonly AuditAnchor[] {
    return this.chain.getChain();
  }

  /**
   * Get last anchor
   * 
   * Returns the last anchor in the chain.
   * 
   * @returns Last anchor or null
   */
  getLastAnchor(): AuditAnchor | null {
    return this.chain.getLastAnchor();
  }

  /**
   * Get anchor by ID
   * 
   * Retrieves an anchor by its ID.
   * 
   * @param anchorId - Anchor ID
   * @returns Anchor or null
   */
  getAnchorById(anchorId: string): AuditAnchor | null {
    return this.chain.getAnchorById(anchorId);
  }

  /**
   * Clear chain (mainly for testing)
   */
  clear(): void {
    this.chain.clear();
    this.initialized = false;
  }
}

// Global instance
let globalAuditTrailService: AuditTrailService | null = null;

/**
 * Get global Audit Trail Service instance
 * 
 * @returns Global service instance
 */
export function getAuditTrailService(): AuditTrailService {
  if (!globalAuditTrailService) {
    globalAuditTrailService = new AuditTrailService();
  }
  return globalAuditTrailService;
}

/**
 * Reset global Audit Trail Service (mainly for testing)
 */
export function resetAuditTrailService(): void {
  globalAuditTrailService = new AuditTrailService();
}

