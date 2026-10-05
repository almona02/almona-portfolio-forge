import { ProductionCockpit } from '@/components/fabricator/cockpit/ProductionCockpit';
import { ProductionDocumentsPanel } from '@/components/fabricator/workflow/ProductionDocumentsPanel';
import { WorkflowValidationGate } from '@/components/fabricator/workflow/WorkflowValidationGate';
import { catalogProfilesOrEmpty } from '@/lib/fabricator/catalog/CatalogResolver';
import { freezePositionRelease } from '@/lib/fabricator/positionRelease';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { validateStepTransition } from '@/lib/fabricator/validation/WorkflowValidator';
import { useWorkflowStore } from '@/store/workflowStore';
import { lazyRetry } from '@/utils/lazyImport';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { Suspense, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const ProductionCommand = lazyRetry(
    () => import('@/components/fabricator/ProductionCommand').then((m) => ({
        default: m.ProductionCommand,
    })),
    'ProductionCommand'
);

/**
 * GOLD-TIER PRODUCTION PAGE
 *
 * Features:
 * - Complete data flow from workflow store
 * - Error handling for missing optimization
 * - Loading states with premium UX
 * - System pack profile resolution
 * - Generation state management
 * - UP-18 release freeze before QC
 */
export const ProductionPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const {
        measurementData,
        currentProject,
        optimizationResult,
        bom,
        completeStep,
        workflowIdentity,
        stockReservation,
        setPositionRelease,
    } = useWorkflowStore();

    const productionValidation = useMemo(
        () =>
            validateStepTransition(
                {
                    measurementData,
                    currentProject,
                    bom,
                    optimizationResult,
                },
                'production'
            ),
        [measurementData, currentProject, bom, optimizationResult]
    );

    const [isGenerating, _setIsGenerating] = useState(false);
    const [isReleasing, setIsReleasing] = useState(false);
    const [releaseError, setReleaseError] = useState<string | null>(null);

    // UP-06: catalog profiles for the active pack only — no ROCK60/[0] substitute.
    const profiles = useMemo(
        () => catalogProfilesOrEmpty(currentProject?.systemPackId),
        [currentProject?.systemPackId],
    );

    const hasRequiredData = currentProject !== null && optimizationResult !== null;

    const handleProductionComplete = async () => {
        if (isReleasing || isGenerating) return;
        setReleaseError(null);

        if (!workflowIdentity) {
            setReleaseError('Load an authoritative position before releasing to the shop.');
            return;
        }
        if (!stockReservation) {
            setReleaseError('Acknowledge stock availability for this revision before release.');
            return;
        }

        setIsReleasing(true);
        try {
            const release = await freezePositionRelease({
                identity: workflowIdentity,
                bom,
                stockReservation,
                optimizationResult,
            });
            setPositionRelease(release);
            if (!completeStep('production')) {
                throw new Error('Workflow completion guard rejected production.');
            }
            toast.success('Position released for QC', {
                description: `Release ${release.releaseId.slice(0, 8)}… · R${release.revision}`,
            });
            const qcProjectId = workflowIdentity.projectId;
            const qcPoseId = workflowIdentity.positionId;
            void navigate(
                fabricatorRoutes.studioProductionQuality() +
                    `?${new URLSearchParams({ projectId: qcProjectId, poseId: qcPoseId })}`,
            );
        } catch (reason) {
            setReleaseError(reason instanceof Error ? reason.message : 'Release freeze failed.');
        } finally {
            setIsReleasing(false);
        }
    };

    const LoadingFallback = (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Loading production command center...</p>
            </div>
        </div>
    );

    if (!hasRequiredData || !productionValidation.valid) {
        const goBackTarget = !currentProject ? 'design' : 'optimization';
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
                <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 space-y-6">
                    <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-amber-200">
                            {!currentProject ? 'Project Required' : 'Optimization Required'}
                        </h2>
                    </div>
                    <WorkflowValidationGate
                        result={productionValidation}
                        targetStepLabel="Production"
                        onGoBack={() => {
                            const projId = projectId ?? currentProject?.id;
                            const posId = poseId ?? projId;
                            if (projId && posId) {
                                navigate(
                                    goBackTarget === 'design'
                                        ? fabricatorRoutes.poseDesign(projId, posId)
                                        : fabricatorRoutes.poseOptimization(projId, posId)
                                );
                            } else {
                                navigate(fabricatorRoutes.studioProjects());
                            }
                        }}
                        backLabel={goBackTarget === 'design' ? 'Go to Design' : 'Go to Optimization'}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Suspense fallback={LoadingFallback}>
                <ProductionCockpit
                    project={currentProject}
                    optimization={optimizationResult}
                    bom={bom}
                    documentsSlot={<ProductionDocumentsPanel />}
                    cncSlot={
                        <ProductionCommand
                            project={currentProject}
                            optimization={optimizationResult}
                            bom={bom}
                            isGenerating={isGenerating}
                            profiles={profiles}
                        />
                    }
                />
                <div className="p-2 flex flex-col items-end gap-2">
                    {releaseError ? (
                        <p role="alert" className="text-sm text-red-300 max-w-lg text-right">
                            {releaseError}
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500 max-w-lg text-right">
                            Manual production recording — freezes BOM, stock, and optimization for this
                            revision before QC. Does not claim CNC completion.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            void handleProductionComplete();
                        }}
                        disabled={isGenerating || isReleasing}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {isReleasing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Freezing release…
                            </>
                        ) : (
                            'Release & Continue to QC'
                        )}
                    </button>
                </div>
            </Suspense>
        </div>
    );
};
