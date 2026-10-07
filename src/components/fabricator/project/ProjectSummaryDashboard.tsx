import { PoseLayoutPreview } from '@/components/fabricator/project/PoseLayoutPreview';
import { useDeletePose, useUpsertPose, useUpdateProject } from '@/hooks/useFabricatorQueries';
import { PresetAwareBOMGenerator, type CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { useEngineeringSystemPacks } from '@/hooks/fabricator/useEngineeringSystemPacks';
import { resolveEstimatePattern } from '@/lib/fabricator/bom/resolveEstimatePattern';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { persistenceErrorMessage } from '@/lib/supabase/fabricatorClientV2';
import { nextPoseNumber } from '@/pages/fabricator/workflow/MeasuringPage';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import type { WindowUnit } from '@/types/fabricator';
import {
  AlertTriangle,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ProjectSummaryDashboardProps {
  projectId: string | undefined;
  projectMeta: { id: string; project_name?: string; project_code?: string; client_name?: string; status?: string; meta?: unknown } | null | undefined;
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
  failedPositionIds: string[];
  failureReasons: Map<string, string>;
  isPartialEstimate: boolean;
}

export const ProjectSummaryDashboard: React.FC<ProjectSummaryDashboardProps> = ({
  projectId,
  projectMeta,
  positions,
  onOpenStudio,
}) => {
  const navigate = useNavigate();
  const engineeringPacks = useEngineeringSystemPacks();
  const deletePose = useDeletePose();
  const upsertPose = useUpsertPose();
  const updateProject = useUpdateProject();
  const [isAggregating, setIsAggregating] = useState(false);
  const [aggregatedBOM, setAggregatedBOM] = useState<AggregatedBOM | null>(null);
  const aggregationGeneration = useRef(0);
  useEffect(() => {
    ++aggregationGeneration.current;
    setAggregatedBOM(null);
    setIsAggregating(false);
    return () => { ++aggregationGeneration.current; };
  }, [positions, engineeringPacks]);

  const openPoseMeasuring = useCallback((id: string) => {
    if (!projectId) return;
    navigate(fabricatorRoutes.poseMeasuring(projectId, id));
  }, [navigate, projectId]);

  const handleDuplicatePose = useCallback(async (id: string) => {
    if (!projectId) return;
    const source = positions.find((p) => p.id === id);
    if (!source) return;
    try {
      const poseId = crypto.randomUUID();
      const posNumber = nextPoseNumber(positions);
      const created = await upsertPose.mutateAsync({
        windowUnit: {
          ...source,
          id: poseId,
          projectId,
          posNumber,
          status: 'measuring',
          createdAt: new Date(),
          updatedAt: new Date(),
          optimization: null,
        },
        grid: source.grid as Record<string, unknown> | undefined,
        selectedPreset: source.presetId,
      });
      toast.success(`Pose ${posNumber} duplicated`);
      navigate(fabricatorRoutes.poseMeasuring(created.projectId, created.poseId));
    } catch (err) {
      toast.error(`Duplicate failed: ${persistenceErrorMessage(err)}`);
    }
  }, [navigate, positions, projectId, upsertPose]);

  const handleDeletePose = useCallback(async (id: string) => {
    if (positions.length <= 1) {
      toast.error('Keep at least one pose in the project.');
      return;
    }
    const source = positions.find((p) => p.id === id);
    const label = source?.posNumber || 'this pose';
    if (!window.confirm(`Delete pose ${label}? This cannot be undone.`)) return;
    try {
      await deletePose.mutateAsync(id);
      toast.success(`Pose ${label} deleted`);
    } catch (err) {
      toast.error(`Delete failed: ${persistenceErrorMessage(err)}`);
    }
  }, [deletePose, positions]);

  const handleQuantityChange = useCallback(async (position: WindowUnit, value: string) => {
    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      toast.error('Quantity must be a positive integer.');
      return;
    }
    if (quantity === (position.quantity ?? 1) || !projectId) return;
    try {
      await upsertPose.mutateAsync({
        windowUnit: { ...position, projectId, quantity, optimization: null, updatedAt: new Date() },
        grid: position.grid as Record<string, unknown> | undefined,
        selectedPreset: position.presetId,
      });
      toast.success(`Pose ${position.posNumber || position.id} quantity saved`);
    } catch (error) {
      toast.error(`Quantity save failed: ${persistenceErrorMessage(error)}`);
    }
  }, [projectId, upsertPose]);

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
    const generation = ++aggregationGeneration.current;
    setIsAggregating(true);

    try {
      const generator = new PresetAwareBOMGenerator();
      const positionBOMs = new Map<string, CompleteBOM>();
      const failedPositionIds: string[] = [];
      const failureReasons = new Map<string, string>();

      let materialCost = 0, hardwareCost = 0, glazingCost = 0;
      let accessoriesCost = 0, laborCost = 0;
      let totalProfiles = 0, totalHardware = 0, totalGlazing = 0, totalAccessories = 0;

      for (const pos of positions) {
        try {
          const pack = engineeringPacks.find(pack => pack.meta.id === pos.systemPackId);
          if (!pack) throw new Error('Saved system pack is unavailable to the signed-in owner.');
          const pattern = resolveEstimatePattern(pos);
          const bom = await generator.generateCompleteBOM(pos, pattern, pack, false);
          if (!bom.qualification || bom.qualification.generatedPieceCount !== bom.qualification.requiredPieceCount) {
            throw new Error(`Incomplete profile ledger: ${bom.qualification?.generatedPieceCount ?? 0}/${bom.qualification?.requiredPieceCount ?? '?'} required pieces. Resolve frame and divider profiles in Design.`);
          }
          const qty = pos.quantity ?? 1;
          if (!Number.isSafeInteger(qty) || qty < 1) throw new Error('Pose quantity must be a positive integer.');
          positionBOMs.set(pos.id, bom);

          totalProfiles += bom.profiles.reduce((sum, profile) => sum + profile.cuttingLengths.length, 0) * qty;
          totalHardware += bom.hardware.length * qty;
          totalGlazing += bom.glazing.length * qty;
          totalAccessories += bom.accessories.length * qty;
          materialCost += bom.cost.materialCost * qty;
          hardwareCost += bom.cost.hardwareCost * qty;
          glazingCost += bom.cost.glazingCost * qty;
          accessoriesCost += bom.cost.accessoriesCost * qty;
          laborCost += bom.cost.laborCost * qty;
        } catch (error) {
          failedPositionIds.push(pos.id);
          failureReasons.set(pos.id, error instanceof Error ? error.message : 'BOM calculation failed.');
        }
      }

      const isPartialEstimate =
        failedPositionIds.length > 0 || positionBOMs.size < positions.length;

      if (generation !== aggregationGeneration.current) return;
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
        failedPositionIds,
        failureReasons,
        isPartialEstimate,
      });
      if (projectId && projectMeta) {
        const existingMeta = projectMeta.meta && typeof projectMeta.meta === 'object' && !Array.isArray(projectMeta.meta)
          ? projectMeta.meta as Record<string, unknown> : {};
        updateProject.mutate({ projectId, updates: { meta: {
          ...existingMeta,
          bom_estimate: {
            classification: 'estimate_only', manufacturingEligible: false,
            generatedAt: new Date().toISOString(), isPartialEstimate,
            sourcePositions: positions.map(position => ({ id: position.id, updatedAt: position.updatedAt })),
            positionBOMs: Array.from(positionBOMs.entries()),
            failures: Array.from(failureReasons.entries()),
          },
        } } }, {
          onSuccess: data => data ? toast.success('Project BOM estimate saved') : toast.error('BOM calculated but saving returned no receipt'),
          onError: () => toast.error('BOM calculated but saving failed. Retry before leaving.'),
        });
      }

      if (isPartialEstimate) {
        toast.warning(
          `Partial project BOM: ${positionBOMs.size}/${positions.length} positions resolved. Failed positions are labeled — not a complete manufacturing total.`,
        );
      }
    } finally {
      if (generation === aggregationGeneration.current) setIsAggregating(false);
    }
  }, [positions, engineeringPacks, projectId, projectMeta, updateProject]);

  return (
    <div className="h-full overflow-auto p-6 space-y-6 bg-[#0a0a0a]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard label="Positions" value={positions.length} icon={<Layers size={16} />} />
        <KPICard label="Total Units" value={totalUnits} icon={<Box size={16} />} />
        <KPICard label="Total Area" value={`${totalArea.toFixed(2)} m²`} icon={<Ruler size={16} />} />
        <KPICard label="Systems" value={systemBreakdown.length} icon={<Package size={16} />} />
        <KPICard
          label="Estimated Cost"
          value={aggregatedBOM?.positionBOMs.size ? `${aggregatedBOM.totalCost.toLocaleString('en-EG', { maximumFractionDigits: 0 })} EGP` : '—'}
          icon={<DollarSign size={16} />}
          highlight
        />
      </div>

      {aggregatedBOM?.isPartialEstimate ? (
        <Alert className="border-amber-600/40 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200 text-sm">
            Partial estimate only — {aggregatedBOM.positionBOMs.size}/{positions.length} positions
            resolved
            {aggregatedBOM.failedPositionIds.length
              ? ` (${aggregatedBOM.failedPositionIds.length} failed)`
              : ''}
            . Failed poses cannot look like a complete project BOM.
          </AlertDescription>
        </Alert>
      ) : null}

      {aggregatedBOM && !aggregatedBOM.isPartialEstimate && (
        <Alert className="border-amber-600/40 bg-amber-500/5">
          <AlertDescription>Estimate only — manufacturing approval and validated cutting rules are required before production.</AlertDescription>
        </Alert>
      )}
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
            <div className="space-y-4">
              <PoseLayoutPreview
                poses={positions}
                onSelect={openPoseMeasuring}
                onEdit={openPoseMeasuring}
                onDuplicate={(id) => { void handleDuplicatePose(id); }}
                onDelete={(id) => { void handleDeletePose(id); }}
              />
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
                    const failed = aggregatedBOM?.failedPositionIds.includes(pos.id);
                    return (
                      <tr key={pos.id} className="border-b border-slate-800/50 hover:bg-amber-500/5">
                        <td className="py-2 px-3 text-amber-300 font-mono text-xs">{pos.posNumber || i + 1}</td>
                        <td className="py-2 px-3 text-slate-300">{pos.type || 'window'}</td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">{pos.overallWidth}</td>
                        <td className="py-2 px-3 text-right text-slate-300 font-mono">{pos.overallHeight}</td>
                        <td className="py-2 px-3 text-right text-slate-300">
                          <Input key={`${pos.id}:${pos.quantity}`} type="number" min={1} step={1}
                            aria-label={`Quantity for pose ${pos.posNumber || i + 1}`}
                            defaultValue={pos.quantity ?? 1} className="w-16 ml-auto h-8"
                            onBlur={event => { void handleQuantityChange(pos, event.target.value); }} />
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                            {pos.systemPackId || '—'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {failed ? (
                            <div><Badge variant="outline" className="text-[10px] border-red-500/40 text-red-300">
                              BOM failed
                            </Badge><p className="text-xs text-red-300 mt-1">{aggregatedBOM?.failureReasons.get(pos.id)}</p></div>
                          ) : (
                            <StatusBadge status={pos.status} />
                          )}
                        </td>
                        <td className="py-2 px-3 text-right text-amber-200 font-mono text-xs">
                          {failed
                            ? '—'
                            : posBOM
                              ? `${(posBOM.cost.totalCost * (pos.quantity || 1)).toLocaleString('en-EG', { maximumFractionDigits: 0 })}`
                              : '—'}
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
                {aggregatedBOM && aggregatedBOM.positionBOMs.size > 0 && (
                  <tfoot>
                    <tr className="border-t border-amber-600/30 font-bold">
                      <td colSpan={4} className="py-2 px-3 text-amber-200">{aggregatedBOM.isPartialEstimate ? 'Partial estimate subtotal' : 'Project estimate total'}</td>
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregated Cost Breakdown */}
      {aggregatedBOM && aggregatedBOM.positionBOMs.size > 0 && (
        <Card className="bg-slate-900/40 border-amber-600/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-200 flex items-center gap-2">
              <DollarSign size={16} />
              Estimated Cost Breakdown
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                <CheckCircle2 size={10} className="mr-1" />
                {aggregatedBOM.positionBOMs.size}/{positions.length} positions calculated
                {aggregatedBOM.isPartialEstimate ? ' (partial estimate)' : ''}
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
