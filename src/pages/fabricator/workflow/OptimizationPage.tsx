import { useAuth } from '@/context/AuthContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useWorkflowStore } from '@/store/workflowStore';
import { lazyRetry } from '@/utils/lazyImport';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { Suspense, useMemo } from 'react';
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
    const { projectId } = useParams<{ projectId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        currentProject,
        completeStep,
        setOptimizationResult
    } = useWorkflowStore();

    // ✅ GOLD-TIER: Resolve profiles from system pack
    const profiles = useMemo(() => {
        if (!currentProject?.systemPackId) return [];

        const systemPack = SYSTEM_PACKS.find(
            pack => pack.meta.id === currentProject.systemPackId
        );

        return systemPack?.profiles || [];
    }, [currentProject?.systemPackId]);

    // ✅ GOLD-TIER: Error handling for missing data
    const hasRequiredData = currentProject !== null;

    // ✅ GOLD-TIER: Navigation with smooth transition
    const handleOptimizationComplete = (result: any) => {
        setOptimizationResult(result);
        completeStep('optimization');

        // Smooth transition delay for visual feedback
        setTimeout(() => {
            navigate(
                projectId
                    ? `/fabricator/workflow/inventory/${projectId}`
                    : '/fabricator/workflow/inventory'
            );
        }, 100);
    };

    // ✅ GOLD-TIER: Premium loading state
    const LoadingFallback = (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Loading optimization controls...</p>
            </div>
        </div>
    );

    // ✅ GOLD-TIER: Error state with actionable guidance
    if (!hasRequiredData) {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
                <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-amber-200">Design Required</h2>
                    <p className="text-slate-400">
                        Please complete the design step before proceeding to optimization.
                    </p>
                    <button
                        onClick={() => navigate('/fabricator/workflow/design')}
                        className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-amber-700 transition-all duration-200 transform hover:scale-105"
                    >
                        Go to Design
                    </button>
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
                </div>
            </Suspense>
        </div>
    );
};
