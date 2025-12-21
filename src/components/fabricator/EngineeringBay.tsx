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

import { performanceMonitor } from '@/lib/performance';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/ui/collapsible';
import { Profile, WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';
import { AlertCircle, Box, ChevronDown, Cpu, FileText, Settings, Sparkles, Wand2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Dynamic import for heavy 3D component
const Window3DGenerator = React.lazy(() => import('./Window3DGenerator'));

import { generateComponentsFromGrid } from '@/algorithms/smartDraw';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { validateDesign } from '@/lib/fabricator/ConstraintEngine';
import { connectHardwareForWindowType } from '@/lib/fabricator/hardwareConnector';
import { Badge } from '@/shared/ui/ui/badge';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { Layers } from 'lucide-react';
import { SmartDrawCanvas } from './SmartDrawCanvas';

interface EngineeringBayProps {
    project: WindowUnit | null;
    onDesignComplete: (components: WindowComponent[]) => void;
    onHardwareUpdate?: (hardware: any[]) => void;
    profiles: Profile[];
    relatedPositions?: WindowUnit[];
    onSelectPosition?: (id: string) => void;
    onBackToMeasuring?: () => void;
    onAddNewPose?: () => void;
}

export const EngineeringBay: React.FC<EngineeringBayProps> = ({
    project,
    onDesignComplete,
    profiles,
    relatedPositions,
    onSelectPosition,
    onBackToMeasuring,
    onAddNewPose,
}) => {
    const { t } = useTranslation('fabricator');
    // --- State Management ---
    const [currentGrid, setCurrentGrid] = useState<WindowGrid>({ rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }]});
    const [activeSystemPackId, setActiveSystemPackId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPro3D, setIsPro3D] = useState<boolean>(true);
    
    // --- Derived State & Memos ---
    // Get system pack for Gold Tier integration
    const systemPack = useMemo(() => {
        return activeSystemPackId 
            ? SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId) || null
            : null;
    }, [activeSystemPackId]);

    // Gold Tier: Prioritize system pack profiles and use systemProfileSelections
    const effectiveProfiles = useMemo(() => {
        // Start with system pack profiles if available
        if (systemPack?.profiles && systemPack.profiles.length > 0) {
            const systemProfileIds = new Set(systemPack.profiles.map(p => p.id));
            // Merge: system pack profiles first, then add missing from passed profiles
            return [
                ...systemPack.profiles,
                ...profiles.filter(p => !systemProfileIds.has(p.id))
            ];
        }
        return profiles;
    }, [systemPack, profiles]);

    // Gold Tier: Use systemProfileSelections to map profile codes to actual profiles
    const selectedProfiles = useMemo(() => {
        if (!project?.systemProfileSelections || !systemPack) {
            return effectiveProfiles;
        }

        const selections = project.systemProfileSelections;
        const mappedProfiles: Profile[] = [];

        // Map frame profile
        if (selections.frameProfileCode) {
            const frameProfile = effectiveProfiles.find(p => 
                p.code === selections.frameProfileCode || p.id === selections.frameProfileCode
            );
            if (frameProfile) {
                mappedProfiles.push({ ...frameProfile, profileRole: 'frame' });
            }
        }

        // Map sash profile
        if (selections.sashProfileCode) {
            const sashProfile = effectiveProfiles.find(p => 
                p.code === selections.sashProfileCode || p.id === selections.sashProfileCode
            );
            if (sashProfile) {
                mappedProfiles.push({ ...sashProfile, profileRole: 'sash' });
            }
        }

        // Map bead profile
        if (selections.beadProfileCode) {
            const beadProfile = effectiveProfiles.find(p => 
                p.code === selections.beadProfileCode || p.id === selections.beadProfileCode
            );
            if (beadProfile) {
                mappedProfiles.push({ ...beadProfile, profileRole: 'glazing_bead' });
            }
        }

        // Add any missing required profiles from system pack
        const requiredRoles = ['frame', 'sash', 'glazing_bead'];
        requiredRoles.forEach(role => {
            if (!mappedProfiles.some(p => p.profileRole === role)) {
                const roleProfile = systemPack.profiles?.find(p => p.profileRole === role);
                if (roleProfile) {
                    const matched = effectiveProfiles.find(p => 
                        p.id === roleProfile.id || 
                        (p.code === roleProfile.code && p.profileRole === role)
                    );
                    if (matched) {
                        mappedProfiles.push({ ...matched, profileRole: role });
                    }
                }
            }
        });

        return mappedProfiles.length > 0 ? mappedProfiles : effectiveProfiles;
    }, [project?.systemProfileSelections, effectiveProfiles, systemPack]);

    // The "live" project object that reflects the current state of the engineering design
    const liveProject = useMemo<WindowUnit | null>(() => {
        if (!project) return null;

        // Gold Tier: Generate components with system pack integration
        const { components, hardware: generatedHardware } = generateComponentsFromGrid(
            project,
            currentGrid,
            selectedProfiles, // Use system-aware profiles
            activeSystemPackId,
            systemPack // Pass system pack for glass allowances and hardware
        );

        // Gold Tier: Auto-connect hardware based on window type
        const connectedHardware = connectHardwareForWindowType(
            { ...project, components },
            components,
            systemPack
        );

        // Merge generated hardware with connected hardware (avoid duplicates)
        const hardwareMap = new Map<string, any>();
        
        // Add generated hardware first
        generatedHardware.forEach(hw => {
            hardwareMap.set(hw.id || `${hw.type}-${hw.name}`, hw);
        });
        
        // Add connected hardware (override if same type/name)
        connectedHardware.forEach(hw => {
            const key = hw.id || `${hw.type}-${hw.name}`;
            const existing = hardwareMap.get(key);
            if (existing) {
                // Merge quantities if same type
                hardwareMap.set(key, { ...existing, quantity: existing.quantity + hw.quantity });
            } else {
                hardwareMap.set(key, hw);
            }
        });
        
        const allHardware = Array.from(hardwareMap.values());

        return {
            ...project,
            grid: currentGrid,
            components,
            hardware: allHardware,
            systemPackId: activeSystemPackId,
            updatedAt: new Date(),
        };
    }, [project, currentGrid, selectedProfiles, activeSystemPackId, systemPack]);

    // --- Performance: Memoized BOM Data Calculations ---
    const bomData = useMemo(() => {
        if (!liveProject || !liveProject.components || liveProject.components.length === 0) {
            return null;
        }

        // Component categorization
        const componentsByCategory = {
            frame: [] as WindowComponent[],
            sash: [] as WindowComponent[],
            structural: [] as WindowComponent[],
            glazing: [] as WindowComponent[],
            accessory: [] as WindowComponent[],
            other: [] as WindowComponent[],
        };

        liveProject.components.forEach(comp => {
            const role = comp.profile?.profileRole;
            if (!role) {
                componentsByCategory.other.push(comp);
                return;
            }

            if (role.startsWith('frame') || role === 'architrave' || role === 'threshold' || 
                role === 'sill' || role === 'head' || role === 'jamb') {
                componentsByCategory.frame.push(comp);
            } else if (role.startsWith('sash') || role === 'screen_sash') {
                componentsByCategory.sash.push(comp);
            } else if (role === 'mullion' || role === 'mullion_false' || role === 'transom' || 
                       role === 'reinforcement' || role === 'corner_cleat') {
                componentsByCategory.structural.push(comp);
            } else if (role.startsWith('glazing_bead')) {
                componentsByCategory.glazing.push(comp);
            } else if (role === 'interlock' || role === 'screen_adapter' || role === 'panel' || 
                       role === 'gasket' || role === 'weather_strip' || role === 'accessory') {
                componentsByCategory.accessory.push(comp);
            } else {
                componentsByCategory.other.push(comp);
            }
        });

        // Get system pack
        const systemPack = liveProject.systemPackId 
            ? SYSTEM_PACKS.find(p => p.meta.id === liveProject.systemPackId)
            : null;

        // Verify profile specs function
        const verifyProfileSpecs = (profile: Profile | undefined, systemPackProfiles: Profile[] | undefined) => {
            if (!profile || !systemPackProfiles) return { verified: false, missing: [], mismatched: [] };
            
            const systemProfile = systemPackProfiles.find(p => 
                p.id === profile.id || 
                p.name === profile.name ||
                (p.profileRole === profile.profileRole && p.width === profile.width)
            );
            
            if (!systemProfile) {
                return { verified: false, missing: [t('engineering_bay.verification.profile_not_found', 'Profile not found in system pack')], mismatched: [] };
            }
            
            const missing: string[] = [];
            const mismatched: string[] = [];
            
            if (!profile.width && systemProfile.width) missing.push('width');
            if (!profile.height && systemProfile.height) missing.push('height');
            if (!profile.costPerMeter && systemProfile.costPerMeter) missing.push('costPerMeter');
            if (!profile.weightPerMeter && systemProfile.weightPerMeter) missing.push('weightPerMeter');
            
            if (profile.width && systemProfile.width && Math.abs(profile.width - systemProfile.width) > 1) {
                mismatched.push(`width (${profile.width} vs ${systemProfile.width})`);
            }
            if (profile.costPerMeter && systemProfile.costPerMeter && 
                Math.abs(profile.costPerMeter - systemProfile.costPerMeter) > 0.01) {
                mismatched.push(`costPerMeter`);
            }
            
            return {
                verified: missing.length === 0 && mismatched.length === 0,
                missing,
                mismatched,
                systemProfile
            };
        };

        // Glass details calculation
        const sashComponents = liveProject.components.filter(c => 
            c.profile?.profileRole?.startsWith('sash') || c.type === 'sash'
        );
        const glassSpecs: Array<{ sashIndex: number; width: number; height: number; area: number; type: string }> = [];
        
        const sashGroups = new Map<string, WindowComponent[]>();
        sashComponents.forEach(comp => {
            const cellId = comp.id.split('_').slice(0, -1).join('_');
            if (!sashGroups.has(cellId)) {
                sashGroups.set(cellId, []);
            }
            sashGroups.get(cellId)!.push(comp);
        });

        sashGroups.forEach((sashParts) => {
            const topBottom = sashParts.find(p => p.id.includes('top') || p.id.includes('bottom'));
            const leftRight = sashParts.find(p => p.id.includes('left') || p.id.includes('right'));
            
            if (topBottom && leftRight) {
                const sashProfile = sashParts[0]?.profile;
                const sashWidth = topBottom.width - (2 * (sashProfile?.width || 0));
                const sashHeight = leftRight.height - (2 * (sashProfile?.width || 0));
                const glassWidth = Math.max(0, sashWidth);
                const glassHeight = Math.max(0, sashHeight);
                const area = (glassWidth * glassHeight) / 1_000_000;
                
                glassSpecs.push({
                    sashIndex: glassSpecs.length + 1,
                    width: glassWidth,
                    height: glassHeight,
                    area,
                    type: liveProject.glazing?.type || 'double'
                });
            }
        });

        const totalGlassArea = glassSpecs.reduce((sum, g) => sum + g.area, 0);
        const glazingType = liveProject.glazing?.type || 'double';
        const glassThickness = liveProject.glazing?.thickness || 24;
        const paneCount = glazingType === 'single' ? 1 : glazingType === 'double' ? 2 : 3;
        const totalGlassWeight = totalGlassArea * glassThickness * 2.5 * paneCount;

        const glassDetails = { glassSpecs, totalGlassArea, glazingType, glassThickness, totalGlassWeight };

        // Totals calculation
        let totalMaterialCost = 0;
        let totalWeight = 0;
        
        Object.values(componentsByCategory).forEach(comps => {
            comps.forEach(comp => {
                if (comp.profile) {
                    const length = comp.cuttingLengths?.[0] || 0;
                    const quantity = comp.quantity || 1;
                    const lengthMeters = (length / 1000) * quantity;
                    totalMaterialCost += (comp.profile.costPerMeter || 0) * lengthMeters;
                    totalWeight += (comp.profile.weightPerMeter || 0) * lengthMeters;
                }
            });
        });
        
        liveProject.hardware.forEach(hw => {
            if (hw.type === 'reinforcement' && hw.length && hw.profileId) {
                const reinforcementProfile = profiles.find(p => p.id === hw.profileId);
                if (reinforcementProfile) {
                    const lengthMeters = (hw.length / 1000) * (hw.quantity || 1);
                    totalMaterialCost += (reinforcementProfile.costPerMeter || 0) * lengthMeters;
                    totalWeight += (reinforcementProfile.weightPerMeter || 0) * lengthMeters;
                }
            }
        });

        const totals = { materialCost: totalMaterialCost, weight: totalWeight };

        // Aggregation by category
        const aggregatedByCategory: Record<string, Record<string, {
            profile: Profile | undefined;
            type: string;
            quantity: number;
            totalLength: number;
            totalWeight: number;
            totalCost: number;
            role?: string;
            verification: ReturnType<typeof verifyProfileSpecs>;
            specs: {
                width?: number;
                height?: number;
                material?: string;
                costPerMeter?: number;
                weightPerMeter?: number;
                color?: string;
            };
        }>> = {};

        Object.entries(componentsByCategory).forEach(([category, comps]) => {
            if (comps.length === 0) return;
            
                const aggregated = comps.reduce((acc, comp) => {
                const key = `${comp.profile?.name || comp.type}_${comp.type}`;
                if (!acc[key]) {
                    const profile = comp.profile;
                    
                    const verification = verifyProfileSpecs(profile, systemPack?.profiles);
                    
                                        acc[key] = {
                                            profile: profile,
                                            type: comp.type,
                                            quantity: 0,
                                            totalLength: 0,
                                            totalWeight: 0,
                                            totalCost: 0,
                                            role: profile?.profileRole,
                                            verification: verification,
                                            specs: {
                                                width: profile?.width,
                                                height: profile?.height,
                                                material: profile?.material,
                                                costPerMeter: profile?.costPerMeter,
                                                weightPerMeter: profile?.weightPerMeter,
                                                color: profile?.color,
                                            }
                                        };
                                    }
                                    const compLength = comp.cuttingLengths?.[0] || 0;
                                    const quantity = comp.quantity || 1;
                                    const lengthMeters = (compLength / 1000) * quantity;
                                    const profile = comp.profile;
                                    
                                    acc[key].quantity += quantity;
                                    acc[key].totalLength += compLength * quantity;
                                    acc[key].totalWeight += (profile?.weightPerMeter || 0) * lengthMeters;
                                    acc[key].totalCost += (profile?.costPerMeter || 0) * lengthMeters;
                                    return acc;
            }, {} as Record<string, any>);
            
            aggregatedByCategory[category] = aggregated;
        });

        return {
            componentsByCategory,
            glassDetails,
            totals,
            aggregatedByCategory,
            systemPack,
            verifyProfileSpecs
        };
    }, [liveProject, profiles, t]);

    // --- Effects ---
    // Sync state when the master project object changes (e.g., loading a saved project)
    // Preserve all data from measuring step including grid, systemProfileSelections, etc.
    useEffect(() => {
        if (project) {
            // Preserve grid layout from measuring step
            setCurrentGrid(project.grid || { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] });
            // Preserve system pack selection from measuring step
            setActiveSystemPackId(project.systemPackId || null);
            // Note: systemProfileSelections, measurementMode, wallDeduction, etc. are already
            // preserved in the project object and can be accessed via project.systemProfileSelections
        }
    }, [project]);

    // --- Performance Monitoring ---
    useEffect(() => {
        const startTime = performance.now();
        
        return () => {
            const renderTime = performance.now() - startTime;
            if (renderTime > 100) {
                console.warn(`[Performance] EngineeringBay render: ${renderTime.toFixed(2)}ms`);
            }
            // Track with monitor
            performanceMonitor.track('engineering_bay_render', renderTime, 'EngineeringBay');
        };
    });

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

    const handleSubmit = useCallback((): boolean => {
        if (!liveProject) {
            setError('Cannot complete design: project data is missing.');
            return false;
        }
        if (liveProject.components.length === 0) {
            setError('Cannot complete design: the grid is empty or invalid.');
            return false;
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
            return false;
        }

        setError(null);
        onDesignComplete(liveProject.components);
        return true;
    }, [liveProject, onDesignComplete, currentGrid, activeSystemPackId]);

    const handleSaveAndNext = useCallback(() => {
        const ok = handleSubmit();
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
    }, [handleSubmit, onAddNewPose, project, relatedPositions, onSelectPosition]);
    
    // --- Render Logic ---
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

    return (
        <div className="space-y-6">
            {/* --- MASTER CONTROL CARD --- */}
            <Card className="bg-gray-800/30 border-gray-700 shadow-2xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-3">
                            <Cpu className="h-6 w-6 text-orange-400" />
                            <span className="text-xl">{t('engineering_bay.title', 'Engineering Bay')}</span>
                        </CardTitle>
                        {liveProject && (
                          <div className="flex items-center gap-2">
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
                              onClick={handleSubmit}
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
                                {t('engineering_bay.standard_3d', 'Standard 3D')}
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
                                        {t('engineering_bay.system_configuration', 'System Configuration')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-gray-300">{t('engineering_bay.active_system', 'Active System')}</Label>
                                        {activeSystemPackId && (
                                            <div className="text-[11px] text-gray-400" title={(() => {
                                                const pack = SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId);
                                                return pack ? `${pack.meta.name} (${pack.meta.brands?.join(', ') || 'Brand'})` : activeSystemPackId;
                                            })()}>
                                                {(() => {
                                                    const pack = SYSTEM_PACKS.find(p => p.meta.id === activeSystemPackId);
                                                    return pack ? `${pack.meta.name} • ${pack.meta.brands?.join(', ') || 'Brand'}` : activeSystemPackId;
                                                })()}
                                            </div>
                                        )}
                                        <Select
                                            value={activeSystemPackId}
                                            onValueChange={handleSystemPackSelect}
                                        >
                                            <SelectTrigger className="h-9 bg-gray-950 border-gray-700 text-xs text-gray-100 focus:ring-orange-500/20">
                                                <SelectValue placeholder={t('engineering_bay.select_system', 'Select System')} />
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
                                        <Wand2 className="h-4 w-4 mr-2"/>
                                        {t('engineering_bay.suggest_ai_layout', 'Suggest AI Layout')}
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="bg-gray-900/50">
                                <CardHeader><CardTitle className="text-base">{t('engineering_bay.structure', 'Structure')}</CardTitle></CardHeader>
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
                                        {t('engineering_bay.live_digital_twin', 'Live Digital Twin (Apex Engine v6.0)')}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                     <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-800">
                                        {liveProject && (
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
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- BILL OF MATERIALS (Maalem-Grade Precision) --- */}
            {bomData && (() => {
                const { componentsByCategory, glassDetails, totals, aggregatedByCategory, systemPack } = bomData;
                
                const categoryLabels = {
                    frame: t('engineering_bay.bom_frame', 'Frame Profiles'),
                    sash: t('engineering_bay.bom_sash', 'Sash Profiles'),
                    structural: t('engineering_bay.bom_structural', 'Structural Profiles'),
                    glazing: t('engineering_bay.bom_glazing', 'Glazing Profiles'),
                    accessory: t('engineering_bay.bom_accessory', 'Accessory Profiles'),
                    other: t('engineering_bay.bom_other', 'Other Components'),
                };

                return (
                    <Card className="bg-gray-800/30 border-gray-700">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-orange-400" />
                                {t('engineering_bay.bill_of_materials', 'Real-time Bill of Materials')}
                            </CardTitle>
                            <CardDescription className="text-xs text-gray-400">
                                {t('engineering_bay.bom_precision_note', 'Maalem-grade precision - All components from unit preset')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Grouped by category */}
                            {Object.entries(componentsByCategory).map(([category, comps]) => {
                                if (comps.length === 0) return null;

                                const aggregated = aggregatedByCategory[category] || {};

                                return (
                                    <Collapsible key={category} defaultOpen={false} className="space-y-2">
                                        <CollapsibleTrigger className="flex items-center justify-between w-full p-2 sm:p-2.5 hover:bg-gray-800/50 rounded transition-colors touch-manipulation">
                                            <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide truncate flex-1 text-left">
                                                {categoryLabels[category as keyof typeof categoryLabels]}
                                            </h4>
                                            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-180 flex-shrink-0 ml-2" />
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-1.5 sm:space-y-2 pt-1">
                                        {Object.values(aggregated).map((item: any, idx) => {
                                            const isVerified = item.verification?.verified !== false;
                                            const hasMissing = item.verification?.missing?.length > 0;
                                            const hasMismatched = item.verification?.mismatched?.length > 0;
                                            
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-2.5 rounded border text-xs sm:text-sm gap-1 sm:gap-0 ${
                                                        isVerified 
                                                            ? 'bg-gray-900/50 border-gray-700' 
                                                            : hasMissing || hasMismatched
                                                            ? 'bg-yellow-900/20 border-yellow-700/50'
                                                            : 'bg-gray-900/50 border-gray-700'
                                                    }`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            {/* Profile Thumbnail in BOM */}
                                                            {item.profile?.thumbnailUrl && (
                                                                <img 
                                                                    src={item.profile.thumbnailUrl} 
                                                                    alt={item.profile.name || item.type}
                                                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-700 object-contain bg-white/5 flex-shrink-0"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                            <div className="font-medium text-white text-xs sm:text-sm truncate">
                                                                {item.profile?.name || item.type}
                                                            </div>
                                                            {!isVerified && (
                                                                <span className="text-[8px] sm:text-[10px] text-yellow-400 bg-yellow-900/30 px-1 py-0.5 rounded" title={
                                    hasMissing ? `${t('engineering_bay.verification.missing', 'Missing:')} ${item.verification.missing.map((m: string) => t(`engineering_bay.specs.${m}`, m)).join(', ')}` :
                                    hasMismatched ? `${t('engineering_bay.verification.mismatch', 'Mismatch:')} ${item.verification.mismatched.join(', ')}` :
                                    t('engineering_bay.verification.not_verified', 'Not verified')
                                                                }>
                                                                    ⚠
                                                                </span>
                                                            )}
                                                            {isVerified && item.verification && (
                                                                <span className="text-[8px] sm:text-[10px] text-green-400" title={t('engineering_bay.verification.verified', 'Verified against system pack')}>
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 break-words space-x-1">
                                                            <span className="inline-block">{item.type}</span>
                                                            {item.role && <span className="inline-block"> • {item.role}</span>}
                                                            {item.specs?.material && <span className="inline-block"> • {item.specs.material}</span>}
                                                            {item.specs?.width && <span className="inline-block"> • {item.specs.width}{t('engineering_bay.units.mm', 'mm')}</span>}
                                                            {item.specs?.height && <span className="inline-block"> × {item.specs.height}{t('engineering_bay.units.mm', 'mm')}</span>}
                                                            {item.totalLength > 0 && <span className="inline-block"> • {Math.round(item.totalLength)}{t('engineering_bay.units.mm', 'mm')}</span>}
                                                            {item.totalWeight > 0 && <span className="inline-block"> • {item.totalWeight.toFixed(2)}{t('engineering_bay.units.kg', 'kg')}</span>}
                                                            {item.totalCost > 0 && <span className="inline-block"> • {item.totalCost.toFixed(2)} {t('engineering_bay.currency', 'EGP')}</span>}
                                                        </div>
                                                        {/* Show missing specs warning */}
                                                        {hasMissing && (
                                                            <div className="text-[9px] text-yellow-400 mt-1">
                                                                {t('engineering_bay.verification.missing', 'Missing:')} {item.verification.missing.map((m: string) => t(`engineering_bay.specs.${m}`, m)).join(', ')}
                                                            </div>
                                                        )}
                                                        {hasMismatched && (
                                                            <div className="text-[9px] text-yellow-400 mt-1">
                                                                {t('engineering_bay.verification.mismatch', 'Mismatch:')} {item.verification.mismatched.join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-gray-300 font-bold sm:ml-4 text-xs sm:text-sm flex-shrink-0">
                                                        {item.quantity}{t('engineering_bay.units.quantity', 'x')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}

                            {/* Glass/Glazing Details - Collapsible */}
                            {glassDetails.glassSpecs.length > 0 && (
                                <Collapsible defaultOpen={false} className="space-y-2 pt-2 border-t border-gray-700">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-gray-800/50 rounded transition-colors">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                            {t('engineering_bay.bom_glass', 'Glass & Glazing')}
                                        </h4>
                                        <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-180" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 pt-1">
                                        {glassDetails.glassSpecs.map((glass, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex justify-between items-center p-2 bg-gray-900/50 rounded border border-gray-700 text-sm"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-white">
                                                        {t('engineering_bay.glass_sash', 'Sash')} {glass.sashIndex} - {glass.type} {glassDetails.glassThickness}mm
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        {Math.round(glass.width)}{t('engineering_bay.units.mm', 'mm')} × {Math.round(glass.height)}{t('engineering_bay.units.mm', 'mm')}
                                                        {` • ${glass.area.toFixed(2)}${t('engineering_bay.units.m2', 'm²')}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="p-2 bg-gray-900/30 rounded border border-gray-600 text-xs">
                                            <div className="flex justify-between text-gray-300">
                                                <span>{t('engineering_bay.total_glass_area', 'Total Glass Area')}:</span>
                                                <span className="font-mono font-bold">{glassDetails.totalGlassArea.toFixed(2)}{t('engineering_bay.units.m2', 'm²')}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-300 mt-1">
                                                <span>{t('engineering_bay.total_glass_weight', 'Total Glass Weight')}:</span>
                                                <span className="font-mono font-bold">{glassDetails.totalGlassWeight.toFixed(2)}{t('engineering_bay.units.kg', 'kg')}</span>
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {/* Hardware - Collapsible */}
                            {liveProject.hardware && liveProject.hardware.length > 0 && (
                                <Collapsible defaultOpen={false} className="space-y-2 pt-2 border-t border-gray-700">
                                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 sm:p-2.5 hover:bg-gray-800/50 rounded transition-colors touch-manipulation">
                                        <h4 className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide truncate flex-1 text-left">
                                            {t('engineering_bay.bom_hardware', 'Hardware')}
                                        </h4>
                                        <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 transition-transform duration-200 data-[state=open]:rotate-180 flex-shrink-0 ml-2" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-1.5 sm:space-y-2 pt-1">
                                    {liveProject.hardware.map(hw => (
                                        <div 
                                            key={hw.id} 
                                            className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 sm:p-2.5 bg-gray-900/50 rounded border border-gray-700 text-xs sm:text-sm gap-1 sm:gap-0"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-white text-xs sm:text-sm truncate">{hw.name}</div>
                                                <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 break-words">
                                                    <span className="inline-block">{hw.type}</span>
                                                    {hw.length && <span className="inline-block"> • {Math.round(hw.length)}{t('engineering_bay.units.mm', 'mm')}</span>}
                                                    {hw.position && <span className="inline-block"> • {hw.position}</span>}
                                                </div>
                                            </div>
                                            <span className="font-mono text-gray-300 font-bold sm:ml-4 text-xs sm:text-sm flex-shrink-0">
                                                {hw.quantity || 1}{hw.type === 'gasket' ? t('engineering_bay.units.meters', 'm') : hw.type === 'reinforcement' ? ` ${t('engineering_bay.units.bars', 'bars')}` : t('engineering_bay.units.quantity', 'x')}
                                            </span>
                                        </div>
                                    ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            )}

                            {/* Unit Summary & Totals - Always visible */}
                            <div className="space-y-2 pt-2 border-t-2 border-gray-600">
                                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide">
                                    {t('engineering_bay.bom_summary', 'Unit Summary')}
                                </h4>
                                <div className="p-3 bg-gray-900/40 rounded border border-gray-600 space-y-2 text-sm">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-400">{t('engineering_bay.unit_dimensions', 'Dimensions')}:</span>
                                            <div className="font-mono text-white font-bold mt-0.5">
                                                {Math.round(liveProject.overallWidth)}{t('engineering_bay.units.mm', 'mm')} × {Math.round(liveProject.overallHeight)}{t('engineering_bay.units.mm', 'mm')}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">{t('engineering_bay.system_pack', 'System Pack')}:</span>
                                            <div className="text-white font-medium mt-0.5">
                                                {systemPack?.meta.name || liveProject.systemPackId || t('engineering_bay.not_specified', 'Not specified')}
                                            </div>
                                        </div>
                                        {liveProject.positionMeta && (
                                            <>
                                                {liveProject.positionMeta.flatNumber && (
                                                    <div>
                                                        <span className="text-gray-400">{t('engineering_bay.flat_number', 'Flat')}:</span>
                                                        <div className="text-white mt-0.5">{liveProject.positionMeta.flatNumber}</div>
                                                    </div>
                                                )}
                                                {liveProject.positionMeta.floor && (
                                                    <div>
                                                        <span className="text-gray-400">{t('engineering_bay.floor', 'Floor')}:</span>
                                                        <div className="text-white mt-0.5">{liveProject.positionMeta.floor}</div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <div className="pt-2 border-t border-gray-700 space-y-1">
                                        <div className="flex justify-between text-gray-300">
                                            <span>{t('engineering_bay.total_material_cost', 'Total Material Cost')}:</span>
                                            <span className="font-mono font-bold text-orange-400">
                                                {totals.materialCost.toFixed(2)} {t('engineering_bay.currency', 'EGP')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-gray-300">
                                            <span>{t('engineering_bay.total_profile_weight', 'Total Profile Weight')}:</span>
                                            <span className="font-mono font-bold">
                                                {totals.weight.toFixed(2)}{t('engineering_bay.units.kg', 'kg')}
                                            </span>
                                        </div>
                                        {glassDetails.totalGlassWeight > 0 && (
                                            <div className="flex justify-between text-gray-300">
                                                <span>{t('engineering_bay.total_unit_weight', 'Total Unit Weight')}:</span>
                                                <span className="font-mono font-bold text-blue-400">
                                                    {(totals.weight + glassDetails.totalGlassWeight).toFixed(2)}{t('engineering_bay.units.kg', 'kg')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })()}
        </div>
    );
};
