import { PoseLayoutPreview } from '@/components/fabricator/project/PoseLayoutPreview';
import { useAuth } from '@/context/AuthContext';
import { useDeletePose, useProjectPositions, useUpsertPose } from '@/hooks/useFabricatorQueries';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import { persistenceErrorMessage } from '@/lib/supabase/fabricatorClientV2';
import { useWorkflowStore } from '@/store/workflowStore';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import type { MeasurementData, WindowUnit } from '@/types/fabricator';
import { lazyRetry } from '@/utils/lazyImport';
import { ChevronDown } from 'lucide-react';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const SmartMeasuringInterface = lazyRetry(
    () => import('@/components/fabricator/SmartMeasuringInterface').then((m) => ({
        default: m.SmartMeasuringInterface,
    })),
    'SmartMeasuringInterface'
);

export function unitFromMeasurement(
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
            ...(base?.glazing ?? {}),
            type: data.glazingType ?? (base?.glazing as { type?: string } | undefined)?.type,
            color: data.glassColor ?? (base?.glazing as { color?: string } | undefined)?.color,
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

export function nextPoseNumber(poses: WindowUnit[]): string {
    const numericPositions = poses
        .map(candidate => Number(candidate.posNumber))
        .filter(value => Number.isInteger(value) && value > 0);
    return String((numericPositions.length ? Math.max(...numericPositions) : poses.length) + 1);
}

export function nextPoseDraft(
    base: WindowUnit,
    data: MeasurementData,
    projectId: string,
    poseId: string,
    posNumber: string,
): WindowUnit {
    const now = new Date();
    return {
        ...unitFromMeasurement(base, data, projectId, poseId, posNumber),
        posNumber,
        status: 'measuring',
        createdAt: now,
        updatedAt: now,
        positionMeta: {
            buildingBlock: base.positionMeta?.buildingBlock,
        },
        optimization: null,
        components: [],
        hardware: [],
    };
}

export const MeasuringPage: React.FC = () => {
    const { projectId, poseId } = useParams<{ projectId?: string; poseId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { setMeasurementData, completeStep, currentProject: pose } = useWorkflowStore();
    const siblings = useProjectPositions(projectId);
    const upsertPose = useUpsertPose();
    const deletePose = useDeletePose();
    /** Pose layout strip — closed by default so small screens keep measuring form in view */
    const [poseLayoutOpen, setPoseLayoutOpen] = useState(false);
    const layoutPoses = useMemo(() => {
        if (!pose) return siblings;
        const index = siblings.findIndex(candidate => candidate.id === pose.id);
        if (index < 0) return [...siblings, pose];
        return siblings.map(candidate => candidate.id === pose.id ? pose : candidate);
    }, [pose, siblings]);
    const activePoseSummary = useMemo(() => {
        const w = pose?.overallWidth;
        const h = pose?.overallHeight;
        const dims = Number(w) > 0 && Number(h) > 0
            ? `${Math.round(Number(w))} × ${Math.round(Number(h))} mm`
            : 'Not measured';
        return `Pose ${pose?.posNumber || '1'} · ${dims} · ${layoutPoses.length} pose${layoutPoses.length === 1 ? '' : 's'}`;
    }, [pose, layoutPoses.length]);

    const persistPose = useCallback(async (data: MeasurementData, targetPoseId: string, posNumber: string) => {
        if (!projectId || !user?.id) throw new Error('Not authenticated');
        const unit = unitFromMeasurement(pose ?? null, data, projectId, targetPoseId, posNumber);
        return upsertPose.mutateAsync({ windowUnit: unit, grid: data.grid as Record<string, unknown> | undefined });
    }, [pose, projectId, user?.id, upsertPose]);

    const handleMeasurementComplete = async (data: MeasurementData) => {
        if (!projectId || !poseId) {
            setMeasurementData(data);
            completeStep('measuring');
            navigate('/fabricator/workflow/design');
            return;
        }
        try {
            const posNumber = pose?.posNumber || String(siblings.length || 1);
            const result = await persistPose(data, poseId, posNumber);
            setMeasurementData(data);
            completeStep('measuring');
            toast.success(`Pose ${posNumber} saved: ${data.width} × ${data.height} mm`);
            navigate(fabricatorRoutes.poseDesign(result.projectId, result.poseId));
        } catch (err) {
            toast.error(`Failed to save pose: ${persistenceErrorMessage(err)}`);
        }
    };

    const handleSaveAndNext = async (data: MeasurementData) => {
        if (!projectId || !poseId || !user?.id) return;
        try {
            const posNumber = pose?.posNumber || String(siblings.length || 1);
            await persistPose(data, poseId, posNumber);
            setMeasurementData(data);
            completeStep('measuring');
            if (!pose) throw new Error('Authoritative position is unavailable');
            const newPositionNumber = nextPoseNumber(layoutPoses);
            const draft = nextPoseDraft(
                pose,
                data,
                projectId,
                crypto.randomUUID(),
                newPositionNumber,
            );
            const created = await upsertPose.mutateAsync({
                windowUnit: draft,
                grid: draft.grid as Record<string, unknown> | undefined,
                selectedPreset: draft.presetId,
            });
            toast.success(`Pose ${posNumber} saved. Pose ${newPositionNumber} is ready to measure.`);
            navigate(fabricatorRoutes.poseMeasuring(created.projectId, created.poseId));
        } catch (err) {
            toast.error(`Failed to add next pose: ${persistenceErrorMessage(err)}`);
        }
    };

    const handleDuplicatePose = useCallback(async (id: string) => {
        if (!projectId) return;
        const source = layoutPoses.find((candidate) => candidate.id === id);
        if (!source) return;
        try {
            const newId = crypto.randomUUID();
            const posNumber = nextPoseNumber(layoutPoses);
            const created = await upsertPose.mutateAsync({
                windowUnit: {
                    ...source,
                    id: newId,
                    projectId,
                    posNumber,
                    status: 'measuring',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    optimization: null,
                },
                grid: source.grid as Record<string, unknown> | undefined,
                selectedPreset: source.presetId,
            });
            toast.success(`Pose ${posNumber} duplicated`);
            navigate(fabricatorRoutes.poseMeasuring(created.projectId, created.poseId));
            setPoseLayoutOpen(false);
        } catch (err) {
            toast.error(`Duplicate failed: ${persistenceErrorMessage(err)}`);
        }
    }, [layoutPoses, navigate, projectId, upsertPose]);

    const handleDeletePose = useCallback(async (id: string) => {
        if (!projectId) return;
        if (layoutPoses.length <= 1) {
            toast.error('Keep at least one pose in the project.');
            return;
        }
        const source = layoutPoses.find((candidate) => candidate.id === id);
        const label = source?.posNumber || 'this pose';
        if (!window.confirm(`Delete pose ${label}? This cannot be undone.`)) return;
        try {
            await deletePose.mutateAsync(id);
            toast.success(`Pose ${label} deleted`);
            if (id === poseId) {
                const fallback = layoutPoses.find((candidate) => candidate.id !== id);
                if (fallback) {
                    navigate(fabricatorRoutes.poseMeasuring(projectId, fallback.id));
                } else {
                    navigate(fabricatorRoutes.studioProject(projectId));
                }
            }
            setPoseLayoutOpen(false);
        } catch (err) {
            toast.error(`Delete failed: ${persistenceErrorMessage(err)}`);
        }
    }, [deletePose, layoutPoses, navigate, poseId, projectId]);

    const poseGlazing = pose?.glazing && typeof pose.glazing === 'object'
        ? (pose.glazing as { type?: string; color?: string })
        : undefined;
    // Preserve raw color/glazing; SmartMeasuringInterface seeds suggestions and requires Confirm.
    const normalizedPoseColor = pose?.color?.trim() || undefined;
    const normalizedGlazingType = poseGlazing?.type?.trim() || undefined;
    const normalizedGlassColor = poseGlazing?.color?.trim() || undefined;
    const initialData: MeasurementData | undefined = pose
        ? {
            width: String(pose.overallWidth),
            height: String(pose.overallHeight),
            windowType: !pose.type || pose.type === 'window' ? 'sliding_window_2sash' : pose.type,
            color: normalizedPoseColor,
            glazingType: normalizedGlazingType,
            glassColor: normalizedGlassColor,
            systemPackId: pose.systemPackId,
            measurementMode: pose.measurementMode ?? 'manufacturing',
            wallDeduction: '0',
            flatNumber: pose.positionMeta?.flatNumber,
            buildingBlock: pose.positionMeta?.buildingBlock,
            floor: pose.positionMeta?.floor,
            unitOrApartment: pose.positionMeta?.unitOrApartment,
            elevation: pose.positionMeta?.elevation,
            roomOrZone: pose.positionMeta?.roomOrZone,
            windowIndex: pose.positionMeta?.windowIndex,
            remarks: pose.positionMeta?.remarks,
            grid: pose.grid && Number(pose.grid.cols) > 0 && Number(pose.grid.rows) > 0
              ? pose.grid
              : undefined,
            presetId: pose.presetId,
        }
        : undefined;

    if (!projectId || !poseId) return <div role="alert" className="p-8 text-red-300">Authoritative project and position identifiers are required.</div>;

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-950">
            <Collapsible
                open={poseLayoutOpen}
                onOpenChange={setPoseLayoutOpen}
                className="shrink-0 border-b border-amber-600/20"
            >
                <div className="px-2 py-1 sm:px-4 sm:py-2.5">
                    <CollapsibleTrigger
                        type="button"
                        className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 sm:py-1 text-left hover:bg-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 min-h-9"
                        aria-label={poseLayoutOpen ? 'Hide project pose layout' : 'Show project pose layout'}
                    >
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-xs sm:text-sm font-semibold text-amber-200">
                                Pose {pose?.posNumber || '1'}
                                <span className="ml-1.5 font-mono font-normal text-[10px] text-slate-500 sm:hidden">
                                    {activePoseSummary}
                                </span>
                            </h2>
                            <p className="hidden sm:block truncate font-mono text-[11px] text-slate-500">
                                {activePoseSummary}
                            </p>
                        </div>
                        <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-amber-500/80 transition-transform ${poseLayoutOpen ? 'rotate-180' : ''}`}
                            aria-hidden
                        />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2 pb-1 data-[state=closed]:animate-none">
                        <p className="mb-2 hidden text-xs text-slate-500 sm:block">
                            Width and height for this pose are saved on the position record and shown in the project layout.
                        </p>
                        <div className="max-h-[40vh] overflow-y-auto overscroll-contain sm:max-h-none">
                            <PoseLayoutPreview
                                poses={layoutPoses}
                                activeId={poseId}
                                compact
                                onSelect={(id) => {
                                    if (projectId) navigate(fabricatorRoutes.poseMeasuring(projectId, id));
                                    setPoseLayoutOpen(false);
                                }}
                                onEdit={(id) => {
                                    if (projectId) navigate(fabricatorRoutes.poseMeasuring(projectId, id));
                                    setPoseLayoutOpen(false);
                                }}
                                onDuplicate={(id) => { void handleDuplicatePose(id); }}
                                onDelete={(id) => { void handleDeletePose(id); }}
                                onAdd={undefined}
                            />
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <Suspense fallback={
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
                    </div>
                }>
                    <SmartMeasuringInterface
                        key={poseId ?? 'new'}
                        onMeasurementComplete={handleMeasurementComplete}
                        onSaveAndNextPose={handleSaveAndNext}
                        initialData={initialData}
                        systemPackId={pose?.systemPackId}
                        poseLabel={`Pose ${pose?.posNumber || '1'}`}
                    />
                </Suspense>
            </div>
        </div>
    );
};
