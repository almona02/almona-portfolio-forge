/**
 * @tier Tier 2 Advisory (Constitutional Hardener)
 * @purpose Prevents advisory outputs from contaminating execution paths
 * @gold_tier Performance: < 5ms validation
 * @constitutional_compliance AICS-001 §5.6 & §5.10.2
 */

// We define types locally or import them. Since the prompt implies specific imports but we might not have the types file yet,
// I will define the interfaces here to ensure compilation, or try to import if they should exist.
// The prompt has: import { AdvisoryOutput, ValidationResult } from '@/types/ticketing';
// I will create a types file or define them inline if necessary later. For now, I'll define them in a types file 
// to be cleaner or just export them here if they are reused.
// Given the prompt provides the code content exactly, I will stick to it but I need to make sure the import works.
// I'll assume '@/types/ticketing' might need to be created. I'll create a dummy one if needed or just define them here as export 
// if I can modify the file slightly to avoid import errors, BUT the prompt gave specific code. 
// I will create the types file first to be safe, or just use the code provided and fix imports if they fail.
// A better approach is to create the types file.

import { AdvisoryOutput, ValidationResult } from '../../../types/ticketing';

export class AdvisoryHardener {
  private static readonly EXECUTION_PATHS = [
    'execute', 'assign', 'resolve', 'create', 'update', 'delete',
    'approve', 'reject', 'escalate', 'complete', 'close'
  ];

  private static readonly PROHIBITED_TERMS = [
    'authoritative', 'guaranteed', 'certain',
    'must', 'definitely', 'automatically'
  ];

  /**
   * Hardens advisory output - Constitutional gatekeeper
   * @performance O(1) constant time validation
   */
  static harden(advisory: AdvisoryOutput): ValidationResult {
    const violations: string[] = [];

    // 1. Tier Enforcement
    if (advisory.tier !== 'Tier 2') {
      violations.push(`Violation: Component claims Tier ${advisory.tier}, must be Tier 2`);
    }

    // 2. Execution Path Detection
    if (advisory.suggestion && this.containsExecutionPaths(JSON.stringify(advisory.suggestion))) {
        // Note: The prompt used 'advisory.suggestion' which might be an object or string. 
        // If it's an object, we should stringify it or check properties.
        // The prompt code had: if (advisory.suggestion && this.containsExecutionPaths(advisory.suggestion))
        // Assuming suggestion is a string. If it's 'any', safest is to cast or stringify.
        // I'll stick to the prompt's logic but ensure it handles if suggestion is not a string by checking type?
        // Actually, let's just use JSON.stringify to be safe for "any" type content.
        // Wait, the prompt code says `containsExecutionPaths(text: string)`. 
        // If suggestion is 'any', passing it might fail TS check. 
        // I will assume suggestion is string-like or adjust slightly for TS safety.
        // RE-READING prompt code: `suggestion: any`. 
        // I'll cast it to string if it's not, or use JSON.stringify.
        // The prompt implementation `containsExecutionPaths(text: string)`.
        // I will modify the call slightly to `String(advisory.suggestion)` or similar to be safe.
      violations.push('Violation: Advisory contains execution path terminology');
    }

    // 3. Disclaimer Verification
    if (!advisory.constitutionalDisclaimer || 
        !advisory.constitutionalDisclaimer.includes('ADVISORY ONLY')) {
      violations.push('Violation: Missing or insufficient constitutional disclaimer');
    }

    // 4. Human Validation Requirement
    if (advisory.requiresHumanValidation !== true) {
      violations.push('Violation: Advisory must require human validation');
    }

    // 5. Prohibited Terminology Scan
    const prohibitedFound = this.scanForProhibitedTerms(advisory);
    if (prohibitedFound.length > 0) {
      violations.push(`Violation: Contains prohibited terms: ${prohibitedFound.join(', ')}`);
    }

    return {
      valid: violations.length === 0,
      violations,
      hardenedAdvisory: violations.length === 0 ? {
        ...advisory,
        // Add cryptographic verification token
        verificationToken: this.generateVerificationToken(advisory),
        // Timestamp with monotonic clock
        hardenedAt: performance.now(),
        // Constitutional metadata
        constitutionalVersion: 'AICS-001-v1.0.0',
        institutionalClassification: 'Tier2-Advisory-Only'
      } : advisory
    };
  }

  /**
   * Performance-optimized execution path detection
   * @complexity O(n*m) but with pre-compiled regex
   */
  private static containsExecutionPaths(text: string): boolean {
    // Ensure text is a string
    const str = typeof text === 'string' ? text : JSON.stringify(text);
    const executionPattern = new RegExp(
      this.EXECUTION_PATHS.map(p => `\\b${p}\\b`).join('|'),
      'i'
    );
    return executionPattern.test(str);
  }

  /**
   * Fast prohibited term scanning with bloom filter optimization
   */
  private static scanForProhibitedTerms(advisory: AdvisoryOutput): string[] {
    const found: string[] = [];
    const text = JSON.stringify(advisory).toLowerCase();
    
    this.PROHIBITED_TERMS.forEach(term => {
      if (text.includes(term.toLowerCase())) {
        found.push(term);
      }
    });
    
    return found;
  }

  /**
   * Generate cryptographic verification token for audit trail
   */
  private static generateVerificationToken(advisory: AdvisoryOutput): string {
    const data = {
      content: advisory.suggestion,
      timestamp: Date.now(),
      tier: advisory.tier,
      nonce: Math.random().toString(36).substring(2, 15)
    };
    
    return btoa(JSON.stringify(data)); // Base64 for now, upgrade to SHA-256 in production
  }

  /**
   * Performance monitoring for gold-tier requirements
   */
  static performanceMetrics = {
    validationTime: 0,
    validationCount: 0,
    
    recordValidation(startTime: number): void {
      const duration = performance.now() - startTime;
      this.validationTime += duration;
      this.validationCount++;
      
      if (duration > 5) { // 5ms threshold
        console.warn(`AdvisoryHardener performance warning: ${duration.toFixed(2)}ms`);
      }
    },
    
    getAverageTime(): number {
      return this.validationCount > 0 
        ? this.validationTime / this.validationCount 
        : 0;
    }
  };
}
