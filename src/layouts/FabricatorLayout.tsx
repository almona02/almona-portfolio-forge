import { BosphorusWorkflowRibbon } from '@/components/fabricator/BosphorusWorkflowRibbon';
import { Box, Factory, Package, Ruler, Scissors, Settings, Zap } from 'lucide-react';
import React from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

const WORKFLOW_STEPS = [
    { id: 'measuring', name: 'Smart Measuring', description: 'Digital measurement capture', icon: Ruler },
    { id: 'design', name: 'Technical Design', description: 'Component specification', icon: Settings },
    { id: 'preview3d', name: '3D Preview', description: 'Visual model preview', icon: Box },
    { id: 'optimization', name: 'Cutting Optimization', description: 'Material optimization', icon: Scissors },
    { id: 'inventory', name: 'Inventory Check', description: 'Stock management', icon: Package },
    { id: 'production', name: 'Production Planning', description: 'Scheduling & machining', icon: Factory },
    { id: 'quality-control', name: 'Quality Control', description: 'Inspection & validation', icon: Zap },
];

export const FabricatorLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId?: string }>();

    // Extract current step from URL path (e.g., /fabricator/workflow/design -> design)
    const pathParts = location.pathname.split('/');
    const currentStepId = pathParts[pathParts.length - (projectId ? 2 : 1)] || 'measuring';

    const currentStepIndex = WORKFLOW_STEPS.findIndex(s => s.id === currentStepId);

    const handleStepChange = (stepId: string) => {
        // Preserve projectId in URL if it exists
        const route = projectId
            ? `/fabricator/workflow/${stepId}/${projectId}`
            : `/fabricator/workflow/${stepId}`;
        navigate(route);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950">
            {/* The Bosphorus Bridge Pattern UI - Always Visible */}
            <div className="w-full z-10">
                <BosphorusWorkflowRibbon
                    steps={WORKFLOW_STEPS}
                    activeStepId={currentStepId}
                    onStepChange={handleStepChange}
                    currentStepIndex={currentStepIndex}
                    totalSteps={WORKFLOW_STEPS.length}
                />
            </div>

            {/* Dynamic Content Area - Route Outlet */}
            <main className="flex-1 overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
};

export default FabricatorLayout;
