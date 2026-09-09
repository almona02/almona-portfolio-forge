import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { CuttingPlan, OptimizationResult } from '@/types/fabricator';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface OptimizationSummaryProps {
  result: OptimizationResult | null;
  /** Algorithm name from existing solver metadata only */
  algorithmLabel?: string | null;
  /** Authority from AlgorithmSelector metadata only — never inferred */
  authority?: 'deterministic' | 'advisory' | null;
}

function countCuts(plans: CuttingPlan[] | undefined): number {
  if (!plans) return 0;
  return plans.reduce((n, p) => n + (p.cuts?.length ?? 0), 0);
}

/**
 * Reads already-produced OptimizationResult fields. Does not recompute waste, kerf, or length.
 */
export const OptimizationSummary: React.FC<OptimizationSummaryProps> = ({
  result,
  algorithmLabel,
  authority,
}) => {
  const { t } = useTranslation('fabricator');

  const metrics = useMemo(() => {
    if (!result) return null;
    const plans = result.cuttingPlan ?? [];
    const requiredPieces = countCuts(plans);
    const barsRequired = plans.length;
    const utilization =
      plans.length > 0
        ? plans.reduce((s, p) => s + (p.utilization ?? 0), 0) / plans.length
        : null;
    return {
      requiredPieces,
      barsRequired,
      utilization,
      wastePercentage: result.wastePercentage,
      materialUsage: result.materialUsage,
    };
  }, [result]);

  const cells = [
    {
      label: t('industrial.opt.required', 'Required pieces'),
      value: metrics ? String(metrics.requiredPieces) : NOT_RECORDED,
    },
    {
      label: t('industrial.opt.bars', 'Bars required'),
      value: metrics ? String(metrics.barsRequired) : NOT_RECORDED,
    },
    {
      label: t('industrial.opt.utilized', 'Utilized'),
      value:
        metrics?.utilization != null
          ? `${metrics.utilization.toFixed(1)}%`
          : NOT_RECORDED,
    },
    {
      label: t('industrial.opt.waste', 'Waste'),
      value:
        metrics?.wastePercentage != null
          ? `${metrics.wastePercentage.toFixed(1)}%`
          : NOT_RECORDED,
    },
    {
      label: t('industrial.opt.remnants', 'Reusable remnants'),
      value: NOT_RECORDED,
    },
    {
      label: t('industrial.opt.unplaced', 'Unplaced cuts'),
      value: NOT_RECORDED,
    },
    {
      label: t('industrial.opt.algorithm', 'Algorithm'),
      value: algorithmLabel || NOT_RECORDED,
    },
    {
      label: t('industrial.opt.authority', 'Authority'),
      value: authority
        ? authority === 'advisory'
          ? t('industrial.opt.advisory', 'ADVISORY')
          : t('industrial.opt.authoritative', 'AUTHORITATIVE')
        : NOT_RECORDED,
    },
  ];

  return (
    <section
      className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-px bg-amber-900/30 border border-amber-600/20"
      data-testid="optimization-summary"
      data-authority={authority ?? 'not_recorded'}
    >
      {cells.map((c) => (
        <div key={c.label} className="bg-[#0d0d0d] px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-amber-700">{c.label}</div>
          <div
            className="text-sm font-mono text-amber-100 mt-0.5 tabular-nums"
            dir="ltr"
          >
            {c.value}
          </div>
        </div>
      ))}
    </section>
  );
};
