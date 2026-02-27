import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { useWorkflowStore } from '@/store/workflowStore';
import type { MeasurementData } from '@/types/fabricator';
import { lazyRetry } from '@/utils/lazyImport';
import React, { Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const SmartMeasuringInterface = lazyRetry(
    () => import('@/components/fabricator/SmartMeasuringInterface').then((m) => ({
        default: m.SmartMeasuringInterface,
    })),
    'SmartMeasuringInterface'
);

export const MeasuringPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const { setMeasurementData, completeStep, measurementData } = useWorkflowStore();

    const handleMeasurementComplete = (data: MeasurementData) => {
        setMeasurementData(data);
        completeStep('measuring');
        if (projectId && poseId) {
            navigate(fabricatorRoutes.poseDesign(projectId, poseId));
        } else {
            navigate(projectId ? `/fabricator/workflow/design/${projectId}` : '/fabricator/workflow/design');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-950">
            <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
                </div>
            }>
                <SmartMeasuringInterface
                    onComplete={handleMeasurementComplete}
                    initialData={measurementData}
                />
            </Suspense>
        </div>
    );
};
