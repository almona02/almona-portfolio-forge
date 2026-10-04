import { generateComponentsFromGrid } from '@/algorithms/smartDraw';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateDesign } from '@/lib/fabricator/ConstraintEngine';
import type { DesignCompleteHandler } from '@/lib/fabricator/engineering/designCompletion';
import { resolveSystemPackProfiles } from '@/lib/fabricator/engineering/resolveSystemPackProfiles';
import {
    createLayoutSuggestionAction,
    createSystemConversionAction,
    type PendingGeometryAction,
} from '@/lib/fabricator/engineering/systemGeometryCompatibility';
import { connectHardwareForWindowType } from '@/lib/fabricator/hardwareConnector';
import { Profile, WindowGrid, WindowUnit } from '@/types/fabricator';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
// We need to verify where this utility is located relative to the hook
// EngineeringBay was in src/components/fabricator/EngineeringBay.tsx
// mergeHardwareArrays was imported from './utils/hardwareMergingUtils' -> src/components/fabricator/utils/hardwareMergingUtils
import { transformWorkerResultToBOMData } from '@/components/fabricator/bom/utils/transformBOMResult';
import { useBOMCalculation } from '@/hooks/useBOMCalculation';
import { mergeHardwareArrays } from '../../components/fabricator/utils/hardwareMergingUtils';

export type { DesignCompletionPayload, DesignCompleteHandler } from '@/lib/fabricator/engineering/designCompletion';

interface UseEngineeringEngineProps {
    project: WindowUnit | null;
    profiles: Profile[];
    onDesignComplete: DesignCompleteHandler;
}

/**
 * FP-028 / D3: Identity token for BOM commits.
 * Late responses must match the still-current position/system/geometry/revision.
 */
export function buildBomRequestKey(
    unit: Pick<WindowUnit, 'id' | 'revision' | 'overallWidth' | 'overallHeight' | 'quantity' | 'presetId'>,
    systemPackId: string | null,
    grid: WindowGrid
): string {
    return JSON.stringify({
        id: unit.id,
        revision: unit.revision ?? null,
        systemPackId,
        overallWidth: unit.overallWidth,
        overallHeight: unit.overallHeight,
        quantity: unit.quantity ?? 1,
        presetId: unit.presetId ?? null,
        grid,
    });
}

