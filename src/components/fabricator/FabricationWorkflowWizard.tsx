/**
 * FabricationWorkflowWizard Component
 * 
 * Seamless 3-step workflow wizard: Measurement → Design → BOM
 * Provides progress indicator, auto-save, context-sensitive help, and keyboard navigation.
 * 
 * Part of Journey 1 Polish: Measurement → Design → BOM
 * Week 2, Day 6-7: Journey Integration & Flow
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import {
  Ruler,
  Grid3X3,
  FileText,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Keyboard,
  Save,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartMeasuringInterface } from './SmartMeasuringInterface';
import { EngineeringBay } from './EngineeringBay';
import { VisualBOMDisplay, type BOMDisplayData } from './VisualBOMDisplay';
import type { MeasurementData } from '@/types/fabricator';
import type { WindowUnit, WindowComponent, Profile } from '@/types/fabricator';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/ui/tooltip';

const WIZARD_STORAGE_KEY = 'almona:fabrication:wizard:state';

export type WizardStep = 'measurement' | 'design' | 'bom';

export interface FabricationWorkflowWizardProps {
  /** Initial step */
  initialStep?: WizardStep;
  /** System pack ID */
  systemPackId?: string;
  /** Region */
  region?: 'egypt' | 'turkey' | 'mena' | 'gulf' | 'global';
  /** Profiles for design phase */
  profiles?: Profile[];
  /** Callback when workflow is complete */
  onWorkflowComplete?: (windowUnit: WindowUnit) => void;
  /** Callback when step changes */
  onStepChange?: (step: WizardStep) => void;
  /** Class name */
  className?: string;
  /** Enable auto-save */
  enableAutoSave?: boolean;
  /** Show help tooltips */
  showHelp?: boolean;
}

/**
 * Workflow steps configuration
 */
const WORKFLOW_STEPS: Array<{
  id: WizardStep;
  title: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: 'measurement',
    title: 'Measurement',
    description: 'Enter dimensions and specifications',
    icon: Ruler,
  },
  {
    id: 'design',
    title: 'Design',
    description: 'Configure grid layout and structure',
    icon: Grid3X3,
  },
  {
    id: 'bom',
    title: 'BOM & Export',
    description: 'Review bill of materials and export',
    icon: FileText,
  },
];

/**
 * Help text for each step
 */
const STEP_HELP: Record<WizardStep, string> = {
  measurement: 'Enter window dimensions, select system pack, and configure specifications. Use Tab to navigate fields, Enter to proceed.',
  design: 'Configure the grid layout using SmartDrawCanvas. Use keyboard shortcuts: Ctrl+Z (undo), Ctrl+C (copy), Ctrl+V (paste).',
  bom: 'Review the bill of materials, check costs, and export. Use workshop view for production floor display.',
};

/**
 * FabricationWorkflowWizard Component
 * 
 * Seamless 3-step workflow wizard with auto-save and keyboard navigation
 */
