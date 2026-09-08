/**
 * @tier Tier 3 Protected (Execution Path)
 * @constitutional_compliance AICS-001 §5.10.2 (No ML/AI)
 * @deterministic true
 */

interface Ticket {
  id: string;
  type: string;
  priority: string;
}

interface ValidatedAdvisoryOutput {
  humanValidationId: string;
  suggestion?: string;
}

interface AssignmentRule {
  id: string;
  execute(ticket: Ticket): string;
}

export interface AssigneeCandidate {
  id: string;
  activeTicketCount: number;
}

export interface AssignmentResult {
  assignmentId: string;
  ticketId: string;
  assignedTo: string;
  ruleId: string;
  humanActorId: string;
  advisoryValidationId?: string;
  timestamp: string;
  tier: string;
  deterministic: boolean;
  constitutionalDisclaimer: string;
}

class ConstitutionalViolationError extends Error {
  constructor(
    message: string,
    public citation: string,
  ) {
    super(message);
    this.name = 'ConstitutionalViolationError';
  }
}

function generateDeterministicId(ticketId: string, ruleId: string, actorId: string): string {
  return `ASSIGN-${ticketId}-${ruleId}-${actorId}`;
}

/** Role required for ticket type — deterministic policy (no RANDOM()). */
export function roleForTicketType(ticketType: string): string {
  switch (ticketType) {
    case 'technical':
    case 'maintenance':
    case 'installation':
    case 'spare_parts':
      return 'technician';
    case 'sales':
    case 'billing':
      return 'sales_rep';
    default:
      return 'admin';
  }
}

/** Pick assignee: lowest workload, tie-break by id ascending. */
export function selectDeterministicAssignee(candidates: AssigneeCandidate[]): string | null {
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => {
    if (a.activeTicketCount !== b.activeTicketCount) {
      return a.activeTicketCount - b.activeTicketCount;
    }
    return a.id.localeCompare(b.id);
  });
  return sorted[0].id;
}

export class AssignmentExecutor {
  private readonly assignmentRules: Map<string, AssignmentRule>;

  constructor(rules: AssignmentRule[]) {
    this.assignmentRules = new Map(rules.map((rule) => [rule.id, rule]));
  }

  /**
   * Policy-driven assignment (Tier 3) — no advisory input required.
   * Used for deterministic auto-assignment after ticket creation.
   */
  executePolicyAssignment(
    ticket: Ticket,
    assigneeId: string,
    humanActorId: string,
    ruleId: string = 'RULE-ASSIGN-POLICY',
  ): AssignmentResult {
    return {
      assignmentId: generateDeterministicId(ticket.id, ruleId, humanActorId),
      ticketId: ticket.id,
      assignedTo: assigneeId,
      ruleId,
      humanActorId,
      timestamp: new Date().toISOString(),
      tier: 'Tier 3',
      deterministic: true,
      constitutionalDisclaimer:
        'Assignment executed by deterministic policy rules (lowest workload, id tie-break).',
    };
  }

  executeAssignment(
    ticket: Ticket,
    validatedAdvisory: ValidatedAdvisoryOutput,
    humanActorId: string,
  ): AssignmentResult {
    if (!validatedAdvisory.humanValidationId) {
      throw new ConstitutionalViolationError(
        'Assignment requires human-validated advisory input',
        'AICS-001 §2.1',
      );
    }

    const rule = this.selectAssignmentRule(ticket, validatedAdvisory);

    return {
      assignmentId: generateDeterministicId(ticket.id, rule.id, humanActorId),
      ticketId: ticket.id,
      assignedTo: rule.execute(ticket),
      ruleId: rule.id,
      humanActorId,
      advisoryValidationId: validatedAdvisory.humanValidationId,
      timestamp: new Date().toISOString(),
      tier: 'Tier 3',
      deterministic: true,
      constitutionalDisclaimer:
        'Assignment executed by deterministic rules following human validation of advisory suggestions.',
    };
  }

  private selectAssignmentRule(ticket: Ticket, advisory: ValidatedAdvisoryOutput): AssignmentRule {
    if (ticket.type === 'technical' && ticket.priority === 'critical') {
      const rule = this.assignmentRules.get('RULE-ASSIGN-001');
      if (rule) return rule;
    }

    if (ticket.type === 'warranty' && advisory.suggestion?.includes('senior')) {
      const rule = this.assignmentRules.get('RULE-ASSIGN-002');
      if (rule) return rule;
    }

    const defaultRule = this.assignmentRules.get('RULE-ASSIGN-DEFAULT');
    if (!defaultRule) {
      throw new Error('Default assignment rule missing configuration');
    }
    return defaultRule;
  }
}