export const useEngineeringEngine = ({
    project,
    profiles,
    onDesignComplete
}: UseEngineeringEngineProps) => {
    const { t } = useTranslation('fabricator');

    // --- State Management ---
    const [currentGrid, setCurrentGrid] = useState<WindowGrid>(
        project?.grid || { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] }
    );
    const [activeSystemPackId, setActiveSystemPackId] = useState<string | null>(project?.systemPackId || null);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(project?.presetId || null);
    const [error, setError] = useState<string | null>(null);
    const [pendingGeometryAction, setPendingGeometryAction] = useState<PendingGeometryAction | null>(null);

    // Sync state when the master project object changes
    useEffect(() => {
        if (project) {
            setCurrentGrid(project.grid || { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] });
            setActiveSystemPackId(project.systemPackId || null);
            setActiveTemplateId(project.presetId || null);
            setPendingGeometryAction(null);
        }
    }, [project]);

    // --- Derived State & Memos ---
    
    // Get system pack
    const systemPack = useMemo(() => {
        return activeSystemPackId 
            ? SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId) || null
            : null;
    }, [activeSystemPackId]);

    // Effective Profiles (prioritize system pack / catalog-derived profiles)
    const effectiveProfiles = useMemo(() => {
        const packProfiles =
            systemPack?.profiles && systemPack.profiles.length > 0
                ? systemPack.profiles
                : resolveSystemPackProfiles(systemPack);
        if (packProfiles.length > 0) {
            const systemProfileIds = new Set(packProfiles.map((p) => p.id));
            return [
                ...packProfiles,
                ...profiles.filter((p) => !systemProfileIds.has(p.id)),
            ];
        }
        return profiles;
    }, [systemPack, profiles]);

    // Selected Profiles (map codes to objects)
    const selectedProfiles = useMemo(() => {
        if (!project?.systemProfileSelections || !systemPack) {
            return effectiveProfiles;
        }

        const selections = project.systemProfileSelections;
        const mappedProfiles: Profile[] = [];
        const requiredRoles = ['frame', 'sash', 'glazing_bead'];

        // Helper to find and add profile
        const addProfile = (code: string | undefined, role: string) => {
             if (code) {
                const profile = effectiveProfiles.find(p => p.id === code || p.name === code);
                if (profile) {
                    mappedProfiles.push({ ...profile, profileRole: role as any });
                    return true;
                }
             }
             return false;
        };

        addProfile(selections.frameProfileCode, 'frame');
        addProfile(selections.sashProfileCode, 'sash');
        addProfile(selections.beadProfileCode, 'glazing_bead');

        // Add missing required profiles from system pack
        requiredRoles.forEach(role => {
            if (!mappedProfiles.some(p => p.profileRole === role)) {
                const roleProfile = systemPack.profiles?.find(p => p.profileRole === role);
                if (roleProfile) {
                    const matched = effectiveProfiles.find(p => 
                        p.id === roleProfile.id || 
                        (p.name === roleProfile.name && p.profileRole === role)
                    );
                    if (matched) {
                        mappedProfiles.push({ ...matched, profileRole: role as any });
                    }
                }
            }
        });

        return mappedProfiles.length > 0 ? mappedProfiles : effectiveProfiles;
    }, [project?.systemProfileSelections, effectiveProfiles, systemPack]);

    // Live Project (The Engine)
    const liveProject = useMemo<WindowUnit | null>(() => {
        if (!project) return null;

        const { components, hardware: generatedHardware } = generateComponentsFromGrid(
            project,
            currentGrid,
            selectedProfiles,
            activeSystemPackId,
            systemPack
        );

        const connectedHardware = connectHardwareForWindowType(
            { ...project, components },
            components,
            systemPack
        );

        const allHardware = mergeHardwareArrays(generatedHardware, connectedHardware);

        return {
            ...project,
            grid: currentGrid,
            components,
            hardware: allHardware,
            systemPackId: activeSystemPackId || undefined,
            presetId: activeTemplateId || undefined,
            updatedAt: new Date(),
        };
    }, [project, currentGrid, selectedProfiles, activeSystemPackId, activeTemplateId, systemPack]);

    // --- BOM Worker Integration (Phase 2) ---
    const { calculateBOM, isCalculating: isBOMCalculating } = useBOMCalculation();
    const [bomData, setBOMData] = useState<any | null>(null); // Type 'any' temporarily to match BOMData interface complexity
    const bomRequestKeyRef = useRef<string | null>(null);

    /**
     * FP-028 / D3: Depend on manufacturing identity string, not liveProject object
     * identity (updatedAt / new arrays must not clear or re-request BOM).
     */
    const bomRequestKey = useMemo(() => {
        if (!liveProject || !activeSystemPackId) return null;
        if (!liveProject.components || liveProject.components.length === 0) return null;
        return buildBomRequestKey(
            liveProject,
            activeSystemPackId,
            liveProject.grid ?? currentGrid
        );
    }, [liveProject, activeSystemPackId, currentGrid]);

    // Calculate BOM whenever manufacturing identity changes
    useEffect(() => {
        bomRequestKeyRef.current = bomRequestKey;

        if (!bomRequestKey || !liveProject || !activeSystemPackId) {
            setBOMData(null);
            return;
        }

        // Drop prior BOM immediately so a late A response cannot linger under B UI
        setBOMData(null);

        let cancelled = false;
        const requestKey = bomRequestKey;
        const requestSystemPackId = activeSystemPackId;
        const requestLiveProject = liveProject;
        const requestGrid = liveProject.grid ?? currentGrid;

        const runBOMCalculation = async () => {
            const currentSystemPack = SYSTEM_PACKS.find(p => p.meta.id === requestSystemPackId);
            const patternStub = {
                id: 'custom',
                name: 'Custom',
                gridSpec: requestGrid,
            } as any;

            try {
                const result = await calculateBOM(
                    requestLiveProject,
                    patternStub,
                    currentSystemPack as any
                );

                // FP-028 / D3: reject late commits after identity/system/grid changes
                if (cancelled || bomRequestKeyRef.current !== requestKey) {
                    return;
                }

                const transformed = transformWorkerResultToBOMData(
                    result,
                    currentSystemPack,
                    (key: string, defaultVal?: string) => t(key, defaultVal || '')
                );
                setBOMData(transformed);
            } catch (err) {
                if (cancelled || bomRequestKeyRef.current !== requestKey) {
                    return;
                }
                console.error('BOM Worker Error:', err);
            }
        };

        const timeoutId = setTimeout(() => {
            void runBOMCalculation();
        }, 50);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
        // liveProject/currentGrid captured when bomRequestKey changes; t used only for labels
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bomRequestKey, calculateBOM]);

    // --- Actions ---

    const updateGrid = useCallback((grid: WindowGrid) => {
        setPendingGeometryAction(null);
        // Manual canvas edits unbind the saved template identity
        setActiveTemplateId(null);
        setCurrentGrid(grid);
    }, []);

    /**
     * FP-028 / D2 + P5.2: System selection changes manufacturing identity only.
     * Never replace saved geometry with pack.defaultGrid.
     * When incompatible, queue an explicit conversion proposal.
     */
    const selectSystem = useCallback((systemId: string) => {
        setError(null);
        setActiveSystemPackId(systemId);

        const pack = SYSTEM_PACKS.find((p) => p.meta.id === systemId);
        if (!pack || !project) {
            setPendingGeometryAction(null);
            return;
        }

        const pending = createSystemConversionAction(
            pack,
            currentGrid,
            project.overallWidth,
            project.overallHeight
        );
        setPendingGeometryAction(pending);
        if (pending) {
            setError(pending.message);
        }
    }, [currentGrid, project]);

    const requestLayoutSuggestion = useCallback(() => {
        if (!project) {
            setError('Cannot suggest layout: project data is missing.');
            return;
        }
        const pending = createLayoutSuggestionAction(
            currentGrid,
            project.overallWidth,
            project.overallHeight,
            activeSystemPackId
        );
        if (!pending) {
            setError(null);
            setPendingGeometryAction(null);
            return;
        }
        setPendingGeometryAction(pending);
        setError(pending.message);
    }, [project, currentGrid, activeSystemPackId]);

    const applyPendingGeometryAction = useCallback(() => {
        if (!pendingGeometryAction?.canApply) {
            setPendingGeometryAction(null);
            setError(null);
            return;
        }
        setCurrentGrid(pendingGeometryAction.proposedGrid);
        setActiveTemplateId(null);
        setPendingGeometryAction(null);
        setError(null);
    }, [pendingGeometryAction]);

    const dismissPendingGeometryAction = useCallback(() => {
        setPendingGeometryAction(null);
        setError(null);
    }, []);

    const validate = useCallback((): boolean => {
        if (!liveProject) {
            setError('Cannot complete design: project data is missing.');
            return false;
        }
        if (!activeSystemPackId) {
            setError('Cannot complete design: select a system pack first.');
            return false;
        }
        if (!currentGrid?.cells?.length) {
            setError('Cannot complete design: the grid has no cells. Apply a pattern or draw the layout.');
            return false;
        }
        if (selectedProfiles.length === 0 && effectiveProfiles.length === 0) {
            setError('Cannot complete design: no frame/sash profiles resolved for this system pack.');
            return false;
        }
        if (liveProject.components.length === 0) {
            setError(
                'Cannot complete design: no cut components were generated. Check system pack profiles and grid layout.',
            );
            return false;
        }

        const validation = validateDesign(
            liveProject.overallWidth,
            liveProject.overallHeight,
            currentGrid,
            activeSystemPackId || 'generic'
        );

        if (!validation.isValid) {
            setError(validation.errors.join(' '));
            return false;
        }

        setError(null);
        // FP-028 / P5.3: persist grid + system + template with components
        onDesignComplete({
            components: liveProject.components,
            grid: currentGrid,
            systemPackId: activeSystemPackId,
            presetId: activeTemplateId,
        });
        return true;
    }, [
        liveProject,
        currentGrid,
        activeSystemPackId,
        activeTemplateId,
        onDesignComplete,
        selectedProfiles.length,
        effectiveProfiles.length,
    ]);


    
    // For handling preset selection externally or other grid updates that shouldn't reset system pack
    const applyGrid = useCallback((grid: WindowGrid, templateId?: string) => {
         setPendingGeometryAction(null);
         setCurrentGrid(grid);
         setActiveTemplateId(templateId ?? null);
    }, []);

    // For updates that might come from drafting
    const updateFromDrafting = useCallback((grid: WindowGrid, systemId?: string) => {
        setPendingGeometryAction(null);
        setCurrentGrid(grid);
        if (systemId) setActiveSystemPackId(systemId);
    }, []);

    return {
        // Data
        liveProject,
        currentGrid,
        activeSystemPackId,
        activeTemplateId,
        pendingGeometryAction,
        bomData,
        error,
        isCalculating: isBOMCalculating,
        // Actions
        actions: {
            updateGrid,
            selectSystem,
            requestLayoutSuggestion,
            applyPendingGeometryAction,
            dismissPendingGeometryAction,
            validate,
            setError,
            applyGrid,
            updateFromDrafting,
            setActiveSystemPackId
        }
    };
};
