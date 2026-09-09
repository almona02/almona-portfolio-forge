import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { CuttingPlan } from '@/types/fabricator';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface AvailableStockPanelProps {
  plans: CuttingPlan[] | null | undefined;
}

/**
 * Stock / remnant lengths as recorded on the cutting plan. No remnant math.
 */
export const AvailableStockPanel: React.FC<AvailableStockPanelProps> = ({ plans }) => {
  const { t } = useTranslation('fabricator');
  const bars = plans ?? [];

  return (
    <section
      className="h-full min-h-0 flex flex-col border border-amber-600/20 bg-[#0d0d0d]"
      data-testid="available-stock-panel"
    >
      <header className="px-3 py-2 border-b border-amber-600/20 text-[10px] uppercase tracking-widest text-amber-500">
        {t('industrial.opt.stock', 'Available stock / remnants')}
      </header>
      <div className="flex-1 overflow-auto">
        {bars.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">{NOT_RECORDED}</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#111] text-[10px] uppercase text-amber-700">
              <tr>
                <th className="text-start px-2 py-1 font-medium">Profile</th>
                <th className="text-end px-2 py-1 font-medium">Stock</th>
                <th className="text-end px-2 py-1 font-medium">Waste</th>
                <th className="text-end px-2 py-1 font-medium">Util %</th>
              </tr>
            </thead>
            <tbody>
              {bars.map((b, i) => (
                <tr key={`${b.profile?.id ?? 'bar'}-${i}`} className="border-t border-amber-900/20">
                  <td className="px-2 py-1" dir="ltr">
                    {b.profile?.name || b.profile?.id || NOT_RECORDED}
                  </td>
                  <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                    {b.stockLength ?? NOT_RECORDED}
                  </td>
                  <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                    {b.totalWaste ?? NOT_RECORDED}
                  </td>
                  <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                    {b.utilization != null ? b.utilization.toFixed(1) : NOT_RECORDED}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
