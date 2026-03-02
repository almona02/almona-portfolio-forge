import { ProductionDocumentsPanel } from '@/components/fabricator/workflow/ProductionDocumentsPanel';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { getPoseWorkflowPathForStage } from '@/lib/fabricator/workflow/workflowGraph';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { useWorkflowStore } from '@/store/workflowStore';
import { lazyRetry } from '@/utils/lazyImport';
import { AlertCircle, ClipboardList, Cpu, Loader2 } from 'lucide-react';
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
        currentProject,
        optimizationResult,
        completeStep
    } = useWorkflowStore();

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
        const qualityPath = projectId && poseId
            ? getPoseWorkflowPathForStage('quality-control', projectId, poseId)
            : '/fabricator/studio/production/quality';

        // Smooth transition
        setTimeout(() => {
            navigate(qualityPath);
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

    // ✅ GOLD-TIER: Error state with actionable guidance
    if (!hasRequiredData) {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
                <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-amber-200">
                        {!currentProject ? 'Project Required' : 'Optimization Required'}
                    </h2>
                    <p className="text-slate-400">
                        {!currentProject
                            ? 'Please complete the design step before proceeding to production.'
                            : 'Please complete the optimization step before generating production commands.'
                        }
                    </p>
                    <button
                        onClick={() => navigate(
                            !currentProject
                                ? (projectId && poseId
                                    ? getPoseWorkflowPathForStage('design', projectId, poseId)
                                    : fabricatorRoutes.studioProjects())
                                : (projectId && poseId
                                    ? getPoseWorkflowPathForStage('optimization', projectId, poseId)
                                    : fabricatorRoutes.studioProjects())
                        )}
                        className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-amber-700 transition-all duration-200 transform hover:scale-105"
                    >
                        {!currentProject ? 'Go to Design' : 'Go to Optimization'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <Suspense fallback={LoadingFallback}>
                <Tabs defaultValue="documents" className="flex-1 flex flex-col">
                    <div className="px-6 pt-4">
                        <TabsList className="bg-slate-900/60 border-amber-600/20 grid grid-cols-2 w-full max-w-sm">
                            <TabsTrigger value="documents" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
                                <ClipboardList className="w-3 h-3 mr-1" /> Documents
                            </TabsTrigger>
                            <TabsTrigger value="cnc" className="text-amber-300 data-[state=active]:text-amber-100 text-xs">
                                <Cpu className="w-3 h-3 mr-1" /> CNC / G-Code
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="documents" className="flex-1 p-6 overflow-auto">
                        <ProductionDocumentsPanel />
                    </TabsContent>

                    <TabsContent value="cnc" className="flex-1 overflow-auto">
                        <ProductionCommand
                            project={currentProject}
                            optimization={optimizationResult}
                            isGenerating={isGenerating}
                            profiles={profiles}
                        />
                    </TabsContent>
                </Tabs>

                {/* Continue button */}
                <div className="fixed bottom-8 right-8 z-50">
                    <button
                        onClick={handleProductionComplete}
                        disabled={isGenerating}
                        className="group relative px-8 py-4 bg-gradient-to-r from-green-500 via-green-600 to-green-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    Continue to Quality Control
                                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </>
                            )}
                        </span>
                        {!isGenerating && (
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        )}
                    </button>
                </div>
            </Suspense>
        </div>
    );
};
