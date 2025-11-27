import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { WindowUnit } from '@/types/fabricator';
import type { OptimizationOptions } from '@/integrations/cnc/CNCController';
import {
  MassProductionOptimizer,
  type UnifiedCuttingPlan,
} from '@/algorithms/massProductionOptimizer';
import {
  Factory,
  Scissors,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Layers,
  Clock,
} from 'lucide-react';

interface MassProductionDashboardProps {
  /** Projects that already have single‑project optimization results attached. */
  projects: WindowUnit[];
  /** Authenticated user id used for remnant operations. */
  userId: string;
}

/**
 * MassProductionDashboard
 * ----------------------------------------------------------------------------
 * Cross‑project cockpit for the MassProductionOptimizer:
 * - Lets operators select multiple optimized jobs
 * - Runs GA + remnant‑aware mass mode via MassProductionOptimizer
 * - Surfaces waste improvement and remnant utilisation at a glance
 */
export const MassProductionDashboard: React.FC<MassProductionDashboardProps> = ({
  projects,
  userId,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [options, setOptions] = useState<OptimizationOptions>({
    minimizeWaste: true,
    minimizeTime: false,
    minimizeEnergy: false,
    prioritizeQuality: false,
    allowRemnantUsage: true,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UnifiedCuttingPlan | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const optimizedProjects = useMemo(
    () =>
      projects.filter(
        (p) => p.optimization && p.optimization.cuttingPlan && p.optimization.cuttingPlan.length > 0,
      ),
    [projects],
  );

  /**
   * Fast lookup map for projectId → project, reused between renders and
   * across optimization runs to avoid rebuilding large maps in hot paths.
   */
  const optimizedProjectsById = useMemo(() => {
    const map = new Map<string, WindowUnit>();
    for (const project of optimizedProjects) {
      map.set(project.id, project);
    }
    return map;
  }, [optimizedProjects]);

  /**
   * Set-based view of the current selection to keep lookups O(1) even when
   * hundreds of optimized jobs are visible in the list.
   */
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleProject = (projectId: string) => {
    setSelectedIds((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId],
    );
  };

  const handleRun = async () => {
    if (!selectedIds.length) {
      setError('Please select at least one optimized project.');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const optimizer = new MassProductionOptimizer({
        projectLoader: async (ids) =>
          ids
            .map((id) => optimizedProjectsById.get(id))
            .filter((p): p is WindowUnit => Boolean(p)),
        userId,
      });

      const unified = await optimizer.optimizeAcrossProjects(selectedIds, options);
      setResult(unified);
      setLastSummary(optimizer.getLastRunSummary());
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Mass production optimization failed:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to run mass production optimization. ',
      );
    } finally {
      setIsRunning(false);
    }
  };

  if (!optimizedProjects.length) {
    return (
      <Card className="bg-gray-900/70 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="h-5 w-5 text-orange-400" />
            Mass Production Mode
          </CardTitle>
          <CardDescription className="text-sm text-gray-400">
            No optimized projects are available yet. Complete single‑job optimization in the main
            workflow first, then return here to batch optimize across jobs.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const improvement =
    result && result.improvementVsBaselinePercentage
      ? result.improvementVsBaselinePercentage
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gray-900/80 border-gray-800 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <Sparkles className="h-5 w-5 text-orange-400" />
                Mass Production Optimizer
              </CardTitle>
              <CardDescription className="text-sm text-gray-300 mt-1">
                Select multiple optimized jobs and run cross‑project, remnant‑aware cutting
                optimization to minimise waste across the factory.
              </CardDescription>
            </div>
            {result && (
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className="text-[11px] bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Run Completed
                </Badge>
                <p className="text-xs text-gray-400">
                  Waste improvement vs baseline:{' '}
                  <span className="text-emerald-300 font-semibold">
                    {improvement.toFixed(1)}%
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive" className="bg-red-900/25 border-red-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Project selection list */}
        <Card className="bg-gray-900/70 border-gray-800 xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-orange-400" />
              Optimized Jobs ({optimizedProjects.length})
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Pick the positions / jobs you want to batch into this mass‑production run. Only jobs
              with a completed cutting optimization are listed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {optimizedProjects.map((project) => {
                const isSelected = selectedIdSet.has(project.id);
                const waste = project.optimization?.wastePercentage ?? 0;
                const efficiency = project.optimization?.nestingEfficiency ?? 0;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => toggleProject(project.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-sm border ${
                            isSelected
                              ? 'bg-orange-500 border-orange-400'
                              : 'border-gray-500 bg-gray-900'
                          }`}
                        />
                        <div>
                          <div className="text-sm font-semibold text-gray-100">
                            {project.orderNumber}{' '}
                            <span className="text-[11px] text-gray-400">
                              · {project.posNumber}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {project.overallWidth.toFixed(0)} ×{' '}
                            {project.overallHeight.toFixed(0)} mm ·{' '}
                            {project.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/40"
                        >
                          Eff. {efficiency.toFixed(1)}%
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-red-500/10 text-red-300 border-red-500/40"
                        >
                          Waste {waste.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-400">
                Selected:{' '}
                <span className="font-semibold text-gray-200">{selectedIds.length}</span>{' '}
                project{selectedIds.length === 1 ? '' : 's'}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handleRun}
                disabled={isRunning || selectedIds.length === 0}
                className="bg-orange-500 hover:bg-orange-600 text-xs"
              >
                {isRunning ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing…
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4 mr-2" />
                    Run Mass Optimization
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Options & results */}
        <div className="space-y-4">
          <Card className="bg-gray-900/70 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Factory className="h-4 w-4 text-orange-400" />
                Optimization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Minimise Waste</span>
                <Button
                  type="button"
                  size="sm"
                  variant={options.minimizeWaste ? 'default' : 'outline'}
                  className="h-7 px-3 text-[11px]"
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, minimizeWaste: !prev.minimizeWaste }))
                  }
                >
                  {options.minimizeWaste ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Use Remnants First</span>
                <Button
                  type="button"
                  size="sm"
                  variant={options.allowRemnantUsage ? 'default' : 'outline'}
                  className="h-7 px-3 text-[11px]"
                  onClick={() =>
                    setOptions((prev) => ({
                      ...prev,
                      allowRemnantUsage: !prev.allowRemnantUsage,
                    }))
                  }
                >
                  {options.allowRemnantUsage ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Prioritise Production Time</span>
                <Button
                  type="button"
                  size="sm"
                  variant={options.minimizeTime ? 'default' : 'outline'}
                  className="h-7 px-3 text-[11px]"
                  onClick={() =>
                    setOptions((prev) => ({ ...prev, minimizeTime: !prev.minimizeTime }))
                  }
                >
                  {options.minimizeTime ? 'On' : 'Off'}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Prioritise Quality</span>
                <Button
                  type="button"
                  size="sm"
                  variant={options.prioritizeQuality ? 'default' : 'outline'}
                  className="h-7 px-3 text-[11px]"
                  onClick={() =>
                    setOptions((prev) => ({
                      ...prev,
                      prioritizeQuality: !prev.prioritizeQuality,
                    }))
                  }
                >
                  {options.prioritizeQuality ? 'On' : 'Off'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/70 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-orange-400" />
                Optimization Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {!result ? (
                <p className="text-gray-400">
                  Run a mass‑production optimization to see combined waste metrics and remnant
                  utilisation here.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400">Baseline Waste</p>
                      <p className="text-lg font-semibold text-red-300">
                        {result.baselineWastePercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400">Final Waste</p>
                      <p className="text-lg font-semibold text-emerald-300">
                        {result.finalWastePercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-gray-400">Improvement</p>
                      <p className="text-lg font-semibold text-emerald-300">
                        {improvement.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={Math.max(0, Math.min(100, 100 - result.finalWastePercentage))}
                    className="h-2 mt-2"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500">
                    <span>Higher is better (material utilisation)</span>
                    <span>
                      {result.projectIds.length} project
                      {result.projectIds.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {result.remnantUsage && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] text-gray-400">Remnant Utilisation</p>
                      <div className="flex justify-between text-[11px] text-gray-300">
                        <span>
                          Used:{' '}
                          <span className="font-semibold">
                            {result.remnantUsage.summary.totalRemnantsUsed}
                          </span>{' '}
                          pcs
                        </span>
                        <span>
                          Avg. Utilisation:{' '}
                          <span className="font-semibold">
                            {result.remnantUsage.summary.averageRemnantUtilization.toFixed(1)}%
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {lastSummary && (
                    <p className="mt-3 text-[11px] text-gray-500 leading-snug">{lastSummary}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MassProductionDashboard;


