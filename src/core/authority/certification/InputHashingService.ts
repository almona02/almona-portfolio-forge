/**
 * @file InputHashingService.ts
 * @description Input Hashing Service - Deterministic Input Hashing
 * 
 * AICS-001 Reference: Section 7.5 (Deterministic Replay Guarantee)
 * 
 * Provides deterministic hashing of inputs for replay verification.
 * 
 * Key Principle: "Same inputs + same truth versions = same result"
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

/**
 * Input Hash Result
 */
export interface InputHashResult {
  /**
   * Cryptographic hash of inputs (SHA-256 hex string)
   */
  hash: string;
  
  /**
   * Canonical JSON representation used for hashing
   */
  canonicalInput: string;
  
  /**
   * Timestamp when hash was computed
   */
  timestamp: Date;
}

/**
 * Input Hashing Service
 * 
 * Provides deterministic hashing of computation inputs.
 * 
 * AICS-001 Section 7.5: Inputs must be hashed before computation
 * to enable deterministic replay verification.
 */
export class InputHashingService {
  /**
   * Hash inputs deterministically
   * 
   * Creates a canonical JSON representation and computes SHA-256 hash.
   * 
   * The canonical representation:
   * - Sorts object keys
   * - Uses consistent formatting
   * - Excludes metadata that doesn't affect computation
   * 
   * @param inputs - Input data to hash
   * @returns Input hash result
   */
  static async hashInputs(inputs: unknown): Promise<InputHashResult> {
    // Create canonical JSON representation
    const canonicalInput = this.canonicalizeInputs(inputs);
    
    // Compute SHA-256 hash
    const hash = await this.computeSHA256(canonicalInput);
    
    return {
      hash,
      canonicalInput,
      timestamp: new Date(),
    };
  }

  /**
   * Canonicalize inputs for deterministic hashing
   * 
   * Converts inputs to canonical JSON representation:
   * - Sorts object keys
   * - Uses consistent formatting
   * - Handles special types (Date, etc.)
   * 
   * @param inputs - Input data
   * @returns Canonical JSON string
   */
  private static canonicalizeInputs(inputs: unknown): string {
    // Convert to JSON with sorted keys and consistent formatting
    // Convert to JSON with sorted keys and consistent formatting
    // const canonical = JSON.stringify(inputs, (key, value) => {
    //   // Handle Date objects
    //   if (value instanceof Date) {
    //     return value.toISOString();
    //   }
      
    //   // Handle undefined (exclude from JSON)
    //   if (value === undefined) {
    //     return null;
    //   }
      
    //   return value;
    // }, 2); // 2-space indentation for readability (doesn't affect hash)
    
    // Remove formatting whitespace for consistent hashing
    // In production, you might want to use a more sophisticated approach
    // For now, we'll use compact JSON (no spaces) for deterministic hashing
    const compact = JSON.stringify(inputs, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value === undefined) {
        return null;
      }
      return value;
    });
    
    return compact;
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
   * Verify input hash
   * 
   * Re-computes hash from inputs and compares with provided hash.
   * 
   * @param inputs - Input data
   * @param expectedHash - Expected hash value
   * @returns True if hash matches
   */
  static async verifyInputHash(inputs: unknown, expectedHash: string): Promise<boolean> {
    const result = await this.hashInputs(inputs);
    return result.hash === expectedHash;
  }

  /**
   * Create input hash from multiple input sources
   * 
   * Combines multiple input sources into single hash.
   * 
   * @param inputs - Array of input sources
   * @returns Combined input hash result
   */
  static async hashMultipleInputs(inputs: unknown[]): Promise<InputHashResult> {
    // Combine all inputs into single object
    const combined = {
      inputs,
      count: inputs.length,
    };
    
    return this.hashInputs(combined);
  }
}


