/**
 * EscalationEngine - Issue Escalation System
 * 
 * Handles issue escalation based on severity and response time SLAs
 * 
 * @since Phase 5: Pre-Pilot Hardening (Week 27)
 */

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EscalationLevel = 'level1' | 'level2' | 'level3' | 'executive';

export interface Issue {
  id: string;
  workshopId: string;
  severity: IssueSeverity;
  description: string;
  reportedAt: Date;
  escalatedAt?: Date;
  resolvedAt?: Date;
  escalationLevel: EscalationLevel;
  assignedTo?: string;
}

export interface EscalationRule {
  severity: IssueSeverity;
  responseTimeSLA: number; // minutes
  resolutionTimeSLA: number; // hours
  escalationLevel: EscalationLevel;
}

const ESCALATION_RULES: EscalationRule[] = [
  {
    severity: 'critical',
    responseTimeSLA: 30, // 30 minutes
    resolutionTimeSLA: 4, // 4 hours
    escalationLevel: 'executive'
  },
  {
    severity: 'high',
    responseTimeSLA: 120, // 2 hours
    resolutionTimeSLA: 24, // 24 hours
    escalationLevel: 'level3'
  },
  {
    severity: 'medium',
    responseTimeSLA: 480, // 8 hours
    resolutionTimeSLA: 72, // 72 hours
    escalationLevel: 'level2'
  },
  {
    severity: 'low',
    responseTimeSLA: 1440, // 24 hours
    resolutionTimeSLA: 168, // 1 week
    escalationLevel: 'level1'
  }
];

/**
 * EscalationEngine - Manages issue escalation
 */
export class EscalationEngine {
  private issues: Issue[] = [];

  /**
   * Create new issue
   */
  createIssue(workshopId: string, severity: IssueSeverity, description: string): Issue {
    const rule = ESCALATION_RULES.find(r => r.severity === severity)!;
    
    const issue: Issue = {
      id: `issue-${Date.now()}`,
      workshopId,
      severity,
      description,
      reportedAt: new Date(),
      escalationLevel: rule.escalationLevel
    };

    this.issues.push(issue);
    return issue;
  }

  /**
   * Check if issue needs escalation
   */
  checkEscalation(issueId: string): boolean {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue) return false;

    const rule = ESCALATION_RULES.find(r => r.severity === issue.severity)!;
    const timeSinceReport = (Date.now() - issue.reportedAt.getTime()) / (1000 * 60); // minutes

    if (timeSinceReport > rule.responseTimeSLA && !issue.escalatedAt) {
      this.escalate(issueId);
      return true;
    }

    return false;
  }

  /**
   * Escalate issue
   */
  escalate(issueId: string): void {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue || issue.escalatedAt) return;

    const rule = ESCALATION_RULES.find(r => r.severity === issue.severity)!;
    
    // Determine next escalation level
    const escalationLevels: EscalationLevel[] = ['level1', 'level2', 'level3', 'executive'];
    const currentIndex = escalationLevels.indexOf(issue.escalationLevel);
    const nextLevel = escalationLevels[Math.min(currentIndex + 1, escalationLevels.length - 1)];

    issue.escalationLevel = nextLevel;
    issue.escalatedAt = new Date();
  }

  /**
   * Resolve issue
   */
  resolveIssue(issueId: string): void {
    const issue = this.issues.find(i => i.id === issueId);
    if (issue) {
      issue.resolvedAt = new Date();
    }
  }

  /**
   * Get all issues
   */
  getIssues(): Issue[] {
    return this.issues;
  }

  /**
   * Get issues by workshop
   */
  getIssuesByWorkshop(workshopId: string): Issue[] {
    return this.issues.filter(i => i.workshopId === workshopId);
  }

  /**
   * Get issues by severity
   */
  getIssuesBySeverity(severity: IssueSeverity): Issue[] {
    return this.issues.filter(i => i.severity === severity);
  }

  /**
   * Get SLA status for issue
   */
  getSLAStatus(issueId: string): {
    withinSLA: boolean;
    timeRemaining: number; // minutes
    sla: EscalationRule;
  } {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }

    const rule = ESCALATION_RULES.find(r => r.severity === issue.severity)!;
    const timeSinceReport = (Date.now() - issue.reportedAt.getTime()) / (1000 * 60); // minutes
    const timeRemaining = rule.responseTimeSLA - timeSinceReport;

    return {
      withinSLA: timeRemaining > 0,
      timeRemaining: Math.max(0, timeRemaining),
      sla: rule
    };
  }
}

