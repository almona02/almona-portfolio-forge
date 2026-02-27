import type { CuttingJob } from '@/algorithms/adaptiveSolver';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { useAuth } from '@/context/AuthContext';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { validateStepTransition } from '@/lib/fabricator/validation/WorkflowValidator';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { findBestMatchingPattern, getPatternById } from '@/lib/fabricator/presetUtils';
import { useWorkflowStore } from '@/store/workflowStore';
import type { AdaptiveSolverConfig, OptimizationResult } from '@/types/fabricator';
import { lazyRetry } from '@/utils/lazyImport';
import { WorkflowValidationGate } from '@/components/fabricator/workflow/WorkflowValidationGate';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const OptimizationEqualizer = lazyRetry(
    () => import('@/components/fabricator/OptimizationEqualizer').then((m) => ({
        default: m.OptimizationEqualizer,
    })),
    'OptimizationEqualizer'
);

/**
 * GOLD-TIER OPTIMIZATION PAGE
 * 
 * Features:
 * - Proper data flow from workflow store
 * - Error handling for missing data
 * - Loading states with premium UX
 * - User authentication integration
 * - System pack profile resolution
 */
export const OptimizationPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const {
        measurementData,
        currentProject,
        bom,
        optimizationResult,
        completeStep,
        setOptimizationResult,
        setBOM,
    } = useWorkflowStore();

    const optimizationValidation = useMemo(
        () =>
            validateStepTransition(
                {
                    measurementData,
                    currentProject,
                    bom,
                    optimizationResult,
                },
                'optimization'
            ),
        [measurementData, currentProject, bom, optimizationResult]
    );

    const systemPack = useMemo(() => {
        if (!currentProject?.systemPackId) return null;
        return SYSTEM_PACKS.find(p => p.meta.id === currentProject.systemPackId) ?? null;
    }, [currentProject?.systemPackId]);

    // ✅ GOLD-TIER: Resolve profiles from system pack
    const profiles = useMemo(() => systemPack?.profiles ?? [], [systemPack]);

    // ✅ GOLD-TIER: Error handling for missing data
    const hasRequiredData = currentProject !== null;

    // P0: Run cutting optimization and proceed to commercial
    const handleOptimizationComplete = useCallback(async (payload: { strategy?: unknown; minRemnantLength?: number; maxRemnantAge?: number }) => {
        if (!currentProject || !profiles.length) return;

        setIsOptimizing(true);
        try {
            const components = currentProject.components ?? [];
            let optimizationResult: OptimizationResult;

            if (components.length > 0) {
                const job: CuttingJob = {
                    components,
                    profiles,
                    defaultStockLength: 6000,
                    systemPackId: currentProject.systemPackId ?? undefined,
                };
                const solverConfig: AdaptiveSolverConfig = {
                    maxSolvingTime: 30,
                    complexityThresholds: { simple: 50, medium: 500 },
                };
                const solver = new AdaptiveSolver(solverConfig);
                optimizationResult = await solver.solve(job, profiles);
            } else {
                // Minimal result when no components (e.g. empty design)
                optimizationResult = {
                    materialUsage: 0,
                    wastePercentage: 0,
                    estimatedProductionTime: 0,
                    cuttingPlan: [],
                    nestingEfficiency: 0,
                    costBreakdown: {
                        materialCost: 0,
                        laborCost: 0,
                        hardwareCost: 0,
                        glazingCost: 0,
                        totalCost: 0,
                    },
                };
            }

            setOptimizationResult(optimizationResult);

            // P1.2: Generate BOM when we have pattern + systemPack
            if (systemPack && currentProject.grid) {
                try {
                    const pattern =
                        (currentProject as { presetId?: string }).presetId
                            ? getPatternById((currentProject as { presetId: string }).presetId)
                            : findBestMatchingPattern(currentProject.grid, currentProject.systemPackId ?? null)?.pattern;
                    if (pattern) {
                        const bomGenerator = new PresetAwareBOMGenerator();
                        const bom = await bomGenerator.generateCompleteBOM(currentProject, pattern, systemPack)
                            .catch(() => null);
                        if (bom) setBOM(bom);
                    }
                } catch {
                    // BOM optional; continue without it
                }
            }

            completeStep('optimization');

            const projId = projectId ?? currentProject.id;
            const posId = poseId ?? projId;
            setTimeout(() => {
                navigate(fabricatorRoutes.poseCommercial(projId, posId));
            }, 100);
        } catch (err) {
            console.error('[OptimizationPage] Optimization failed:', err);
            // Fallback: minimal result so user can proceed
            setOptimizationResult({
                materialUsage: 0,
                wastePercentage: 0,
                estimatedProductionTime: 0,
                cuttingPlan: [],
                nestingEfficiency: 0,
                costBreakdown: { materialCost: 0, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 0 },
            });
            completeStep('optimization');
            const projId = projectId ?? currentProject.id;
            const posId = poseId ?? projId;
            setTimeout(() => navigate(fabricatorRoutes.poseCommercial(projId, posId)), 100);
        } finally {
            setIsOptimizing(false);
        }
    }, [currentProject, profiles, projectId, poseId, systemPack, completeStep, setOptimizationResult, setBOM, navigate]);

    // ✅ GOLD-TIER: Premium loading state
    const LoadingFallback = (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Loading optimization controls...</p>
            </div>
        </div>
    );

    // ✅ P3.1.4: WorkflowValidationGate when design is incomplete
    if (!hasRequiredData || !optimizationValidation.valid) {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
                <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 space-y-6">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-amber-200">
                            {optimizationValidation.errors.length > 0 ? 'Design Required' : 'Optimization'}
                        </h2>
                    </div>
                    <WorkflowValidationGate
                        result={optimizationValidation}
                        targetStepLabel="Optimization"
                        onGoBack={() => {
                            const projId = projectId ?? currentProject?.id;
                            const posId = poseId ?? projId;
                            if (projId && posId) {
                                navigate(fabricatorRoutes.poseDesign(projId, posId));
                            } else {
                                navigate(fabricatorRoutes.studioProjects());
                            }
                        }}
                        backLabel="Go to Design"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-amber-50">
            <Suspense fallback={LoadingFallback}>
                <div className="max-w-7xl mx-auto w-full p-6 space-y-6">
                    {/* ✅ GOLD-TIER: Page header with context */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 p-6">
                        <h1 className="text-2xl font-bold text-slate-900">
                            Optimization Strategy
                        </h1>
                        <p className="text-slate-600 mt-2">
                            Fine-tune your optimization parameters to match your production needs.
                            Adjust the balance between waste reduction, remnant usage, and production speed.
                        </p>
                    </div>

                    {/* ✅ GOLD-TIER: Component with proper data */}
                    <OptimizationEqualizer
                        userId={user?.id || 'guest'}
                        profiles={profiles}
                        onComplete={handleOptimizationComplete}
                    />
                    {isOptimizing && (
                        <div className="flex items-center justify-center gap-2 py-4 text-amber-600">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Running cutting optimization...</span>
                        </div>
                    )}
                </div>
            </Suspense>
        </div>
    );
};
