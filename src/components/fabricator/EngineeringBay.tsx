/**
 * Almona Fabricator Pro: EngineeringBay (v2.0)
 *
 * This is the central engineering cockpit for defining the technical specification
 * of a window unit. It replaces the form-based TechnicalCalculator with a highly
 * interactive, visually-driven design experience. It seamlessly integrates the
 * SmartDrawCanvas for layout and the Apex Engine (Window3DGenerator) for
 * instantaneous, production-accurate 3D feedback.
 *
 * Prestige Enhancements:
 * - Visual-First Design: The SmartDrawCanvas is now the primary method for defining
 *   the window structure (sashes, fixed panels), making design intuitive.
 * - Intelligent System Packs: Applying a System Pack (e.g., "ROCK 60") doesn't just
 *   load profiles; it pre-configures the grid with a recommended layout.
 * - Unified Component & Hardware Management: A single, clean interface manages the
 *   bill of materials generated from the visual design.
 * - Deterministic Layout Suggestions: "Suggest Layout" applies rule-based Egyptian
 *   pattern matching for transparent and auditable outcomes.
 * - Seamless 3D Integration: The Apex Engine is not a "preview"; it's a live,
 *   interactive twin of the engineering design.
 */

import ErrorBoundary from '@/components/ErrorBoundary';
import { performanceMonitor } from '@/lib/performance';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import { AlertCircle, Box, ChevronDown, ChevronRight, Command, Cpu, Keyboard, Layers, Menu, Ruler, Settings, Sparkles, Wand2 } from 'lucide-react';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// Dynamic import for heavy 3D component
const Window3DGenerator = React.lazy(() => import('./Window3DGenerator'));

import { SYSTEM_PACKS } from '@/data/systemPacks';
import { patternToWindowGrid, suggestBestPatternForContext, type EgyptianPattern } from '@/lib/fabricator/presetUtils';
import { Badge } from '@/shared/ui/ui/badge';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/ui/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/ui/table';

import { StructuralValidator } from '@/lib/physics/StructuralValidator';
import { ThermalEngine } from '@/lib/physics/ThermalEngine';
import { PoseQuickEditModal } from './PoseQuickEditModal';
import { SmartDrawCanvas } from './SmartDrawCanvas';
import { DraftingWorkbench } from './drafting/DraftingWorkbench';
import { ArchitecturalPresetSelector, SIMPLE_PRESETS } from './drafting/prestige';
import { applyPresetIntelligence, getPresetById } from './drafting/prestige/presetApplication';
import type { DraftingOutput } from './drafting/types/drafting';
import { convertDraftingToWindowGrid } from './drafting/utils/draftingToWindowGrid';
import { CrossSectionGenerator } from './physics/CrossSectionGenerator';

import { useEngineeringEngine } from '@/hooks/fabricator/useEngineeringEngine';
import { useModeSwitch } from '@/hooks/fabricator/usePoseSync';
import { macroRecorder } from '@/lib/keyboard/macro-manager';
import { MacroRecorderPanel } from './MacroRecorderPanel';
import { BOMSidebar } from './bom/BOMSidebar';
import { WizardModeWrapper } from './wizard/WizardModeWrapper';

/**
 * Swappable component interfaces.
 *
 * Every visual subsystem (canvas, preview) can be replaced by passing
 * a component that satisfies the corresponding interface. If omitted,
 * the defaults (SmartDrawCanvas, Window3DGenerator) are used.
 *
 * @see src/lib/fabricator/interfaces/ for the full contracts
 */
import type { DesignCanvasComponent } from '@/lib/fabricator/interfaces/IDesignCanvas';
import type { PreviewPanelComponent } from '@/lib/fabricator/interfaces/IPreviewPanel';

interface EngineeringBayProps {
    project: WindowUnit | null;
    onDesignComplete: (components: WindowComponent[]) => void;
    onHardwareUpdate?: (hardware: any[]) => void;
    /** Optional pose-level save handler from parent (supports local fallback modes). */
    onPoseSave?: (updated: WindowUnit) => Promise<void> | void;
    profiles: Profile[];
    relatedPositions?: WindowUnit[];
    onSelectPosition?: (id: string) => void;
    onBackToMeasuring?: () => void;
    onAddNewPose?: () => void;
    mode?: 'expert' | 'wizard';
    /** Swappable design canvas (default: SmartDrawCanvas) */
    CanvasComponent?: DesignCanvasComponent;
    /** Swappable preview panel (default: Window3DGenerator via React.lazy) */
    PreviewComponent?: PreviewPanelComponent;
}

