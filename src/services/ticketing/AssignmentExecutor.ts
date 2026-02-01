/**
 * @tier Tier 3 Protected (Execution Path)
 * @constitutional_compliance AICS-001 §5.10.2 (No ML/AI)
 * @deterministic true
 * @audit_trail complete
 */

// Basic Type Definitions for completeness
interface Ticket {
    id: string;
    type: string;
    priority: string;
    // other fields...
}

interface ValidatedAdvisoryOutput {
    humanValidationId: string;
    suggestion?: string;
    // other fields...
}

interface AssignmentRule {
    id: string;
    execute(ticket: Ticket): string; // Returns technician ID
}

interface AssignmentResult {
    assignmentId: string;
    ticketId: string;
    assignedTo: string;
    ruleId: string;
    humanActorId: string;
    advisoryValidationId: string;
    timestamp: string;
    tier: string;
    deterministic: boolean;
    constitutionalDisclaimer: string;
}

class ConstitutionalViolationError extends Error {
    constructor(message: string, public citation: string) {
        super(message);
        this.name = 'ConstitutionalViolationError';
    }
}

function generateDeterministicId(ticketId: string, ruleId: string, actorId: string): string {
    return `ASSIGN-${ticketId}-${ruleId}-${actorId}`;
}

export class AssignmentExecutor {
  private readonly assignmentRules: Map<string, AssignmentRule>;
  
  constructor(rules: AssignmentRule[]) {
    // Load deterministic rules from registry
    this.assignmentRules = new Map(rules.map(rule => [rule.id, rule]));
  }

  /**
   * Execute assignment based on validated advisory input
   * @constitutional_requirement Human validation must precede execution
   */
  executeAssignment(
    ticket: Ticket,
    validatedAdvisory: ValidatedAdvisoryOutput,
    humanActorId: string
  ): AssignmentResult {
    // Verify advisory has been human-validated
    if (!validatedAdvisory.humanValidationId) {
      throw new ConstitutionalViolationError(
        'Assignment requires human-validated advisory input',
        'AICS-001 §2.1'
      );
    }

    // Apply deterministic rule
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
      constitutionalDisclaimer: 'Assignment executed by deterministic rules following human validation of advisory suggestions.'
    };
  }

  /**
   * Deterministic rule selection
   */
  private selectAssignmentRule(
    ticket: Ticket,
    advisory: ValidatedAdvisoryOutput
  ): AssignmentRule {
    // Rule selection logic (deterministic, rule-based)
    if (ticket.type === 'technical' && ticket.priority === 'critical') {
      const rule = this.assignmentRules.get('RULE-ASSIGN-001');
      if (rule) return rule;
    }
    
    if (ticket.type === 'warranty' && advisory.suggestion?.includes('senior')) {
      const rule = this.assignmentRules.get('RULE-ASSIGN-002');
      if (rule) return rule;
    }
    
    // Default rule
    // We assume a 'RULE-ASSIGN-DEFAULT' exists or we throw
    const defaultRule = this.assignmentRules.get('RULE-ASSIGN-DEFAULT');
    if (!defaultRule) {
        throw new Error("Default assignment rule missing configuration");
    }
    return defaultRule;
  }
}
