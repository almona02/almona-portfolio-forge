/**
 * @file AuditAnchorChain.ts
 * @description Audit Anchor Chain - Chain Management for Audit Records
 * 
 * AICS-001 Reference: Section 7.4 (Audit Trail Doctrine)
 * 
 * Manages the cryptographic chain of audit anchors.
 * 
 * Requirements:
 * - Append-only (immutable chain)
 * - Cryptographically linked
 * - Tamper-evident
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type { AuditAnchor } from './AuditAnchor';
import { CryptographicLinker } from './CryptographicLinker';

/**
 * Chain Integrity Verification Result
 * 
 * Result of chain integrity verification.
 */
export interface ChainIntegrityResult {
  /**
   * Whether chain integrity is valid
   */
  isValid: boolean;
  
  /**
   * Number of anchors in chain
   */
  anchorCount: number;
  
  /**
   * First anchor ID
   */
  firstAnchorId: string | null;
  
  /**
   * Last anchor ID
   */
  lastAnchorId: string | null;
  
  /**
   * Verification errors (if any)
   */
  errors: string[];
}

/**
 * Audit Anchor Chain
 * 
 * Manages the cryptographic chain of audit anchors.
 * 
 * AICS-001 Section 7.4: "Audit records are append-only, cryptographically linked, time-stamped, tamper-evident"
 */
export class AuditAnchorChain {
  private anchors: AuditAnchor[] = [];
  private lastHash: string | null = null;

  /**
   * Create genesis anchor
   * 
   * Creates the first anchor in the chain (genesis block).
   * 
   * @returns Genesis anchor
   */
  async createGenesisAnchor(): Promise<AuditAnchor> {
    if (this.anchors.length > 0) {
      throw new Error('Genesis anchor already exists. Chain is not empty.');
    }
    
    const genesisData = JSON.stringify({
      type: 'genesis',
      timestamp: new Date().toISOString(),
    });
    
    const linkResult = await CryptographicLinker.computeLink({
      previousHash: CryptographicLinker.GENESIS_HASH,
      recordData: genesisData,
      timestamp: new Date(),
    });
    
    const genesisAnchor: AuditAnchor = {
      anchorId: linkResult.hash,
      timestamp: linkResult.timestamp,
      decisionContext: {
        inputs: {
          hash: CryptographicLinker.GENESIS_HASH,
          inputType: 'genesis',
          timestamp: linkResult.timestamp,
        },
        canonicalTruthVersions: {
          geometry: '1.0.0',
          material: '1.0.0',
          machine: '1.0.0',
          process: '1.0.0',
          certification: '1.0.0',
        },
        validationResults: {},
        tierClassification: 'T3',
        reasoning: {
          decision: 'Genesis anchor created',
          rationale: 'Initial anchor for audit chain',
          alternatives: [],
        },
      },
      previousAnchorId: CryptographicLinker.GENESIS_HASH,
      proofHash: linkResult.hash,
    };
    
    this.anchors.push(genesisAnchor);
    this.lastHash = genesisAnchor.anchorId;
    
    return genesisAnchor;
  }

  /**
   * Append anchor to chain
   * 
   * Appends a new anchor to the chain with cryptographic linking.
   * 
   * AICS-001 Section 7.4: "Append-only" - New anchors are appended, never inserted or modified
   * 
   * @param anchor - Anchor to append
   * @returns Appended anchor with computed hash
   */
  async appendAnchor(anchor: Omit<AuditAnchor, 'anchorId' | 'previousAnchorId' | 'proofHash'>): Promise<AuditAnchor> {
    // Ensure chain is initialized
    if (this.anchors.length === 0) {
      await this.createGenesisAnchor();
    }
    
    // Get previous hash
    const previousHash = this.lastHash || CryptographicLinker.GENESIS_HASH;
    
    // Create canonical record data
    const recordData = this.createCanonicalRecordData(anchor);
    
    // Compute cryptographic link
    const linkResult = await CryptographicLinker.computeLink({
      previousHash,
      recordData,
      timestamp: anchor.timestamp,
    });
    
    // Create anchor with computed hash
    const newAnchor: AuditAnchor = {
      ...anchor,
      anchorId: linkResult.hash,
      previousAnchorId: previousHash,
      proofHash: linkResult.hash,
    };
    
    // Append to chain (immutable - append only)
    this.anchors.push(newAnchor);
    this.lastHash = newAnchor.anchorId;
    
    return newAnchor;
  }

