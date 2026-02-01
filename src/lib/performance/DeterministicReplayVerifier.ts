/**
 * CONSTITUTIONAL PERFORMANCE MONITORING
 * AICS-001 Compliance Framework
 * 
 * Deterministic Replay Verifier - Ensures identical inputs produce identical outputs
 * Critical for Tier 3 system performance optimization validation
 */

import crypto from 'crypto';

export interface VerificationResult {
  deterministic: boolean;
  baselineHash: string;
  repetitionHashes: string[];
  constitutionalCompliance: 'PASS' | 'FAIL';
  violationReason: string | null;
  avgExecutionTime: number;
  executionTimeVariance: number;
}

export interface DeterministicOperation<T> {
  name: string;
  tier: 'Tier 0' | 'Tier 3';
  execute: () => Promise<T> | T;
}

/**
 * Verifies that operations maintain deterministic behavior across optimizations
 */
export class DeterministicReplayVerifier {
  /**
   * SHA-256 hash generator for deterministic comparison
   */
  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Serialize object with sorted keys for deterministic hashing
   */
  private serializeDeterministically(obj: any): string {
    return JSON.stringify(obj, (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return Object.keys(value)
          .sort()
          .reduce((sorted, key) => {
            sorted[key] = value[key];
            return sorted;
          }, {} as any);
      }
      return value;
    });
  }

  /**
   * Calculate variance in execution times
   */
  private calculateVariance(times: number[]): number {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const squareDiffs = times.map(time => Math.pow(time - avg, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / times.length);
  }

  /**
   * Verify deterministic behavior by running operation multiple times
   * 
   * @param operation - Operation to verify
   * @param iterations - Number of times to run (default: 3)
   * @returns Verification result with constitutional compliance status
   */
  async verifyDeterministicBehavior<T>(
    operation: DeterministicOperation<T>,
    iterations: number = 3
  ): Promise<VerificationResult> {
    const hashes: string[] = [];
    const executionTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const output = await operation.execute();
      const endTime = performance.now();

      const serialized = this.serializeDeterministically(output);
      const hash = this.sha256(serialized);

      hashes.push(hash);
      executionTimes.push(endTime - startTime);
    }

    const baselineHash = hashes[0];
    const allIdentical = hashes.every(h => h === baselineHash);
    const avgExecutionTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
    const variance = this.calculateVariance(executionTimes);

    return {
      deterministic: allIdentical,
      baselineHash,
      repetitionHashes: hashes,
      constitutionalCompliance: allIdentical ? 'PASS' : 'FAIL',
      violationReason: allIdentical 
        ? null 
        : `Non-deterministic behavior detected: ${hashes.length} unique outputs from ${iterations} iterations`,
      avgExecutionTime,
      executionTimeVariance: variance
    };
  }

  /**
   * Compare two operation results for identity
   */
  resultsIdentical<T>(a: T, b: T): boolean {
    const hashA = this.sha256(this.serializeDeterministically(a));
    const hashB = this.sha256(this.serializeDeterministically(b));
    return hashA === hashB;
  }

  /**
   * Verify cache integrity by recomputing and comparing
   * 
   * CONSTITUTIONAL REQUIREMENT: Cached results must match fresh computation
   */
  async verifyCacheIntegrity<T>(
    cachedResult: T,
    recomputeOperation: () => Promise<T> | T
  ): Promise<{ valid: boolean; reason: string }> {
    const freshResult = await recomputeOperation();
    const identical = this.resultsIdentical(cachedResult, freshResult);

    return {
      valid: identical,
      reason: identical 
        ? 'Cache integrity verified' 
        : 'CONSTITUTIONAL VIOLATION: Cached result differs from fresh computation'
    };
  }
}

/**
 * Export singleton instance
 */
export const deterministicVerifier = new DeterministicReplayVerifier();
