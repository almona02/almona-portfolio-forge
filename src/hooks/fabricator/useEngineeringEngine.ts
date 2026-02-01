import { generateComponentsFromGrid } from '@/algorithms/smartDraw';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateDesign } from '@/lib/fabricator/ConstraintEngine';
import { connectHardwareForWindowType } from '@/lib/fabricator/hardwareConnector';
import { Profile, WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
// We need to verify where this utility is located relative to the hook
// EngineeringBay was in src/components/fabricator/EngineeringBay.tsx
// mergeHardwareArrays was imported from './utils/hardwareMergingUtils' -> src/components/fabricator/utils/hardwareMergingUtils
import { transformWorkerResultToBOMData } from '@/components/fabricator/bom/utils/transformBOMResult';
import { useBOMCalculation } from '@/hooks/useBOMCalculation';
import { mergeHardwareArrays } from '../../components/fabricator/utils/hardwareMergingUtils';

interface UseEngineeringEngineProps {
    project: WindowUnit | null;
    profiles: Profile[];
    onDesignComplete: (components: WindowComponent[]) => void;
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
    const [error, setError] = useState<string | null>(null);

    // Sync state when the master project object changes
    useEffect(() => {
        if (project) {
            setCurrentGrid(project.grid || { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] });
            setActiveSystemPackId(project.systemPackId || null);
        }
    }, [project]);

    // --- Derived State & Memos ---
    
    // Get system pack
    const systemPack = useMemo(() => {
        return activeSystemPackId 
            ? SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId) || null
            : null;
    }, [activeSystemPackId]);

    // Effective Profiles (prioritize system pack)
    const effectiveProfiles = useMemo(() => {
        if (systemPack?.profiles && systemPack.profiles.length > 0) {
            const systemProfileIds = new Set(systemPack.profiles.map(p => p.id));
            return [
                ...systemPack.profiles,
                ...profiles.filter(p => !systemProfileIds.has(p.id))
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
            updatedAt: new Date(),
        };
    }, [project, currentGrid, selectedProfiles, activeSystemPackId, systemPack]);

    // --- BOM Worker Integration (Phase 2) ---
    const { calculateBOM, isCalculating: isBOMCalculating } = useBOMCalculation();
    const [bomData, setBOMData] = useState<any | null>(null); // Type 'any' temporarily to match BOMData interface complexity

    // Calculate BOM whenever inputs change
    useEffect(() => {
        if (!liveProject || !liveProject.components || liveProject.components.length === 0) {
            setBOMData(null);
            return;
        }

        const runBOMCalculation = async () => {
            // Check for necessary data
            if (!activeSystemPackId) return;

            // Use the liveProject as is (it's already a WindowUnit)
            // Ideally we pass systemPack too
            const currentSystemPack = SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId);
            // Default pattern stub if missing (should be in project)
            const patternStub = { 
                id: 'custom', 
                name: 'Custom',
                gridSpec: currentGrid 
            } as any; 

            try {
                const result = await calculateBOM(
                    liveProject, 
                    patternStub, 
                    currentSystemPack as any // simplified cast
                );
                
                // Transform result for UI
                const transformed = transformWorkerResultToBOMData(
                    result, 
                    currentSystemPack, 
                    (key: string, defaultVal?: string) => t(key, defaultVal || '')
                );
                setBOMData(transformed);
                
            } catch (err) {
                console.error("BOM Worker Error:", err);
                // Fallback or error state could be set here
            }
        };

        const timeoutId = setTimeout(runBOMCalculation, 50); // Debounce slightly
        return () => clearTimeout(timeoutId);

        // eslint-disable-next-line react-hooks/exhaustive-deps -- currentGrid is intentionally excluded to prevent infinite loop; it's already a dependency of liveProject
    }, [liveProject, activeSystemPackId, calculateBOM, t]);

    // --- Actions ---

    const updateGrid = useCallback((grid: WindowGrid) => {
        setCurrentGrid(grid);
    }, []);

    const selectSystem = useCallback((systemId: string) => {
        setError(null);
        setActiveSystemPackId(systemId);
        
        // Apply default grid if available
        const packData = SYSTEM_PACKS.find((p: any) => p.meta.id === systemId);
        if (packData?.defaultGrid) {
            setCurrentGrid(packData.defaultGrid);
        } else {
             // Fallback
             setCurrentGrid({ rows: 1, cols: 2, cells: [
                {id: '0-0', row: 0, col: 0, type: 'sash'},
                {id: '0-1', row: 0, col: 1, type: 'sash'},
            ]});
        }
    }, []);

    const validate = useCallback((): boolean => {
        if (!liveProject) {
            setError('Cannot complete design: project data is missing.');
            return false;
        }
        if (liveProject.components.length === 0) {
            setError('Cannot complete design: the grid is empty or invalid.');
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
        onDesignComplete(liveProject.components);
        return true;
    }, [liveProject, currentGrid, activeSystemPackId, onDesignComplete]);


    
    // For handling preset selection externally or other grid updates that shouldn't reset system pack
    const applyGrid = useCallback((grid: WindowGrid) => {
         setCurrentGrid(grid);
    }, []);

    // For updates that might come from drafting
    const updateFromDrafting = useCallback((grid: WindowGrid, systemId?: string) => {
        setCurrentGrid(grid);
        if (systemId) setActiveSystemPackId(systemId);
    }, []);

    return {
        // Data
        liveProject,
        currentGrid,
        activeSystemPackId,
        bomData,
        error,
        isCalculating: isBOMCalculating,
        // Actions
        actions: {
            updateGrid,
            selectSystem,
            validate,
            setError,
            applyGrid,
            updateFromDrafting,
            setActiveSystemPackId
        }
    };
};
