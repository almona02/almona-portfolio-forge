/**
 * Legal Certification Badge Component
 * 
 * Visual indicator showing that a tool is constitutionally certified
 * and legally protected. Displays on toolbars and tool selection.
 * 
 * @since Legal Competitive Advantage Implementation
 */

import { Badge } from '@/shared/ui/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';
import { AlertCircle, Shield } from 'lucide-react';
import React from 'react';
import type { DraftingTool } from '../types/drafting';
import { formatDisclaimerForUI } from '../utils/legalDisclaimers';
import { getToolCertification, isToolCertified } from '../utils/toolCertification';

interface LegalCertificationBadgeProps {
  tool: DraftingTool;
  /** Show detailed tooltip */
  showDetails?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export const LegalCertificationBadge: React.FC<LegalCertificationBadgeProps> = ({
  tool,
  showDetails = true,
  size = 'sm'
}) => {
  const certification = getToolCertification(tool);
  const isCertified = isToolCertified(tool);
  
  if (!isCertified) {
    return null; // Don't show badge for uncertified tools
  }
  
  const badgeVariant = certification.certification.status === 'certified' 
    ? 'default' 
    : certification.certification.status === 'experimental'
    ? 'secondary'
    : 'outline';
  
  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;
  
  const badgeContent = (
    <Badge 
      variant={badgeVariant}
      className={`flex items-center gap-1 ${size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'md' ? 'text-sm px-2 py-1' : 'text-base px-2.5 py-1.5'}`}
    >
      <Shield className={`w-${iconSize} h-${iconSize}`} />
      <span className="sr-only">Constitutionally Certified</span>
    </Badge>
  );
  
  if (!showDetails) {
    return badgeContent;
  }
  
  const disclaimer = formatDisclaimerForUI({
    toolName: certification.toolName,
    operation: 'Tool Operation',
    scope: certification.legalDisclaimer.scope,
    limitations: certification.legalDisclaimer.limitations,
    humanApprovalRequired: certification.legalDisclaimer.humanApprovalRequired,
    auditTrailId: 'N/A',
    legalStatus: certification.tier === 3 ? 'deterministic' : 'informational',
    tier: certification.tier,
    disclaimerText: '',
    timestamp: new Date()
  });
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-md p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-sm">Constitutionally Certified</h4>
            </div>
            
            <div className="text-xs space-y-2">
              <div>
                <span className="font-medium">Tool:</span> {certification.toolName}
              </div>
              <div>
                <span className="font-medium">Tier:</span> {certification.tier === 0 ? 'Visual Drafting' : certification.tier === 1 ? 'Authoritative AI' : 'Protected Determinism'}
              </div>
              <div>
                <span className="font-medium">Accuracy:</span> {certification.accuracyGuarantee}%
              </div>
              <div>
                <span className="font-medium">Status:</span> {certification.certification.status}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="text-xs font-medium mb-1">Scope:</div>
              <div className="text-xs text-gray-600">{disclaimer.scope}</div>
            </div>
            
            {disclaimer.limitations.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs font-medium mb-1">Limitations:</div>
                <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                  {disclaimer.limitations.map((limitation, i) => (
                    <li key={i}>{limitation}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {disclaimer.approvalRequired && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Human Approval Required</span>
                </div>
              </div>
            )}
            
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-500">
                Certified by: {certification.certification.certifiedBy}
                <br />
                Date: {certification.certification.certifiedDate.toLocaleDateString()}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Compact badge for toolbars (no tooltip)
 */
export const LegalCertificationBadgeCompact: React.FC<{ tool: DraftingTool }> = ({ tool }) => {
  return <LegalCertificationBadge tool={tool} showDetails={false} size="sm" />;
};

