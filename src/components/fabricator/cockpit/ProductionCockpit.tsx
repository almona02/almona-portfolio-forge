import { NOT_RECORDED } from '@/lib/fabricator/studioWorkflow';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { Button } from '@/shared/ui/ui/button';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProductionOutputDialog } from '../output/ProductionOutputDialog';
import { StockConfirmDialog } from '../output/StockConfirmDialog';

export interface ProductionCockpitProps {
  project: WindowUnit | null;
  optimization: OptimizationResult | null;
  bom: CompleteBOM | null;
  documentsSlot?: React.ReactNode;
  cncSlot?: React.ReactNode;
}

export const ProductionCockpit: React.FC<ProductionCockpitProps> = ({
  project,
  optimization,
  bom,
  documentsSlot,
  cncSlot,
}) => {
  const { t } = useTranslation('fabricator');
  const [outputOpen, setOutputOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);

  const batchIds = project?.massProductionMeta?.includedInBatchIds;
  const cuts = useMemo(
    () =>
      (optimization?.cuttingPlan ?? []).flatMap((plan, pi) =>
        (plan.cuts ?? []).map((cut, ci) => ({
          key: cut.cutId || `${plan.profile?.id ?? pi}-${ci}`,
          cutId: cut.cutId,
          sourceCutId: cut.cutId,
          profile: plan.profile?.name || plan.profile?.id || NOT_RECORDED,
          length: cut.length,
          angle: cut.angle,
          quantity: 1,
        })),
      ),
    [optimization?.cuttingPlan],
  );

  return (
    <div
      className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_240px] grid-rows-[auto_minmax(0,1fr)] gap-2 p-2"
      data-testid="production-cockpit"
    >
      <aside className="border border-amber-600/20 bg-[#0d0d0d] overflow-auto lg:row-span-2">
        <header className="px-3 py-2 text-[10px] uppercase tracking-widest text-amber-500 border-b border-amber-600/20">
          {t('industrial.prod.batches', 'Batches / work orders')}
        </header>
        {!batchIds?.length ? (
          <p className="p-3 text-xs text-slate-500" data-testid="production-no-batches">
            {NOT_RECORDED}
          </p>
        ) : (
          <ul className="text-xs">
            {batchIds.map((id) => (
              <li key={id} className="px-3 py-2 border-b border-amber-900/20 font-mono" dir="ltr">
                {id}
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="border border-amber-600/20 bg-[#0d0d0d] p-3">
        <header className="text-[10px] uppercase tracking-widest text-amber-500 mb-2">
          {t('industrial.prod.preview', 'Selected position')}
        </header>
        {!project ? (
          <p className="text-xs text-slate-500">{NOT_RECORDED}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <dt className="text-amber-700">Pose</dt>
            <dd className="font-mono text-amber-100" dir="ltr">{project.posNumber}</dd>
            <dt className="text-amber-700">Size</dt>
            <dd className="font-mono" dir="ltr">
              {project.overallWidth} × {project.overallHeight} mm
            </dd>
            <dt className="text-amber-700">Customer</dt>
            <dd>{project.customer || NOT_RECORDED}</dd>
            <dt className="text-amber-700">Due</dt>
            <dd>{project.dueDate ? String(project.dueDate) : NOT_RECORDED}</dd>
          </dl>
        )}
      </section>

      <aside className="border border-amber-600/20 bg-[#0d0d0d] p-3 lg:row-span-2 overflow-auto space-y-3">
        <header className="text-[10px] uppercase tracking-widest text-amber-500">
          {t('industrial.prod.readiness', 'Readiness')}
        </header>
        <ReadinessRow
          label={t('industrial.prod.machine', 'Machine target')}
          value={NOT_RECORDED}
        />
        <ReadinessRow
          label={t('industrial.prod.stock', 'Stock')}
          value={bom ? t('industrial.prod.bom_present', 'BOM present') : NOT_RECORDED}
        />
        <ReadinessRow
          label={t('industrial.prod.opt', 'Optimization')}
          value={optimization ? t('industrial.prod.available', 'Available') : NOT_RECORDED}
        />
        <ReadinessRow
          label={t('industrial.prod.qc', 'QC readiness')}
          value={
            project?.status === 'quality' || project?.status === 'delivered'
              ? String(project.status)
              : NOT_RECORDED
          }
        />
        <ReadinessRow
          label={t('industrial.prod.export', 'Export')}
          value={optimization ? t('industrial.prod.available', 'Available') : NOT_RECORDED}
        />
        <Button
          type="button"
          size="sm"
          className="w-full bg-amber-700 hover:bg-amber-600 text-white"
          onClick={() => setOutputOpen(true)}
        >
          {t('industrial.output.open', 'Production output')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full border-amber-700/50 text-amber-200"
          onClick={() => setStockOpen(true)}
        >
          {t('industrial.stock.confirm_cta', 'Confirm stock consumption')}
        </Button>
      </aside>

      <section className="border border-amber-600/20 bg-[#0d0d0d] min-h-0 flex flex-col overflow-hidden">
        <header className="px-3 py-2 text-[10px] uppercase tracking-widest text-amber-500 border-b border-amber-600/20">
          {t('industrial.prod.cuts', 'Physical cuts')}
        </header>
        <div className="flex-1 overflow-auto">
          {cuts.length === 0 ? (
            <p className="p-3 text-xs text-slate-500" data-testid="production-no-cuts">
              {NOT_RECORDED}
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#111] text-[10px] uppercase text-amber-700">
                <tr>
                  <th className="text-start px-2 py-1">sourceCutId</th>
                  <th className="text-start px-2 py-1">Profile</th>
                  <th className="text-end px-2 py-1">Length</th>
                  <th className="text-end px-2 py-1">Angle</th>
                  <th className="text-end px-2 py-1">Qty</th>
                </tr>
              </thead>
              <tbody>
                {cuts.map((c) => (
                  <tr key={c.key} className="border-t border-amber-900/20">
                    <td className="px-2 py-1 font-mono" dir="ltr">
                      {c.sourceCutId || NOT_RECORDED}
                    </td>
                    <td className="px-2 py-1" dir="ltr">{c.profile}</td>
                    <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                      {c.length}
                    </td>
                    <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                      {c.angle}
                    </td>
                    <td className="px-2 py-1 text-end font-mono tabular-nums" dir="ltr">
                      {c.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border-t border-amber-600/20 max-h-48 overflow-auto">
          {documentsSlot}
          {cncSlot}
        </div>
      </section>

      <ProductionOutputDialog
        open={outputOpen}
        onOpenChange={setOutputOpen}
        hasBom={Boolean(bom)}
        hasOptimization={Boolean(optimization)}
      />
      <StockConfirmDialog
        open={stockOpen}
        onOpenChange={setStockOpen}
        material={project?.systemPackId || NOT_RECORDED}
        bars={optimization?.cuttingPlan?.length ?? null}
        remnantsCreated={null}
        scrap={optimization?.wastePercentage ?? null}
        warehouse={NOT_RECORDED}
      />
    </div>
  );
};

function ReadinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-[11px]">
      <span className="text-amber-700">{label}</span>
      <span className="text-amber-100 text-end">{value}</span>
    </div>
  );
}
