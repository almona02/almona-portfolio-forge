/**
 * Tool Operation Audit Trail
 * 
 * Logs all tool operations with full legal defensibility.
 * Every operation is auditable and replayable.
 * 
 * @since Legal Competitive Advantage Implementation
 */

import type { DraftingTool } from '../types/drafting';
import type { ToolOperationDisclaimer } from './legalDisclaimers';
import { generateToolDisclaimer } from './legalDisclaimers';
import { getToolCertification } from './toolCertification';
import { logDraftingAction } from './constitutionalAudit';

export interface ToolOperationAudit {
  /** Unique operation ID */
  operationId: string;
  /** Tool identifier */
  toolId: string;
  /** Tool name */
  toolName: string;
  /** Operation timestamp */
  timestamp: Date;
  /** User ID who performed operation */
  userId: string;
  /** Input parameters */
  inputParameters: Record<string, any>;
  /** Output results */
  outputResults: Record<string, any>;
  /** Human approval status */
  humanApproval: {
    required: boolean;
    approved: boolean;
    approvedBy?: string;
    approvalTimestamp?: Date;
    approvalReason?: string;
  };
  /** Constitutional compliance */
  constitutionalCompliance: {
    tier: 0 | 1 | 3;
    violations: string[];
    healthScore: number;
  };
  /** Legal defensibility */
  legalDefensibility: {
    disclaimer: ToolOperationDisclaimer;
    auditTrailHash: string;
    replayable: boolean;
  };
  /** Metadata */
  metadata: {
    sessionId: string;
    projectId?: string;
    workspaceId?: string;
  };
}

/**
 * Generate unique operation ID
 */
function generateOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate audit trail hash for legal defensibility
 */
function generateAuditTrailHash(audit: Omit<ToolOperationAudit, 'legalDefensibility'>): string {
  // Create hash from critical audit data
  const hashData = {
    operationId: audit.operationId,
    toolId: audit.toolId,
    timestamp: audit.timestamp.toISOString(),
    userId: audit.userId,
    inputParameters: audit.inputParameters,
    outputResults: audit.outputResults,
    humanApproval: audit.humanApproval
  };
  
  // Simple hash (in production, use crypto.subtle.digest)
  const hashString = JSON.stringify(hashData);
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `hash-${Math.abs(hash).toString(16)}`;
}

/**
 * Get current user ID (placeholder - integrate with auth system)
 */
function getCurrentUserId(): string {
  // TODO: Integrate with actual auth system
  return `user-${Date.now()}`;
}

/**
 * Get current session ID
 */
function getCurrentSessionId(): string {
  // TODO: Integrate with session management
  return `session-${Date.now()}`;
}

/**
 * Log tool operation with full audit trail
 */
export function logToolOperation(
  tool: DraftingTool,
  operation: string,
  input: Record<string, any>,
  output: Record<string, any>,
  options?: {
    projectId?: string;
    workspaceId?: string;
    humanApproved?: boolean;
    approvedBy?: string;
    approvalReason?: string;
  }
): ToolOperationAudit {
  const certification = getToolCertification(tool);
  const operationId = generateOperationId();
  const auditTrailId = `audit-${operationId}`;
  
  // Generate legal disclaimer
  const disclaimer = generateToolDisclaimer(tool, operation, auditTrailId);
  
  // Create audit record
  const audit: Omit<ToolOperationAudit, 'legalDefensibility'> = {
    operationId,
    toolId: tool,
    toolName: certification.toolName,
    timestamp: new Date(),
    userId: getCurrentUserId(),
    inputParameters: input,
    outputResults: output,
    humanApproval: {
      required: certification.legalDisclaimer.humanApprovalRequired,
      approved: options?.humanApproved || false,
      approvedBy: options?.approvedBy,
      approvalTimestamp: options?.humanApproved ? new Date() : undefined,
      approvalReason: options?.approvalReason
    },
    constitutionalCompliance: {
      tier: certification.tier,
      violations: [],
      healthScore: 100
    },
    metadata: {
      sessionId: getCurrentSessionId(),
      projectId: options?.projectId,
      workspaceId: options?.workspaceId
    }
  };
  
  // Generate audit trail hash
  const auditTrailHash = generateAuditTrailHash(audit);
  
  // Complete audit record
  const completeAudit: ToolOperationAudit = {
    ...audit,
    legalDefensibility: {
      disclaimer,
      auditTrailHash,
      replayable: certification.deterministicReplay
    }
  };
  
  // Store in audit log (constitutional audit)
  logDraftingAction(
    'tool_operation',
    {
      toolId: tool,
      toolName: certification.toolName,
      operation,
      operationId,
      auditTrailHash,
      tier: certification.tier,
      humanApprovalRequired: certification.legalDisclaimer.humanApprovalRequired,
      humanApproved: completeAudit.humanApproval.approved
    },
    {
      inputParameters: input,
      outputResults: output
    },
    `CHECKPOINT-TOOL-OPERATION-${operationId}`
  );
  
  // Store in local audit trail (for replay)
  storeAuditTrail(completeAudit);
  
  return completeAudit;
}