export const FabricationWorkflowWizard: React.FC<FabricationWorkflowWizardProps> = ({
  initialStep = 'measurement',
  systemPackId,
  region,
  profiles = [],
  onWorkflowComplete,
  onStepChange,
  className = '',
  enableAutoSave = true,
  showHelp = true,
}) => {
  const { t } = useTranslation('fabricator');
  const [currentStep, setCurrentStep] = useState<WizardStep>(initialStep);
  const [measurementData, setMeasurementData] = useState<MeasurementData | null>(null);
  const [windowUnit, setWindowUnit] = useState<WindowUnit | null>(null);
  const [bomData, setBomData] = useState<BOMDisplayData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current step index
  const currentStepIndex = useMemo(
    () => WORKFLOW_STEPS.findIndex((s) => s.id === currentStep),
    [currentStep]
  );

  // Auto-save state to localStorage
  const saveState = useCallback(() => {
    if (!enableAutoSave) return;

    try {
      const state = {
        currentStep,
        measurementData,
        windowUnit: windowUnit ? {
          id: windowUnit.id,
          orderNumber: windowUnit.orderNumber,
          overallWidth: windowUnit.overallWidth,
          overallHeight: windowUnit.overallHeight,
          systemPackId: windowUnit.systemPackId,
        } : null,
        timestamp: Date.now(),
      };
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save wizard state:', error);
    }
  }, [enableAutoSave, currentStep, measurementData, windowUnit]);

  // Load saved state from localStorage
  useEffect(() => {
    if (!enableAutoSave) return;

    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Only restore if saved within last hour
        if (Date.now() - state.timestamp < 3600000) {
          if (state.currentStep) setCurrentStep(state.currentStep);
          if (state.measurementData) setMeasurementData(state.measurementData);
        }
      }
    } catch (error) {
      console.error('Failed to load wizard state:', error);
    }
  }, [enableAutoSave]);

  // Auto-save on state changes
  useEffect(() => {
    if (!enableAutoSave) return;

    setIsSaving(true);
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveState();
      setIsSaving(false);
    }, 1000); // Debounce auto-save

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentStep, measurementData, windowUnit, enableAutoSave, saveState]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA'
      ) {
        return;
      }

      const { handleNext: next, handlePrevious: prev, currentStepIndex: stepIdx } = handlersRef.current;

      // Ctrl+Tab: Next step
      if (e.key === 'Tab' && !e.shiftKey && e.ctrlKey) {
        e.preventDefault();
        next();
      }

      // Ctrl+Shift+Tab: Previous step
      if (e.key === 'Tab' && e.shiftKey && e.ctrlKey) {
        e.preventDefault();
        prev();
      }

      // Escape: Go to previous step
      if (e.key === 'Escape' && stepIdx > 0) {
        e.preventDefault();
        prev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle step change
  const handleStepChange = useCallback(
    (step: WizardStep) => {
      setCurrentStep(step);
      onStepChange?.(step);
    },
    [onStepChange]
  );

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStepIndex < WORKFLOW_STEPS.length - 1) {
      const nextStep = WORKFLOW_STEPS[currentStepIndex + 1].id;
      handleStepChange(nextStep);
    }
  }, [currentStepIndex, handleStepChange]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      const previousStep = WORKFLOW_STEPS[currentStepIndex - 1].id;
      handleStepChange(previousStep);
    }
  }, [currentStepIndex, handleStepChange]);

  // Store handlers in ref for keyboard navigation
  const handlersRef = useRef({ handleNext, handlePrevious, currentStepIndex });
  useEffect(() => {
    handlersRef.current = { handleNext, handlePrevious, currentStepIndex };
  }, [handleNext, handlePrevious, currentStepIndex]);

  // Handle measurement complete
  const handleMeasurementComplete = useCallback(
    (data: MeasurementData) => {
      setMeasurementData(data);

      // Create window unit from measurement data
      const unit: WindowUnit = {
        id: `unit-${Date.now()}`,
        orderNumber: '',
        posNumber: '',
        type: data.windowType || 'sliding_window',
        components: [],
        overallWidth: Number(data.width) || 1200,
        overallHeight: Number(data.height) || 1200,
        color: data.color || 'RAL 9016',
        glazing: {
          type: data.glazingType || 'double',
          color: data.glassColor || 'clear',
        },
        hardware: [],
        status: 'design',
        optimization: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        systemPackId: data.systemPackId,
        grid: data.grid,
        systemProfileSelections: data.systemProfileSelections,
        measurementMode: data.measurementMode,
        wallDeduction: data.wallDeduction,
        manufacturingWidth: data.manufacturingWidth,
        manufacturingHeight: data.manufacturingHeight,
        roughOpeningWidth: data.roughOpeningWidth,
        roughOpeningHeight: data.roughOpeningHeight,
        flyScreenType: data.flyScreenType,
        presetId: data.presetId,
        positionMeta: {
          flatNumber: data.flatNumber,
          buildingBlock: data.buildingBlock,
          floor: data.floor,
          unitOrApartment: data.unitOrApartment,
          elevation: data.elevation,
          roomOrZone: data.roomOrZone,
          windowIndex: data.windowIndex,
          remarks: data.remarks,
        },
      };

      setWindowUnit(unit);
      handleNext();
    },
    [handleNext]
  );

  // Handle design complete
  const handleDesignComplete = useCallback(
    (components: WindowComponent[]) => {
      if (!windowUnit) return;

      const updatedUnit: WindowUnit = {
        ...windowUnit,
        components,
        status: 'optimized',
        updatedAt: new Date(),
      };

      setWindowUnit(updatedUnit);

      // Calculate BOM data from components (simplified version of EngineeringBay's bomData calculation)
      // Component categorization
      const componentsByCategory = {
        frame: [] as WindowComponent[],
        sash: [] as WindowComponent[],
        structural: [] as WindowComponent[],
        glazing: [] as WindowComponent[],
        accessory: [] as WindowComponent[],
        other: [] as WindowComponent[],
      };

      components.forEach((comp) => {
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

      // Glass details (simplified)
      const glazingType = updatedUnit.glazing?.type || 'double';
      const glassThickness = updatedUnit.glazing?.thickness || (glazingType === 'single' ? 5 : 24);
      const sashComponents = components.filter(c => 
        c.profile?.profileRole?.startsWith('sash') || c.type === 'sash'
      );

      // Simplified glass calculation
      const glassSpecs: Array<{ sashIndex: number; width: number; height: number; area: number; type: string }> = [];
      sashComponents.forEach((comp, idx) => {
        const area = (comp.width * comp.height) / 1_000_000;
        glassSpecs.push({
          sashIndex: idx + 1,
          width: comp.width,
          height: comp.height,
          area,
          type: glazingType,
        });
      });

      const totalGlassArea = glassSpecs.reduce((sum, g) => sum + g.area, 0);
      const paneCount = glazingType === 'single' ? 1 : glazingType === 'double' ? 2 : 3;
      const effectiveThickness = glazingType === 'single' 
        ? glassThickness 
        : glassThickness / paneCount;
      const totalGlassWeight = totalGlassArea * effectiveThickness * 2.5 * paneCount;

      // Totals calculation
      let totalMaterialCost = 0;
      let totalWeight = 0;

      components.forEach((comp) => {
        if (comp.profile) {
          const length = comp.cuttingLengths?.[0] || 0;
          const quantity = comp.quantity || 1;
          const lengthMeters = (length / 1000) * quantity;
          totalMaterialCost += (comp.profile.costPerMeter || 0) * lengthMeters;
          totalWeight += (comp.profile.weightPerMeter || 0) * lengthMeters;
        }
      });

      // Aggregation by category (simplified)
      const aggregatedByCategory: Record<string, Record<string, any>> = {};
      Object.entries(componentsByCategory).forEach(([category, comps]) => {
        if (comps.length === 0) return;

        const aggregated = comps.reduce((acc, comp) => {
          const key = `${comp.profile?.name || comp.type}_${comp.type}`;
          if (!acc[key]) {
            acc[key] = {
              profile: comp.profile,
              type: comp.type,
              quantity: 0,
              totalLength: 0,
              totalWeight: 0,
              totalCost: 0,
              role: comp.profile?.profileRole,
              verification: { verified: true, missing: [], mismatched: [] },
              specs: {
                width: comp.profile?.width,
                height: comp.profile?.height,
                material: comp.profile?.material,
                costPerMeter: comp.profile?.costPerMeter,
                weightPerMeter: comp.profile?.weightPerMeter,
                color: comp.profile?.color,
              },
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

      const bom: BOMDisplayData = {
        componentsByCategory,
        glassDetails: {
          glassSpecs,
          totalGlassArea,
          glazingType,
          glassThickness,
          totalGlassWeight,
        },
        totals: {
          materialCost: totalMaterialCost,
          weight: totalWeight,
        },
        aggregatedByCategory,
        systemPack: null, // Would need to load system pack
      };

      setBomData(bom);
      handleNext();
    },
    [windowUnit, handleNext]
  );

  // Handle workflow complete
  const handleWorkflowComplete = useCallback(() => {
    if (windowUnit && onWorkflowComplete) {
      onWorkflowComplete(windowUnit);
    }
  }, [windowUnit, onWorkflowComplete]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'measurement':
        return (
          <SmartMeasuringInterface
            onMeasurementComplete={handleMeasurementComplete}
            systemPackId={systemPackId}
            region={region}
          />
        );

      case 'design':
        if (!windowUnit) {
          return (
            <Card className="card-glass-dark">
              <CardContent className="p-6 text-center text-amber-600/70">
                {t('fabrication_wizard.no_measurement', 'Please complete measurement step first')}
              </CardContent>
            </Card>
          );
        }

        return (
          <EngineeringBay
            project={windowUnit}
            onDesignComplete={handleDesignComplete}
            profiles={profiles}
            relatedPositions={[]}
          />
        );

      case 'bom':
        if (!windowUnit) {
          return (
            <Card className="card-glass-dark">
              <CardContent className="p-6 text-center text-amber-600/70">
                {t('fabrication_wizard.no_design', 'Please complete design step first')}
              </CardContent>
            </Card>
          );
        }

        return (
          <VisualBOMDisplay
            bomData={bomData}
            windowUnit={windowUnit}
            mode="standard"
            showQRCodes={true}
            showCostBreakdown={true}
            t={t}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Progress Indicator */}
      <Card className="card-glass-dark rounded-b-none border-b-2 border-amber-600/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-amber-200">
              <span className="text-sm font-semibold">
                {t('fabrication_wizard.title', 'Fabrication Workflow')}
              </span>
              {isSaving && (
                <Badge variant="outline" className="bg-amber-950/30 border-amber-500/40 text-amber-300 text-xs">
                  <Save className="h-3 w-3 mr-1" />
                  {t('fabrication_wizard.saving', 'Saving...')}
                </Badge>
              )}
            </CardTitle>
            {showHelp && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-400 hover:text-amber-300">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <div className="space-y-2">
                      <div className="font-semibold text-amber-200">{STEP_HELP[currentStep]}</div>
                      <div className="text-xs text-amber-400/80 border-t border-amber-600/30 pt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Keyboard className="h-3 w-3" />
                          <span className="font-semibold">Keyboard Shortcuts:</span>
                        </div>
                        <div className="space-y-1">
                          <div>Ctrl+Tab: Next step</div>
                          <div>Ctrl+Shift+Tab: Previous step</div>
                          <div>Esc: Go back</div>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Step Indicators */}
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-amber-600/20 -z-10" />
            <div
              className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-emerald-500/60 to-amber-500/60 transition-all duration-500 -z-10"
              style={{ width: `${(currentStepIndex / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
            />

            {/* Steps */}
            {WORKFLOW_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center flex-1 cursor-pointer"
                  onClick={() => {
                    // Allow navigation to completed or previous steps
                    if (isCompleted || index <= currentStepIndex) {
                      handleStepChange(step.id);
                    }
                  }}
                >
                  <div
                    className={cn(
                      'relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                      isCompleted
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : isCurrent
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400 scale-110 shadow-lg shadow-amber-500/50'
                        : 'bg-gray-800/50 border-amber-600/30 text-amber-600/50'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div
                      className={cn(
                        'text-xs font-semibold',
                        isCurrent ? 'text-amber-200' : isCompleted ? 'text-emerald-400' : 'text-amber-600/50'
                      )}
                    >
                      {step.title}
                    </div>
                    <div className="text-[10px] text-amber-600/70 mt-0.5">{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        {renderStepContent()}
      </div>

      {/* Navigation Footer */}
      <Card className="card-glass-dark rounded-t-none border-t-2 border-amber-600/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="btn-secondary-dark"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('fabrication_wizard.previous', 'Previous')}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600/70">
                {t('fabrication_wizard.step', 'Step')} {currentStepIndex + 1} {t('fabrication_wizard.of', 'of')}{' '}
                {WORKFLOW_STEPS.length}
              </span>
            </div>

            {currentStepIndex < WORKFLOW_STEPS.length - 1 ? (
              <Button onClick={handleNext} className="btn-primary" disabled={!measurementData && currentStepIndex === 0}>
                {t('fabrication_wizard.next', 'Next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleWorkflowComplete} className="btn-primary-gradient">
                {t('fabrication_wizard.complete', 'Complete Workflow')}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
