// pages/FabricatorWorkflow.tsx
import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Tabs, TabsContent } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Button } from '@/shared/ui/ui/button';
import {
  Ruler,
  Scissors,
  Settings,
  Package,
  Zap,
  Factory,
  AlertCircle,
  Loader2,
  Box,
  Share2,
  ChevronRight,
  Play,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';

// NOTE: Heavy Fabricator Pro modules are lazy‑loaded per tab to keep
// initial bundle size and TTI low for heavy‑duty usage.
const SmartMeasuringInterface = React.lazy(() =>
  import('@/components/fabricator/SmartMeasuringInterface').then((m) => ({
    default: m.SmartMeasuringInterface,
  })),
);
const DesignInterface = React.lazy(() =>
  import('@/components/fabricator/DesignInterface').then((m) => ({
    default: m.DesignInterface,
  })),
);
const CuttingOptimizationEngine = React.lazy(() =>
  import('@/components/fabricator/CuttingOptimizationEngine').then((m) => ({
    default: m.CuttingOptimizationEngine,
  })),
);
const InventoryDashboard = React.lazy(() =>
  import('@/components/fabricator/InventoryDashboard').then((m) => ({
    default: m.InventoryDashboard,
  })),
);
const ProfileManagement = React.lazy(() =>
  import('@/components/fabricator/ProfileManagement').then((m) => ({
    default: m.ProfileManagement,
  })),
);
const ElsherifImportWizard = React.lazy(() =>
  import('@/components/fabricator/ElsherifImportWizard').then((m) => ({
    default: m.ElsherifImportWizard,
  })),
);
import { supabase } from '@/lib/supabase';
const ProductionScheduler = React.lazy(() =>
  import('@/components/fabricator/ProductionScheduler').then((m) => ({
    default: m.ProductionScheduler,
  })),
);
const QualityControl = React.lazy(() =>
  import('@/components/fabricator/QualityControl').then((m) => ({
    default: m.QualityControl,
  })),
);
const RealTimeMonitoring = React.lazy(() =>
  import('@/components/fabricator/RealTimeMonitoring').then((m) => ({
    default: m.RealTimeMonitoring,
  })),
);
const Window3DGenerator = React.lazy(() =>
  import('@/components/fabricator/Window3DGenerator').then((m) => ({
    default: m.Window3DGenerator,
  })),
);
const JobSummaryPanel = React.lazy(() =>
  import('@/components/fabricator/JobSummaryPanel').then((m) => ({
    default: m.JobSummaryPanel,
  })),
);
const InventoryStatusPanel = React.lazy(() =>
  import('@/components/fabricator/InventoryStatusPanel').then((m) => ({
    default: m.InventoryStatusPanel,
  })),
);
const QuickReportsPanel = React.lazy(() =>
  import('@/components/fabricator/QuickReportsPanel').then((m) => ({
    default: m.QuickReportsPanel,
  })),
);
const PricingPreview = React.lazy(() =>
  import('@/components/fabricator/PricingPreview').then((m) => ({
    default: m.PricingPreview,
  })),
);
const PositionsGrid = React.lazy(() =>
  import('@/components/fabricator/PositionsGrid').then((m) => ({
    default: m.PositionsGrid,
  })),
);
const CommercialOfferPanel = React.lazy(() =>
  import('@/components/fabricator/CommercialOfferPanel').then((m) => ({
    default: m.CommercialOfferPanel,
  })),
);
const WorkflowProgress = React.lazy(() =>
  import('@/components/fabricator/WorkflowProgress').then((m) => ({
    default: m.WorkflowProgress,
  })),
);
const FeedbackButton = React.lazy(() =>
  import('@/components/fabricator/FeedbackButton').then((m) => ({
    default: m.FeedbackButton,
  })),
);
import { track } from '@/lib/analytics';
import ErrorBoundary from '@/components/ErrorBoundary';
const ClientPortalManager = React.lazy(() =>
  import('@/modules/client-portal').then((m) => ({
    default: m.ClientPortalManager,
  })),
);
const Rock60CuttingSummary = React.lazy(() =>
  import('@/components/fabricator/Rock60CuttingSummary').then((m) => ({
    default: m.Rock60CuttingSummary,
  })),
);
const NewProjectWizard = React.lazy(() =>
  import('@/components/fabricator/NewProjectWizard').then((m) => ({
    default: m.NewProjectWizard,
  })),
);

import { parseLegacyOrderData } from '@/lib/legacyDataParser';
import { ROCK60_WINDOW_SYSTEM_TEMPLATE } from '@/data/systemPacks';
import {
  WindowUnit,
  Profile,
  OptimizationResult,
  WindowComponent,
  CuttingPlan,
  Cut,
  MeasurementData,
} from '@/types/fabricator';
import { validateProject, deriveSystemConstraintsFromProfiles, validateProjectWithConstraints } from '@/lib/fabricatorValidation';
import { useJobsStore } from '@/store/jobsStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnatolianCockpit } from '@/components/fabricator/AnatolianCockpit';
import { IstanbulSkylineFooter } from '@/components/fabricator/IstanbulSkylineFooter';
import { BosphorusWorkflowRibbon } from '@/components/fabricator/BosphorusWorkflowRibbon';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';

const sampleHardware = [
  { id: 'hinge_1', name: 'Casement Hinge', type: 'hinge', quantity: 2, position: 'side' },
  { id: 'lock_1', name: 'Multi-point Lock', type: 'lock', quantity: 1, position: 'side' },
  { id: 'handle_1', name: 'Lever Handle', type: 'handle', quantity: 1, position: 'center' }
];

import type { ProjectHeaderMeta } from '@/components/fabricator/NewProjectWizard';

export const FabricatorWorkflow: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as { jobId?: string; startTab?: string } | null) || null;
  const {
    jobs,
    selectedJobId,
    setSelectedJob,
    addOrUpdateJob,
  } = useJobsStore();
  const { state: workspaceState, dispatch: workspaceDispatch } = useFabricatorWorkspace();
  const [activeTab, setActiveTab] = useState(navState?.startTab || 'measuring');
  const currentProject = (workspaceState.currentProject as WindowUnit | null) || null;
  const [projects, setProjects] = useState<WindowUnit[]>([]);
  const [inventory, setInventory] = useState<Profile[]>([]);
  const optimizationResults: OptimizationResult | null =
    (currentProject?.optimization as OptimizationResult | null) || null;
  const [isGeneratingCuttingPlan, setIsGeneratingCuttingPlan] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [showClientPortal, setShowClientPortal] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [projectMeta, setProjectMeta] = useState<ProjectHeaderMeta | null>(null);

  const workflowSteps = [
    { id: 'measuring', name: 'Smart Measuring', icon: Ruler, description: 'Digital measurement capture' },
    { id: 'design', name: 'Technical Design', icon: Settings, description: 'Component specification' },
    { id: 'preview3d', name: '3D Preview', icon: Box, description: 'Visual model preview' },
    { id: 'optimization', name: 'Cutting Optimization', icon: Scissors, description: 'Material optimization' },
    { id: 'inventory', name: 'Inventory Check', icon: Package, description: 'Stock management' },
    { id: 'production', name: 'Production Planning', icon: Factory, description: 'Scheduling & machining' },
    { id: 'quality', name: 'Quality Control', icon: Zap, description: 'Inspection & validation' }
  ];

  // Get current step index for progress tracking
  const currentStepIndex = workflowSteps.findIndex(step => step.id === activeTab);
  const completedSteps = currentStepIndex;

  // Sync selected job from dashboard (if any)
  useEffect(() => {
    const jobIdFromNav = navState?.jobId;
    const activeId = jobIdFromNav || selectedJobId;

    if (jobIdFromNav && jobIdFromNav !== selectedJobId) {
      setSelectedJob(jobIdFromNav);
    }

    if (activeId) {
      const job = jobs.find((j) => j.id === activeId);
      if (job) {
        workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: job as WindowUnit });
      }
    }
  }, [jobs, navState, selectedJobId, setSelectedJob, workspaceDispatch]);

  // If there's no active project and no header meta yet, prompt for a new project
  useEffect(() => {
    if (!currentProject && !projectMeta) {
      setShowProjectWizard(true);
    }
  }, [currentProject, projectMeta]);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    const loadInventory = async () => {
      setIsLoadingInventory(true);
      setInventoryError(null);
      
      try {
        // Simulate async loading
        await new Promise(resolve => setTimeout(resolve, 500));
        const legacyData = parseLegacyOrderData();
        
        if (!legacyData.profiles || legacyData.profiles.length === 0) {
          throw new Error('No profiles found in inventory data');
        }

        const profiles = [...legacyData.profiles];

        // Ensure at least one ROCK 60 template profile is available locally so that
        // the ROCK 60 45° template button in the design flow always works, even
        // before Supabase-backed profile seeding is wired here.
        const hasRock60Template = profiles.some(
          (p) =>
            (p.systemBrand && p.systemBrand.toLowerCase().includes('rock 60')) ||
            (p.specifications && (p.specifications as any).window_system === 'ROCK 60'),
        );

        if (!hasRock60Template) {
          profiles.push({
            id: 'rock60_template_local',
            name: 'ROCK 60 System Template',
            material: 'aluminum',
            width: 60,
            height: 60,
            thickness: 1.8,
            color: '#C0C0C0',
            costPerMeter: 0,
            cuttingAllowance: 3,
            stockQuantity: 0,
            minStockLevel: 0,
            maxStockLevel: 1000,
            supplier: 'Template',
            systemBrand: 'ROCK 60',
            weightPerMeter:
              (ROCK60_WINDOW_SYSTEM_TEMPLATE.rock60_45_degree_config?.frame_profiles
                ?.main_frame?.weight_kg_m as number | undefined) ?? 1.315,
            grainDirection: null,
            specifications: {
              ...ROCK60_WINDOW_SYSTEM_TEMPLATE,
              template: true,
              template_type: 'window_system',
            },
          });
        }

        setInventory(profiles);
      } catch (error) {
        console.error('Error loading inventory:', error);
        setInventoryError(error instanceof Error ? error.message : 'Failed to load inventory data');
        // Set empty inventory as fallback
        setInventory([]);
      } finally {
        setIsLoadingInventory(false);
      }
    };

    loadInventory();
  }, []);

  const generateCuttingPlan = useCallback(
    async (components: WindowComponent[], profiles: Profile[]): Promise<OptimizationResult> => {
      setIsGeneratingCuttingPlan(true);

      // Global hard safety limit for profile stock length in mm.
      // Many regional suppliers use 6–7.5m bars; we cap all cutting
      // calculations at 8000mm to prevent impossible cuts from being generated.
      const MAX_STOCK_LENGTH_MM = 8000;

      try {
        if (!components || components.length === 0) {
          throw new Error('No components provided for cutting plan generation');
        }
        
        if (!profiles || profiles.length === 0) {
          throw new Error('No profiles available in inventory');
        }

        await new Promise((res) => setTimeout(res, 1000));

        const cuttingPlan: CuttingPlan[] = [];
        let totalMaterialCost = 0;
        let totalWaste = 0;

        components.forEach((component) => {
          const profile = profiles.find((p) => p.id === component.profile.id);
          if (!profile) return;

          const cuts: Cut[] = [];
          let profileWaste = 0;

          const specs = profile.specifications || {};
          const isMiter45 =
            specs.cuttingType === 'miter_45' || specs.optimizedFor45Degree === true;

          component.cuttingLengths.forEach((length, index) => {
            const baseAngle = component.angles[index] || 90;
            const angle = isMiter45 ? 45 : baseAngle;

            // Extra logic for frame profiles with decorative/border frames
            const isBorderFrame =
              (profile.type === 'frame' ||
                specs.egyptFrameType === 'sliding' ||
                specs.egyptFrameType === 'casement') &&
              specs.egyptBorderIncluded === 'with';

            // Base allowance comes from profile.cuttingAllowance.
            // If this is a frame with border, we add an extra, per-profile border allowance
            // (stored in specifications.borderExtraAllowanceMm and falling back to 5mm).
            const borderExtraAllowance = isBorderFrame
              ? (specs.borderExtraAllowanceMm as number | undefined) ?? 5
              : 0;
            const allowance = profile.cuttingAllowance + borderExtraAllowance;

            const rawLength = length + allowance;

            // Hard safety check: no individual cut may exceed MAX_STOCK_LENGTH_MM.
            // This protects against impossible jobs when measurements + allowances
            // accidentally exceed available bar length (e.g. > 8m).
            if (rawLength > MAX_STOCK_LENGTH_MM) {
              throw new Error(
                `Calculated cut length ${rawLength.toFixed(
                  1,
                )} mm exceeds maximum stock length ${MAX_STOCK_LENGTH_MM} mm for profile "${profile.name}". ` +
                  'Please adjust dimensions or split this element into multiple parts.',
              );
            }

            const cut: Cut = {
              length: rawLength,
              angle,
              componentId: component.id,
              componentType: (specs.profileRole as string | undefined) || undefined,
              waste: allowance,
            };
            cuts.push(cut);
            profileWaste += allowance;
          });

          // Use profile‑specific stock length when available, but never exceed the
          // global MAX_STOCK_LENGTH_MM safety cap.
          const profileStockLength =
            typeof (profile.specifications as any)?.stockLengthMm === 'number'
              ? (profile.specifications as any).stockLengthMm
              : 6000;
          const stockLength = Math.min(profileStockLength, MAX_STOCK_LENGTH_MM);

          const totalCutLength = cuts.reduce((sum, cut) => sum + cut.length, 0);
          const utilization = (totalCutLength / stockLength) * 100;

          cuttingPlan.push({
            profile,
            stockLength,
            cuts,
            totalWaste: profileWaste,
            utilization,
          });

          // Material cost:
          // - Aluminum: price by kg → costPerKg * weightPerMeter(kg/m) * length(m)
          // - UPVC/wood: price by meter → costPerMeter * length(m)
          let effectiveCostPerMeter = profile.costPerMeter;

          if (
            profile.material === 'aluminum' &&
            typeof specs.costPerKg === 'number' &&
            typeof profile.weightPerMeter === 'number'
          ) {
            effectiveCostPerMeter = specs.costPerKg * profile.weightPerMeter;
          }

          totalMaterialCost += (totalCutLength / 1000) * effectiveCostPerMeter;
          totalWaste += profileWaste;
        });

        const totalNetCutLength = cuttingPlan.reduce(
          (sum, plan) =>
            sum + plan.cuts.reduce((cutSum, cut) => cutSum + cut.length, 0),
          0,
        );

        const result: OptimizationResult = {
          materialUsage: totalMaterialCost,
          wastePercentage:
            totalNetCutLength + totalWaste === 0
              ? 0
              : (totalWaste / (totalWaste + totalNetCutLength)) * 100,
          estimatedProductionTime: components.length * 2.5,
          cuttingPlan,
          nestingEfficiency: 92.5,
          costBreakdown: {
            materialCost: totalMaterialCost,
            laborCost: totalMaterialCost * 0.3,
            hardwareCost: components.reduce(
              (sum, comp) => sum + comp.hardware.reduce((hSum, _h) => hSum + 5, 0),
              0,
            ),
            glazingCost: totalMaterialCost * 0.4,
            totalCost: 0,
          },
        };

        result.costBreakdown.totalCost =
          result.costBreakdown.materialCost +
          result.costBreakdown.laborCost +
          result.costBreakdown.hardwareCost +
          result.costBreakdown.glazingCost;

        setIsGeneratingCuttingPlan(false);
        workspaceDispatch({ type: 'SET_OPTIMIZATION_RESULT', payload: result });
        return result;
      } catch (error) {
        setIsGeneratingCuttingPlan(false);
        console.error('Error generating cutting plan:', error);
        throw error;
      }
    },
    [workspaceDispatch]
  );

  const handleMeasurementComplete = useCallback(
    (data: MeasurementData) => {
      try {
        setProjectError(null);

        if (!projectMeta) {
          throw new Error('Please create a project header before measuring.');
        }
        
        const width = Number(data.width);
        const height = Number(data.height);
        
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
          throw new Error('Invalid measurement data provided');
        }

        const resolvedSystemPackId = data.systemPackId || projectMeta.systemPackId;

        const newProject: WindowUnit = {
          id: `proj_${Date.now()}`,
          orderNumber: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          posNumber: `POS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          type: data.windowType || 'sliding_window',
          components: [],
          overallWidth: width,
          overallHeight: height,
          color: String(data.color) || 'Silver',
          glazing: {
            type: data.glazingType || 'double',
            thickness: 24,
            spacer: 12,
            gasFill: 'argon'
          },
          hardware: sampleHardware,
          status: 'design',
          optimization: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          customer: projectMeta.clientName,
          systemPackId: resolvedSystemPackId,
          projectCode: projectMeta.projectCode,
          customerCode: projectMeta.customerCode,
          positionCode: `FP-${projectMeta.projectCode || ''}-${Math.random()
            .toString(36)
            .toUpperCase()
            .slice(-3)}`,
        };

        // Don't require components at measurement stage - they'll be added in design phase
        const validation = validateProject(newProject, false);
        if (!validation.isValid) {
          throw new Error(validation.errors.map(e => e.message).join(', '));
        }
        
        workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject });
        workspaceDispatch({ type: 'SET_MEASUREMENT_DATA', payload: data });
        addOrUpdateJob(newProject);
        setSelectedJob(newProject.id);
        setActiveTab('design');
        track('fabricator_job_created', {
          jobId: newProject.id,
          orderNumber: newProject.orderNumber,
          type: newProject.type,
          width: newProject.overallWidth,
          height: newProject.overallHeight,
        });
      } catch (error) {
        console.error('Error creating project from measurements:', error);
        setProjectError(error instanceof Error ? error.message : 'Failed to create project');
      }
    },
    [addOrUpdateJob, setSelectedJob, projectMeta, setActiveTab, workspaceDispatch]
  );

  const handleDesignComplete = useCallback(async (components: WindowComponent[]) => {
    if (!currentProject) {
      setProjectError('No project available. Please complete the measurement phase first.');
      return;
    }

    try {
      setProjectError(null);

      if (!components || components.length === 0) {
        throw new Error('No components provided. Please add at least one component.');
      }

      const optimization = await generateCuttingPlan(components, inventory);
      const updatedProject: WindowUnit = {
        ...currentProject,
        components,
        optimization,
        status: 'optimized',
        updatedAt: new Date(),
      };

      workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: updatedProject });
      addOrUpdateJob(updatedProject);
      setSelectedJob(updatedProject.id);
      setActiveTab('optimization');
      track('fabricator_job_status_changed', {
        jobId: updatedProject.id,
        orderNumber: updatedProject.orderNumber,
        status: updatedProject.status,
      });
    } catch (error) {
      console.error('Error completing design:', error);
      setProjectError(error instanceof Error ? error.message : 'Failed to generate cutting plan');
    }
  }, [currentProject, inventory, generateCuttingPlan, addOrUpdateJob, setSelectedJob, workspaceDispatch]);

  const handleProductionStart = useCallback(() => {
    if (!currentProject) {
      setProjectError('No project available. Please complete the design and optimization phases first.');
      return;
    }

    try {
      setProjectError(null);

      // Apply base validation plus system-specific constraints derived from
      // the profiles currently used in inventory.
      const constraints = deriveSystemConstraintsFromProfiles(inventory);
      const validation = validateProjectWithConstraints(currentProject, constraints);
      if (!validation.isValid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }

      // Heavy-duty stock check: ensure inventory has enough bars for the
      // current optimization before allowing production.
      if (currentProject.optimization) {
        const shortages: string[] = [];

        currentProject.optimization.cuttingPlan.forEach((plan) => {
          const profile = plan.profile;
          const availableBars = profile.stockQuantity ?? 0;
          const requiredLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
          const requiredBars = Math.ceil(requiredLength / plan.stockLength);

          if (availableBars < requiredBars) {
            shortages.push(
              `${profile.name}: need ${requiredBars} bars (${Math.round(
                requiredLength / 1000,
              )} m), available ${availableBars}`,
            );
          }
        });

        if (shortages.length > 0) {
          throw new Error(
            `Insufficient stock for this order:\n` +
              shortages.map((s) => `• ${s}`).join('\n'),
          );
        }
      }

      const updatedProject: WindowUnit = {
        ...currentProject,
        status: 'production',
        updatedAt: new Date(),
      };

      workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: updatedProject });
      setProjects((prev) => [...prev, updatedProject]);
      addOrUpdateJob(updatedProject);
      setSelectedJob(updatedProject.id);
      setActiveTab('production');
      track('fabricator_job_status_changed', {
        jobId: updatedProject.id,
        orderNumber: updatedProject.orderNumber,
        status: updatedProject.status,
      });
    } catch (error) {
      console.error('Error starting production:', error);
      setProjectError(error instanceof Error ? error.message : 'Failed to start production');
    }
  }, [currentProject, addOrUpdateJob, setSelectedJob, workspaceDispatch]);

  const getStepStatus = (stepId: string) => {
    const stepIndex = workflowSteps.findIndex(step => step.id === stepId);
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <ErrorBoundary level="page">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Alert System */}
          <AnimatePresence>
            {inventoryError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Inventory Loading Error</AlertTitle>
                  <AlertDescription>
                    {inventoryError}. Some features may be limited. Please refresh the page to retry.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {projectError && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Project Error</AlertTitle>
                  <AlertDescription>
                    {projectError}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {isLoadingInventory && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert className="mb-6 bg-blue-900/20 border-blue-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <AlertTitle>Loading Inventory</AlertTitle>
                  <AlertDescription>
                    Loading profile data from inventory...
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header Section - FABRICATOR PRO / AI WORKFLOW v4.0 */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              {/* Left: Title and summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <Factory className="h-10 w-10 text-orange-400" />
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse ring-2 ring-green-400/40" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold tracking-[0.2em] text-orange-300/80 uppercase">
                      FABRICATOR PRO
                    </div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-orange-400 via-red-400 to-red-500 bg-clip-text text-transparent">
                      AI WORKFLOW v4.0
                    </h1>
                  </div>
                </div>
                <p className="text-sm md:text-base text-gray-300 max-w-xl leading-relaxed">
                  Smart aluminum & UPVC fabrication pipeline: 
                  <span className="text-orange-300"> Smart Measuring</span>, 
                  <span className="text-orange-300"> Technical Design</span>, 
                  <span className="text-orange-300"> AI Optimization</span>, 
                  <span className="text-orange-300"> Inventory</span>, 
                  <span className="text-orange-300"> Production</span>, 
                  <span className="text-orange-300"> Quality Control</span>.
                </p>
              </div>

              {/* Right: System status & search */}
              <div className="w-full lg:w-auto">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Card className="bg-gray-900/70 border-gray-700">
                    <CardContent className="py-3 px-4">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">System</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm font-semibold text-emerald-300">Optimal</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/70 border-gray-700">
                    <CardContent className="py-3 px-4">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">Efficiency</div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-semibold text-orange-300">92.5%</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/70 border-gray-700">
                    <CardContent className="py-3 px-4">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">Active Jobs</div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-semibold text-blue-300">12</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search machines, orders..."
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:border-orange-500/60"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Suspense fallback={null}>
                    <Button
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600 text-xs"
                      onClick={() => {
                        // Reset current context and open a fresh project header wizard
                        workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
                        setProjectMeta(null);
                        setShowProjectWizard(true);
                        setActiveTab('measuring');
                      }}
                    >
                      New Project
                    </Button>
                  </Suspense>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-500 text-orange-300 bg-orange-500/10 text-xs"
                    onClick={() => navigate('/fabricator-workflow/pro')}
                  >
                    <Factory className="h-3 w-3 mr-1" />
                    Mass Production
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Project Header / Context Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 md:p-6 bg-gray-900/40 rounded-xl border border-gray-800">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
                  MODULE
                </p>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-100 flex items-center gap-2">
                  <span>Fabricator Workflow Pro</span>
                  <Badge variant="outline" className="border-orange-500/40 text-orange-300 bg-orange-500/10 text-[10px] uppercase tracking-wide">
                    End-to-End
                  </Badge>
                </h2>
                <p className="text-xs md:text-sm text-gray-400">
                  Complete project lifecycle from measurement to optimization, inventory, production, and quality.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {currentProject && (
                  <>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-300 border-orange-500/40 text-[11px]">
                          <Clock className="h-3 w-3 mr-1" />
                          {currentProject.orderNumber}
                        </Badge>
                        {currentProject.projectCode && (
                          <Badge variant="outline" className="text-[11px]">
                            {currentProject.projectCode}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="bg-green-500/10 text-green-300 border-green-500/40 text-[11px] capitalize">
                          {currentProject.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {projectMeta?.projectName || 'Untitled Project'} ·{' '}
                        {projectMeta?.clientName || 'Unnamed Client'}
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowClientPortal(true)}
                      className="bg-blue-600 hover:bg-blue-700 transition-colors text-xs"
                      size="sm"
                    >
                      <Share2 className="h-3 w-3 mr-1" />
                      Share with Client
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Anatolian Fabricator Cockpit – market intelligence + KPI badges */}
          <AnatolianCockpit
            inventory={inventory}
            currentProject={currentProject}
            optimization={optimizationResults}
            completedSteps={completedSteps}
            totalSteps={workflowSteps.length}
            projectMeta={projectMeta}
          />

          {/* Advanced Bosphorus Workflow Ribbon – prestige step navigation */}
          <BosphorusWorkflowRibbon
            steps={workflowSteps.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              icon: s.icon,
            }))}
            activeStepId={activeTab}
            onStepChange={setActiveTab}
            currentStepIndex={currentStepIndex}
            totalSteps={workflowSteps.length}
            currentTypeLabel={currentProject ? currentProject.type.replace('_', ' ') : undefined}
          />

          {/* Status progress */}
          {currentProject && (
            <div className="mb-6">
              <Suspense
                fallback={
                  <div className="h-10 w-full rounded-lg bg-gray-800/60 animate-pulse" />
                }
              >
                <WorkflowProgress currentStatus={currentProject.status} />
              </Suspense>
            </div>
          )}

          {/* Mobile context panel trigger */}
          <div className="lg:hidden mb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowMobilePanel((prev) => !prev)}
            >
              {showMobilePanel ? 'Hide Job Info' : 'Show Job Info'}
            </Button>
          </div>

          {/* Mobile context panel */}
          {showMobilePanel && (
            <div className="lg:hidden space-y-4 mb-6">
              <Suspense
                fallback={
                  <div className="space-y-3">
                    <div className="h-32 rounded-lg bg-gray-800/60 animate-pulse" />
                    <div className="h-32 rounded-lg bg-gray-800/60 animate-pulse" />
                    <div className="h-32 rounded-lg bg-gray-800/60 animate-pulse" />
                  </div>
                }
              >
                <JobSummaryPanel project={currentProject} />
                <InventoryStatusPanel project={currentProject} />
                <QuickReportsPanel
                  project={currentProject}
                  optimization={optimizationResults}
                />
                <CommercialOfferPanel
                  project={currentProject}
                  optimization={optimizationResults}
                />
              </Suspense>
            </div>
          )}

          {/* Main Content Area with side context panel */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                {/* Measuring Tab */}
            <TabsContent value="measuring" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Ruler className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      Smart Measuring Interface
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Digital measurement capture with AI-assisted dimension verification and validation
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {!projectMeta ? (
                    <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center space-y-3">
                      <p className="text-sm text-gray-300 font-medium">
                        Project header required before measuring
                      </p>
                      <p className="text-xs text-gray-400 max-w-md mx-auto">
                        In professional workflows, each project starts with a clear client, site,
                        currency and system definition. Create the project header to continue.
                      </p>
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-xs mt-2"
                        onClick={() => setShowProjectWizard(true)}
                      >
                        Create Project Header
                      </Button>
                    </div>
                  ) : (
                    <ErrorBoundary level="component">
                      <Suspense
                        fallback={
                          <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                        }
                      >
                        <SmartMeasuringInterface
                          onMeasurementComplete={handleMeasurementComplete}
                          systemPackId={projectMeta.systemPackId}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

                {/* Design Tab */}
            <TabsContent value="design" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Settings className="h-6 w-6 text-orange-400" />
                      </div>
                      <div>
                        Technical Design & Component Specification
                        <CardDescription className="text-lg text-gray-300 mt-1">
                          Define window components, profiles, and manufacturing specifications with precision
                        </CardDescription>
                      </div>
                    </CardTitle>
                    {currentProject && (
                      <div className="flex flex-col items-end gap-1">
                        <label className="text-[11px] text-gray-400">Quantity (poses)</label>
                        <input
                          type="number"
                          min={1}
                          className="w-20 h-8 rounded-md bg-gray-900 border border-gray-700 text-xs px-2 text-right"
                          value={currentProject.quantity || 1}
                          onChange={(e) => {
                            const qty = Math.max(1, Number(e.target.value) || 1);
                            const updated: WindowUnit = {
                              ...currentProject,
                              quantity: qty,
                            };
                            setCurrentProject(updated);
                            addOrUpdateJob(updated);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <DesignInterface
                        project={currentProject}
                        profiles={inventory}
                        onDesignComplete={handleDesignComplete}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

                {/* 3D Preview Tab */}
            <TabsContent value="preview3d" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Box className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      3D Model Preview
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Real-time 3D visualization of your window design with interactive controls and error detection
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="w-full h-[600px] rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      {currentProject ? (
                        <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
                          <Window3DGenerator 
                            windowUnit={currentProject}
                            showControls={true}
                            presentationMode={false}
                            showErrorDetection={true}
                            profiles={inventory}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <Box className="h-20 w-20 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-2xl font-semibold mb-3 text-gray-400">No Project Available</h3>
                          <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Please complete the measurement and design phases first to generate a 3D preview of your window project.
                          </p>
                          <Button 
                            onClick={() => setActiveTab('measuring')}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <Ruler className="h-4 w-4 mr-2" />
                            Start Measuring
                          </Button>
                        </div>
                      )}
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

                {/* Optimization Tab */}
            <TabsContent value="optimization" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Scissors className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <div>
                        AI-Powered Cutting Optimization
                        <CardDescription className="text-lg text-gray-300 mt-1">
                          Advanced algorithms for material optimization, waste reduction, and cost efficiency
                        </CardDescription>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-500 text-orange-300 bg-orange-500/10 text-xs"
                          onClick={() => navigate('/fabricator-workflow/pro')}
                        >
                          <Factory className="h-3 w-3 mr-1" />
                          Mass Production
                        </Button>
                        <span className="text-[11px] text-gray-400">
                          Open Mass Production Cockpit to batch-optimize across all optimized jobs.
                        </span>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <CuttingOptimizationEngine 
                        project={currentProject}
                        optimization={optimizationResults} 
                        isGenerating={isGeneratingCuttingPlan} 
                      />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

                {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-8">
              {/* Profile Management */}
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Package className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      Profile Management
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Add, edit, and manage material profiles (aluminum, UPVC, wood) for cutting optimization and inventory tracking
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <ProfileManagement 
                        userId={userId}
                        onProfilesUpdate={(updatedProfiles) => {
                          setInventory(updatedProfiles);
                        }}
                      />
                    </Suspense>
                  </ErrorBoundary>

                  {/* ELSHERIF Catalog Import – ROCK60 45° optimized profiles */}
                  <div className="mt-4">
                    <Suspense
                      fallback={
                        <div className="h-24 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <ElsherifImportWizard
                        userId={userId}
                        onProfilesImported={(importedProfiles) => {
                          // Merge into current inventory so optimization engine can use them immediately
                          setInventory((prev) => [...prev, ...importedProfiles]);
                        }}
                      />
                    </Suspense>
                  </div>

                  {/* ROCK 60 – 2D cutting list summary for 45° configuration */}
                  {inventory.length > 0 && (
                    <div className="mt-4">
                      <Suspense
                        fallback={
                          <div className="h-40 rounded-lg bg-gray-800/60 animate-pulse" />
                        }
                      >
                        <Rock60CuttingSummary profiles={inventory} />
                      </Suspense>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inventory Dashboard */}
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Package className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      Inventory Management & Stock Control
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Real-time inventory tracking, stock alerts, automatic reordering, and remnant management
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="h-80 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <InventoryDashboard 
                        inventory={inventory} 
                        project={currentProject}
                        userId={userId}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

                {/* Production Tab */}
            <TabsContent value="production" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Factory className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      Production Planning & Scheduling
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Machine scheduling, operation sequencing, real-time monitoring, and production tracking
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <ProductionScheduler 
                        project={currentProject} 
                        onProductionStart={handleProductionStart} 
                      />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

                {/* Quality Tab */}
            <TabsContent value="quality" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Zap className="h-6 w-6 text-orange-400" />
                    </div>
                    <div>
                      Quality Control & Inspection
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Automated quality checks, compliance verification, and inspection reporting
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <QualityControl project={currentProject} />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
              </Tabs>
            </div>

            {/* Desktop context panel */}
            <div className="hidden lg:block w-80 flex-shrink-0 space-y-4">
              <Suspense
                fallback={
                  <>
                    <div className="h-40 rounded-lg bg-gray-800/60 animate-pulse" />
                    <div className="h-40 rounded-lg bg-gray-800/60 animate-pulse" />
                    <div className="h-40 rounded-lg bg-gray-800/60 animate-pulse" />
                  </>
                }
              >
                <JobSummaryPanel project={currentProject} />
                <InventoryStatusPanel project={currentProject} />
                <QuickReportsPanel
                  project={currentProject}
                  optimization={optimizationResults}
                />
                <CommercialOfferPanel
                  project={currentProject}
                  optimization={optimizationResults}
                />
                <PricingPreview
                  project={currentProject}
                  profiles={inventory}
                  accessories={[]}
                  region={(projectMeta?.region ?? 'global') as any}
                />
              </Suspense>
            </div>
          </div>

          {/* Real-time Monitoring Section */}
          {(activeTab === 'production' || activeTab === 'quality') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-12"
            >
              <Suspense
                fallback={
                  <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                }
              >
                <RealTimeMonitoring projects={projects} />
              </Suspense>
            </motion.div>
          )}

          {/* Positions & Flats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <Suspense
              fallback={<div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />}
            >
              <PositionsGrid currentProject={currentProject} />
            </Suspense>
          </motion.div>

          {/* Client Portal Modal */}
          {showClientPortal && currentProject && (
            <Suspense
              fallback={
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                  <div className="w-80 h-40 rounded-xl bg-gray-900/80 border border-gray-700 animate-pulse" />
                </div>
              }
            >
              <ClientPortalManager
                project={currentProject}
                onClose={() => setShowClientPortal(false)}
              />
            </Suspense>
          )}

          {/* Istanbul Skyline – interactive ambient footer */}
          <IstanbulSkylineFooter
            completionRatio={
              workflowSteps.length > 0 ? (currentStepIndex + 1) / workflowSteps.length : 0
            }
          />

          {/* Feedback button for stabilization phase */}
          <Suspense fallback={null}>
            <FeedbackButton jobId={currentProject?.id} />
          </Suspense>

          {/* New Project Wizard – mandatory header before measuring */}
          <Suspense fallback={null}>
            <NewProjectWizard
              open={showProjectWizard}
              onOpenChange={setShowProjectWizard}
              onSubmit={(meta) => {
                const projectCode = `FP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
                const customerCode = `FC-${meta.clientName
                  .replace(/\s+/g, '')
                  .toUpperCase()
                  .slice(0, 3)}-${Date.now().toString(36).toUpperCase().slice(-3)}`;
                setProjectMeta({ ...meta, projectCode, customerCode });
                setShowProjectWizard(false);
                // Keep user on measuring tab ready to capture dimensions
                setActiveTab('measuring');
              }}
            />
          </Suspense>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FabricatorWorkflow;