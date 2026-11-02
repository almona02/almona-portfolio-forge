import { ManufacturingApprovalPanel } from '@/components/fabricator/workflow/ManufacturingApprovalPanel';
import { YilmazExportActionPanel } from '@/components/fabricator/export/YilmazExportActionPanel';
import { useEngineeringSystemPacks } from '@/hooks/fabricator/useEngineeringSystemPacks';
import type { CuttingJob } from '@/algorithms/adaptiveSolver';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { OptimizationCockpit } from '@/components/fabricator/cockpit/OptimizationCockpit';
import { OptimizationSolverInputsPanel } from '@/components/fabricator/cockpit/OptimizationSolverInputsPanel';
import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings';
import {
    resolveManufacturingAuthority,
    type ResolvedManufacturingAuthority,
} from '@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver';
import { fetchOwnedStockVersions } from '@/lib/fabricator/inventory/loadOwnedPhysicalBarLots';
import {
    approvedStockOptions,
    assessStockReadiness,
    barsByProfile,
    resolveApprovedSolverInputs,
    type OptimizationMode,
    type SolverInputIssue,
} from '@/lib/fabricator/optimization/solverInputs';
import { WorkflowValidationGate } from '@/components/fabricator/workflow/WorkflowValidationGate';
import { useAuth } from '@/context/AuthContext';
import { recordOptimizationEvidence } from '@/lib/fabricator/commercial/recordOptimizationEvidence';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { completeDesignLedger, validateOptimizationReconciliation, validateStepTransition } from '@/lib/fabricator/validation/WorkflowValidator';
import { useWorkflowStore } from '@/store/workflowStore';
import type { AdaptiveSolverConfig, OptimizationResult, Profile } from '@/types/fabricator';
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
 * FP-025A wraps the workspace in OptimizationCockpit so results are displayed, not
 * recalculated in the UI. Batch 2 (AICS-001 Tier 3): the production run binds the
 * solver to the approved, revision-bound manufacturing authority (kerf, trim, stock
 * length per profile) and to the operator's owned-stock acknowledgement; there is no
 * default 6000 mm bar. Inventory-free simulation is an explicit mode that never
 * records evidence and never completes the optimization step.
 */
