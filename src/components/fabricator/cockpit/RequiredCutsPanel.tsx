import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { CuttingPlan } from '@/types/fabricator';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface RequiredCutsPanelProps {
  plans: CuttingPlan[] | null | undefined;
}

/**
 * Displays required cuts from an existing cutting plan. No length math.
 */
export const RequiredCutsPanel: React.FC<RequiredCutsPanelProps> = ({ plans }) => {
  const { t } = useTranslation('fabricator');
  const rows =
    plans?.flatMap((plan, pi) =>
      (plan.cuts ?? []).map((cut, ci) => ({
        key: cut.cutId || `${plan.profile?.id ?? pi}-${ci}`,
        cutId: cut.cutId,
        profile: plan.profile?.name || plan.profile?.id || NOT_RECORDED,
        length: cut.length,
        angle: cut.angle,
        componentId: cut.componentId,
      })),
    ) ?? [];

  return (
    <section
      className="h-full min-h-0 flex flex-col border border-amber-600/20 bg-[#0d0d0d]"
      data-testid="required-cuts-panel"
    >
      <header className="px-3 py-2 border-b border-amber-600/20 text-[10px] uppercase tracking-widest text-amber-500">
        {t('industrial.opt.required_cuts', 'Required cuts')}
      </header>
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">{NOT_RECORDED}</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#111] text-[10px] uppercase text-amber-700">
              <tr>
                <th className="text-start px-2 py-1 font-medium">Cut</th>
                <th className="text-start px-2 py-1 font-medium">Profile</th>
                <th className="text-end px-2 py-1 font-medium">Length</th>
                <th className="text-end px-2 py-1 font-medium">Angle</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-amber-900/20">
                  <td className="px-2 py-1 font-mono text-amber-200" dir="ltr">
                    {r.cutId || NOT_RECORDED}
                  </td>
                  <td className="px-2 py-1 text-amber-100" dir="ltr">
                    {r.profile}
                  </td>
                  <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                    {r.length}
                  </td>
                  <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                    {r.angle}
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
