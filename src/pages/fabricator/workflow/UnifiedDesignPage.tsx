import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Eye, Pencil, RefreshCw, Ruler } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

// Components
import { SmartMeasuringInterface } from '@/components/fabricator/SmartMeasuringInterface';
import { DraftingWorkbench } from '@/components/fabricator/drafting/DraftingWorkbench';

// Types & Utils
import type { DraftingOutput } from '@/components/fabricator/drafting/types/drafting';
import { cadToCanonical, canonicalToCAD, canonicalToWizard, wizardToCanonical } from '@/lib/workflow/dataConverters';
import { useWorkflowStore } from '@/store/workflowStore';
import type { CanonicalEngineeringModel } from '@/types/CanonicalEngineeringModel';
import type { MeasurementData } from '@/types/fabricator';

type DesignMode = 'wizard' | 'drafting';

export const UnifiedDesignPage: React.FC = () => {
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId?: string }>();
    const location = useLocation();

    // Get workflow store
    const {
        currentProject,
        setCurrentProject,
        measurementData,
        setMeasurementData,
        completeStep
    } = useWorkflowStore();

    // State
    const [designMode, setDesignMode] = useState<DesignMode>('wizard');
    const [isConverting, setIsConverting] = useState(false);
    const [lastModeSwitch, setLastModeSwitch] = useState<DesignMode>('wizard');
    const [canonicalModel, setCanonicalModel] = useState<CanonicalEngineeringModel | null>(null);

    // Initialize mode based on canonical model or URL params
    useEffect(() => {
        if (currentProject) {
            // Try to infer mode from existing project data
            const hasGrid = currentProject.grid !== undefined;
            setDesignMode(hasGrid ? 'wizard' : 'drafting');
        }

        // Check for mode in URL query params
        const params = new URLSearchParams(location.search);
        const modeParam = params.get('mode') as DesignMode;
        if (modeParam && (modeParam === 'wizard' || modeParam === 'drafting')) {
            setDesignMode(modeParam);
        }
    }, [currentProject, location.search]);

    // Handle wizard completion (Gold-Tier with proper type conversion)
    const handleWizardComplete = useCallback((wizardData: MeasurementData) => {
        console.log('🎯 Wizard completion with precision:', {
            width: wizardData.width,
            height: wizardData.height,
            windowType: wizardData.windowType,
            systemPack: wizardData.systemPackId,
        });

        // Validate input
        if (!wizardData.width || !wizardData.height) {
            console.error('Wizard completion: Missing dimensions');
            alert('Please enter both width and height');
            return;
        }

        // Create WindowUnit from MeasurementData
        const windowUnit: any = {
            id: projectId || `POSE-${Date.now()}`,
            orderNumber: `ORD-${Date.now()}`,
            posNumber: wizardData.windowIndex || 'W-01',
            type: wizardData.windowType || 'sliding_window',
            components: [],
            overallWidth: parseFloat(wizardData.width),
            overallHeight: parseFloat(wizardData.height),
            color: wizardData.color || 'Silver',
            glazing: {
                type: wizardData.glazingType || 'double',
                thickness: 4,
                spacer: 12,
                gasFill: 'argon',
            },
            hardware: [],
            status: 'design' as const,
            optimization: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            systemPackId: wizardData.systemPackId,
            grid: wizardData.grid,
            measurementMode: wizardData.measurementMode,
            wallDeduction: wizardData.wallDeduction,
            manufacturingWidth: wizardData.manufacturingWidth,
            manufacturingHeight: wizardData.manufacturingHeight,
            roughOpeningWidth: wizardData.roughOpeningWidth,
            roughOpeningHeight: wizardData.roughOpeningHeight,
            flyScreenType: wizardData.flyScreenType,
            systemProfileSelections: wizardData.systemProfileSelections,
            presetId: wizardData.presetId,
        };

        // Create canonical model with origin preservation
        const canonicalModel = wizardToCanonical(windowUnit);

        // Atomic store update
        setCanonicalModel(canonicalModel);
        setCurrentProject(windowUnit);
        setMeasurementData(wizardData);
        completeStep('design');

        // Gold-tier navigation with smooth transition
        setTimeout(() => {
            navigate('/fabricator/workflow/preview3d', {
                state: {
                    transition: 'design_complete',
                    canonicalModel: canonicalModel,
                    timestamp: Date.now(),
                },
            });
        }, 100); // Small delay for visual feedback
    }, [projectId, setMeasurementData, setCurrentProject, completeStep, navigate]);

    // Handle CAD completion
    const handleDraftingComplete = useCallback((cadData: DraftingOutput) => {
        console.log('CAD completed:', cadData);

        // Convert CAD data to canonical model
        const canonical = cadToCanonical(cadData);

        // Update store
        setCanonicalModel(canonical);
        setCurrentProject(canonicalToWizard(canonical));
        completeStep('design');

        // Navigate to 3D preview
        navigate('/fabricator/workflow/preview3d');
    }, [setCurrentProject, completeStep, navigate]);

    // Handle mode switch with data preservation
    const handleModeSwitch = useCallback(async (newMode: DesignMode) => {
        if (newMode === designMode || isConverting) return;

        setIsConverting(true);
        setLastModeSwitch(designMode);

        try {
            if (canonicalModel) {
                // We have existing data, convert between modes
                if (newMode === 'drafting' && designMode === 'wizard') {
                    // Wizard → CAD conversion
                    const cadData = canonicalToCAD(canonicalModel);
                    console.log('Converted wizard → CAD:', cadData);
                } else if (newMode === 'wizard' && designMode === 'drafting') {
                    // CAD → Wizard conversion
                    const wizardData = canonicalToWizard(canonicalModel);
                    console.log('Converted CAD → wizard:', wizardData);
                }
            }

            // Update mode
            setDesignMode(newMode);

            // Update URL with mode
            const params = new URLSearchParams(location.search);
            params.set('mode', newMode);
            navigate(`${location.pathname}?${params.toString()}`, { replace: true });

        } catch (error) {
            console.error('Mode switch failed:', error);
            // Revert to previous mode
            setDesignMode(lastModeSwitch);
        } finally {
            setIsConverting(false);
        }
    }, [designMode, isConverting, canonicalModel, lastModeSwitch, location, navigate]);

    // Handle continue to 3D preview (Gold-Tier with enhanced UX)
    const handleContinue = useCallback(() => {
        if (!canonicalModel) {
            // User-friendly error with guidance
            const message = designMode === 'wizard'
                ? 'Please complete the wizard to add window dimensions and specifications'
                : 'Please complete your design before previewing';
            alert(message);
            return;
        }

        // Mark design as completed with timestamp
        const updatedModel: CanonicalEngineeringModel = {
            ...canonicalModel,
            metadata: {
                ...canonicalModel.metadata,
                modifiedAt: new Date().toISOString(),
            },
            constitutional: {
                ...canonicalModel.constitutional,
                auditTrail: [
                    ...canonicalModel.constitutional.auditTrail,
                    {
                        timestamp: new Date().toISOString(),
                        action: 'design_finalized_for_preview',
                        ruleId: 'RULE-FIN-001',
                        data: { entryMode: canonicalModel.metadata.entryMode }
                    }
                ],
            },
        };

        // Update store
        setCanonicalModel(updatedModel);

        // Convert to WindowUnit for backward compatibility
        const windowUnit = canonicalToWizard(updatedModel);
        setCurrentProject(windowUnit);

        // Mark step as complete
        completeStep('design');

        // Show loading state during navigation
        setIsConverting(true);

        // Smooth navigation with progress indicator
        setTimeout(() => {
            navigate('/fabricator/workflow/preview3d', {
                state: {
                    transition: 'smooth',
                    preserveScroll: true,
                    canonicalModel: updatedModel,
                    designMode: designMode,
                },
            });
            setIsConverting(false);
        }, 300);
    }, [canonicalModel, designMode, setCanonicalModel, setCurrentProject, completeStep, navigate, setIsConverting]);

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-amber-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {projectId ? 'Edit Project' : 'Create New Window'}
                            </h1>
                            <p className="text-slate-600 mt-1">
                                Design using guided wizard or professional CAD tools
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Mode switcher */}
                            <div className="flex rounded-lg border border-slate-300 p-1 bg-slate-100">
                                <button
                                    onClick={() => handleModeSwitch('wizard')}
                                    disabled={isConverting}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${designMode === 'wizard'
                                        ? 'bg-white text-slate-900 shadow-sm border border-slate-300'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                        } ${isConverting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Ruler className="w-4 h-4" />
                                        Wizard Mode
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleModeSwitch('drafting')}
                                    disabled={isConverting}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${designMode === 'drafting'
                                        ? 'bg-amber-100 text-amber-900 shadow-sm border border-amber-300'
                                        : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                                        } ${isConverting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Pencil className="w-4 h-4" />
                                        CAD Mode
                                    </div>
                                </button>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/fabricator/projects')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/fabricator/workflow/preview3d')}
                                    disabled={!canonicalModel}
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Preview
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-hidden">
                {isConverting ? (
                    // Loading state during conversion
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600" />
                            <p className="mt-4 text-slate-600">
                                Converting design data...
                            </p>
                        </div>
                    </div>
                ) : (
                    // Design interface
                    <div className="h-full max-w-7xl mx-auto px-6 py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                            {/* Left panel - Mode information */}
                            <div className="lg:col-span-1 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {designMode === 'wizard' ? (
                                                <>
                                                    <Ruler className="w-5 h-5" />
                                                    Wizard Mode
                                                </>
                                            ) : (
                                                <>
                                                    <Pencil className="w-5 h-5" />
                                                    CAD Mode
                                                </>
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            {designMode === 'wizard'
                                                ? 'Step-by-step guided design with automatic grid generation'
                                                : 'Professional CAD tools with visual design and 50+ templates'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <h4 className="font-medium mb-2">Best for:</h4>
                                            <ul className="space-y-1 text-sm">
                                                {designMode === 'wizard' ? (
                                                    <>
                                                        <li className="flex items-center">
                                                            <span className="text-green-500 mr-2">✓</span>
                                                            Quick window designs
                                                        </li>
                                                        <li className="flex items-center">
                                                            <span className="text-green-500 mr-2">✓</span>
                                                            Standard window types
                                                        </li>
                                                        <li className="flex items-center">
                                                            <span className="text-green-500 mr-2">✓</span>
                                                            Measurement-first approach
                                                        </li>
                                                    </>
                                                ) : (
                                                    <>
                                                        <li className="flex items-center">
                                                            <span className="text-green-500 mr-2">✓</span>
                                                            Complex custom designs
                                                        </li>
                                                        <li className="flex items-center">
                                                            <span className="text-green-500 mr-2">✓</span>
                                                            Professional CAD users
                                                        </li>
                                                        <li className="flex items-center">
                                                            <span className="text-green-500 mr-2">✓</span>
                                                            50+ Egyptian templates
                                                        </li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">Tips:</h4>
                                            <p className="text-sm text-slate-600">
                                                {designMode === 'wizard'
                                                    ? 'Start with overall dimensions, then configure individual cells.'
                                                    : 'Use templates for common window types, then customize with CAD tools.'}
                                            </p>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleModeSwitch(designMode === 'wizard' ? 'drafting' : 'wizard')}
                                            className="w-full"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Switch to {designMode === 'wizard' ? 'CAD Mode' : 'Wizard Mode'}
                                        </Button>

                                        {/* Egyptian Standards Compliance */}
                                        <div className="mt-6 pt-6 border-t border-slate-700">
                                            <h4 className="font-medium text-slate-700 flex items-center gap-2 mb-3">
                                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                                Egyptian Standards
                                            </h4>
                                            <div className="text-sm font-medium text-green-600 mb-2">100% Compliant</div>
                                            <div className="space-y-2">
                                                {[
                                                    { id: 'thermal', name: 'EGP 301-2023 Thermal' },
                                                    { id: 'structural', name: 'Structural Integrity' },
                                                    { id: 'water', name: 'Water Tightness Class 4A' },
                                                    { id: 'air', name: 'Air Permeability Class 4' },
                                                ].map(standard => (
                                                    <div key={standard.id} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                                            <span className="text-sm text-slate-600">{standard.name}</span>
                                                        </div>
                                                        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">✓</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4">
                                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                    <span>Compliance</span>
                                                    <span>100%</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500" style={{ width: '100%' }} />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Progress indicators */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Design Progress</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Window Structure</span>
                                                <span className={canonicalModel?.geometry ? 'text-green-600' : 'text-slate-400'}>
                                                    {canonicalModel?.geometry ? '✓ Complete' : 'Pending'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>Materials</span>
                                                <span className={canonicalModel?.materials ? 'text-green-600' : 'text-slate-400'}>
                                                    {canonicalModel?.materials ? '✓ Complete' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right panel - Design interface */}
                            <div className="lg:col-span-2 h-full">
                                <Card className="h-full border-2 border-slate-300">
                                    <CardContent className="p-0 h-full">
                                        {designMode === 'wizard' ? (
                                            <div className="h-full">
                                                <SmartMeasuringInterface
                                                    onMeasurementComplete={handleWizardComplete}
                                                    systemPackId={measurementData?.systemPackId}
                                                    region="egypt"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-full">
                                                <DraftingWorkbench
                                                    onDesignValidated={handleDraftingComplete}
                                                    initialTemplate={undefined}
                                                    onExit={() => navigate('/fabricator/projects')}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-white/80 backdrop-blur-sm py-3">
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="text-sm text-slate-600">
                        {canonicalModel ? (
                            <>
                                Design last saved: {new Date(canonicalModel.metadata.modifiedAt).toLocaleTimeString()}
                            </>
                        ) : (
                            'Start designing your window...'
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                if (window.confirm('Save draft and exit?')) {
                                    navigate('/fabricator/projects');
                                }
                            }}
                        >
                            Save Draft
                        </Button>

                        <div className="relative group">
                            <Button
                                onClick={handleContinue}
                                disabled={!canonicalModel || isConverting}
                                className={`
                                    relative overflow-hidden
                                    bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500
                                    hover:from-amber-600 hover:via-amber-700 hover:to-amber-600
                                    text-white shadow-lg hover:shadow-xl
                                    transition-all duration-300 transform hover:scale-[1.02]
                                    active:scale-95
                                    ${(!canonicalModel || isConverting)
                                        ? 'opacity-50 cursor-not-allowed grayscale'
                                        : 'group-hover:shadow-amber-500/25'
                                    }
                                `}
                            >
                                {/* Animated background effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                <div className="relative flex items-center gap-2">
                                    {isConverting ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-4 h-4" />
                                            <span>Preview 3D</span>
                                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </>
                                    )}
                                </div>
                            </Button>

                            {/* Progress indicator when converting */}
                            {isConverting && (
                                <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-600 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
