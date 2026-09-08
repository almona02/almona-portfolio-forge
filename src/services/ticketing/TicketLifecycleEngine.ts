/**
 * @tier Tier 3 Protected (Execution Path)
 * @constitutional_compliance AICS-001 §5.10.2 (No ML/AI)
 * @deterministic true
 */

import { TICKET_STATUS_TRANSITIONS } from '@/lib/ticketing/ticketTransitions';

export interface TicketTransitionResult {
  transitionId: string;
  ticketId: string;
  previousStatus: string;
  newStatus: string;
  actorId: string;
  timestamp: string;
  rationale: string;
  tier: string;
  deterministic: boolean;
  constitutionalDisclaimer: string;
}

function generateDeterministicId(
  ticketId: string,
  targetStatus: string,
  actorId: string,
  timestamp: string,
): string {
  return `TRANS-${ticketId}-${targetStatus}-${actorId}-${timestamp}`;
}

export class TicketLifecycleEngine {
  private readonly STATUS_TRANSITIONS = TICKET_STATUS_TRANSITIONS;

  validateTransition(
    currentStatus: string,
    targetStatus: string,
  ): { valid: boolean; ruleId: string; rationale: string } {
    const allowed = this.STATUS_TRANSITIONS[currentStatus] ?? [];

    if (allowed.includes(targetStatus)) {
      return {
        valid: true,
        ruleId: `TRANSITION-${currentStatus.toUpperCase()}-TO-${targetStatus.toUpperCase()}`,
        rationale: 'Status transition validated by deterministic rule',
      };
    }

    return {
      valid: false,
      ruleId: 'TRANSITION-INVALID',
      rationale: `Transition from ${currentStatus} to ${targetStatus} not allowed`,
    };
  }

  executeTransition(
    ticketId: string,
    targetStatus: string,
    actorId: string,
    rationale: string,
    currentStatus: string,
    timestamp: string = new Date().toISOString(),
  ): TicketTransitionResult {
    const validation = this.validateTransition(currentStatus, targetStatus);
    if (!validation.valid) {
      throw new Error(`Invalid transition: ${validation.rationale}`);
    }

    return {
      transitionId: generateDeterministicId(ticketId, targetStatus, actorId, timestamp),
      ticketId,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      actorId,
      timestamp,
      rationale,
      tier: 'Tier 3',
      deterministic: true,
      constitutionalDisclaimer:
        'Status transition executed by deterministic rules. Human validation of resolution quality required.',
    };
  }
}
