/**
 * ValidationEnvelope Error Display Component
 * 
 * Displays ValidationEnvelope validation errors in a user-friendly format.
 * Shows failed constraint categories and specific constraint failures.
 * 
 * AICS-001 Reference: Section 4.4 (Constraint Enforcement Model)
 * 
 * Blackbox Visual Polish: Prestige dark theme with amber/gold accents, smooth animations, hover effects
 */

import type { ValidationEnvelopeResult } from '@/core/authority/validation_envelopes';
import { ConstraintCategory, getConstraintRegistry, getValidationEnvelope } from '@/core/authority/validation_envelopes';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';
import { AlertCircle, FileText, XCircle } from 'lucide-react';
import React, { useState } from 'react';

interface ValidationEnvelopeErrorDisplayProps {
  envelopeResult: ValidationEnvelopeResult;
  compact?: boolean;
}

/**
 * Get human-readable category name
 */
function getCategoryName(category: ConstraintCategory): string {
  const categoryNames: Record<ConstraintCategory, string> = {
    [ConstraintCategory.GEOMETRIC]: 'Geometric Constraints',
    [ConstraintCategory.MATERIAL]: 'Material Constraints',
    [ConstraintCategory.MACHINE]: 'Machine Constraints',
    [ConstraintCategory.PROCESS]: 'Process Constraints',
    [ConstraintCategory.CERTIFICATION]: 'Certification Constraints',
  };
  return categoryNames[category] || category;
}

/**
 * Get AICS-001 section reference for a constraint
 */
function getAICS001SectionReference(constraintId: string): string | null {
  const registry = getConstraintRegistry();
  const entry = registry.get(constraintId);
  return entry?.constraint.ruleId || null;
}

/**
 * Get AICS-001 section number from ruleId (e.g., "AICS-001-4.3.1-1" -> "4.3.1")
 */
function extractAICS001Section(ruleId: string | null): string | null {
  if (!ruleId || !ruleId.startsWith('AICS-001-')) {
    return null;
  }
  // Extract section from format: AICS-001-4.3.X-Y
  const match = ruleId.match(/AICS-001-(4\.3\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Constraint Error Item Component
 */
const ConstraintErrorItem: React.FC<{
  constraint: any;
  idx: number;
}> = ({ constraint }) => {
  const [isHovered, setIsHovered] = useState(false);
  const ruleId = getAICS001SectionReference(constraint.constraintId);
  const sectionRef = extractAICS001Section(ruleId);

  return (
    <div
      className="text-xs text-red-300/90 flex items-start gap-2 p-2 rounded-md hover:bg-red-950/30 transition-colors duration-200 focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
    >
      <AlertCircle className={`h-3 w-3 mt-0.5 flex-shrink-0 transition-transform duration-200 ${isHovered ? 'scale-110 text-red-400' : ''}`} />
      <div className="flex-1">
        <div className="font-medium transition-colors duration-200">{constraint.constraintName}</div>
        {constraint.error && (
          <div className="text-red-400/70 mt-0.5 ml-4 transition-opacity duration-200">{constraint.error}</div>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-red-500/60 text-[10px] font-mono hover:text-red-400/80 cursor-help transition-colors duration-200">
                  {constraint.constraintId}
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-amber-500/30 text-xs font-mono max-w-xs">
                <p>Constraint ID: {constraint.constraintId}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {ruleId && sectionRef && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-amber-500/80 hover:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 bg-amber-950/20 border border-amber-500/30 rounded hover:bg-amber-950/30 hover:border-amber-500/50 transition-all duration-200 cursor-help">
                    <FileText className="h-2.5 w-2.5" />
                    <span>AICS-001 Section {sectionRef}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-slate-900 border-amber-500/30 text-xs max-w-xs">
                  <p>Reference: {ruleId}</p>
                  <p className="text-amber-400/80 mt-1">AICS-001 Section {sectionRef}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ValidationEnvelope Error Display Component
 */
export const ValidationEnvelopeErrorDisplay: React.FC<ValidationEnvelopeErrorDisplayProps> = ({
  envelopeResult,
  compact = false,
}) => {
  if (envelopeResult.complies) {
    return null;
  }

  const envelope = getValidationEnvelope();
  const errorReport = envelope.getErrorReport(envelopeResult);

  if (compact) {
    // Compact display: Show summary only
    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold">
          Failed Categories: {envelopeResult.failedCategories.map(cat => getCategoryName(cat)).join(', ')}
        </div>
        <div className="text-red-400/80">
          {errorReport.slice(0, 2).map((error, idx) => (
            <div key={idx} className="truncate">{error}</div>
          ))}
          {errorReport.length > 2 && (
            <div className="text-red-400/60">... and {errorReport.length - 2} more errors</div>
          )}
        </div>
      </div>
    );
  }

  // Full display: Show all failed categories and constraints
  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Summary */}
      <div className="text-sm p-3 bg-red-950/20 border border-red-500/30 rounded-md">
        <span className="font-semibold text-slate-200">Validation failed:</span>{' '}
        <span className="text-red-400 font-medium">
          {envelopeResult.metadata.failedCategories} of {envelopeResult.metadata.totalCategories} categories failed
        </span>
        {' '}
        <span className="text-slate-400">
          ({envelopeResult.metadata.totalConstraints - envelopeResult.allConstraintResults.filter(r => r.passed).length} of {envelopeResult.metadata.totalConstraints} constraints failed)
        </span>
      </div>

      {/* Failed Categories */}
      <div className="space-y-2">
        {envelopeResult.failedCategories.map((category) => {
          const categoryResult = envelopeResult.categoryResults.get(category);
          if (!categoryResult) return null;

          const failedConstraints = categoryResult.constraintResults.filter((r: any) => !r.passed);

          return (
            <Card 
              key={category} 
              className="bg-red-950/20 border-red-500/30 hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 animate-in slide-in-from-left-5 fade-in"
            >
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <XCircle className="h-4 w-4 animate-pulse" />
                  {getCategoryName(category)} (Failed)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-1.5">
                  {failedConstraints.map((constraint: any, idx: number) => (
                    <ConstraintErrorItem key={idx} constraint={constraint} idx={idx} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Metadata */}
      {import.meta.env.DEV && (
        <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-700/50">
          Validation timestamp: {envelopeResult.timestamp.toISOString()}
        </div>
      )}
    </div>
  );
};
