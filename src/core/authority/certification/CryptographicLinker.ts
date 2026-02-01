/**
 * @file CryptographicLinker.ts
 * @description Cryptographic Linker - Cryptographic Chain Linking
 * 
 * AICS-001 Reference: Section 7.4 (Audit Trail Doctrine)
 * 
 * Provides cryptographic linking for audit records.
 * 
 * Requirements:
 * - Cryptographically linked (prev_hash references)
 * - Tamper-evident (hash changes if data changes)
 * - Time-stamped
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

/**
 * Cryptographic Link Data
 * 
 * Data used to compute cryptographic links between audit records.
 */
export interface CryptographicLinkData {
  /**
   * Previous anchor hash (or genesis hash)
   */
  previousHash: string;
  
  /**
   * Current record data (serialized)
   */
  recordData: string;
  
  /**
   * Timestamp
   */
  timestamp: Date;
  
  /**
   * Optional: Nonce for uniqueness (if needed)
   */
  nonce?: number;
}

/**
 * Cryptographic Link Result
 * 
 * Result of cryptographic linking computation.
 */
export interface CryptographicLinkResult {
  /**
   * Hash of the current record
   */
  hash: string;
  
  /**
   * Previous hash (for chain verification)
   */
  previousHash: string;
  
  /**
   * Timestamp
   */
  timestamp: Date;
  
  /**
   * Canonical representation used for hashing
   */
  canonicalData: string;
}

/**
 * Cryptographic Linker
 * 
 * Provides cryptographic linking for audit records.
 * 
 * AICS-001 Section 7.4: "Audit records are cryptographically linked"
 * 
 * Uses SHA-256 for cryptographic hashing.
 */
export class CryptographicLinker {
  /**
   * Genesis hash (for first record in chain)
   */
  static readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

  /**
   * Compute cryptographic link
   * 
   * Computes hash for audit record with cryptographic linking.
   * 
   * Hash formula: SHA-256(prev_hash + record_data + timestamp + nonce)
   * 
   * @param linkData - Link data
   * @returns Cryptographic link result
   */
  static async computeLink(linkData: CryptographicLinkData): Promise<CryptographicLinkResult> {
    // Create canonical representation
    const canonicalData = this.createCanonicalRepresentation(linkData);
    
    // Compute SHA-256 hash
    const hash = await this.computeSHA256(canonicalData);
    
    return {
      hash,
      previousHash: linkData.previousHash,
      timestamp: linkData.timestamp,
      canonicalData,
    };
  }

  /**
   * Create canonical representation
   * 
   * Creates deterministic string representation for hashing.
   * 
   * @param linkData - Link data
   * @returns Canonical string representation
   */
  private static createCanonicalRepresentation(linkData: CryptographicLinkData): string {
    // Create canonical JSON (sorted keys, consistent formatting)
    const canonical = {
      prev_hash: linkData.previousHash,
      data: linkData.recordData,
      timestamp: linkData.timestamp.toISOString(),
      ...(linkData.nonce !== undefined ? { nonce: linkData.nonce } : {}),
    };
    
    // Use compact JSON for deterministic hashing
    return JSON.stringify(canonical);
  }

  /**
   * Compute SHA-256 hash
   * 
   * Uses Web Crypto API if available, falls back to simple hash.
   * 
   * @param data - Data to hash
   * @returns SHA-256 hash (hex string)
   */
  private static async computeSHA256(data: string): Promise<string> {
    // Use Web Crypto API if available (browser/Node.js)
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
        console.warn('Web Crypto API failed, using fallback hash:', error);
        return this.simpleHash(data);
      }
    }
    
    // Fallback: Simple hash (not cryptographically secure, but deterministic)
    // In production, ensure Web Crypto API is available
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
  private static simpleHash(data: string): string {
    // Simple hash function (deterministic but not cryptographically secure)
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
   * Verify link integrity
   * 
   * Verifies that a hash matches the expected data.
   * 
   * @param linkData - Link data
   * @param expectedHash - Expected hash
   * @returns True if hash matches
   */
  static async verifyLinkIntegrity(
    linkData: CryptographicLinkData,
    expectedHash: string
  ): Promise<boolean> {
    const result = await this.computeLink(linkData);
    return result.hash === expectedHash;
  }

  /**
   * Verify chain link
   * 
   * Verifies that current hash was computed from previous hash.
   * 
   * @param currentHash - Current record hash
   * @param previousHash - Previous record hash
   * @param recordData - Current record data
   * @param timestamp - Record timestamp
   * @returns True if chain link is valid
   */
  static async verifyChainLink(
    currentHash: string,
    previousHash: string,
    recordData: string,
    timestamp: Date
  ): Promise<boolean> {
    const linkData: CryptographicLinkData = {
      previousHash,
      recordData,
      timestamp,
    };
    
    const result = await this.computeLink(linkData);
    return result.hash === currentHash;
  }
}


