import type { CuttingJob } from '@/algorithms/adaptiveSolver';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { OptimizationCockpit } from '@/components/fabricator/cockpit/OptimizationCockpit';
import { WorkflowValidationGate } from '@/components/fabricator/workflow/WorkflowValidationGate';
import { useAuth } from '@/context/AuthContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { PresetAwareBOMGenerator } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { findBestMatchingPattern, getPatternById } from '@/lib/fabricator/presetUtils';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { validateOptimizationResult, validateStepTransition } from '@/lib/fabricator/validation/WorkflowValidator';
import { useWorkflowStore } from '@/store/workflowStore';
import type { AdaptiveSolverConfig, OptimizationResult } from '@/types/fabricator';
import { lazyRetry } from '@/utils/lazyImport';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
 * Solver path is unchanged. FP-025A only wraps the workspace in OptimizationCockpit
 * so results are displayed, not recalculated in the UI.
 */
export const OptimizationPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationError, setOptimizationError] = useState<string | null>(null);
    const activeRunRef = useRef(0);
    const submissionLockedRef = useRef(false);
    const projectIdentityRef = useRef<string | null>(null);
    const mountedRef = useRef(true);
    const {
        measurementData,
        currentProject,
        bom,
        optimizationResult,
        completeStep,
        setOptimizationResult,
        setBOM,
        invalidateStep,
    } = useWorkflowStore();
    const activeProjectRef = useRef(currentProject);

    const projectIdentity = currentProject ? `${currentProject.id}:${currentProject.updatedAt instanceof Date ? currentProject.updatedAt.toISOString() : String(currentProject.updatedAt ?? '')}` : null;
    useEffect(() => { projectIdentityRef.current = projectIdentity; }, [projectIdentity]);
    useEffect(() => { activeProjectRef.current = currentProject; }, [currentProject]);
    useEffect(() => () => { mountedRef.current = false; activeRunRef.current += 1; }, []);

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

    const profiles = useMemo(() => systemPack?.profiles ?? [], [systemPack]);

    const hasRequiredData = currentProject !== null;

    const handleOptimizationComplete = useCallback(async (_payload: { strategy?: unknown; minRemnantLength?: number; maxRemnantAge?: number }) => {
        if (submissionLockedRef.current) return;
        if (!currentProject || !profiles.length) {
            setOptimizationError('Resolve the system pack and component profiles before retrying.');
            return;
        }

        const runId = ++activeRunRef.current;
        const runProjectIdentity = projectIdentity;
        const runProject = currentProject;
        submissionLockedRef.current = true;
        invalidateStep('optimization');
        setOptimizationError(null);
        setIsOptimizing(true);
        try {
            const components = currentProject.components ?? [];
            if (!components.length) throw new Error('No manufacturing components are available.');
            const job: CuttingJob = { components, profiles, defaultStockLength: 6000, systemPackId: currentProject.systemPackId ?? undefined };
            const solverConfig: AdaptiveSolverConfig = { maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } };
            const optimizationResult: OptimizationResult = await new AdaptiveSolver(solverConfig).solve(job, profiles);
            if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current || runProject !== activeProjectRef.current) return;
            const resultValidation = validateOptimizationResult(optimizationResult);
            if (!resultValidation.valid) throw new Error(resultValidation.errors[0]?.message ?? 'Optimization result is invalid.');

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
                        if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current || runProject !== activeProjectRef.current) return;
                        if (bom) setBOM(bom);
                    }
                } catch {
                    // BOM optional; continue without it
                }
            }

            if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current || runProject !== activeProjectRef.current) return;
            setOptimizationResult(optimizationResult);
            if (!completeStep('optimization')) throw new Error('Optimization evidence could not be verified.');

            const projId = projectId ?? currentProject.id;
            const posId = poseId ?? projId;
            setTimeout(() => {
                if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current || runProject !== activeProjectRef.current) return;
                void navigate(fabricatorRoutes.poseCommercial(projId, posId));
            }, 100);
        } catch (err) {
            if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current) return;
            console.error('[OptimizationPage] Optimization failed:', err);
            invalidateStep('optimization');
            setOptimizationError(err instanceof Error ? err.message : 'Optimization failed. Review the design and retry.');
        } finally {
            if (runId === activeRunRef.current) {
                submissionLockedRef.current = false;
                if (mountedRef.current) setIsOptimizing(false);
            }
        }
    }, [currentProject, profiles, projectId, poseId, systemPack, completeStep, setOptimizationResult, setBOM, navigate, invalidateStep, projectIdentity]);

    const validOptimization = validateOptimizationResult(optimizationResult).valid;

    const LoadingFallback = (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Loading optimization controls...</p>
            </div>
        </div>
    );

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
                                void navigate(fabricatorRoutes.poseDesign(projId, posId));
                            } else {
                                void navigate(fabricatorRoutes.studioProjects());
                            }
                        }}
                        backLabel="Go to Design"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            <Suspense fallback={LoadingFallback}>
                <OptimizationCockpit result={optimizationResult} algorithmLabel={null} authority={null}>
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
                    {optimizationError && (
                        <div role="alert" className="mx-4 mb-4 rounded border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-200">
                            {optimizationError} Retry optimization after correcting the input.
                        </div>
                    )}
                </OptimizationCockpit>

                {validOptimization && projectId && poseId && (
                    <div className="p-2 flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                if (completeStep('optimization')) void navigate(fabricatorRoutes.poseCommercial(projectId, poseId));
                            }}
                            disabled={isOptimizing}
                            className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm rounded"
                        >
                            Continue to Quote
                        </button>
                    </div>
                )}
            </Suspense>
        </div>
    );
};
