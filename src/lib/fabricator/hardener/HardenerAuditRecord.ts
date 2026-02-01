/**
 * HardenerAuditRecord - Audit Trail for Hardener Selection
 * 
 * Records all hardener selection decisions for audit purposes.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import type { HardenerSelectionResult, HardenerSelectionContext } from './types';

/**
 * Hardener Audit Record
 */
export interface HardenerAuditRecord {
  /** Timestamp of selection */
  timestamp: Date;
  /** Window unit ID */
  windowUnitId: string;
  /** Selection context */
  context: HardenerSelectionContext;
  /** Selection result */
  result: HardenerSelectionResult;
  /** User who initiated selection */
  userId?: string;
  /** System mode */
  mode: 'sandbox' | 'production' | 'certified';
  /** Audit trail hash */
  auditHash?: string;
}

/**
 * Hardener Audit Logger
 * 
 * Logs all hardener selection decisions for constitutional audit trail.
 */
export class HardenerAuditLogger {
  private records: HardenerAuditRecord[] = [];

  /**
   * Log hardener selection
   */
  logSelection(
    windowUnitId: string,
    context: HardenerSelectionContext,
    result: HardenerSelectionResult,
    userId?: string,
    mode: 'sandbox' | 'production' | 'certified' = 'production'
  ): HardenerAuditRecord {
    const record: HardenerAuditRecord = {
      timestamp: new Date(),
      windowUnitId,
      context,
      result,
      userId,
      mode,
      auditHash: this.generateAuditHash(windowUnitId, context, result),
    };

    this.records.push(record);

    // In production, also log to persistent storage
    if (mode === 'production' || mode === 'certified') {
      this.persistRecord(record);
    }

    return record;
  }

  /**
   * Get audit records for a window unit
   */
  getRecordsForWindowUnit(windowUnitId: string): HardenerAuditRecord[] {
    return this.records.filter(r => r.windowUnitId === windowUnitId);
  }

  /**
   * Get all audit records
   */
  getAllRecords(): HardenerAuditRecord[] {
    return [...this.records];
  }

  /**
   * Generate audit hash for integrity verification
   */
  private generateAuditHash(
    windowUnitId: string,
    context: HardenerSelectionContext,
    result: HardenerSelectionResult
  ): string {
    const data = JSON.stringify({
      windowUnitId,
      context,
      result: {
        hardenerCode: result.hardenerCode,
        ruleId: result.ruleId,
        validation: result.validation,
      },
    });

    // Simple hash function (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Persist record to storage (localStorage or backend)
   */
  private persistRecord(record: HardenerAuditRecord): void {
    try {
      const key = `hardener_audit_${record.windowUnitId}_${record.timestamp.getTime()}`;
      localStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      console.error('Failed to persist hardener audit record:', error);
      // In production, send to backend audit service
    }
  }
}

/**
 * Singleton instance
 */
export const hardenerAuditLogger = new HardenerAuditLogger();

