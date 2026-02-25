import { PresetAwareBOMGenerator, type CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import type { WindowUnit } from '@/types/fabricator';
import {
  ArrowRight,
  Box,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Layers,
  Loader2,
  Package,
  Ruler,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ProjectSummaryDashboardProps {
  projectId: string | undefined;
  projectMeta: { id: string; project_name?: string; project_code?: string; client_name?: string; status?: string } | undefined;
  positions: WindowUnit[];
  onOpenStudio: () => void;
}

interface AggregatedBOM {
  totalProfiles: number;
  totalHardware: number;
  totalGlazing: number;
  totalAccessories: number;
  materialCost: number;
  hardwareCost: number;
  glazingCost: number;
  accessoriesCost: number;
  laborCost: number;
  totalCost: number;
  positionBOMs: Map<string, CompleteBOM>;
}

export const ProjectSummaryDashboard: React.FC<ProjectSummaryDashboardProps> = ({
  projectId,
  projectMeta: _projectMeta,
  positions,
  onOpenStudio,
}) => {
  const navigate = useNavigate();
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregatedBOM, setAggregatedBOM] = useState<AggregatedBOM | null>(null);

  const totalArea = useMemo(() => {
    return positions.reduce((sum, p) => {
      const qty = p.quantity || 1;
      return sum + (p.overallWidth * p.overallHeight * qty) / 1_000_000;
    }, 0);
  }, [positions]);

  const totalUnits = useMemo(() => {
    return positions.reduce((sum, p) => sum + (p.quantity || 1), 0);
  }, [positions]);

  const systemBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const pos of positions) {
      const sys = pos.systemPackId || 'Unknown';
      map.set(sys, (map.get(sys) || 0) + (pos.quantity || 1));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [positions]);

  const handleAggregateProject = useCallback(async () => {
    if (positions.length === 0) return;
    setIsAggregating(true);

    try {
      const generator = new PresetAwareBOMGenerator();
      const positionBOMs = new Map<string, CompleteBOM>();

      let materialCost = 0, hardwareCost = 0, glazingCost = 0;
      let accessoriesCost = 0, laborCost = 0;
      let totalProfiles = 0, totalHardware = 0, totalGlazing = 0, totalAccessories = 0;

      for (const pos of positions) {
        const systemPack = SYSTEM_PACKS.find(sp => sp.meta.id === pos.systemPackId) ?? SYSTEM_PACKS[0];
        const pattern = EGYPTIAN_PATTERNS.find(p => p.id === pos.presetId) ?? EGYPTIAN_PATTERNS[0];
        if (!systemPack || !pattern) continue;

        try {
          const bom = await generator.generateCompleteBOM(pos, pattern, systemPack, false);
          const qty = pos.quantity || 1;
          positionBOMs.set(pos.id, bom);

          totalProfiles += bom.profiles.length * qty;
          totalHardware += bom.hardware.length * qty;
          totalGlazing += bom.glazing.length * qty;
          totalAccessories += bom.accessories.length * qty;
          materialCost += bom.cost.materialCost * qty;
          hardwareCost += bom.cost.hardwareCost * qty;
          glazingCost += bom.cost.glazingCost * qty;
          accessoriesCost += bom.cost.accessoriesCost * qty;
          laborCost += bom.cost.laborCost * qty;
        } catch {
          // Skip positions that fail BOM generation
        }
      }

      setAggregatedBOM({
        totalProfiles,
        totalHardware,
        totalGlazing,
        totalAccessories,
        materialCost,
        hardwareCost,
        glazingCost,
        accessoriesCost,
        laborCost,
        totalCost: materialCost + hardwareCost + glazingCost + accessoriesCost + laborCost,
        positionBOMs,
      });
    } finally {
      setIsAggregating(false);
    }
  }, [positions]);

  return (
    <div className="h-full overflow-auto p-6 space-y-6 bg-[#0a0a0a]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Positions" value={positions.length} icon={<Layers size={16} />} />
        <KPICard label="Total Units" value={totalUnits} icon={<Box size={16} />} />
        <KPICard label="Total Area" value={`${totalArea.toFixed(1)} m²`} icon={<Ruler size={16} />} />
        <KPICard label="Systems" value={systemBreakdown.length} icon={<Package size={16} />} />
        <KPICard
          label="Project Cost"
          value={aggregatedBOM ? `${aggregatedBOM.totalCost.toLocaleString('en-EG', { maximumFractionDigits: 0 })} EGP` : '—'}
          icon={<DollarSign size={16} />}
          highlight
        />
      </div>

      {/* Positions Table */}
      <Card className="bg-slate-900/40 border-amber-600/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
              <ClipboardList size={16} />
              Positions ({positions.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void handleAggregateProject()}
                disabled={isAggregating || positions.length === 0}
                className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
              >
                {isAggregating ? <Loader2 size={14} className="mr-1 animate-spin" /> : <ClipboardList size={14} className="mr-1" />}
                {isAggregating ? 'Aggregating...' : 'Aggregate Project BOM'}
              </Button>
              <Button size="sm" onClick={onOpenStudio} variant="outline" className="border-amber-600/30 text-amber-300 text-xs">
                Open Studio
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Layers size={40} className="mx-auto mb-3 opacity-30" />
              <p>No positions in this project yet.</p>
              <Button onClick={onOpenStudio} variant="outline" className="mt-4 border-amber-600/30 text-amber-300" size="sm">
                Open Studio to Add Positions
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-600/20 text-xs text-slate-500 uppercase">
                    <th className="text-left py-2 px-3">Pos</th>
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-right py-2 px-3">Width</th>
                    <th className="text-right py-2 px-3">Height</th>
                    <th className="text-right py-2 px-3">Qty</th>
                    <th className="text-left py-2 px-3">System</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-right py-2 px-3">Cost</th>
                    <th className="text-right py-2 px-3" />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, i) => {
                    const posBOM = aggregatedBOM?.positionBOMs.get(pos.id);
                    return (
                      <tr key={pos.id} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                        <td className="py-2 px-3 text-amber-300 font-mono text-xs">{pos.posNumber || i + 1}</td>
                        <td className="py-2 px-3 text-slate-300">{pos.type || 'window'}</td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">{pos.overallWidth}</td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">{pos.overallHeight}</td>
                        <td className="py-2 px-3 text-right text-slate-300">{pos.quantity || 1}</td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                            {pos.systemPackId || '—'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          <StatusBadge status={pos.status} />
                        </td>
                        <td className="py-2 px-3 text-right text-amber-200 font-mono text-xs">
                          {posBOM ? `${posBOM.cost.totalCost.toLocaleString('en-EG', { maximumFractionDigits: 0 })}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {projectId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-amber-400 hover:text-amber-300"
                              onClick={() => navigate(fabricatorRoutes.poseDesign(projectId, pos.id))}
                            >
                              <ArrowRight size={12} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {aggregatedBOM && (
                  <tfoot>
                    <tr className="border-t border-amber-600/30 font-bold">
                      <td colSpan={4} className="py-2 px-3 text-amber-200">Project Total</td>
                      <td className="py-2 px-3 text-right text-amber-200">{totalUnits}</td>
                      <td colSpan={2} />
                      <td className="py-2 px-3 text-right text-amber-300 font-mono">
                        {aggregatedBOM.totalCost.toLocaleString('en-EG', { maximumFractionDigits: 0 })} EGP
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregated Cost Breakdown */}
      {aggregatedBOM && (
        <Card className="bg-slate-900/40 border-amber-600/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
              <DollarSign size={16} />
              Project Cost Breakdown
              <Badge className="bg-green-500/20 text-green-300 border-green-500/40 text-[10px]">
                <CheckCircle2 size={10} className="mr-1" />
                {aggregatedBOM.positionBOMs.size}/{positions.length} positions calculated
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <CostCard label="Profiles" value={aggregatedBOM.materialCost} count={aggregatedBOM.totalProfiles} />
              <CostCard label="Hardware" value={aggregatedBOM.hardwareCost} count={aggregatedBOM.totalHardware} />
              <CostCard label="Glazing" value={aggregatedBOM.glazingCost} count={aggregatedBOM.totalGlazing} />
              <CostCard label="Accessories" value={aggregatedBOM.accessoriesCost} count={aggregatedBOM.totalAccessories} />
              <CostCard label="Labor" value={aggregatedBOM.laborCost} />
              <CostCard label="Total" value={aggregatedBOM.totalCost} highlight />
            </div>

            {/* System breakdown */}
            {systemBreakdown.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-800/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">System Pack Distribution</p>
                <div className="flex flex-wrap gap-2">
                  {systemBreakdown.map(([sys, count]) => (
                    <Badge key={sys} variant="outline" className="text-xs border-amber-600/30 text-amber-300">
                      {sys}: {count} unit{count > 1 ? 's' : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const KPICard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }> = ({
  label, value, icon, highlight,
}) => (
  <Card className={highlight ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-900/40 border-amber-600/20'}>
    <CardContent className="pt-4 pb-3 px-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <p className={`text-lg font-bold mt-1 ${highlight ? 'text-amber-300' : 'text-amber-200'}`}>
        {value}
      </p>
    </CardContent>
  </Card>
);

const CostCard: React.FC<{ label: string; value: number; count?: number; highlight?: boolean }> = ({
  label, value, count, highlight,
}) => (
  <div className={`rounded-lg border p-3 ${highlight ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-800/30 border-slate-700/30'}`}>
    <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-amber-300' : 'text-amber-200'}`}>
      {value.toLocaleString('en-EG', { maximumFractionDigits: 0 })}
      <span className="text-xs font-normal text-slate-500 ml-1">EGP</span>
    </p>
    {count !== undefined && (
      <p className="text-[10px] text-slate-600 mt-0.5">{count} items</p>
    )}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { bg: string; text: string }> = {
    draft: { bg: 'bg-slate-500/20', text: 'text-slate-300' },
    measuring: { bg: 'bg-blue-500/20', text: 'text-blue-300' },
    design: { bg: 'bg-amber-500/20', text: 'text-amber-300' },
    optimized: { bg: 'bg-green-500/20', text: 'text-green-300' },
    production: { bg: 'bg-purple-500/20', text: 'text-purple-300' },
    quality: { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
    delivered: { bg: 'bg-emerald-500/20', text: 'text-emerald-300' },
  };
  const c = config[status] || config.draft;
  return (
    <Badge className={`${c.bg} ${c.text} border-transparent text-[10px]`}>
      {status}
    </Badge>
  );
};
