import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { CuttingPlan } from '@/types/fabricator';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface CutPatternViewerProps {
  plans: CuttingPlan[] | null | undefined;
}

/**
 * Horizontal bar visualization of an already-produced cutting plan.
 *
 * FP-025A data authority: paints `stockLength`, `cuts[].length`, `totalWaste`,
 * and `utilization` as stored. Does not compute kerf, trim, remnant, or scrap.
 */
export const CutPatternViewer: React.FC<CutPatternViewerProps> = ({ plans }) => {
  const { t } = useTranslation('fabricator');
  const bars = plans ?? [];

  return (
    <section
      className="border border-amber-600/20 bg-[#0d0d0d]"
      data-testid="cut-pattern-viewer"
      aria-label={t('industrial.opt.visualizer', 'Cut pattern')}
    >
      <header className="px-3 py-2 border-b border-amber-600/20 text-[10px] uppercase tracking-widest text-amber-500">
        {t('industrial.opt.visualizer', 'Cut pattern')}
      </header>
      {bars.length === 0 ? (
        <p className="p-3 text-xs text-slate-500">{NOT_RECORDED}</p>
      ) : (
        <div className="p-3 space-y-3">
          {bars.map((bar, i) => {
            const stock = bar.stockLength || 0;
            return (
              <div key={`${bar.profile?.id ?? 'bar'}-${i}`}>
                <div className="flex justify-between text-[10px] text-amber-700 mb-1 font-mono" dir="ltr">
                  <span>{bar.profile?.name || bar.profile?.id || NOT_RECORDED}</span>
                  <span>{stock ? `${stock} mm` : NOT_RECORDED}</span>
                </div>
                <div
                  className="h-7 w-full bg-slate-900 border border-slate-800 flex overflow-hidden"
                  role="img"
                  aria-label={`Bar ${i + 1}`}
                >
                  {stock > 0 &&
                    (bar.cuts ?? []).map((cut, ci) => {
                      const pct = Math.min(100, (cut.length / stock) * 100);
                      return (
                        <div
                          key={cut.cutId || `${i}-${ci}`}
                          className="h-full border-e border-black/40 bg-amber-700/80"
                          style={{ width: `${pct}%` }}
                          title={`${cut.cutId || NOT_RECORDED} ${cut.length} mm`}
                        />
                      );
                    })}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono" dir="ltr">
                  waste={bar.totalWaste ?? NOT_RECORDED} · util=
                  {bar.utilization != null ? `${bar.utilization}` : NOT_RECORDED}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