  /**
   * Create canonical record data
   * 
   * Creates deterministic string representation of anchor data for hashing.
   * 
   * @param anchor - Anchor data
   * @returns Canonical string representation
   */
  private createCanonicalRecordData(anchor: Omit<AuditAnchor, 'anchorId' | 'previousAnchorId' | 'proofHash'>): string {
    // Create canonical JSON representation (sorted keys)
    const canonical = {
      timestamp: anchor.timestamp.toISOString(),
      decisionContext: anchor.decisionContext,
      ...(anchor.sealId ? { sealId: anchor.sealId } : {}),
    };
    
    return JSON.stringify(canonical);
  }

  /**
   * Verify chain integrity
   * 
   * Verifies the cryptographic integrity of the entire chain.
   * 
   * AICS-001 Section 7.4: "Tamper-evident" - Chain verification detects any tampering
   * 
   * @returns Chain integrity result
   */
  async verifyChainIntegrity(): Promise<ChainIntegrityResult> {
    const errors: string[] = [];
    
    if (this.anchors.length === 0) {
      return {
        isValid: false,
        anchorCount: 0,
        firstAnchorId: null,
        lastAnchorId: null,
        errors: ['Chain is empty'],
      };
    }
    
    // Verify each anchor's link to previous
    for (let i = 0; i < this.anchors.length; i++) {
      const anchor = this.anchors[i];
      
      // Verify previous anchor reference
      if (i === 0) {
        // First anchor should reference genesis hash
        if (anchor.previousAnchorId !== CryptographicLinker.GENESIS_HASH) {
          errors.push(`First anchor ${anchor.anchorId} has invalid previous hash: ${anchor.previousAnchorId}`);
        }
      } else {
        // Subsequent anchors should reference previous anchor's hash
        const previousAnchor = this.anchors[i - 1];
        if (anchor.previousAnchorId !== previousAnchor.anchorId) {
          errors.push(`Anchor ${anchor.anchorId} has invalid previous hash: ${anchor.previousAnchorId}, expected: ${previousAnchor.anchorId}`);
        }
      }
      
      // Verify anchor hash matches computed hash
      const recordData = this.createCanonicalRecordData({
        timestamp: anchor.timestamp,
        decisionContext: anchor.decisionContext,
        sealId: anchor.sealId,
      });
      
      const isValid = await CryptographicLinker.verifyChainLink(
        anchor.anchorId,
        anchor.previousAnchorId,
        recordData,
        anchor.timestamp
      );
      
      if (!isValid) {
        errors.push(`Anchor ${anchor.anchorId} hash verification failed`);
      }
    }
    
    const isValid = errors.length === 0;
    const firstAnchor = this.anchors[0];
    const lastAnchor = this.anchors[this.anchors.length - 1];
    
    return {
      isValid,
      anchorCount: this.anchors.length,
      firstAnchorId: firstAnchor?.anchorId || null,
      lastAnchorId: lastAnchor?.anchorId || null,
      errors,
    };
  }

  /**
   * Get chain
   * 
   * Returns all anchors in the chain (read-only).
   * 
   * @returns Array of anchors
   */
  getChain(): readonly AuditAnchor[] {
    return [...this.anchors]; // Return copy to prevent modification
  }

  /**
   * Get last anchor
   * 
   * Returns the last anchor in the chain.
   * 
   * @returns Last anchor or null
   */
  getLastAnchor(): AuditAnchor | null {
    if (this.anchors.length === 0) {
      return null;
    }
    return this.anchors[this.anchors.length - 1];
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
    return this.anchors.find(a => a.anchorId === anchorId) || null;
  }

  /**
   * Clear chain (mainly for testing)
   */
  clear(): void {
    this.anchors = [];
    this.lastHash = null;
  }
}


