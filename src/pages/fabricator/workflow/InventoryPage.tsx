import { useAuth } from '@/context/AuthContext';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { useWorkflowStore } from '@/store/workflowStore';
import { lazyRetry } from '@/utils/lazyImport';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { Suspense, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const InventoryDashboard = lazyRetry(
    () => import('@/components/fabricator/InventoryDashboard').then((m) => ({
        default: m.InventoryDashboard,
    })),
    'InventoryDashboard'
);

/**
 * GOLD-TIER INVENTORY PAGE
 * 
 * Features:
 * - Proper inventory data from system pack
 * - Error handling for missing data
 * - Loading states with premium UX
 * - User authentication integration
 * - Smooth navigation transitions
 */
export const InventoryPage: React.FC = () => {
    const { projectId } = useParams<{ projectId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { currentProject, completeStep } = useWorkflowStore();

    // ✅ GOLD-TIER: Resolve inventory from system pack
    const inventory = useMemo(() => {
        if (!currentProject?.systemPackId) return [];

        const systemPack = SYSTEM_PACKS.find(
            pack => pack.meta.id === currentProject.systemPackId
        );

        return systemPack?.profiles || [];
    }, [currentProject?.systemPackId]);

    // ✅ GOLD-TIER: Error handling
    const hasRequiredData = currentProject !== null;

    // ✅ GOLD-TIER: Navigation handler
    const handleInventoryComplete = () => {
        completeStep('inventory');

        // Smooth transition
        setTimeout(() => {
            navigate(
                projectId
                    ? `/fabricator/workflow/production/${projectId}`
                    : '/fabricator/workflow/production'
            );
        }, 100);
    };

    // ✅ GOLD-TIER: Premium loading state
    const LoadingFallback = (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900">
            <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Loading inventory dashboard...</p>
            </div>
        </div>
    );

    // ✅ GOLD-TIER: Error state
    if (!hasRequiredData) {
        return (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-950 to-slate-900 p-6">
                <div className="max-w-md w-full bg-slate-900/50 border border-amber-600/30 rounded-lg p-8 text-center space-y-4">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-amber-200">Project Required</h2>
                    <p className="text-slate-400">
                        Please complete the design and optimization steps before checking inventory.
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
        <div className="flex flex-col h-full">
            <Suspense fallback={LoadingFallback}>
                <InventoryDashboard
                    inventory={inventory}
                    project={currentProject}
                    userId={user?.id}
                />

                {/* ✅ GOLD-TIER: Continue button with premium styling */}
                <div className="fixed bottom-8 right-8 z-50">
                    <button
                        onClick={handleInventoryComplete}
                        className="group relative px-8 py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Continue to Production
                            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </span>
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                    </button>
                </div>
            </Suspense>
        </div>
    );
};
