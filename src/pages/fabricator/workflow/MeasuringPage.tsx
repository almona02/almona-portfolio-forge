import { PoseLayoutPreview } from '@/components/fabricator/project/PoseLayoutPreview';
import { useAuth } from '@/context/AuthContext';
import { usePose, useProjectPositions, useUpsertPose } from '@/hooks/useFabricatorQueries';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { persistenceErrorMessage } from '@/lib/supabase/fabricatorClientV2';
import { useWorkflowStore } from '@/store/workflowStore';
import type { MeasurementData, WindowUnit } from '@/types/fabricator';
import { lazyRetry } from '@/utils/lazyImport';
import React, { Suspense, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const SmartMeasuringInterface = lazyRetry(
    () => import('@/components/fabricator/SmartMeasuringInterface').then((m) => ({
        default: m.SmartMeasuringInterface,
    })),
    'SmartMeasuringInterface'
);

function unitFromMeasurement(
    base: WindowUnit | null,
    data: MeasurementData,
    projectId: string,
    poseId: string,
    posNumber: string,
): WindowUnit {
    const width = data.manufacturingWidth ?? (Number(data.width) || 0);
    const height = data.manufacturingHeight ?? (Number(data.height) || 0);
    const now = new Date();
    return {
        id: poseId,
        orderNumber: base?.orderNumber ?? '',
        posNumber,
        type: data.windowType || base?.type || 'window',
        components: base?.components ?? [],
        overallWidth: width,
        overallHeight: height,
        color: data.color || base?.color || '#FFFFFF',
        glazing: {
            type: data.glazingType,
            color: data.glassColor,
            ...(base?.glazing ?? {}),
        },
        hardware: base?.hardware ?? [],
        status: 'draft',
        optimization: base?.optimization ?? null,
        createdAt: base?.createdAt ?? now,
        updatedAt: now,
        customer: base?.customer,
        projectCode: base?.projectCode,
        projectId,
        systemPackId: data.systemPackId || base?.systemPackId,
        quantity: base?.quantity ?? 1,
        positionMeta: {
            ...(base?.positionMeta ?? {}),
            flatNumber: data.flatNumber,
            buildingBlock: data.buildingBlock,
            floor: data.floor,
            unitOrApartment: data.unitOrApartment,
            elevation: data.elevation,
            roomOrZone: data.roomOrZone,
            windowIndex: data.windowIndex,
            remarks: data.remarks,
        },
        measurementMode: data.measurementMode,
        grid: data.grid ?? base?.grid,
        presetId: data.presetId ?? base?.presetId,
    } as WindowUnit;
}

export const MeasuringPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { setMeasurementData, completeStep, measurementData } = useWorkflowStore();
    const { data: pose, isLoading: loadingPose } = usePose(poseId);
    const siblings = useProjectPositions(projectId);
    const upsertPose = useUpsertPose();

    const persistPose = useCallback(async (data: MeasurementData, targetPoseId: string, posNumber: string) => {
        if (!projectId || !user?.id) throw new Error('Not authenticated');
        const unit = unitFromMeasurement(pose ?? null, data, projectId, targetPoseId, posNumber);
        return upsertPose.mutateAsync({ windowUnit: unit, grid: data.grid as Record<string, unknown> | undefined });
    }, [pose, projectId, user?.id, upsertPose]);

    const handleMeasurementComplete = async (data: MeasurementData) => {
        setMeasurementData(data);
        completeStep('measuring');
        if (!projectId || !poseId) {
            navigate('/fabricator/workflow/design');
            return;
        }
        try {
            const posNumber = pose?.posNumber || String(siblings.length || 1);
            const result = await persistPose(data, poseId, posNumber);
            toast.success(`Pose ${posNumber} saved: ${data.width} × ${data.height} mm`);
            navigate(fabricatorRoutes.poseDesign(result.projectId, result.poseId));
        } catch (err) {
            toast.error(`Failed to save pose: ${persistenceErrorMessage(err)}`);
        }
    };

    const handleSaveAndNext = async (data: MeasurementData) => {
        setMeasurementData(data);
        completeStep('measuring');
        if (!projectId || !poseId || !user?.id) return;
        try {
            const posNumber = pose?.posNumber || String(siblings.length || 1);
            const saved = await persistPose(data, poseId, posNumber);
            const nextNum = String(Math.max(siblings.length, Number(posNumber) || siblings.length) + 1);
            const nextId = crypto.randomUUID();
            const nextUnit = unitFromMeasurement(
                { ...(pose ?? {} as WindowUnit), components: [], overallWidth: 1200, overallHeight: 1400, id: nextId, posNumber: nextNum, status: 'measuring' },
                {
                    ...data,
                    width: '1200',
                    height: '1400',
                    manufacturingWidth: 1200,
                    manufacturingHeight: 1400,
                    flatNumber: '',
                    windowIndex: '',
                    remarks: '',
                },
                saved.projectId,
                nextId,
                nextNum,
            );
            nextUnit.components = [];
            const created = await upsertPose.mutateAsync({ windowUnit: nextUnit });
            toast.success(`Pose ${posNumber} saved. Measuring pose ${nextNum}.`);
            navigate(fabricatorRoutes.poseMeasuring(created.projectId, created.poseId));
        } catch (err) {
            toast.error(`Failed to add next pose: ${persistenceErrorMessage(err)}`);
        }
    };

    const initialData: MeasurementData | undefined = pose
        ? {
            width: String(pose.overallWidth || measurementData?.width || 1200),
            height: String(pose.overallHeight || measurementData?.height || 1400),
            windowType: pose.type || measurementData?.windowType || 'sliding_window_2sash',
            color: pose.color,
            glazingType: 'type' in (pose.glazing ?? {}) ? (pose.glazing as { type?: string }).type : undefined,
            glassColor: 'color' in (pose.glazing ?? {}) ? (pose.glazing as { color?: string }).color : undefined,
            systemPackId: pose.systemPackId,
            measurementMode: pose.measurementMode ?? 'manufacturing',
            wallDeduction: '0',
            flatNumber: pose.positionMeta?.flatNumber,
            floor: pose.positionMeta?.floor,
            elevation: pose.positionMeta?.elevation,
            remarks: pose.positionMeta?.remarks,
            grid: pose.grid,
            presetId: pose.presetId,
        }
        : measurementData ?? undefined;

    return (
        <div className="flex flex-col h-full bg-slate-950">
            <div className="px-4 pt-4 pb-2 border-b border-amber-600/20">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                        <h2 className="text-sm font-semibold text-amber-200">
                            Measuring — Pose {pose?.posNumber || '1'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            Width and height for this pose are saved on the position record and shown in the project layout.
                        </p>
                    </div>
                </div>
                <PoseLayoutPreview
                    poses={siblings.length ? siblings : (pose ? [pose] : [])}
                    activeId={poseId}
                    compact
                    onSelect={(id) => {
                        if (projectId) navigate(fabricatorRoutes.poseMeasuring(projectId, id));
                    }}
                    onAdd={user?.id ? () => {
                        if (!pose) {
                            toast.error('Save this pose before adding another.');
                            return;
                        }
                        void handleSaveAndNext({
                            width: String(pose.overallWidth || 1200),
                            height: String(pose.overallHeight || 1400),
                            windowType: pose.type || 'window',
                            systemPackId: pose.systemPackId,
                            measurementMode: 'manufacturing',
                            manufacturingWidth: pose.overallWidth,
                            manufacturingHeight: pose.overallHeight,
                        });
                    } : undefined}
                />
            </div>
            <Suspense fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
                </div>
            }>
                {loadingPose ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
                    </div>
                ) : (
                <SmartMeasuringInterface
                    key={poseId ?? 'new'}
                    onMeasurementComplete={handleMeasurementComplete}
                    onSaveAndNextPose={handleSaveAndNext}
                    initialData={initialData}
                    systemPackId={pose?.systemPackId}
                    poseLabel={`Pose ${pose?.posNumber || '1'}`}
                />
                )}
            </Suspense>
        </div>
    );
};
