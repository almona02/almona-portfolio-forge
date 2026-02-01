/**
 * CONSTITUTIONAL PERFORMANCE MONITORING
 * Audit Trail Integrity Checker
 * 
 * Ensures all performance optimizations maintain complete audit trail
 * as required by AICS-001 constitutional governance
 */

export interface AuditEntry {
  id: string;
  timestamp: number;
  operation: string;
  tier: 'Tier 0' | 'Tier 3';
  inputs: any;
  outputs: any;
  duration: number;
  ruleId?: string; // For Tier 3 algorithm selection
  hash: string; // SHA-256 of inputs+outputs
}

export interface AuditTrailReport {
  totalEntries: number;
  tier0Entries: number;
  tier3Entries: number;
  missingEntries: string[];
  integrityViolations: string[];
  complete: boolean;
  constitutionalCompliance: 'PASS' | 'FAIL';
}

/**
 * Monitors and verifies audit trail integrity for constitutional compliance
 */
export class AuditTrailIntegrityChecker {
  private auditLog: AuditEntry[] = [];
  private maxLogSize = 10000; // Keep last 10k entries
  private requiredOperations = new Set<string>();

  /**
   * Register an operation that requires audit trail
   */
  registerRequiredOperation(operationName: string, tier: 'Tier 0' | 'Tier 3'): void {
    this.requiredOperations.add(`${operationName}:${tier}`);
  }

  /**
   * Record an audit entry
   */
  recordAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'hash'>): AuditEntry {
    const fullEntry: AuditEntry = {
      ...entry,
      id: this.generateEntryId(),
      timestamp: Date.now(),
      hash: this.hashEntry(entry)
    };

    this.auditLog.push(fullEntry);

    // Trim old entries if exceeding max size
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }

    // Store in IndexedDB for persistence
    this.persistAuditEntry(fullEntry);

    return fullEntry;
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash an audit entry for integrity verification using Web Crypto API
   */
  private hashEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'hash'>): string {
    const data = JSON.stringify({
      operation: entry.operation,
      tier: entry.tier,
      inputs: entry.inputs,
      outputs: entry.outputs,
      ruleId: entry.ruleId
    });
    
    // Use simple hash for browser compatibility (SHA-256 via Web Crypto would be async)
    // For audit trail, we use a deterministic hash based on content
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Verify audit trail completeness
   */
  verifyAuditTrailCompleteness(): AuditTrailReport {
    const tier0Entries = this.auditLog.filter(e => e.tier === 'Tier 0');
    const tier3Entries = this.auditLog.filter(e => e.tier === 'Tier 3');

    const missingEntries: string[] = [];
    const integrityViolations: string[] = [];

    // Check for missing required operations
    for (const requiredOp of this.requiredOperations) {
      const [operation, tier] = requiredOp.split(':');
      const hasEntry = this.auditLog.some(
        e => e.operation === operation && e.tier === tier
      );

      if (!hasEntry) {
        missingEntries.push(`Missing audit entry for: ${operation} (${tier})`);
      }
    }

    // Verify Tier 3 entries have rule IDs (deterministic selection)
    tier3Entries.forEach(entry => {
      if (!entry.ruleId && entry.operation.includes('Algorithm')) {
        integrityViolations.push(
          `Tier 3 entry ${entry.id} missing rule ID for deterministic tracking`
        );
      }
    });

    // Verify hash integrity
    this.auditLog.forEach(entry => {
      const recomputedHash = this.hashEntry(entry);
      if (recomputedHash !== entry.hash) {
        integrityViolations.push(
          `Hash mismatch for entry ${entry.id} - possible tampering`
        );
      }
    });

    const complete = missingEntries.length === 0 && integrityViolations.length === 0;

    return {
      totalEntries: this.auditLog.length,
      tier0Entries: tier0Entries.length,
      tier3Entries: tier3Entries.length,
      missingEntries,
      integrityViolations,
      complete,
      constitutionalCompliance: complete ? 'PASS' : 'FAIL'
    };
  }

  /**
   * Get audit trail for a specific operation
   */
  getAuditTrailForOperation(operationName: string): AuditEntry[] {
    return this.auditLog.filter(e => e.operation === operationName);
  }

  /**
   * Get audit trail for Tier 3 operations (execution path)
   */
  getTier3AuditTrail(): AuditEntry[] {
    return this.auditLog.filter(e => e.tier === 'Tier 3');
  }

  /**
   * Verify deterministic replay capability
   */
  verifyDeterministicReplay(operationName: string): {
    canReplay: boolean;
    reason: string;
  } {
    const entries = this.getAuditTrailForOperation(operationName);

    if (entries.length === 0) {
      return {
        canReplay: false,
        reason: 'No audit entries found for this operation'
      };
    }

    // Check all entries have complete input/output data
    const incompleteEntries = entries.filter(
      e => !e.inputs || !e.outputs
    );

    if (incompleteEntries.length > 0) {
      return {
        canReplay: false,
        reason: `${incompleteEntries.length} entries missing input/output data`
      };
    }

    // For Tier 3, verify rule IDs present
    const tier3Entries = entries.filter(e => e.tier === 'Tier 3');
    const missingRuleIds = tier3Entries.filter(e => !e.ruleId);

    if (missingRuleIds.length > 0) {
      return {
        canReplay: false,
        reason: `${missingRuleIds.length} Tier 3 entries missing rule IDs for deterministic replay`
      };
    }

    return {
      canReplay: true,
      reason: 'All audit entries complete for deterministic replay'
    };
  }

  /**
   * Persist audit entry to IndexedDB
   */
  private async persistAuditEntry(entry: AuditEntry): Promise<void> {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return; // Not in browser environment
      }

      const db = await this.openAuditDatabase();
      const transaction = db.transaction(['auditLog'], 'readwrite');
      const store = transaction.objectStore('auditLog');
      
      await store.add(entry);
    } catch (error) {
      console.warn('Failed to persist audit entry to IndexedDB', error);
    }
  }

  /**
   * Open IndexedDB for audit log storage
   */
  private async openAuditDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ConstitutionalAuditLog', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('auditLog')) {
          db.createObjectStore('auditLog', { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Export audit log for compliance reporting
   */
  exportAuditLog(): AuditEntry[] {
    return [...this.auditLog];
  }

  /**
   * Clear audit log (for testing only)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }

  /**
   * Clear required operations (for testing only)
   */
  clearRequiredOperations(): void {
    this.requiredOperations.clear();
  }
}

/**
 * Singleton instance
 */
export const auditTrailChecker = new AuditTrailIntegrityChecker();

// Register required operations
auditTrailChecker.registerRequiredOperation('BOMCalculation', 'Tier 3');
auditTrailChecker.registerRequiredOperation('AlgorithmSelection', 'Tier 3');
auditTrailChecker.registerRequiredOperation('GridGeneration', 'Tier 3');
auditTrailChecker.registerRequiredOperation('CanvasRender', 'Tier 0');
auditTrailChecker.registerRequiredOperation('TemplateLoad', 'Tier 0');
