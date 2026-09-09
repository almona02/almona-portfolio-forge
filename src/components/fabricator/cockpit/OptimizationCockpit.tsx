import { isCadDesktopLayout, useStudioBreakpoint } from '@/hooks/useStudioBreakpoint';
import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import { cn } from '@/lib/utils';
import type { OptimizationResult } from '@/types/fabricator';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DesktopWorkspaceNotice } from '../shell/DesktopWorkspaceNotice';
import { AvailableStockPanel } from './AvailableStockPanel';
import { CutPatternViewer } from './CutPatternViewer';
import { OptimizationSummary } from './OptimizationSummary';
import { RequiredCutsPanel } from './RequiredCutsPanel';

export interface OptimizationCockpitProps {
  result: OptimizationResult | null;
  algorithmLabel?: string | null;
  authority?: 'deterministic' | 'advisory' | null;
  children?: React.ReactNode;
}

export const OptimizationCockpit: React.FC<OptimizationCockpitProps> = ({
  result,
  algorithmLabel,
  authority,
  children,
}) => {
  const { t } = useTranslation('fabricator');
  const bp = useStudioBreakpoint();
  const plans = result?.cuttingPlan;

  return (
    <div
      className="h-full min-h-0 flex flex-col gap-2 p-2"
      data-testid="optimization-cockpit"
    >
      <OptimizationSummary
        result={result}
        algorithmLabel={algorithmLabel}
        authority={authority}
      />

      {!isCadDesktopLayout(bp) && bp === 'mobile' ? (
        <DesktopWorkspaceNotice feature={t('industrial.stages.optimize', 'Optimize')} />
      ) : (
        <div
          className={cn(
            'flex-1 min-h-0 grid gap-2',
            bp === 'desktop' ? 'grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] grid-rows-[1fr_auto]' : 'grid-cols-1',
          )}
        >
          <div className={cn(bp === 'desktop' && 'row-span-1 min-h-0')}>
            <RequiredCutsPanel plans={plans} />
          </div>
          <div className="min-h-0 overflow-auto space-y-2">
            {children}
            <CutPatternViewer plans={plans} />
          </div>
          <div className="min-h-0">
            <AvailableStockPanel plans={plans} />
          </div>
        </div>
      )}
    </div>
  );
};
