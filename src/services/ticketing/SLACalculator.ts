/**
 * @tier Tier 3 Protected (Execution Path)
 * @constitutional_compliance AICS-001 §5.10.2 (No ML/AI)
 * @deterministic true
 */

import { resolveSlaPolicy } from '@/lib/ticketing/slaPolicy';

export interface SlaDeadlines {
  responseDue: Date;
  resolutionDue: Date;
  escalationDue: Date;
}

export class SLACalculator {
  /**
   * Calculate SLA deadlines from canonical policy (slaPolicy.ts).
   */
  calculateDeadlines(priority: string, ticketType: string, creationTime: Date): SlaDeadlines {
    const policy = resolveSlaPolicy(priority, ticketType);
    const ms = creationTime.getTime();
    return {
      responseDue: new Date(ms + policy.responseHours * 3_600_000),
      resolutionDue: new Date(ms + policy.resolutionHours * 3_600_000),
      escalationDue: new Date(ms + policy.escalationHours * 3_600_000),
    };
  }

  /** @deprecated Use calculateDeadlines — kept for backward-compatible tests */
  calculateDeadline(priority: string, ticketType: string, creationTime: Date): Date {
    return this.calculateDeadlines(priority, ticketType, creationTime).resolutionDue;
  }

  isBreached(resolutionDue: Date | string, status: string, now: Date = new Date()): boolean {
    if (['resolved', 'closed', 'cancelled'].includes(status)) return false;
    const due = resolutionDue instanceof Date ? resolutionDue : new Date(resolutionDue);
    return now.getTime() > due.getTime();
  }
}
