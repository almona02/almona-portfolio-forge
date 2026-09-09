import { ProductionCockpit } from '@/components/fabricator/cockpit/ProductionCockpit';
import { ProductionDocumentsPanel } from '@/components/fabricator/workflow/ProductionDocumentsPanel';
import { WorkflowValidationGate } from '@/components/fabricator/workflow/WorkflowValidationGate';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { validateStepTransition } from '@/lib/fabricator/validation/WorkflowValidator';
import { useWorkflowStore } from '@/store/workflowStore';
import { lazyRetry } from '@/utils/lazyImport';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { Suspense, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

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
 */
export const ProductionPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const {
        measurementData,
        currentProject,
        optimizationResult,
        bom,
        completeStep
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

    // ✅ GOLD-TIER: Generation state (reserved for future use)
    const [isGenerating, _setIsGenerating] = useState(false);

    // ✅ GOLD-TIER: Resolve profiles from system pack
    const profiles = useMemo(() => {
        if (!currentProject?.systemPackId) return [];

        const systemPack = SYSTEM_PACKS.find(
            pack => pack.meta.id === currentProject.systemPackId
        );

        return systemPack?.profiles || [];
    }, [currentProject?.systemPackId]);

    // ✅ GOLD-TIER: Error handling
    const hasRequiredData = currentProject !== null && optimizationResult !== null;

    // ✅ GOLD-TIER: Navigation handler
    const handleProductionComplete = () => {
        completeStep('production');

        // Smooth transition
        setTimeout(() => {
            navigate(fabricatorRoutes.studioProductionQuality());
        }, 100);
    };

    // ✅ GOLD-TIER: Premium loading state
    const LoadingFallback = (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Loading production command center...</p>
            </div>
        </div>
    );

    // ✅ P3.1.4: WorkflowValidationGate when production prerequisites missing
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
                <div className="p-2 flex justify-end">
                    <button
                        type="button"
                        onClick={handleProductionComplete}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded disabled:opacity-50"
                    >
                        {isGenerating ? 'Generating...' : 'Continue to Quality Control'}
                    </button>
                </div>
            </Suspense>
        </div>
    );
};
