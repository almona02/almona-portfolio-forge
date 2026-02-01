/**
 * HardenerSelectionPanel - Hardener Selection Panel Component
 * 
 * Full-featured panel for hardener code selection and display.
 * Inspired by LogiKal/KLAES interface patterns with ALMONA's constitutional guarantees.
 * 
 * Constitutional Compliance: AICS-001 §4.3.5 (Certification Constraints)
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HardenerSelectionResult } from '@/lib/fabricator/hardener';
import { hardenerAuditLogger, hardenerSelectionCache, hardenerSelector } from '@/lib/fabricator/hardener';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import { AlertCircle, FileText, Info, Loader2, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { HardenerDisplay } from './HardenerDisplay';

interface HardenerSelectionPanelProps {
  /** Window unit */
  windowUnit: WindowUnit;
  /** System pack */
  systemPack: SystemPack | null;
  /** System mode */
  mode?: 'sandbox' | 'production' | 'certified';
  /** Optional callback when selection changes */
  onSelectionChange?: (selection: HardenerSelectionResult) => void;
  /** Optional user ID for audit trail */
  userId?: string;
  /** Optional className */
  className?: string;
}

/**
 * Hardener Selection Panel Component
 * 
 * Provides hardener code selection interface with constitutional guarantees.
 */
export const HardenerSelectionPanel: React.FC<HardenerSelectionPanelProps> = ({
  windowUnit,
  systemPack,
  mode = 'production',
  onSelectionChange,
  userId,
  className = '',
}) => {
  const [selection, setSelection] = useState<HardenerSelectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-select hardener when window unit or system pack changes
  useEffect(() => {
    if (windowUnit && systemPack) {
      selectHardener();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowUnit?.id, systemPack?.id, windowUnit?.overallWidth, windowUnit?.overallHeight, windowUnit?.type]);

  /**
   * Select hardener code with caching and performance optimization
   */
  const selectHardener = useCallback(async () => {
    // Guard: Ensure windowUnit and systemPack are available
    if (!windowUnit || !systemPack) {
      setError('Window unit or system pack is missing');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract context for cache lookup
      const context = hardenerSelector.extractContext(windowUnit, systemPack);

      // Check cache first
      const cachedResult = hardenerSelectionCache.get(context);
      if (cachedResult) {
        setSelection(cachedResult);
        if (onSelectionChange) {
          onSelectionChange(cachedResult);
        }
        setLoading(false);
        return;
      }

      // Perform selection
      const result = hardenerSelector.selectHardenerForWindowUnit(windowUnit, systemPack);

      // Cache result
      hardenerSelectionCache.set(context, result);

      // Log to audit trail
      if (result.hardenerCode) {
        hardenerAuditLogger.logSelection(windowUnit.id, context, result, userId, mode);
      }

      setSelection(result);

      // Notify parent component
      if (onSelectionChange) {
        onSelectionChange(result);
      }

      // Check for system stop with AICS-001 reference
      if (result.systemStopRequired) {
        const aicsRef = 'AICS-001 §4.3.5, §2.8';
        setError(
          `System stop required: Hardener selection failed validation (${aicsRef}). ` +
          `Manufacturing cannot proceed without valid hardener specification.`
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to select hardener code';
      setError(errorMessage);
      console.error('Hardener selection error:', err);
    } finally {
      setLoading(false);
    }
  }, [windowUnit, systemPack, userId, mode, onSelectionChange]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = () => {
    selectHardener();
  };

  /**
   * Handle override (sandbox only)
   */
  const handleOverride = () => {
    if (mode === 'certified') {
      return; // Override not allowed in certified mode
    }
    // In sandbox mode, allow manual override
    // This would open a manual selection dialog
    console.log('Override hardener selection (sandbox mode)');
  };

  return (
    <Card className={`hardener-selection-panel card-dark ${className}`}>
      <CardHeader className="border-b border-amber-600/30 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg font-semibold text-amber-200/90 tracking-wide">
                HARDENER CODE SELECTION
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-amber-500/70 hover:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 bg-amber-950/20 border border-amber-500/30 rounded cursor-help transition-all duration-200">
                      <FileText className="h-2.5 w-2.5" />
                      <span>AICS-001 §4.3.5</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="bg-slate-900 border border-amber-500/30 text-xs max-w-xs p-2 rounded">
                      <p className="font-semibold text-amber-400 mb-1">Constitutional Compliance</p>
                      <p>AICS-001 Section 4.3.5: Certification Constraints</p>
                      <p className="text-amber-400/80 mt-1 text-[10px]">Tier 3 Protected Determinism</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <CardDescription className="text-sm text-amber-600/70 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Tier 3 deterministic selection with constitutional guarantees
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 border-amber-600/30 text-amber-200/80 hover:bg-amber-950/30 hover:border-amber-500/50 hover:text-amber-200 transition-all duration-200"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Selecting hardener code...</span>
          </div>
        )}

        {/* Error State with AICS-001 Reference */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-950/30 rounded-lg border-2 border-red-600/40 shadow-glow-strong">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-red-300">{error}</p>
              {error.includes('AICS-001') && (
                <div className="flex items-center gap-2 pt-1 border-t border-red-800/50">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1.5 text-amber-500/80 hover:text-amber-400 text-[11px] font-semibold px-2 py-1 bg-amber-950/30 border border-amber-500/40 rounded cursor-help transition-all duration-200">
                          <FileText className="h-3 w-3" />
                          <span>View Constitutional Reference</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="bg-slate-900 border border-amber-500/30 text-xs max-w-sm p-2 rounded">
                          <p className="font-semibold text-amber-400 mb-2">AICS-001 Constitutional Framework</p>
                          <p className="text-slate-300 mb-1">§4.3.5: Certification Constraints</p>
                          <p className="text-slate-300 mb-1">§2.8: System Stop Requirements</p>
                          <p className="text-amber-400/80 mt-2 text-[10px]">All outputs require human validation</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selection Display */}
        {!loading && selection && (
          <HardenerDisplay
            hardenerSelection={selection}
            mode={mode}
            onOverride={mode !== 'certified' ? handleOverride : undefined}
          />
        )}

        {/* No Selection State */}
        {!loading && !selection && !error && (
          <div className="text-center py-8 text-amber-600/70">
            <p className="text-sm font-medium mb-4">No hardener code selected</p>
            <Button
              variant="outline"
              size="sm"
              onClick={selectHardener}
              className="mt-2 border-amber-600/40 text-amber-200/80 hover:bg-amber-950/40 hover:border-amber-500/60 hover:text-amber-200 transition-all duration-200"
            >
              Select Hardener Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

