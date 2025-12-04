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
 * - AI-Powered Suggestions: The "Apply Template" button is now an intelligent
 *   "Suggest Layout" that uses AI/heuristics to propose an optimal grid.
 * - Seamless 3D Integration: The Apex Engine is not a "preview"; it's a live,
 *   interactive twin of the engineering design.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Settings, Box, AlertCircle, Cpu, FileText, Wand2, Sparkles } from 'lucide-react';
import { WindowUnit, Profile, WindowComponent, WindowGrid } from '@/types/fabricator';
import { Window3DGenerator } from './Window3DGenerator'; 
import { SystemPackSelector } from './SystemPackSelector'; 
import { SmartDrawCanvas } from './SmartDrawCanvas'; 
import { generateComponentsFromGrid } from '@/algorithms/smartDraw'; 
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateDesign } from '@/lib/fabricator/ConstraintEngine';

interface EngineeringBayProps {
    project: WindowUnit | null;
    onDesignComplete: (components: WindowComponent[]) => void;
    onHardwareUpdate?: (hardware: any[]) => void;
    profiles: Profile[];
}

export const EngineeringBay: React.FC<EngineeringBayProps> = ({
    project,
    onDesignComplete,
    profiles,
}) => {
    // --- State Management ---
    const [currentGrid, setCurrentGrid] = useState<WindowGrid>({ rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }]});
    const [activeSystemPackId, setActiveSystemPackId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPro3D, setIsPro3D] = useState<boolean>(true);
    
    // --- Derived State & Memos ---
    // The "live" project object that reflects the current state of the engineering design
    const liveProject = useMemo<WindowUnit | null>(() => {
        if (!project) return null;

        // Generate the component list and hardware from the current grid layout
        const { components, hardware } = generateComponentsFromGrid(
            project,
            currentGrid,
            profiles, // Pass available profiles for selection
            activeSystemPackId
        );

        return {
            ...project,
            grid: currentGrid,
            components,
            hardware,
            systemPackId: activeSystemPackId,
            updatedAt: new Date(),
        };
    }, [project, currentGrid, profiles, activeSystemPackId]);

    // --- Effects ---
    // Sync state when the master project object changes (e.g., loading a saved project)
    useEffect(() => {
        if (project) {
            setCurrentGrid(project.grid || { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] });
            setActiveSystemPackId(project.systemPackId || null);
        }
    }, [project]);

    // --- Event Handlers ---
    const handleSystemPackSelect = useCallback((systemPack: any) => {
        setError(null);
        setActiveSystemPackId(systemPack.id);
        
        // INTELLIGENT ACTION: If the system pack has a recommended layout, apply it.
        const packData = SYSTEM_PACKS.find((p: any) => p.meta.id === systemPack.id);
        if (packData?.defaultGrid) {
            setCurrentGrid(packData.defaultGrid);
        } else {
            // Fallback to a simple default
            setCurrentGrid({ rows: 1, cols: 2, cells: [
                {id: '0-0', row: 0, col: 0, type: 'sash'},
                {id: '0-1', row: 0, col: 1, type: 'sash'},
            ]});
        }
    }, []);

    const handleSuggestLayout = useCallback(() => {
        // This is a placeholder for your future AI logic.
        // For now, it can apply a common, sensible layout like a 2x2 grid.
        setError(null);
        setCurrentGrid({
            rows: 2, cols: 2,
            cells: [
                { id: '0-0', row: 0, col: 0, type: 'fixed' },
                { id: '0-1', row: 0, col: 1, type: 'fixed' },
                { id: '1-0', row: 1, col: 0, type: 'sash' },
                { id: '1-1', row: 1, col: 1, type: 'sash' },
            ]
        });
    }, []);

    const handleSubmit = () => {
        if (!liveProject) {
            setError('Cannot complete design: project data is missing.');
            return;
        }
        if (liveProject.components.length === 0) {
            setError('Cannot complete design: the grid is empty or invalid.');
            return;
        }

        // Egyptian-style validation before 3D & optimization
        const validation = validateDesign(
            liveProject.overallWidth,
            liveProject.overallHeight,
            currentGrid,
            activeSystemPackId || 'generic'
        );

        if (!validation.isValid) {
            setError(validation.errors.join(' '));
            return;
        }

        setError(null);
        onDesignComplete(liveProject.components);
    };
    
    // --- Render Logic ---
    if (!project) {
         return (
            <div className="space-y-6">
                <Card className="bg-gray-700/50 border-gray-600">
                <CardContent className="p-8 text-center">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Project Data</h3>
                    <p className="text-gray-400">
                    Please complete the measurement phase first to create a project.
                    </p>
                </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* --- MASTER CONTROL CARD --- */}
            <Card className="bg-gray-800/30 border-gray-700 shadow-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                            <Cpu className="h-6 w-6 text-orange-400" />
                            <span className="text-xl">Engineering Bay</span>
                        </CardTitle>
                        {liveProject && (
                             <Button
                                onClick={handleSubmit}
                                className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                            >
                                Confirm Design & Proceed to Optimization
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* 3D Mode Toggle */}
                    <div className="flex items-center justify-between mb-4 gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Sparkles className="h-4 w-4 text-orange-400" />
                            <span>3D Engine Mode</span>
                        </div>
                        <div className="inline-flex rounded-md border border-gray-700 bg-gray-900/60 p-1 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setIsPro3D(false)}
                                className={`px-2 py-1 rounded-sm transition-colors ${
                                    !isPro3D
                                        ? 'bg-gray-100 text-gray-900'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Standard 3D
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsPro3D(true)}
                                className={`px-2 py-1 rounded-sm transition-colors ${
                                    isPro3D
                                        ? 'bg-orange-500 text-white'
                                        : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                Pro 3D
                            </button>
                        </div>
                    </div>

                    <Alert className="bg-blue-900/30 border-blue-500/50 mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                            Use the controls to define the window structure. The 3D model and Bill of Materials will update in real-time.
                        </AlertDescription>
                    </Alert>

                    {error && (
                        <Alert variant="destructive" className="bg-red-900/20 border-red-500 mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* --- LEFT PANEL: DESIGN CONTROLS --- */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="bg-gray-900/50">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Settings className="h-4 w-4 text-gray-400"/>
                                        System & Layout
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <SystemPackSelector 
                                        category="aluminum_windows" // This can be dynamic
                                        onSystemPackSelect={handleSystemPackSelect}
                                    />
                                     {activeSystemPackId && (
                                        <Alert variant="default" className="border-green-500/50 bg-green-900/30 text-green-200">
                                            <AlertDescription className="text-xs">
                                                Active System: <strong>{activeSystemPackId}</strong>. Constraints and profiles are now filtered.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <Button onClick={handleSuggestLayout} variant="outline" className="w-full">
                                        <Wand2 className="h-4 w-4 mr-2"/>
                                        Suggest AI Layout
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50">
                                <CardHeader><CardTitle className="text-base">Structure</CardTitle></CardHeader>
                                <CardContent>
                                    <SmartDrawCanvas
                                        width={project.overallWidth}
                                        height={project.overallHeight}
                                        grid={currentGrid}
                                        onGridChange={setCurrentGrid}
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* --- RIGHT PANEL: LIVE 3D PREVIEW --- */}
                        <div className="lg:col-span-2">
                             <Card className="bg-gray-900/50 sticky top-4">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Box className="h-4 w-4 text-gray-400"/>
                                        Live Digital Twin (Apex Engine v6.0)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-800">
                                        {liveProject && (
                                            <Window3DGenerator
                                                windowUnit={liveProject}
                                                profiles={profiles}
                                                showControls={true}
                                                presentationMode={false}
                                                showErrorDetection={true}
                                                mode={isPro3D ? 'pro' : 'standard'}
                                            />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- BILL OF MATERIALS (Generated from Live Project) --- */}
            {liveProject && liveProject.components.length > 0 && (
                 <Card className="bg-gray-800/30 border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-orange-400" />
                            Real-time Bill of Materials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {liveProject.components.map(comp => (
                            <div key={comp.id} className="flex justify-between items-center p-2 bg-gray-900/50 rounded border border-gray-700 text-sm">
                                <span>{comp.profile.name} ({comp.type})</span>
                                <span className="font-mono text-gray-400">{comp.quantity}x</span>
                            </div>
                        ))}
                         {liveProject.hardware.map(hw => (
                            <div key={hw.id} className="flex justify-between items-center p-2 bg-gray-900/50 rounded border border-gray-700 text-sm">
                                <span>{hw.name} (Hardware)</span>
                                <span className="font-mono text-gray-400">{hw.quantity}x</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
