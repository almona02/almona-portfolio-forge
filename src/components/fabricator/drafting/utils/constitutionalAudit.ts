// src/components/fabricator/drafting/utils/constitutionalAudit.ts
/**
 * Constitutional Audit System for Drafting Layer
 * 
 * AICS-001 Reference: Section 7.4 (Audit Trail Doctrine)
 * 
 * Every interaction in the drafting layer must be logged for:
 * - Replayability
 * - Deterministic verification
 * - Constitutional compliance verification
 * - Human review capability
 */

export interface DraftingAuditLog {
  id: string;
  timestamp: string;
  action: DraftingAction;
  tier: 'Tier 0';
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  constitutionalCheckpoint: string;
  requiresHumanReview: boolean;
}

export type DraftingAction =
  | 'rectangle_added'
  | 'rectangle_modified'
  | 'rectangle_deleted'
  | 'dimension_added'
  | 'template_selected'
  | 'validation_requested'
  | 'design_exported'
  | 'material_selected'
  | 'system_authority_established'
  | 'preset_intelligence_applied';

/**
 * Log a drafting action with full constitutional context
 */
export function logDraftingAction(
  action: DraftingAction,
  inputs: Record<string, any>,
  outputs: Record<string, any>,
  checkpoint: string
): DraftingAuditLog {
  const log: DraftingAuditLog = {
    id: `DRAFT-AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    tier: 'Tier 0',
    inputs: JSON.parse(JSON.stringify(inputs)), // Deep clone
    outputs: JSON.parse(JSON.stringify(outputs)), // Deep clone
    constitutionalCheckpoint: checkpoint,
    requiresHumanReview: action === 'validation_requested' || action === 'design_exported'
  };

  // Store in session storage for replay capability
  try {
    const existingLogs = JSON.parse(
      sessionStorage.getItem('almona-drafting-audit') || '[]'
    ) as DraftingAuditLog[];
    existingLogs.push(log);
    sessionStorage.setItem('almona-drafting-audit', JSON.stringify(existingLogs));
  } catch (e) {
    console.warn('[Constitutional Audit] Failed to store audit log:', e);
  }

  // Console log for development
  console.log('[Constitutional Audit]', log);

  return log;
}

/**
 * Get full audit trail for current session
 */
export function getAuditTrail(): DraftingAuditLog[] {
  try {
    return JSON.parse(
      sessionStorage.getItem('almona-drafting-audit') || '[]'
    ) as DraftingAuditLog[];
  } catch {
    return [];
  }
}

/**
 * Clear audit trail (for testing only)
 */
export function clearAuditTrail(): void {
  sessionStorage.removeItem('almona-drafting-audit');
}

/**
 * Verify constitutional compliance of audit trail
 */
export function verifyConstitutionalCompliance(logs: DraftingAuditLog[]): {
  compliant: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Check 1: All actions must be Tier 0
  const nonTier0Actions = logs.filter(log => log.tier !== 'Tier 0');
  if (nonTier0Actions.length > 0) {
    violations.push(
      `Found ${nonTier0Actions.length} actions not in Tier 0: ${nonTier0Actions.map(l => l.action).join(', ')}`
    );
  }

  // Check 2: No execution logic in inputs/outputs
  const forbiddenTerms = ['bom', 'cutList', 'optimization', 'profileSelection', 'algorithm'];
  logs.forEach(log => {
    const inputStr = JSON.stringify(log.inputs).toLowerCase();
    const outputStr = JSON.stringify(log.outputs).toLowerCase();
    
    forbiddenTerms.forEach(term => {
      if (inputStr.includes(term) || outputStr.includes(term)) {
        violations.push(
          `Action ${log.action} contains forbidden execution logic term: ${term}`
        );
      }
    });
  });

  // Check 3: All validation requests must have checkpoint
  const validationLogs = logs.filter(log => log.action === 'validation_requested');
  validationLogs.forEach(log => {
    if (!log.constitutionalCheckpoint || log.constitutionalCheckpoint === '') {
      violations.push(`Validation request ${log.id} missing constitutional checkpoint`);
    }
  });

  return {
    compliant: violations.length === 0,
    violations
  };
}