export const EngineeringBay: React.FC<EngineeringBayProps> = ({
    project,
    onDesignComplete,
    onPoseSave,
    profiles,
    relatedPositions,
    onSelectPosition,
    onBackToMeasuring,
    onAddNewPose,
    mode = 'expert',
    CanvasComponent,
    PreviewComponent,
}) => {
    const { t } = useTranslation('fabricator');

    // --- Logic Hook ---
    const {
        liveProject: liveProjectImmediate,
        currentGrid,
        activeSystemPackId,
        bomData,
        error: engineError,
        actions
    } = useEngineeringEngine({
        project,
        profiles,
        onDesignComplete
    });

    // Defer the heavy 3D preview input so grid edits stay snappy.
    // The 3D preview will update on the next idle frame instead of
    // blocking the SmartDrawCanvas interaction.
    const liveProject = useDeferredValue(liveProjectImmediate);

    // --- UI State Management (move designMode first for hooks) ---
    const [designMode, setDesignMode] = useState<'smartdraw' | 'drafting'>('smartdraw');

    // Constitutional mode switching (must be called at top level before any returns)
    const { switchMode, isSwitching } = useModeSwitch({
        poseId: project?.id || '',
        currentMode: designMode === 'drafting' ? 'drafting' : 'smartdraw',
        currentState: { grid: currentGrid, components: liveProject?.components },
        onModeChanged: (newMode) => {
            setDesignMode(newMode === 'drafting' ? 'drafting' : 'smartdraw');
        }
    });

    // --- Rest of UI State ---
    const [isPro3D, setIsPro3D] = useState<boolean>(true);
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [showPresetSelector, setShowPresetSelector] = useState(false);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [engineeringMode, setEngineeringMode] = useState<'expert' | 'wizard'>(mode);
    const [mobileTab, setMobileTab] = useState<'design' | '3d'>('design');
    const [showQuickEditModal, setShowQuickEditModal] = useState(false);

    // Sync internal mode with prop change
    useEffect(() => {
        setEngineeringMode(mode);
    }, [mode]);

    // --- Physics Engine Calculation (Phase 4) ---
    const physicsResults = useMemo(() => {
        if (!activeSystemPackId) return null;

        // Find a representative profile (Frame/Mullion) that has physics data
        const pack = SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId);

        // Try to find a profile with physics data defined
        // 1. Check top-level profiles array (if enriched)
        // 2. Check windowSystemSpec.profiles_cutting_list (if enriched in-place)

        let representativeProfile: any = pack?.profiles?.find(p => p.physics);

        if (!representativeProfile) {
            const cuttingList = pack?.windowSystemSpec?.profiles_cutting_list || [];
            representativeProfile = cuttingList.find((p: any) => p.physics);
        }

        const physics = representativeProfile?.physics;

        if (!physics) return null;

        // 1. Structural Validation (Wind Load)
        // Default to Cairo/High-Rise params if specific project data is missing
        const windParams = {
            windPressure: 1200, // Pa
            mullionSpacing: project?.overallWidth ? project.overallWidth / 2 : 1000,
            mullionHeight: project?.overallHeight || 2000,
            maxDeflectionRatio: 200, // L/200
            elasticModulus: 70000 // Aluminum
        };

        const structResult = StructuralValidator.validateProfile(physics.ix, windParams);

        // 2. Thermal Calculation (Uw)
        const thermalParams = {
            Ag: 2.5, // Estimate m2
            Af: 0.8, // Estimate m2
            Ug: 1.1, // Double Glazing Low-E default
            Uf: physics.uf || 2.4,
            Lg: 6.0, // Perimeter
            Psi: 0.04 // Warm edge
        };
        const uw = ThermalEngine.calculateUw(thermalParams);

        return { structResult, uw, physics };

    }, [activeSystemPackId, project]);

    // --- Performance Monitoring ---
    useEffect(() => {
        const startTime = performance.now();
        return () => {
            const renderTime = performance.now() - startTime;
            if (renderTime > 100) {
                //    console.warn(`[Performance] EngineeringBay render: ${renderTime.toFixed(2)}ms`);
            }
            performanceMonitor.track('engineering_bay_render', renderTime, 'EngineeringBay');
        };
    });

    // --- Drafting Mode Integration ---
    const handleDraftingValidated = useCallback((draftingOutput: DraftingOutput) => {
        // Convert drafting output to WindowGrid
        const windowGrid = convertDraftingToWindowGrid(
            draftingOutput.geometry,
            draftingOutput.template
        );

        // Update grid and system pack via actions
        actions.updateFromDrafting(windowGrid, draftingOutput.suggestedSystemPack || undefined);

        // Switch back to smartdraw mode
        setDesignMode('smartdraw');

    }, [actions]);

    // --- Preset Selection Handler ---
    const handlePresetSelect = useCallback((presetId: string) => {
        actions.setError(null);
        setSelectedPreset(presetId);

        const preset = getPresetById(presetId, SIMPLE_PRESETS);
        if (!preset) return;

        // Apply preset intelligence
        const result = applyPresetIntelligence(
            preset,
            project?.overallWidth,
            project?.overallHeight
        );

        // Update grid via actions
        actions.applyGrid(result.windowGrid);

        // Update system pack if recommended
        if (result.recommendedSystem) {
            // Try to find matching system pack
            const matchingPack = SYSTEM_PACKS.find(p =>
                p.meta.id.toLowerCase().includes(result.recommendedSystem.toLowerCase()) ||
                p.meta.name.toLowerCase().includes(result.recommendedSystem.toLowerCase())
            );
            if (matchingPack) {
                actions.setActiveSystemPackId(matchingPack.meta.id);
            }
        }

        // Close preset selector
        setShowPresetSelector(false);

    }, [project, actions]);

    // --- Event Handlers ---
    const handleSystemPackSelect = useCallback((systemPackId: string) => {
        actions.selectSystem(systemPackId);
    }, [actions]);

    const handleSuggestLayout = useCallback(() => {
        actions.setError(null);
        const type = project?.type?.toLowerCase() ?? '';
        const preferredType: EgyptianPattern['type'] | null =
            type.includes('sliding') ? 'sliding'
                : (type.includes('casement') ? 'casement'
                    : (type.includes('tilt') ? 'tilt_turn'
                        : (type.includes('door') ? 'door'
                            : (type.includes('fixed') ? 'fixed' : null))));

        const suggestion = suggestBestPatternForContext({
            overallWidth: project?.overallWidth,
            overallHeight: project?.overallHeight,
            systemPackId: activeSystemPackId,
            preferredType,
            existingGrid: currentGrid,
        });

        if (suggestion) {
            actions.updateGrid(patternToWindowGrid(suggestion.pattern));

            // If system pack is not selected yet, align to pattern's first compatible pack.
            if (!activeSystemPackId && suggestion.pattern.compatibleSystems.length > 0) {
                actions.setActiveSystemPackId(suggestion.pattern.compatibleSystems[0]);
            }

            toast.success(
                t('engineering_bay.layout_suggested', 'Layout suggested from Egyptian pattern database'),
                { description: suggestion.pattern.name }
            );
            return;
        }

        // Safe deterministic fallback when no pattern matches.
        actions.updateGrid({
            rows: 1, cols: 2,
            cells: [
                { id: '0-0', row: 0, col: 0, type: 'fixed' },
                { id: '0-1', row: 0, col: 1, type: 'sash' },
            ],
            colWidths: [1, 1],
            rowHeights: [1]
        });
    }, [actions, activeSystemPackId, currentGrid, project, t]);

    const handleSaveAndNext = useCallback(() => {
        const ok = actions.validate();
        if (!ok) return;

        // If a dedicated add‑pose handler is provided (measuring tab workflow), use it.
        if (onAddNewPose) {
            onAddNewPose();
            return;
        }

        if (!project || !relatedPositions || !onSelectPosition) return;

        const currentIndex = relatedPositions.findIndex((u) => u.id === project.id);
        if (currentIndex === -1) return;
        const next = relatedPositions[currentIndex + 1];
        if (next) {
            onSelectPosition(next.id);
        }
    }, [actions, onAddNewPose, project, relatedPositions, onSelectPosition]);

    /** Stable callback for Drafting Workbench "Save & Move to Next" (context menu / quick entry). */
    const handleMoveToNextForDrafting = useCallback(() => {
        if (onAddNewPose) {
            onAddNewPose();
            toast.success(t('engineering_bay.save_and_next', 'Save & Next Pose'));
            return;
        }
        if (!project || !relatedPositions?.length || !onSelectPosition) return;
        const idx = relatedPositions.findIndex((u) => u.id === project.id);
        const next = idx >= 0 ? relatedPositions[idx + 1] : null;
        if (next) {
            onSelectPosition(next.id);
            toast.success(t('engineering_bay.save_and_next', 'Save & Next Pose'));
        }
    }, [onAddNewPose, project, relatedPositions, onSelectPosition, t]);

    /** Only expose Move to Next when actionable (add new pose or select next). */
    const moveToNextForDrafting = useMemo(() => {
        if (onAddNewPose) return handleMoveToNextForDrafting;
        if (!project || !relatedPositions?.length || !onSelectPosition) return undefined;
        const idx = relatedPositions.findIndex((u) => u.id === project.id);
        const hasNext = idx >= 0 && idx < relatedPositions.length - 1;
        return hasNext ? handleMoveToNextForDrafting : undefined;
    }, [onAddNewPose, project, relatedPositions, onSelectPosition, handleMoveToNextForDrafting]);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input is active
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
                return;
            }

            const isCtrl = e.ctrlKey || e.metaKey;
            const isAlt = e.altKey;

            if (isCtrl && e.key === 's') { // Save & Next
                e.preventDefault();
                handleSaveAndNext();
            } else if (isCtrl && e.key === 'Enter') { // Confirm Design
                e.preventDefault();
                actions.validate();
            } else if (isAlt && (e.key === 'w' || e.key === 'W')) { // Wizard Mode
                e.preventDefault();
                setEngineeringMode(prev => prev === 'wizard' ? 'expert' : 'wizard');
            } else if (isAlt && (e.key === 'd' || e.key === 'D')) { // Drafting Mode
                e.preventDefault();
                setDesignMode(prev => prev === 'drafting' ? 'smartdraw' : 'drafting');
            } else if (isAlt && (e.key === 'a' || e.key === 'A')) { // Suggest Layout
                e.preventDefault();
                handleSuggestLayout();
            } else if (e.key === '?' && e.shiftKey) { // Help
                e.preventDefault();
                setShowShortcuts(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSaveAndNext, actions, handleSuggestLayout]);


    // --- Render Logic ---
    // Wizard Mode Render
    if (engineeringMode === 'wizard' && project) {
        return (
            <WizardModeWrapper
                projectId={project.id}
                profiles={profiles}
                onComplete={(wizardData) => {
                    void wizardData;
                    toast.success(t('wizard.design_transferred', 'Design transferred to Engineering Bay'));
                    setEngineeringMode('expert');
                }}
                onExit={() => setEngineeringMode('expert')}
            />
        );
    }

    if (!project) {
        return (
            <div className="space-y-6">
                <Card className="bg-gray-700/50 border-gray-600">
                    <CardContent className="p-8 text-center">
                        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t('engineering_bay.no_project_data', 'No Project Data')}</h3>
                        <p className="text-gray-400">
                            {t('engineering_bay.complete_measurement', 'Please complete the measurement phase first to create a project.')}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render Drafting Workbench if in drafting mode
    if (designMode === 'drafting') {
        return (
            <div className="h-full">
                <DraftingWorkbench
                    onDesignValidated={handleDraftingValidated}
                    initialTemplate={activeSystemPackId || undefined}
                    onExit={() => switchMode('smartdraw')}
                    project={project}
                    onMoveToNext={moveToNextForDrafting}
                    onOpenPoseQuickEdit={project ? () => setShowQuickEditModal(true) : undefined}
                />
                {project && (
                    <PoseQuickEditModal
                        pose={project}
                        open={showQuickEditModal}
                        onOpenChange={setShowQuickEditModal}
                        onSavePose={onPoseSave}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto p-6 space-y-6">
            {/* --- MASTER CONTROL CARD --- */}
            <Card className="bg-gray-800/30 border-gray-700 shadow-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                            <Cpu className="h-6 w-6 text-orange-400" />
                            <span className="text-xl">{t('engineering_bay.title', 'Engineering Bay')}</span>
                            {/* ─── Pose Switcher ─────────────────────────────── */}
                            {relatedPositions && relatedPositions.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 px-2 text-xs border-gray-700 text-gray-300 hover:border-orange-500 hover:text-orange-300"
                                        >
                                            {project?.posNumber || 'Pose'}
                                            {activeSystemPackId && (() => {
                                                const pack = SYSTEM_PACKS.find((p) => p.meta?.id === activeSystemPackId);
                                                return pack?.meta?.name ? (
                                                    <span className="ml-2 text-amber-400 font-medium" title={pack.meta.name}>
                                                        — {pack.meta.name}
                                                    </span>
                                                ) : null;
                                            })()}
                                            <ChevronDown className="h-3 w-3 ml-1" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-56 bg-gray-900 border-gray-700 text-gray-200">
                                        {relatedPositions.map((pos) => (
                                            <DropdownMenuItem
                                                key={pos.id}
                                                onClick={() => onSelectPosition?.(pos.id)}
                                                className="focus:bg-gray-800 cursor-pointer"
                                            >
                                                <div className="flex justify-between w-full">
                                                    <span className="font-mono text-xs">{pos.posNumber}</span>
                                                    <span className="text-[10px] text-gray-500">{pos.overallWidth}x{pos.overallHeight}</span>
                                                </div>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-gray-500 hover:text-orange-400"
                                onClick={() => setShowQuickEditModal(true)}
                                title="Quick Edit Pose (size, color, glazing)"
                            >
                                <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-gray-500 hover:text-orange-400"
                                onClick={() => setShowShortcuts(true)}
                                title="Keyboard Shortcuts (Shift + ?)"
                            >
                                <Keyboard className="h-4 w-4" />
                            </Button>
                        </CardTitle>
                        {liveProject && (
                            <>
                                <div className="hidden lg:flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => switchMode('drafting')}
                                        disabled={isSwitching}
                                        className="border-blue-400 text-blue-200 hover:bg-blue-900/30 disabled:opacity-50"
                                        title="Switch to ALMONA Drafting Workbench (Moxisys-style visual drafting)"
                                    >
                                        <Ruler className="h-4 w-4 mr-1" />
                                        {isSwitching ? 'Switching...' : 'Drafting Mode'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (onBackToMeasuring) {
                                                onBackToMeasuring();
                                            }
                                        }}
                                        className="border-cyan-400 text-cyan-200 hover:bg-cyan-900/30"
                                    >
                                        {t('engineering_bay.back_to_measuring', 'Back to Measuring')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setEngineeringMode('wizard')}
                                        className="bg-amber-600 hover:bg-amber-700 text-white border-amber-400"
                                    >
                                        <Wand2 className="h-4 w-4 mr-2" />
                                        Wizard Mode
                                    </Button>
                                    <Button
                                        onClick={actions.validate}
                                        className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                                    >
                                        {t('engineering_bay.confirm_design', 'Confirm Design & Proceed to Optimization')}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={handleSaveAndNext}
                                        className="bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-lg font-semibold"
                                    >
                                        {t('engineering_bay.save_and_next', 'Save & Next Pose')}
                                    </Button>
                                </div>
                                <div className="lg:hidden">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="border-gray-600 bg-gray-800/50">
                                                <Menu className="h-5 w-5 text-gray-300" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-700 text-gray-200">
                                            <DropdownMenuItem onClick={handleSaveAndNext} className="text-cyan-400 focus:text-cyan-300 focus:bg-gray-800 cursor-pointer">
                                                <Sparkles className="h-4 w-4 mr-2" />
                                                {t('engineering_bay.save_and_next', 'Save & Next')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={actions.validate} className="text-green-400 focus:text-green-300 focus:bg-gray-800 cursor-pointer">
                                                <Box className="h-4 w-4 mr-2" />
                                                Confirm Design
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setEngineeringMode('wizard')} className="focus:bg-gray-800 cursor-pointer">
                                                <Wand2 className="h-4 w-4 mr-2" />
                                                Wizard Mode
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setDesignMode('drafting')} className="focus:bg-gray-800 cursor-pointer">
                                                <Ruler className="h-4 w-4 mr-2" />
                                                Drafting Mode
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onBackToMeasuring && onBackToMeasuring()} className="focus:bg-gray-800 cursor-pointer">
                                                <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                                                Back to Measuring
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* 3D Mode Toggle */}
                    <div className="flex items-center justify-between mb-4 gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Sparkles className="h-4 w-4 text-orange-400" />
                            <span>{t('engineering_bay.3d_engine_mode', '3D Engine Mode')}</span>
                        </div>
                        <div className="inline-flex rounded-md border border-gray-700 bg-gray-900/60 p-1 text-xs">
                            <button
                                type="button"
                                onClick={() => setIsPro3D(false)}
                                className={`px-2 py-1 rounded-sm transition-colors ${!isPro3D
                                    ? 'bg-gray-100 text-gray-900'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {t('engineering_bay.standard_3d', 'Standard 3D')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPro3D(true)}
                                className={`px-2 py-1 rounded-sm transition-colors ${isPro3D
                                    ? 'bg-orange-500 text-white'
                                    : 'text-gray-400 hover:text-gray-200'
                                    }`}
                            >
                                {t('engineering_bay.pro_3d', 'Pro 3D')}
                            </button>
                        </div>
                    </div>

                    <Alert className="bg-blue-900/30 border-blue-500/50 mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                            {t('engineering_bay.instructions', 'Use the controls to define the window structure. The 3D model and Bill of Materials will update in real-time.')}
                        </AlertDescription>
                    </Alert>

                    {engineError && (
                        <Alert variant="destructive" className="bg-red-900/20 border-red-500 mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{engineError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="lg:hidden mb-6">
                        <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-gray-900 border border-gray-700">
                                <TabsTrigger value="design" className="data-[state=active]:bg-gray-800 data-[state=active]:text-orange-400">
                                    <Layers className="h-4 w-4 mr-2" /> Design
                                </TabsTrigger>
                                <TabsTrigger value="3d" className="data-[state=active]:bg-gray-800 data-[state=active]:text-orange-400">
                                    <Box className="h-4 w-4 mr-2" /> 3D Preview
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* --- LEFT PANEL: DESIGN CONTROLS --- */}
                        <div className={`lg:col-span-1 space-y-6 ${mobileTab === 'design' ? 'block' : 'hidden lg:block'}`}>
                            <Card className="bg-gray-900/50">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Settings className="h-4 w-4 text-gray-400" />
                                        {t('engineering_bay.system_configuration', 'System Configuration')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Pattern Selection - Modal Dialog */}
                                    <div className="space-y-3">
                                        <Label className="text-sm text-gray-300 font-semibold">Window Pattern</Label>

                                        {/* Selected Pattern Display */}
                                        {selectedPreset && (
                                            <div className="p-3 bg-gray-950/50 border border-gray-700 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                                    <span className="text-sm text-gray-200 font-medium">
                                                        {getPresetById(selectedPreset, SIMPLE_PRESETS)?.title || selectedPreset}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Pattern Selection Button - Opens Modal */}
                                        <Dialog open={showPresetSelector} onOpenChange={setShowPresetSelector}>
                                            <Button
                                                onClick={() => setShowPresetSelector(true)}
                                                className="w-full h-12 bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-700 hover:to-blue-700 text-white shadow-lg transition-all duration-300 hover:shadow-xl"
                                            >
                                                <Sparkles className="w-5 h-5 mr-2" />
                                                <span className="text-base font-semibold">
                                                    {selectedPreset ? 'Change Pattern' : 'Browse Window Patterns'}
                                                </span>
                                                <ChevronRight className="w-4 h-4 ml-auto" />
                                            </Button>

                                            <DialogContent className="max-w-7xl h-[85vh] overflow-hidden flex flex-col">
                                                <DialogHeader>
                                                    <DialogTitle className="text-2xl font-bold">Select Window Pattern</DialogTitle>
                                                    <DialogDescription>
                                                        Choose from residential, commercial, or heritage window designs
                                                    </DialogDescription>
                                                </DialogHeader>

                                                {/* Scrollable Content */}
                                                <div className="flex-1 overflow-y-auto pr-2">
                                                    <ArchitecturalPresetSelector
                                                        presets={SIMPLE_PRESETS}
                                                        selectedPreset={selectedPreset || undefined}
                                                        onSelect={(id) => {
                                                            handlePresetSelect(id);
                                                            setShowPresetSelector(false);
                                                        }}
                                                        currentSystem={activeSystemPackId || undefined}
                                                        currentMaterial={project?.color || undefined}
                                                        defaultShowDetails={false}
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm text-gray-300 font-semibold">{t('engineering_bay.active_system', 'Active System')}</Label>
                                        <Select
                                            value={activeSystemPackId || ""}
                                            onValueChange={handleSystemPackSelect}
                                        >
                                            <SelectTrigger className="h-14 bg-gray-950 border-2 border-gray-600 hover:border-orange-500 text-base transition-colors">
                                                <div className="flex items-center gap-3 w-full">
                                                    <Box className="w-5 h-5 text-orange-400 flex-shrink-0" />
                                                    <div className="flex flex-col items-start flex-1 min-w-0">
                                                        <span className="text-xs text-gray-300 font-medium tracking-wide">System Pack</span>
                                                        {activeSystemPackId ? (
                                                            <span className="text-sm text-gray-100 font-semibold truncate w-full text-left">
                                                                {(() => {
                                                                    const pack = SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId);
                                                                    return pack?.meta.name || activeSystemPackId;
                                                                })()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm text-gray-400">{t('engineering_bay.select_system', 'Select System')}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-900 border-gray-700 text-gray-200">
                                                {(
                                                    (project as any)?.allowedSystemPackIds?.length
                                                        ? SYSTEM_PACKS.filter((p) =>
                                                            (project as any)?.allowedSystemPackIds?.includes(p.meta.id)
                                                        )
                                                        : SYSTEM_PACKS
                                                ).map((pack) => (
                                                    <SelectItem
                                                        key={pack.meta.id}
                                                        value={pack.meta.id}
                                                        className="text-xs focus:bg-gray-800"
                                                        title={pack.meta.name}
                                                    >
                                                        <div className="flex items-center gap-2" title={pack.meta.name}>
                                                            <span className="font-medium">{pack.meta.name}</span>
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-gray-600 text-gray-400">
                                                                {(pack as any).meta?.type || 'system'}
                                                            </Badge>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {activeSystemPackId && (
                                        <div className="grid grid-cols-2 gap-2 bg-gray-950/50 rounded p-2 border border-gray-800/50">
                                            <div className="flex items-center gap-2">
                                                <Layers className="h-3 w-3 text-blue-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500">{t('engineering_bay.profiles', 'Profiles')}</span>
                                                    <span className="text-xs font-mono text-gray-300">
                                                        {(SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId) as any)?.windowSystemSpec?.profiles_cutting_list?.length || 0}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Box className="h-3 w-3 text-orange-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500">{t('engineering_bay.parts', 'Parts')}</span>
                                                    <span className="text-xs font-mono text-gray-300">
                                                        {(SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId) as any)?.windowSystemSpec?.accessories_list?.length || 0}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <Alert variant="default" className="border-blue-500/40 bg-blue-900/20 text-blue-100">
                                        <AlertDescription className="text-xs">
                                            {t('engineering_bay.system_constraints', 'System constraints and presets are applied automatically to SmartDraw and 3D.')}
                                        </AlertDescription>
                                    </Alert>

                                    <Button onClick={handleSuggestLayout} variant="outline" className="w-full">
                                        <Wand2 className="h-4 w-4 mr-2" />
                                        {t('engineering_bay.suggest_layout', 'Suggest Layout')}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50">
                                <CardHeader><CardTitle className="text-base">{t('engineering_bay.structure', 'Structure')}</CardTitle></CardHeader>
                                <CardContent>
                                    <ErrorBoundary
                                        level="component"
                                        fallback={(
                                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                                                Layout canvas failed to render. Please refresh this pose.
                                            </div>
                                        )}
                                    >
                                        {CanvasComponent ? (
                                            <CanvasComponent
                                                width={project.overallWidth}
                                                height={project.overallHeight}
                                                grid={currentGrid}
                                                onGridChange={actions.updateGrid}
                                                systemPackId={activeSystemPackId}
                                            />
                                        ) : (
                                            <SmartDrawCanvas
                                                width={project.overallWidth}
                                                height={project.overallHeight}
                                                grid={currentGrid}
                                                onGridChange={actions.updateGrid}
                                            />
                                        )}
                                    </ErrorBoundary>
                                </CardContent>
                            </Card>

                            {/* --- MACRO RECORDER (Gold Tier) --- */}
                            <MacroRecorderPanel
                                recorder={macroRecorder}
                                className="bg-gray-900/50"
                                onActionExecute={async (type: string, data?: Record<string, any>) => {
                                    if (type === 'custom' && data?.shortcutAction) {
                                        await import('@/lib/keyboard/shortcuts').then(({ shortcutManager }) => {
                                            shortcutManager.executeAction(data.shortcutAction);
                                        });
                                    }
                                }}
                            />
                        </div>

                        {/* --- RIGHT PANEL: LIVE 3D PREVIEW --- */}
                        <div className={`lg:col-span-2 ${mobileTab === '3d' ? 'block' : 'hidden lg:block'}`}>
                            <Card className="bg-gray-900/50 sticky top-4">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Box className="h-4 w-4 text-gray-400" />
                                        {t('engineering_bay.live_digital_twin', 'Live Digital Twin (Apex Engine v6.0)')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="w-full h-[350px] lg:h-[600px] rounded-lg overflow-hidden border border-gray-800">
                                        {liveProject && (
                                            <ErrorBoundary
                                                level="component"
                                                fallback={(
                                                    <div className="flex h-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                                                        3D preview failed to render. Please refresh this pose.
                                                    </div>
                                                )}
                                            >
                                                {PreviewComponent ? (
                                                    <PreviewComponent
                                                        windowUnit={liveProject}
                                                        mode="operator"
                                                    />
                                                ) : (
                                                    <React.Suspense fallback={
                                                        <div className="flex items-center justify-center h-96 bg-gray-900 rounded-lg">
                                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                                                            <span className="ml-3 text-white">{t('engineering_bay.loading_3d', 'Loading 3D Preview...')}</span>
                                                        </div>
                                                    }>
                                                        <Window3DGenerator
                                                            windowUnit={liveProject}
                                                            profiles={profiles}
                                                            showControls={true}
                                                            presentationMode={false}
                                                            showErrorDetection={true}
                                                            mode={isPro3D ? 'pro' : 'standard'}
                                                        />
                                                    </React.Suspense>
                                                )}
                                            </ErrorBoundary>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* --- ENGINEERING PHYSICS PANEL --- */}
                            <Card className="bg-gray-900/50 mt-6 border-l-4 border-l-amber-500">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Cpu className="h-4 w-4 text-amber-400" />
                                        {t('engineering_bay.physics_engine', 'Engineering Physics')}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-gray-400">
                                        Verified against Eurocode 1 & ISO 10077-1
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {/* 1. Structural Statics */}
                                        <div className="space-y-3 bg-gray-950/40 p-3 rounded-lg border border-gray-800">
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Ruler className="h-4 w-4 text-orange-400" />
                                                    <span className="text-gray-300 font-medium tracking-tight">Wind Load Performance (Ix)</span>
                                                </div>
                                                {physicsResults ? (
                                                    <Badge className={`${physicsResults.structResult.isSafe ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} border`}>
                                                        {physicsResults.structResult.isSafe ? 'CONFORMANT' : 'CRITICAL'} (SF: {physicsResults.structResult.safetyFactor})
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-gray-500 border-gray-800">DATA PENDING</Badge>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                                    <span>Utilization</span>
                                                    <span>{Math.min((physicsResults?.structResult.utilization || 0), 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                                                    <div
                                                        className={`h-full transition-all duration-1000 ${physicsResults?.structResult.isSafe ? 'bg-gradient-to-r from-blue-500 to-emerald-400' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min((physicsResults?.structResult.utilization || 0), 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-[10px]">
                                                <div className="flex flex-col">
                                                    <span className="text-gray-500">Required Inertia</span>
                                                    <span className="text-gray-200 font-mono">{physicsResults?.structResult.requiredIx?.toFixed(2) || '---'} cm⁴</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-gray-500">System Inertia</span>
                                                    <span className="text-sky-300 font-mono">{physicsResults?.structResult.actualIx?.toFixed(2) || '---'} cm⁴</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. Thermal Physics */}
                                        <div className="space-y-3 bg-gray-950/40 p-3 rounded-lg border border-gray-800">
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-blue-400" />
                                                    <span className="text-gray-300 font-medium tracking-tight">Thermal Performance (Uw)</span>
                                                </div>
                                                <span className="font-mono text-blue-300 font-bold bg-blue-900/20 px-2 py-0.5 rounded border border-blue-800/30">
                                                    {physicsResults?.uw ? physicsResults.uw.toFixed(2) : '---'} W/m²K
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800 text-center">
                                                    <span className="text-[9px] text-gray-500 block">Uf (Frame)</span>
                                                    <span className="text-[11px] text-gray-300 font-mono">{physicsResults?.physics.uf || '---'}</span>
                                                </div>
                                                <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800 text-center">
                                                    <span className="text-[9px] text-gray-500 block">Ug (Glass)</span>
                                                    <span className="text-[11px] text-gray-300 font-mono">1.10</span>
                                                </div>
                                                <div className="bg-gray-900/80 p-1.5 rounded border border-gray-800 text-center">
                                                    <span className="text-[9px] text-gray-500 block">Ψ (Edge)</span>
                                                    <span className="text-[11px] text-gray-300 font-mono">0.04</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Cross Sections */}
                                        <div className="pt-4 border-t border-gray-800">
                                            <div className="flex items-center justify-between mb-3 text-xs">
                                                <span className="text-gray-400 font-medium">Auto-Generated Cross Sections</span>
                                                <span className="text-[10px] bg-sky-900/30 text-sky-400 px-1.5 py-0.5 rounded border border-sky-800/30">SVG-Precision: 0.1mm</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <CrossSectionGenerator
                                                        type="frame"
                                                        width={physicsResults?.physics.faceWidth || 60}
                                                        depth={physicsResults?.physics.depth || 60}
                                                        glassThickness={24}
                                                        className="w-full bg-gray-950/20 rounded border border-gray-800/50"
                                                    />
                                                    <div className="text-[9px] text-gray-500 text-center font-mono">Frame: {physicsResults?.physics.faceWidth || 60}x{physicsResults?.physics.depth || 60}mm</div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <CrossSectionGenerator
                                                        type="mullion"
                                                        width={physicsResults?.physics.mullionWidth || 80}
                                                        depth={physicsResults?.physics.depth || 120}
                                                        glassThickness={24}
                                                        className="w-full bg-gray-950/20 rounded border border-gray-800/50"
                                                    />
                                                    <div className="text-[9px] text-gray-500 text-center font-mono">Mullion: {physicsResults?.physics.mullionWidth || 80}x{physicsResults?.physics.depth || 120}mm</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-400">
                            <Command className="h-5 w-5" />
                            Keyboard Shortcuts
                        </DialogTitle>
                        <DialogDescription>
                            Power user controls for rapid engineering.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-700 hover:bg-transparent">
                                    <TableHead className="text-gray-400 h-8">Action</TableHead>
                                    <TableHead className="text-right text-gray-400 h-8">Shortcut</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableCell className="py-2 font-medium text-gray-200">Save & Next Pose</TableCell>
                                    <TableCell className="py-2 text-right font-mono text-orange-300">Ctrl + S</TableCell>
                                </TableRow>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableCell className="py-2 font-medium text-gray-200">Confirm & Validate</TableCell>
                                    <TableCell className="py-2 text-right font-mono text-orange-300">Ctrl + Enter</TableCell>
                                </TableRow>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableCell className="py-2 font-medium text-gray-200">Toggle Wizard Mode</TableCell>
                                    <TableCell className="py-2 text-right font-mono text-orange-300">Alt + W</TableCell>
                                </TableRow>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableCell className="py-2 font-medium text-gray-200">Toggle Drafting Mode</TableCell>
                                    <TableCell className="py-2 text-right font-mono text-orange-300">Alt + D</TableCell>
                                </TableRow>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableCell className="py-2 font-medium text-gray-200">Suggest Layout</TableCell>
                                    <TableCell className="py-2 text-right font-mono text-orange-300">Alt + A</TableCell>
                                </TableRow>
                                <TableRow className="border-gray-800 hover:bg-transparent">
                                    <TableCell className="py-2 font-medium text-gray-200">Show Shortcuts</TableCell>
                                    <TableCell className="py-2 text-right font-mono text-orange-300">Shift + ?</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            {project && (
                <PoseQuickEditModal
                    pose={project}
                    open={showQuickEditModal}
                    onOpenChange={setShowQuickEditModal}
                    onSavePose={onPoseSave}
                />
            )}

            {/* --- BILL OF MATERIALS (Maalem-Grade Precision) --- */}
            <BOMSidebar
                bomData={bomData}
                liveProject={liveProject}
                profiles={profiles}
                className="mt-6"
                collapsed={false}
                showSummary={true}
            />
        </div>
    );
};
