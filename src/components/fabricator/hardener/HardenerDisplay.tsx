/**
 * HardenerDisplay - Hardener Code Display Component
 * 
 * Displays selected hardener code with constitutional compliance indicators.
 * Displays reinforcement choices with manufacturing validation.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HardenerSelectionResult } from '@/lib/fabricator/hardener';
import { AlertTriangle, CheckCircle2, FileText, Info, Lock, XCircle } from 'lucide-react';
import React from 'react';

interface HardenerDisplayProps {
  /** Hardener selection result */
  hardenerSelection: HardenerSelectionResult;
  /** System mode */
  mode: 'sandbox' | 'production' | 'certified';
  /** Optional callback for override (sandbox only) */
  onOverride?: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Hardener Display Component
 * 
 * Displays hardener code with constitutional compliance indicators.
 */
export const HardenerDisplay: React.FC<HardenerDisplayProps> = ({
  hardenerSelection,
  mode,
  onOverride,
  className = '',
}) => {
  const isCertified = mode === 'certified';
  const hasWarnings = hardenerSelection.validation === 'WARNING';
  const hasFailures = hardenerSelection.validation === 'FAIL';
  const isSystemStop = hardenerSelection.systemStopRequired;

  return (
    <div className={`hardener-display space-y-3 ${className}`}>
      {/* Main Hardener Code Display */}
      <div className="flex items-center justify-between p-4 bg-card/60 rounded-lg border-2 border-amber-600/30 shadow-card backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-warning/70 mb-1.5 font-medium tracking-wide uppercase">Hardener Code</span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-warning/90 tracking-wider">
                {hardenerSelection.hardenerCode || 'Not Selected'}
              </span>
              <Badge variant="outline" className="text-xs border-amber-500/40 text-warning/80 bg-amber-950/20">
                Tier 3
              </Badge>
            </div>
          </div>

          {/* Validation Status Icon */}
          {hasFailures || isSystemStop ? (
            <XCircle className="w-6 h-6 text-destructive drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
          ) : hasWarnings ? (
            <AlertTriangle className="w-6 h-6 text-warning drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-success drop-shadow-[0_0_4px_rgba(74,222,128,0.5)]" />
          )}
        </div>

        {/* Rule ID */}
        <div className="flex flex-col items-end">
          <span className="text-xs text-warning/70 mb-1.5 font-medium tracking-wide uppercase">Selection Rule</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-2 cursor-help group">
                  <span className="text-sm font-mono text-warning/80 group-hover:text-warning transition-colors">
                    {hardenerSelection.ruleId}
                  </span>
                  <Info className="w-4 h-4 text-warning/60 group-hover:text-warning transition-colors" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-md bg-background border-amber-500/30 p-2 rounded">
                  <p className="text-sm text-foreground">{hardenerSelection.justification}</p>
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-amber-500/20">
                    <FileText className="w-3 h-3 text-warning/70" />
                    <span className="text-xs text-warning/70">AICS-001 §4.3.5</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Compliance Badges */}
      {hardenerSelection.validationDetails.egyptianCodeCompliant && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-950/30 rounded-lg border-2 border-emerald-500/40 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          <span className="text-sm font-medium text-success">
            Egyptian Code 2020 Compliant
          </span>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && hardenerSelection.validationDetails.constraintViolations.length > 0 && (
        <div className="px-4 py-3 bg-amber-950/30 rounded-lg border-2 border-amber-500/40 shadow-subtle">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-warning mb-2">
                Validation Warnings
              </p>
              <ul className="text-xs text-warning/80 space-y-1.5">
                {hardenerSelection.validationDetails.constraintViolations.map((violation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-warning/60 mt-0.5">•</span>
                    <span>{violation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* System Stop Warning with AICS-001 Reference */}
      {isSystemStop && (
        <div className="px-4 py-3 bg-red-950/40 rounded-lg border-2 border-red-600/50 shadow-glow-strong">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-destructive">
                  System Stop Required
                </p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1 text-warning/80 hover:text-warning text-[10px] font-semibold px-1.5 py-0.5 bg-amber-950/20 border border-amber-500/30 rounded cursor-help transition-all duration-200">
                        <FileText className="h-2.5 w-2.5" />
                        <span>AICS-001 §2.8</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="bg-background border border-amber-500/30 text-xs max-w-xs p-2 rounded">
                        <p className="font-semibold text-warning mb-1">System Stop Requirement</p>
                        <p>AICS-001 Section 2.8: Manufacturing cannot proceed without valid hardener specification.</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-destructive/80 leading-relaxed">
                {hardenerSelection.constitutionalDisclaimer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Certified Mode Notice */}
      {isCertified && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-950/30 rounded-lg border-2 border-amber-500/40 shadow-subtle">
          <Lock className="w-4 h-4 text-warning flex-shrink-0" />
          <span className="text-sm font-medium text-warning">
            Certified Mode: Hardener selection cannot be overridden
          </span>
        </div>
      )}

      {/* Override Button (Sandbox/Production Only) */}
      {!isCertified && !isSystemStop && onOverride && (
        <button
          onClick={onOverride}
          className="w-full px-4 py-2.5 text-sm font-medium text-warning/80 bg-card/60 border-2 border-amber-600/30 rounded-lg hover:bg-card/80 hover:border-amber-500/50 hover:text-warning transition-all duration-200 shadow-subtle"
        >
          Override Selection (Sandbox Only)
        </button>
      )}

      {/* Constitutional Disclaimer */}
      <div className="px-4 py-3 bg-cyan-950/30 rounded-lg border-2 border-cyan-500/30 shadow-subtle">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
          <p className="text-xs text-info/80 leading-relaxed">
            {hardenerSelection.constitutionalDisclaimer}
          </p>
        </div>
      </div>
    </div>
  );
};

