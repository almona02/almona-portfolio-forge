/**
 * Legal Disclaimer Generator
 * 
 * Generates per-operation legal disclaimers for all drafting tools.
 * Every tool operation includes explicit legal protection.
 * 
 * @since Legal Competitive Advantage Implementation
 */

import type { DraftingTool } from '../types/drafting';
import { getToolCertification } from './toolCertification';

export interface ToolOperationDisclaimer {
  /** Tool name */
  toolName: string;
  /** Specific operation performed */
  operation: string;
  /** What this operation does */
  scope: string;
  /** What it doesn't do */
  limitations: string[];
  /** Whether human approval is required */
  humanApprovalRequired: boolean;
  /** Audit trail reference ID */
  auditTrailId: string;
  /** Legal status */
  legalStatus: 'deterministic' | 'suggestive' | 'informational';
  /** Constitutional tier */
  tier: 0 | 1 | 3;
  /** Full disclaimer text */
  disclaimerText: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Legal disclaimer templates
 */
const DISCLAIMER_TEMPLATES = {
  GEOMETRY_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool performs geometric shape creation based on user input.
It does NOT:
- Make engineering judgments
- Certify structural adequacy
- Approve designs for production
- Guarantee manufacturability

Human Approval Required: YES
Legal Status: Deterministic (Tier 0/3)

All outputs require human validation before use in production.
This operation is fully auditable and legally defensible.
  `,
  
  TRANSFORM_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool performs geometric transformation based on user input.
It does NOT:
- Validate transformation result
- Approve transformed design
- Guarantee manufacturability
- Certify engineering compliance

Human Approval Required: YES
Legal Status: Deterministic (Tier 3)

All transformations require human validation before use in production.
This operation is fully auditable and legally defensible.
  `,
  
  PATTERN_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool creates geometric patterns based on user parameters.
It does NOT:
- Validate pattern result
- Approve pattern design
- Guarantee manufacturability
- Certify engineering compliance

Human Approval Required: YES
Legal Status: Deterministic (Tier 3)

All patterns require human validation before use in production.
This operation is fully auditable and legally defensible.
  `,
  
  MEASUREMENT_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool measures dimensions based on geometry.
It does NOT:
- Validate measurements
- Certify accuracy
- Approve measurements for production
- Guarantee measurement precision

Human Approval Required: YES
Legal Status: Deterministic (Tier 3)

All measurements require human verification before use in production.
This operation is fully auditable and legally defensible.
  `,
  
  HARDWARE_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool places hardware based on user input and standards.
It does NOT:
- Validate hardware compatibility
- Approve hardware selection
- Guarantee installation
- Certify hardware compliance

Human Approval Required: YES
Legal Status: Visual Drafting (Tier 0)

All hardware placements require human validation before use in production.
This operation is fully auditable and legally defensible.
  `,
  
  STRUCTURAL_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool places structural elements based on user input and analysis.
It does NOT:
- Validate structural adequacy
- Approve structural design
- Guarantee structural performance
- Certify structural engineering compliance

Human Approval Required: YES
Legal Status: Visual Drafting (Tier 0)

CRITICAL: Structural verification required by licensed engineer.
This operation is fully auditable and legally defensible.
  `,
  
  ANNOTATION_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool creates text annotations for documentation.
It does NOT:
- Make engineering judgments
- Certify information
- Approve designs
- Create legally binding statements

Human Approval Required: NO
Legal Status: Informational (Tier 0)

Annotations are for documentation purposes only.
This operation is fully auditable.
  `,
  
  GENERIC_TOOL_DISCLAIMER: (toolName: string, operation: string) => `
CONSTITUTIONAL DISCLAIMER - ${toolName} Operation

Operation: ${operation}
Scope: This tool performs operations based on user input.
It does NOT:
- Make engineering judgments
- Certify results
- Approve designs
- Guarantee outcomes

Human Approval Required: YES
Legal Status: Requires Validation

All outputs require human validation before use.
This operation is fully auditable and legally defensible.
  `
};

/**
 * Generate legal disclaimer for a tool operation
 */
export function generateToolDisclaimer(
  tool: DraftingTool,
  operation: string,
  auditTrailId: string
): ToolOperationDisclaimer {
  const certification = getToolCertification(tool);
  const template = DISCLAIMER_TEMPLATES[
    certification.legalDisclaimer.template as keyof typeof DISCLAIMER_TEMPLATES
  ] || DISCLAIMER_TEMPLATES.GENERIC_TOOL_DISCLAIMER;
  
  const disclaimerText = template(certification.toolName, operation).trim();
  
  // Determine legal status based on tier
  let legalStatus: 'deterministic' | 'suggestive' | 'informational';
  if (certification.tier === 3) {
    legalStatus = 'deterministic';
  } else if (certification.tier === 1) {
    legalStatus = 'suggestive';
  } else {
    legalStatus = 'informational';
  }
  
  return {
    toolName: certification.toolName,
    operation,
    scope: certification.legalDisclaimer.scope,
    limitations: certification.legalDisclaimer.limitations,
    humanApprovalRequired: certification.legalDisclaimer.humanApprovalRequired,
    auditTrailId,
    legalStatus,
    tier: certification.tier,
    disclaimerText,
    timestamp: new Date()
  };
}

/**
 * Get disclaimer text for display
 */
export function getDisclaimerText(disclaimer: ToolOperationDisclaimer): string {
  return disclaimer.disclaimerText;
}

/**
 * Format disclaimer for UI display
 */
export function formatDisclaimerForUI(disclaimer: ToolOperationDisclaimer): {
  title: string;
  scope: string;
  limitations: string[];
  approvalRequired: boolean;
  auditTrailId: string;
} {
  return {
    title: `Constitutional Disclaimer - ${disclaimer.toolName}`,
    scope: disclaimer.scope,
    limitations: disclaimer.limitations,
    approvalRequired: disclaimer.humanApprovalRequired,
    auditTrailId: disclaimer.auditTrailId
  };
}

