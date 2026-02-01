import { useWorkflowStore } from '@/store/workflowStore';
import { lazyRetry } from '@/utils/lazyImport';
import React, { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const EngineeringBayWrapper = lazyRetry(
    () => import('@/components/fabricator/EngineeringBayWrapper').then((m) => ({
        default: m.EngineeringBayWrapper,
    })),
    'EngineeringBayWrapper'
);

export const DesignPage: React.FC = () => {
    const { projectId } = useParams<{ projectId?: string }>();
    const navigate = useNavigate();
    const { completeStep } = useWorkflowStore();

    const _handleDesignComplete = () => {
        completeStep('design');
        navigate(projectId ? `/fabricator/workflow/preview3d/${projectId}` : '/fabricator/workflow/preview3d');
    };

    return (
        <div className="flex flex-col h-full">
            <Suspense fallback={
                <div className="flex items-center justify-center h-full bg-slate-950">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
                </div>
            }>
                <EngineeringBayWrapper />
            </Suspense>
        </div>
    );
};