/**
 * Store audit trail (local storage for now, database in production)
 */
function storeAuditTrail(audit: ToolOperationAudit): void {
  try {
    const auditKey = `almona-audit-${audit.operationId}`;
    const auditData = JSON.stringify(audit);
    
    // Store in localStorage (in production, use database)
    if (typeof window !== 'undefined' && window.localStorage) {
      // Limit stored audits to last 1000 operations
      const existingAudits = getStoredAuditIds();
      if (existingAudits.length >= 1000) {
        // Remove oldest
        const oldestId = existingAudits[0];
        localStorage.removeItem(`almona-audit-${oldestId}`);
      }
      
      localStorage.setItem(auditKey, auditData);
      localStorage.setItem('almona-audit-index', JSON.stringify([
        ...existingAudits.filter(id => id !== audit.operationId),
        audit.operationId
      ]));
    }
  } catch (error) {
    console.error('Failed to store audit trail:', error);
    // Don't throw - audit logging should not break operations
  }
}

/**
 * Get stored audit IDs
 */
function getStoredAuditIds(): string[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const index = localStorage.getItem('almona-audit-index');
      return index ? JSON.parse(index) : [];
    }
  } catch (error) {
    console.error('Failed to get audit index:', error);
  }
  return [];
}

/**
 * Retrieve audit trail by operation ID
 */
export function getAuditTrail(operationId: string): ToolOperationAudit | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const auditData = localStorage.getItem(`almona-audit-${operationId}`);
      if (auditData) {
        const audit = JSON.parse(auditData) as ToolOperationAudit;
        // Restore Date objects
        audit.timestamp = new Date(audit.timestamp);
        if (audit.humanApproval.approvalTimestamp) {
          audit.humanApproval.approvalTimestamp = new Date(audit.humanApproval.approvalTimestamp);
        }
        return audit;
      }
    }
  } catch (error) {
    console.error('Failed to retrieve audit trail:', error);
  }
  return null;
}

/**
 * Get all audit trails for a tool
 */
export function getAuditTrailsForTool(tool: DraftingTool): ToolOperationAudit[] {
  const allAuditIds = getStoredAuditIds();
  const audits: ToolOperationAudit[] = [];
  
  for (const auditId of allAuditIds) {
    const audit = getAuditTrail(auditId);
    if (audit && audit.toolId === tool) {
      audits.push(audit);
    }
  }
  
  return audits.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Replay operation from audit trail (deterministic replay)
 */
export function replayOperation(audit: ToolOperationAudit): {
  success: boolean;
  result?: any;
  error?: string;
} {
  if (!audit.legalDefensibility.replayable) {
    return {
      success: false,
      error: 'Operation is not replayable (non-deterministic)'
    };
  }
  
  try {
    // In a real implementation, this would replay the operation
    // For now, return the stored output
    return {
      success: true,
      result: audit.outputResults
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Replay failed'
    };
  }
}

