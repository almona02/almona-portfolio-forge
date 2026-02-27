import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import {
    useDeletePose,
    useProject,
    useProjectPositions,
    useUpsertPose,
} from '@/hooks/useFabricatorQueries';
import { ApexEngineV6, ApexV6Output } from '@/lib/fabricator/goldTier/ApexEngineV6';
import { FeatureFlags } from '@/lib/featureFlags';
import { Button } from '@/shared/ui/ui/button';
import {
    Tabs,
    TabsList,
    TabsTrigger
} from '@/shared/ui/ui/tabs';
import { Profile, WindowComponent, WindowUnit } from '@/types/fabricator';
import {
    Copy,
    FileText,
    Layout,
    Loader2,
    Menu,
    MonitorPlay,
    Plus,
    Trash2
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { EngineeringBay } from '../EngineeringBay';
import { ProjectOptimizer } from './ProjectOptimizer';
import { ProjectQuote } from './ProjectQuote';

/**
 * PROJECT STUDIO (Reality Workflow)
 * 
 * The main container for the professional fabrication workflow.
 * Manages:
 * 1. Project Context (Client, Job ID)
 * 2. List of Window Units (Designs)
 * 3. Workflow Stages: Design -> Optimization -> Quote
 *
 * When FeatureFlags.FABRICATOR_READ_V2 is true, project and pose data
 * are sourced from React Query (server state).  Otherwise, the legacy
 * local-state path is used for backward compatibility.
 */

interface ProjectStudioProps {
    /** V2: pass projectId to load from Supabase via React Query */
    projectId?: string;
    /** Legacy: full project object for local-state mode */
    initialProject?: {
        id: string;
        clientName: string;
        reference: string;
        units: WindowUnit[];
    };
    profiles: Profile[];
}

// Mock initial project if none provided (legacy mode)
const DEFAULT_PROJECT = {
    id: 'proj-' + Date.now(),
    clientName: 'New Client',
    reference: 'REF-001',
    units: [] as WindowUnit[],
};

export const ProjectStudio: React.FC<ProjectStudioProps> = ({
    projectId,
    initialProject = DEFAULT_PROJECT,
    profiles
}) => {
    const useV2 = FeatureFlags.FABRICATOR_READ_V2 && !!projectId;

    // ─── V2: React Query as single source of truth ─────────────────
    const { data: projectMeta } = useProject(useV2 ? projectId : undefined);
    const v2Units = useProjectPositions(useV2 ? projectId : undefined);
    const upsertPose = useUpsertPose();
    const deletePoseMutation = useDeletePose();

    // ─── Legacy: local state ───────────────────────────────────────
    const [localProject, setLocalProject] = useState(initialProject);

    // ─── Unified read surface ──────────────────────────────────────
    const project = useMemo(() => {
        if (useV2 && projectMeta) {
            return {
                id: projectMeta.id,
                clientName: projectMeta.client_name,
                reference: projectMeta.project_code,
                units: v2Units,
            };
        }
        return localProject;
    }, [useV2, projectMeta, v2Units, localProject]);

    // ─── UI-only state ─────────────────────────────────────────────
    const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
    const [workflowStage, setWorkflowStage] = useState<'design' | 'optimize' | 'quote'>('design');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Optimization Results Cache
    const [optimizationResults, setOptimizationResults] = useState<{
        projectSummary: any;
        unitResults: Map<string, ApexV6Output>;
    } | null>(null);
    const [optimizationProgress, setOptimizationProgress] = useState<{
        isRunning: boolean;
        processed: number;
        total: number;
        currentUnitLabel: string | null;
    }>({
        isRunning: false,
        processed: 0,
        total: 0,
        currentUnitLabel: null,
    });

    // --- Derived State ---
    const activeUnit = useMemo(() =>
        project.units.find(u => u.id === activeUnitId) || null,
        [project.units, activeUnitId]);

    // --- Actions ---

    const handleAddUnit = useCallback(() => {
        const newUnit: WindowUnit = {
            id: `unit-${Date.now()}`,
            orderNumber: `ORD-${Date.now()}`,
            posNumber: `U${project.units.length + 1}`,
            type: 'casement',
            overallWidth: 1000,
            overallHeight: 1200,
            components: [],
            quantity: 1,
            color: 'white',
            glazing: {},
            hardware: [],
            status: 'design',
            optimization: null,
            systemPackId: 'generic-60',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        if (useV2) {
            // Persist through React Query — cache invalidation refreshes units
            upsertPose.mutate({ windowUnit: newUnit }, {
                onSuccess: () => toast.success(`Unit ${newUnit.posNumber} added`),
                onError: (err) => toast.error(`Failed to add unit: ${err}`),
            });
        } else {
            setLocalProject(prev => ({
                ...prev,
                units: [...prev.units, newUnit]
            }));
            toast.success(`Unit ${newUnit.posNumber} added`);
        }
        setActiveUnitId(newUnit.id);
        setWorkflowStage('design');
    }, [project.units, useV2, upsertPose]);

    const handleDuplicateUnit = useCallback((unitId: string) => {
        const unit = project.units.find(u => u.id === unitId);
        if (!unit) return;

        const newUnit: WindowUnit = {
            ...unit,
            id: `unit-${Date.now()}`,
            posNumber: `${unit.posNumber} (Copy)`,
            updatedAt: new Date()
        };

        if (useV2) {
            upsertPose.mutate({ windowUnit: newUnit }, {
                onSuccess: () => toast.success('Unit duplicated'),
            });
        } else {
            setLocalProject(prev => ({
                ...prev,
                units: [...prev.units, newUnit]
            }));
            toast.success('Unit duplicated');
        }
    }, [project.units, useV2, upsertPose]);

    const handleDeleteUnit = useCallback((unitId: string) => {
        if (useV2) {
            deletePoseMutation.mutate(unitId, {
                onSuccess: () => toast.success('Unit removed'),
                onError: (err) => toast.error(`Failed to remove unit: ${err}`),
            });
        } else {
            setLocalProject(prev => ({
                ...prev,
                units: prev.units.filter(u => u.id !== unitId)
            }));
            toast.success('Unit removed');
        }
        if (activeUnitId === unitId) {
            setActiveUnitId(null);
        }
    }, [activeUnitId, useV2, deletePoseMutation]);

    const handleUpdateUnit = useCallback((unitId: string, updates: Partial<WindowUnit>) => {
        const unit = project.units.find(u => u.id === unitId);
        if (!unit) return;

        if (useV2) {
            upsertPose.mutate({ windowUnit: { ...unit, ...updates } });
        } else {
            setLocalProject(prev => ({
                ...prev,
                units: prev.units.map(u => u.id === unitId ? { ...u, ...updates } : u)
            }));
        }
    }, [project.units, useV2, upsertPose]);

    const handleDesignComplete = useCallback((components: WindowComponent[]) => {
        if (activeUnitId) {
            handleUpdateUnit(activeUnitId, { components });
        }
    }, [activeUnitId, handleUpdateUnit]);

    // --- Optimization Logic ---
    const runProjectOptimization = useCallback(async () => {
        if (optimizationProgress.isRunning) {
            return;
        }

        if (project.units.length === 0) {
            toast.error("No units to optimize");
            return;
        }

        setWorkflowStage('optimize');
        setOptimizationProgress({
            isRunning: true,
            processed: 0,
            total: project.units.length,
            currentUnitLabel: null,
        });
        const toastId = toast.loading("Running Apex Engine Optimization...");

        try {
            // 1. Calculate Per-Unit Manufacturing Data
            const unitResults = new Map<string, ApexV6Output>();

            for (const unit of project.units) {
                setOptimizationProgress((prev) => ({
                    ...prev,
                    currentUnitLabel: unit.posNumber || unit.id,
                }));
                await new Promise<void>((resolve) => {
                    setTimeout(resolve, 0);
                });

                // Find system pack
                const pack = SYSTEM_PACKS.find(p => p.meta.id === (unit.systemPackId || 'generic-60')) || SYSTEM_PACKS[0];

                // Init Engine
                const engine = new ApexEngineV6(pack, unit, 'miter');
                const result = engine.generate();
                unitResults.set(unit.id, result);

                setOptimizationProgress((prev) => ({
                    ...prev,
                    processed: prev.processed + 1,
                }));
            }

            // 2. Global Aggregation (Todo: Implement true global nesting in ProjectOptimizer)
            // For now, we aggregate the financials
            const totalCost = Array.from(unitResults.values()).reduce((acc, curr) => acc + curr.financials.totalCost, 0);

            setOptimizationResults({
                projectSummary: { totalCost, unitCount: project.units.length },
                unitResults
            });

            toast.dismiss(toastId);
            toast.success("Optimization Complete", { description: `Processed ${project.units.length} units.` });
            setWorkflowStage('optimize');

        } catch (err) {
            toast.dismiss(toastId);
            toast.error("Optimization Failed");
            console.error(err);
        } finally {
            setOptimizationProgress({
                isRunning: false,
                processed: 0,
                total: 0,
                currentUnitLabel: null,
            });
        }
    }, [optimizationProgress.isRunning, project.units]);

    return (
        <div className="flex h-full bg-gray-950 text-white overflow-hidden font-sans">

            {/* --- SIDEBAR: Project Items --- */}
            <div className={`
        ${isSidebarOpen ? 'w-80' : 'w-16'} 
        flex-shrink-0 bg-gray-900 border-r border-gray-800 transition-all duration-300 flex flex-col z-20
      `}>
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    {isSidebarOpen ? (
                        <div>
                            <h2 className="font-bold text-lg text-orange-500">ALMONA</h2>
                            <p className="text-xs text-gray-400">Fabricator Studio</p>
                        </div>
                    ) : (
                        <div className="mx-auto font-bold text-orange-500">A</div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu className="h-4 w-4" />
                    </Button>
                </div>

                {isSidebarOpen && (
                    <div className="p-4 space-y-4">
                        <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Project</div>
                            <div className="font-medium truncate">{project.clientName}</div>
                            <div className="text-sm text-gray-500">{project.reference}</div>
                        </div>

                        <Button onClick={handleAddUnit} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                            <Plus className="h-4 w-4 mr-2" /> Add New Unit
                        </Button>
                    </div>
                )}

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                        {project.units.map((unit, idx) => (
                            <div
                                key={unit.id}
                                className={`
                  group relative p-3 rounded-lg border transition-all cursor-pointer
                  ${activeUnitId === unit.id
                                        ? 'bg-gray-800 border-orange-500/50 shadow-lg'
                                        : 'bg-gray-900/30 border-gray-800 hover:bg-gray-800 hover:border-gray-700'}
                `}
                                onClick={() => {
                                    setActiveUnitId(unit.id);
                                    if (workflowStage !== 'design') setWorkflowStage('design');
                                }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        <span className="bg-gray-700 text-gray-300 text-[10px] px-1.5 rounded">{idx + 1}</span>
                                        {isSidebarOpen && <span className="truncate">{unit.posNumber}</span>}
                                    </div>
                                    {isSidebarOpen && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDuplicateUnit(unit.id); }}>
                                                <Copy className="h-3 w-3 text-gray-400" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-400" onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit.id); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isSidebarOpen && (
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>{unit.overallWidth} x {unit.overallHeight}</span>
                                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-gray-700">
                                            {unit.systemPackId || 'Generic'}
                                        </Badge>
                                    </div>
                                )}

                                {/* Active Indicator Strip */}
                                {activeUnitId === unit.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500 rounded-l-lg" />
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Workflow Actions */}
                {isSidebarOpen && (
                    <div className="p-4 border-t border-gray-800 space-y-2">
                        <Button
                            onClick={runProjectOptimization}
                            disabled={optimizationProgress.isRunning}
                            variant="outline"
                            className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-900/20 disabled:opacity-60"
                        >
                            {optimizationProgress.isRunning ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <MonitorPlay className="h-4 w-4 mr-2" />
                            )}
                            {optimizationProgress.isRunning
                                ? `Optimizing ${optimizationProgress.processed}/${optimizationProgress.total}`
                                : 'Optimize All'}
                        </Button>
                        <Button
                            onClick={() => setWorkflowStage('quote')}
                            disabled={!optimizationResults}
                            variant="outline"
                            className="w-full border-green-500/30 text-green-400 hover:bg-green-900/20 disabled:opacity-50"
                        >
                            <FileText className="h-4 w-4 mr-2" /> Generate Quote
                        </Button>
                    </div>
                )}
            </div>

            {/* --- MAIN STAGE --- */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-950">

                {/* Top Navigation Bar */}
                <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {workflowStage === 'design' && activeUnit ? `Designing: ${activeUnit.posNumber}` :
                                workflowStage === 'optimize' ? 'Optimization & Cutting Lists' :
                                    workflowStage === 'quote' ? 'Commercial Quote' : 'Project Overview'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Tabs value={workflowStage} onValueChange={(v) => setWorkflowStage(v as any)} className="w-[400px]">
                            <TabsList className="grid w-full grid-cols-3 bg-gray-800 text-gray-400">
                                <TabsTrigger value="design" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">Design</TabsTrigger>
                                <TabsTrigger value="optimize" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Optimize</TabsTrigger>
                                <TabsTrigger value="quote" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Quote</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">

                    {workflowStage === 'design' && (
                        activeUnit ? (
                            <EngineeringBay
                                project={activeUnit}
                                profiles={profiles}
                                onDesignComplete={handleDesignComplete}
                                // When "Save & Next" is clicked in EngineeringBay, we handle it here
                                onAddNewPose={handleAddUnit}
                                onSelectPosition={(id) => {
                                    setActiveUnitId(id);
                                }}
                                relatedPositions={project.units}
                                mode="expert"
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                                <Layout className="h-16 w-16 opacity-20" />
                                <p>Select a unit from the sidebar or create a new one to start designing.</p>
                                <Button onClick={handleAddUnit} variant="outline" className="mt-4 border-orange-500/50 text-orange-400">
                                    Create First Unit
                                </Button>
                            </div>
                        )
                    )}

                    {workflowStage === 'optimize' && (
                        <ProjectOptimizer
                            project={project}
                            results={optimizationResults}
                            onReoptimize={runProjectOptimization}
                            optimizationProgress={optimizationProgress}
                        />
                    )}

                    {workflowStage === 'quote' && (
                        <ProjectQuote
                            project={project}
                            results={optimizationResults}
                        />
                    )}

                </div>
            </div>
        </div>
    );
};