export const OptimizationPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationError, setOptimizationError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [mode, setMode] = useState<OptimizationMode>('production');
    const [stockSelection, setStockSelection] = useState<Record<string, number>>({});
    const [authority, setAuthority] = useState<ResolvedManufacturingAuthority | null>(null);
    const [authorityError, setAuthorityError] = useState<string | null>(null);
    /** Simulation output lives here only — never in the workflow store, never evidence. */
    const [simulationResult, setSimulationResult] = useState<OptimizationResult | null>(null);
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
        invalidateStep,
        alignShellProject,
        workflowIdentity,
        stockReservation,
    } = useWorkflowStore();
    const activeProjectRef = useRef(currentProject);

    const projectIdentity = currentProject ? `${currentProject.id}:${currentProject.updatedAt instanceof Date ? currentProject.updatedAt.toISOString() : String(currentProject.updatedAt ?? '')}` : null;
    useEffect(() => { projectIdentityRef.current = projectIdentity; }, [projectIdentity]);
    useEffect(() => { activeProjectRef.current = currentProject; }, [currentProject]);
    useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; activeRunRef.current += 1; }; }, []);

    const engineeringPacksForGate = useEngineeringSystemPacks();
    // The gate completes the saved design ledger before judging BOM parity, so a pose
    // saved before the sliding-track completion existed is not blocked forever.
    const systemPackForGate = useMemo(
        () => engineeringPacksForGate.find((pack) => pack.meta.id === currentProject?.systemPackId) ?? null,
        [engineeringPacksForGate, currentProject?.systemPackId],
    );

    const optimizationValidation = useMemo(
        () =>
            validateStepTransition(
                {
                    measurementData,
                    currentProject,
                    bom,
                    optimizationResult,
                    systemPack: systemPackForGate,
                },
                'optimization'
            ),
        [measurementData, currentProject, bom, optimizationResult, systemPackForGate]
    );

    const completedProject = useMemo(() => currentProject
        ? { ...currentProject, components: completeDesignLedger(currentProject, systemPackForGate) }
        : null, [currentProject, systemPackForGate]);

    const profiles = useMemo(
        () => Array.from(new Map((completedProject?.components ?? []).filter(component => component.profile?.id).map(component => [component.profile.id, component.profile])).values()),
        [completedProject?.components],
    );

    const hasRequiredData = currentProject !== null;

    // Authoritative revision for evidence + authority resolution.
    const revision = workflowIdentity?.revision ?? (Number.isInteger(currentProject?.revision) ? Number(currentProject?.revision) : 0);

    // Resolve the approved manufacturing authority for the saved revision before any run.
    useEffect(() => {
        let cancelled = false;
        setAuthority(null);
        setAuthorityError(null);
        if (!user?.id || !poseId || revision < 1) return;
        resolveManufacturingAuthority(poseId, revision)
            .then((resolved) => { if (!cancelled) setAuthority(resolved); })
            .catch((err: unknown) => { if (!cancelled) setAuthorityError(err instanceof Error ? err.message : 'Approved manufacturing authority is unavailable.'); });
        return () => { cancelled = true; };
    }, [user?.id, poseId, revision]);

    // Simulation result is bound to one position identity; drop it when the pose changes.
    useEffect(() => { setSimulationResult(null); setStockSelection({}); }, [projectIdentity]);

    const stockOptionsByProfile = useMemo(() => Object.fromEntries(
        profiles.map(profile => [profile.id, authority ? approvedStockOptions(authority, profile.id) : []]),
    ) as Record<string, number[]>, [profiles, authority]);

    /** Physical bars keyed by profile|lengthMm from stock acknowledgement (never metres quotient). */
    const availableBarsByProfileLength = useMemo(
        () => stockReservation?.barsByCatalogueLength ?? {},
        [stockReservation?.barsByCatalogueLength],
    );

    const resolvedInputs = useMemo(
        () => (authority
            ? resolveApprovedSolverInputs(
                profiles,
                authority,
                stockSelection,
                availableBarsByProfileLength,
                { requirePhysicalBars: mode === 'production' },
            )
            : null),
        [authority, profiles, stockSelection, availableBarsByProfileLength, mode],
    );
    const inputIssues: SolverInputIssue[] = resolvedInputs && !resolvedInputs.ok ? resolvedInputs.issues : [];
    // UI readiness preview (no live version yet — production path re-reads below).
    const readiness = useMemo(
        () => assessStockReadiness({ stockReservation, workflowIdentity, bom }),
        [stockReservation, workflowIdentity, bom],
    );

    const handleOptimizationComplete = useCallback(async (_payload: { strategy?: unknown; minRemnantLength?: number; maxRemnantAge?: number }) => {
        if (submissionLockedRef.current) return;
        if (!currentProject || !profiles.length) {
            setOptimizationError('Resolve the system pack and component profiles before retrying.');
            return;
        }

        const runId = ++activeRunRef.current;
        const runProjectIdentity = projectIdentity;
        const runProject = currentProject;
        const runMode: OptimizationMode = mode;
        submissionLockedRef.current = true;
        if (runMode === 'production') invalidateStep('optimization');
        setOptimizationError(null);
        setIsOptimizing(true);
        try {
            // Optimise the completed ledger, not the stored one: a pose saved before the
            // sliding-track completion existed would otherwise be cut without its track pair.
            const components = completeDesignLedger(currentProject, systemPackForGate);
            if (!components.length) throw new Error('No manufacturing components are available.');

            // Solver inputs: approved authority binding (kerf/trim/stock) — no default bar.
            let solverProfiles: Profile[];
            let job: CuttingJob;
            if (runMode === 'production') {
                if (!user?.id || !poseId || revision < 1) {
                    throw new Error('A saved, authenticated position revision is required for a production run. Use inventory-free simulation otherwise.');
                }
                if (!authority) throw new Error(authorityError ?? 'Approved manufacturing authority is still resolving for this revision; retry in a moment.');
                // Fresh stock versions at production boundary — fail closed on drift vs acknowledgement.
                const liveVersions = await fetchOwnedStockVersions(user.id);
                const productionReadiness = assessStockReadiness({
                    stockReservation,
                    workflowIdentity,
                    bom,
                    currentStockVersions: liveVersions.error ? null : liveVersions.versions,
                    currentStockVersionsError: liveVersions.error,
                    requireCurrentStockVersions: true,
                });
                if (!productionReadiness.ready) {
                    throw new Error(`Owned stock is not ready for production: ${productionReadiness.issues.map(issue => issue.message).join(' ')}`);
                }
                const resolved = resolveApprovedSolverInputs(
                    profiles,
                    authority,
                    stockSelection,
                    availableBarsByProfileLength,
                    { requirePhysicalBars: true },
                );
                if (!resolved.ok) throw new Error(resolved.issues.map(issue => issue.message).join(' '));
                // Fail closed: every production binding must carry an integer bar count for the selected length.
                for (const [profileId, binding] of Object.entries(resolved.stockByProfile)) {
                    if (!Number.isInteger(binding.availableBars) || (binding.availableBars as number) < 0) {
                        throw new Error(`Profile ${profileId} has no physical bar count at ${binding.stockLengthMm} mm — production packing blocked.`);
                    }
                }
                solverProfiles = resolved.profiles;
                job = {
                    components,
                    profiles: solverProfiles,
                    stockByProfile: resolved.stockByProfile,
                    systemPackId: currentProject.systemPackId ?? undefined,
                    poseQuantity: currentProject.quantity ?? 1,
                };
            } else {
                // Explicit inventory-free simulation: approved machining/stock when resolvable,
                // otherwise platform defaults + catalogue bar length, labelled as such in the UI.
                // Simulation does not pass finite owned bar counts (inventory-free).
                const resolved = authority ? resolveApprovedSolverInputs(profiles, authority, stockSelection) : null;
                if (resolved?.ok) {
                    solverProfiles = resolved.profiles;
                    job = {
                        components,
                        profiles: solverProfiles,
                        stockByProfile: resolved.stockByProfile,
                        systemPackId: currentProject.systemPackId ?? undefined,
                        poseQuantity: currentProject.quantity ?? 1,
                    };
                } else {
                    solverProfiles = profiles.map(profile => ({
                        ...profile,
                        specifications: {
                            ...(profile.specifications ?? {}),
                            sawKerf: PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm,
                            barEndTrim: PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm,
                        },
                    }));
                    job = {
                        components,
                        profiles: solverProfiles,
                        defaultStockLength: 6000,
                        systemPackId: currentProject.systemPackId ?? undefined,
                        poseQuantity: currentProject.quantity ?? 1,
                    };
                }
            }
            // Algorithm selection stays rule-based inside the solver (AICS-001 / FP-025A): the
            // operator never picks it here, so nothing on this page can present a choice as authority.
            const solverConfig: AdaptiveSolverConfig = { maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } };
            const optimizationResult: OptimizationResult = await new AdaptiveSolver(solverConfig).solve(job, solverProfiles);
            if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current || runProject !== activeProjectRef.current) return;
            const resultValidation = validateOptimizationReconciliation(optimizationResult, { ...runProject, components });
            if (!resultValidation.valid) throw new Error(resultValidation.errors[0]?.message ?? 'Optimization result is invalid.');

            if (runMode === 'simulation') {
                // Simulation is not manufacturing truth: local display only.
                setSimulationResult(optimizationResult);
                return;
            }

            if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current || runProject !== activeProjectRef.current) return;

            // Server-stamped evidence only — client JSON on positions_v2.optimization is not convert-eligible.
            const recorded = await recordOptimizationEvidence({
                positionId: poseId!,
                expectedRevision: revision,
                designRevision: revision,
                bom,
                optimizationResult,
                ruleVersion: bom?.qualification?.ruleVersion ?? null,
                // Design BOM is per-window; evidence ledger is design × pose quantity (multiset).
                poseQuantity: currentProject.quantity ?? 1,
            });
            if (!recorded.ok) {
                throw new Error(recorded.error);
            }
            if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current || runProject !== activeProjectRef.current) return;
            alignShellProject({ ...runProject, components, status: 'optimized', updatedAt: new Date() });
            setSimulationResult(null);
            setOptimizationResult(optimizationResult);
            if (!completeStep('optimization')) throw new Error('Optimization evidence could not be verified.');

        } catch (err) {
            if (!mountedRef.current || runId !== activeRunRef.current || runProjectIdentity !== projectIdentityRef.current) return;
            console.error('[OptimizationPage] Optimization failed:', err);
            if (mode === 'production') invalidateStep('optimization');
            setOptimizationError(err instanceof Error ? err.message : 'Optimization failed. Review the design and retry.');
        } finally {
            if (runId === activeRunRef.current) {
                submissionLockedRef.current = false;
                if (mountedRef.current) setIsOptimizing(false);
            }
        }
    }, [currentProject, profiles, poseId, completeStep, setOptimizationResult, alignShellProject, user?.id, invalidateStep, projectIdentity, bom, workflowIdentity, stockReservation, systemPackForGate, mode, authority, authorityError, stockSelection, availableBarsByProfileLength, revision]);

    const validOptimization = validateOptimizationReconciliation(optimizationResult, completedProject).valid;
    const displayedResult = mode === 'simulation' && simulationResult ? simulationResult : optimizationResult;
    const actualBars = useMemo(() => (displayedResult ? barsByProfile(displayedResult.cuttingPlan) : null), [displayedResult]);
    const productionBlocked = mode === 'production' && (!authority || inputIssues.length > 0 || !readiness.ready);

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
            <div className="flex items-start sm:items-center justify-center h-full min-h-0 overflow-y-auto bg-gradient-to-br from-slate-950 to-slate-900 p-3 sm:p-6">
                <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 space-y-6">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-amber-200">
                            {optimizationValidation.errors.length > 0 ? 'Optimization prerequisites' : 'Optimization'}
                        </h2>
                    </div>
                    <ManufacturingApprovalPanel />
                    <WorkflowValidationGate
                        result={optimizationValidation}
                        targetStepLabel="Optimization"
                        onGoBack={() => {
                            const projId = projectId ?? currentProject?.id;
                            const posId = poseId ?? projId;
                            if (projId && posId) {
                                void navigate(`/fabricator/studio/projects/${projId}/positions/${posId}/bom`);
                            } else {
                                void navigate(fabricatorRoutes.studioProjects());
                            }
                        }}
                        backLabel="Review BOM"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            <p className="px-3 py-2 text-xs text-slate-400">
              Cut plan for pose quantity {currentProject?.quantity ?? 1} (design ledger × N). Project optimization still pools across positions; verify inventory before production.
            </p>
            <Suspense fallback={LoadingFallback}>
                <OptimizationCockpit
                    result={displayedResult}
                    requiredProfiles={bom?.profiles}
                    stockProfiles={profiles}
                    algorithmLabel={null}
                    authority={null}
                >
                    {mode === 'simulation' && simulationResult && (
                        <p role="status" data-testid="simulation-banner" className="mx-4 mb-2 rounded border border-sky-500/40 bg-sky-950/40 p-2 text-xs text-sky-200">
                            Inventory-free simulation — not production or CNC authority. No evidence was recorded and the optimization step is not complete.
                        </p>
                    )}
                    <OptimizationSolverInputsPanel
                        mode={mode}
                        onModeChange={setMode}
                        stockOptionsByProfile={stockOptionsByProfile}
                        stockSelectionByProfile={stockSelection}
                        onStockSelectionChange={(profileId, mm) => setStockSelection(prev => ({ ...prev, [profileId]: mm }))}
                        machining={authority ? { kerfMm: authority.manufacturingSettings.sawKerfMm, trimMm: authority.manufacturingSettings.trimCutMm } : null}
                        authorityError={authorityError}
                        inputIssues={inputIssues}
                        readiness={mode === 'production' ? readiness : null}
                        actualBarsByProfile={actualBars}
                        disabled={isOptimizing}
                    />
                    <OptimizationEqualizer
                        userId={user?.id || 'guest'}
                        profiles={profiles}
                        tier3ManufacturingPath
                        runLabel={mode === 'simulation' ? 'Run inventory-free simulation' : 'Run production optimization'}
                        runDisabled={isOptimizing || productionBlocked}
                        onComplete={(e) => void handleOptimizationComplete(e)}
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
                    <div className="p-3 space-y-3">
                        <YilmazExportActionPanel positionId={poseId} />
                        <div className="flex flex-wrap justify-end gap-3">
                            <button type="button" disabled={isOptimizing || isExporting} className="px-4 py-2 border border-amber-600 text-amber-200 text-sm rounded disabled:opacity-50"
                                onClick={async () => {
                                    if (!currentProject || !optimizationResult) return;
                                    setIsExporting(true);
                                    try {
                                        const { PDFExportService } = await import('@/modules/reporting/PDFExportService');
                                        const branding = { companyName: 'ALMONA' };
                                        const blob = await new PDFExportService(branding).generateCuttingListPDF(currentProject, optimizationResult, { branding });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `cut-list-${currentProject.posNumber || currentProject.id}.pdf`;
                                        link.click();
                                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                                    } catch (error) {
                                        setOptimizationError(error instanceof Error ? error.message : 'Cut-list PDF export failed.');
                                    } finally { setIsExporting(false); }
                                }}>
                                {isExporting ? 'Generating PDF…' : 'Download cut-list PDF'}
                            </button>
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
                    </div>
                )}
            </Suspense>
        </div>
    );
};
