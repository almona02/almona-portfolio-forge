import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/ui/alert-dialog';
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
  X,
} from 'lucide-react';

interface MassProductionDashboardProps {
  /** Projects that already have single‑project optimization results attached. */
  projects: WindowUnit[];
  /** Authenticated user id used for remnant operations. */
  userId: string;
  onClose?: () => void;
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
  onClose,
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
      <Card className="bg-background/70 border-border card-dark">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Factory className="h-5 w-5 text-warning" />
            Mass Production Mode
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
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
      <Card className="bg-background/80 border-border shadow-xl card-dark">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="pt-1">
              <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                <Sparkles className="h-5 w-5 text-warning" />
                Mass Production Optimizer
              </CardTitle>
              <CardDescription className="text-sm text-foreground mt-1">
                Select multiple optimized jobs and run cross‑project, remnant‑aware cutting
                optimization to minimise waste across the factory.
              </CardDescription>
            </div>
            {result && (
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className="text-[11px] bg-emerald-500/15 text-success border-emerald-500/40"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Run Completed
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Waste improvement vs baseline:{' '}
                  <span className="text-success font-semibold">
                    {improvement.toFixed(1)}%
                  </span>
                </p>
              </div>
            )}
            <div className="flex items-start">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hover:bg-red-500/15 hover:text-destructive"
                    aria-label="Exit mass production"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-background border-amber-500/30">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-warning">Exit Mass Production?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You have unsaved optimization batches. Leaving now will discard the current queue configuration.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Stay Here</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (onClose) onClose();
                        else window.history.back();
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Exit & Discard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
        <Card className="bg-background/70 border-border xl:col-span-2 card-dark">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Layers className="h-4 w-4 text-warning" />
              Optimized Jobs ({optimizedProjects.length})
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
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
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border bg-background/40 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-4 w-4 rounded-sm border ${
                            isSelected
                              ? 'bg-amber-500 border-amber-400'
                              : 'border-border bg-background'
                          }`}
                        />
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {project.orderNumber}{' '}
                            <span className="text-[11px] text-muted-foreground">
                              · {project.posNumber}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {project.overallWidth.toFixed(0)} ×{' '}
                            {project.overallHeight.toFixed(0)} mm ·{' '}
                            {project.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-blue-500/15 text-info border-blue-500/40"
                        >
                          Eff. {efficiency.toFixed(1)}%
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-red-500/10 text-destructive border-red-500/40"
                        >
                          Waste {waste.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Selected:{' '}
                <span className="font-semibold text-foreground">{selectedIds.length}</span>{' '}
                project{selectedIds.length === 1 ? '' : 's'}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleRun()}
                disabled={isRunning || selectedIds.length === 0}
                className="btn-primary"
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
          <Card className="bg-background/70 border-border card-dark">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Factory className="h-4 w-4 text-warning" />
                Optimization Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Minimise Waste</span>
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
                <span className="text-foreground">Use Remnants First</span>
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
                <span className="text-foreground">Prioritise Production Time</span>
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
                <span className="text-foreground">Prioritise Quality</span>
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

          <Card className="bg-background/70 border-border card-dark">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-warning" />
                Optimization Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {!result ? (
                <p className="text-muted-foreground">
                  Run a mass‑production optimization to see combined waste metrics and remnant
                  utilisation here.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Baseline Waste</p>
                      <p className="text-lg font-semibold text-destructive">
                        {result.baselineWastePercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Final Waste</p>
                      <p className="text-lg font-semibold text-success">
                        {result.finalWastePercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">Improvement</p>
                      <p className="text-lg font-semibold text-success">
                        {improvement.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={Math.max(0, Math.min(100, 100 - result.finalWastePercentage))}
                    className="h-2 mt-2"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Higher is better (material utilisation)</span>
                    <span>
                      {result.projectIds.length} project
                      {result.projectIds.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {result.remnantUsage && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] text-muted-foreground">Remnant Utilisation</p>
                      <div className="flex justify-between text-[11px] text-foreground">
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
                    <p className="mt-3 text-[11px] text-muted-foreground leading-snug">{lastSummary}</p>
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


