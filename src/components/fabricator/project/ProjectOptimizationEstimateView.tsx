import type { ProjectOptimizationEstimate } from '@/lib/fabricator/production/ProjectOptimizationEstimate';
import { Button } from '@/shared/ui/ui/button';

export function ProjectOptimizationEstimateView({ estimate, onRun }: {
  estimate: ProjectOptimizationEstimate | null; onRun: () => void;
}) {
  return <div className="p-6 space-y-4 overflow-auto h-full">
    <h2 className="text-xl font-semibold">Project cutting estimate</h2>
    <p className="text-amber-300">Estimate only. This does not approve manufacturing, CNC export or production release.</p>
    <Button onClick={onRun}>{estimate ? 'Recalculate all poses' : 'Optimize all poses (estimate)'}</Button>
    {estimate && <>
      <p>{estimate.positions} positions · {estimate.pieces} pieces · {estimate.groups.reduce((sum, group) => sum + group.result.barsCount, 0)} stock bars</p>
      {estimate.groups.map((group, index) => <section key={index} className="border border-slate-700 rounded p-3 space-y-2">
        <h3>{group.profileId} · stock {group.stockLengthMm} mm · kerf {group.kerfMm} mm · trim {group.trimMm} mm</h3>
        <p>Utilization: {(group.result.efficiency * 100).toFixed(1)}% · remaining stock: {group.result.totalWaste.toFixed(1)} mm</p>
        {group.result.stockUsed.map(bar => <p key={bar.id} className="text-sm text-slate-300">
          {bar.id}: {bar.cuts.map(cut => `${cut.label}: ${cut.length.toFixed(1)} mm`).join(' / ')} · remainder {bar.waste.toFixed(1)} mm
        </p>)}
      </section>)}
    </>}
  </div>;
}
