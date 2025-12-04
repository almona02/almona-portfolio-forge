// pages/FabricatorWorkflow.tsx
import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Tabs, TabsContent } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
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
  Clock,
  Search,
  BarChart3,
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
const ProductionCommand = React.lazy(() =>
  import('@/components/fabricator/ProductionCommand').then((m) => ({
    default: m.ProductionCommand,
  })),
);
const OptimizationEqualizer = React.lazy(() =>
  import('@/components/fabricator/OptimizationEqualizer').then((m) => ({
    default: m.OptimizationEqualizer,
  })),
);
const PersonalAnalyticsDashboard = React.lazy(() =>
  import('@/components/fabricator/PersonalAnalyticsDashboard').then((m) => ({
    default: m.PersonalAnalyticsDashboard,
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
const ProfileImportTool = React.lazy(() =>
  import('@/components/fabricator/ProfileImportTool').then((m) => ({
    default: m.ProfileImportTool,
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
const CalibrationWizard = React.lazy(() =>
  import('@/components/fabricator/CalibrationWizard').then((m) => ({
    default: m.CalibrationWizard,
  })),
);

import { parseLegacyOrderData } from '@/lib/legacyDataParser';
import { ROCK60_WINDOW_SYSTEM_TEMPLATE } from '@/data/systemPacks';
import {
  WindowUnit,
  Profile,
  OptimizationResult,
  WindowComponent,
  MeasurementData,
  AdaptiveSolverConfig,
} from '@/types/fabricator';
import { EnhancedAdaptiveSolver } from '@/algorithms/EnhancedAdaptiveSolver';
import { trainingDataCollector } from '@/lib/ml/TrainingDataCollector';
import { validateProject, deriveSystemConstraintsFromProfiles, validateProjectWithConstraints } from '@/lib/fabricatorValidation';
import { useJobsStore } from '@/store/jobsStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnatolianCockpit } from '@/components/fabricator/AnatolianCockpit';
import { BosphorusWorkflowRibbon } from '@/components/fabricator/BosphorusWorkflowRibbon';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { 
  trackFabricatorLoadTime, 
  markFabricatorReady, 
  trackInventoryLoad,
  trackOptimization 
} from '@/lib/performance';
import { FabricatorLoader } from '@/components/ui/EnhancedLoadingStates';
import { ContextualTooltips } from '@/components/fabricator/ContextualTooltips';

const sampleHardware = [
  { id: 'hinge_1', name: 'Casement Hinge', type: 'hinge', quantity: 2, position: 'side' },
  { id: 'lock_1', name: 'Multi-point Lock', type: 'lock', quantity: 1, position: 'side' },
  { id: 'handle_1', name: 'Lever Handle', type: 'handle', quantity: 1, position: 'center' }
];

import type { ProjectHeaderMeta } from '@/components/fabricator/NewProjectWizard';

export const FabricatorWorkflow: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = (location.state as { jobId?: string; startTab?: string; fromCustomer?: {
    id: string;
    name: string;
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
  } } | null) || null;
  const {
    jobs,
    selectedJobId,
    setSelectedJob,
    addOrUpdateJob,
    loadJobs,
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
  // Project-created toast message is now handled directly by wizards
  const { branding } = useCompanyBranding();

  const activeWorkshopLabel =
    branding.workshopName?.trim() ||
    branding.companyName?.trim() ||
    undefined;

  // Force-remount SmartMeasuringInterface when starting a fresh pose measuring session
  const [measurementSessionId, setMeasurementSessionId] = useState(0);


  // Performance tracking: Track component mount
  useEffect(() => {
    trackFabricatorLoadTime();
    
    // Mark as ready when workspace is fully loaded (inventory + initial project state)
    const checkReady = () => {
      if (!isLoadingInventory && (inventory.length > 0 || inventoryError)) {
        // Small delay to ensure UI is rendered
        setTimeout(() => {
          markFabricatorReady();
        }, 100);
      }
    };
    
    checkReady();
  }, [isLoadingInventory, inventory.length, inventoryError]);

  // Measuring tab: existing project + pose selection
  const [selectedExistingProjectKey, setSelectedExistingProjectKey] = useState<string>('');
  const [selectedExistingPoseId, setSelectedExistingPoseId] = useState<string>('');

  // After SmartDraw applies a layout, we treat the pose as "designed" and
  // let the operator decide whether to add more poses or continue to optimisation.
  const [pendingLayoutComponents, setPendingLayoutComponents] = useState<WindowComponent[] | null>(
    null,
  );
  const [showLayoutNextStep, setShowLayoutNextStep] = useState(false);

  const relatedPositions = React.useMemo(
    () =>
      currentProject
        ? jobs.filter((job) => job.orderNumber === currentProject.orderNumber)
        : jobs,
    [jobs, currentProject],
  );

  // Group loaded jobs by project (projectCode or orderNumber) for project‑level selection
  const existingProjectGroups = React.useMemo(
    () => {
      const map = new Map<
        string,
        {
          key: string;
          label: string;
          jobs: WindowUnit[];
        }
      >();

      jobs.forEach((job) => {
        const key = job.projectCode || job.orderNumber || job.id;
        const labelBase = job.projectCode || job.orderNumber || 'Project';
        const label =
          job.customer && job.customer.trim().length > 0
            ? `${labelBase} · ${job.customer}`
            : labelBase;

        if (!map.has(key)) {
          map.set(key, {
            key,
            label,
            jobs: [job],
          });
        } else {
          map.get(key)!.jobs.push(job);
        }
      });

      return Array.from(map.values());
    },
    [jobs],
  );

  // Helper: derive a lightweight project header from an existing pose/job
  const deriveProjectMetaFromJob = (job: WindowUnit): ProjectHeaderMeta => ({
    clientName: job.customer || 'Fabricator Client',
    projectName: job.projectCode || job.orderNumber || 'Project',
    siteName: job.positionMeta?.elevation || '',
    currency: 'EGP',
    region: 'global',
    projectCode: job.projectCode,
    customerCode: job.customerCode,
    orderNumber: job.orderNumber,
    // We don't currently persist customerId / contactPhone / orderDate on WindowUnit;
    // those can be filled if/when the types carry them.
  });

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

  // If workflow is opened from Customers "New Order", pre-open the project wizard with that customer
  useEffect(() => {
    if (navState?.fromCustomer && !projectMeta) {
      setProjectMeta({
        clientName: navState.fromCustomer.name,
        projectName: '',
        siteName: '',
        currency: 'EGP',
        region: 'egypt',
        customerId: navState.fromCustomer.id,
      });
      setShowProjectWizard(true);
      setActiveTab('measuring');
    }
  }, [navState, projectMeta]);

  // Ensure jobs are loaded when entering the workflow directly (for project selection in Measuring)
  useEffect(() => {
    if (!jobs.length) {
      void loadJobs();
    }
  }, [jobs.length, loadJobs]);

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
    // Only force the project wizard when there are no saved jobs at all.
    // If jobs exist, operators can instead select an existing project from
    // the Smart Measuring "Open project" selector.
    if (!currentProject && !projectMeta && jobs.length === 0) {
      setShowProjectWizard(true);
    }
  }, [currentProject, projectMeta, jobs.length]);

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
      
      // Track inventory load performance
      const inventoryTracker = trackInventoryLoad();
      
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
        // End inventory load tracking
        inventoryTracker.end();
      }
    };

    loadInventory();
  }, []);

  const generateCuttingPlan = useCallback(
    async (components: WindowComponent[], profiles: Profile[]): Promise<OptimizationResult> => {
      setIsGeneratingCuttingPlan(true);

      // Track optimization performance
      const optimizationTracker = trackOptimization();

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

        // Validate cut lengths before optimization (preserving safety checks)
        // This validation ensures no cuts will exceed MAX_STOCK_LENGTH_MM after allowances
        components.forEach((component) => {
          const profile = profiles.find((p) => p.id === component.profile.id);
          if (!profile) return;

          const specs = profile.specifications || {};
          const isBorderFrame =
            (profile.type === 'frame' ||
              specs.egyptFrameType === 'sliding' ||
              specs.egyptFrameType === 'casement') &&
            specs.egyptBorderIncluded === 'with';

          const borderExtraAllowance = isBorderFrame
            ? (specs.borderExtraAllowanceMm as number | undefined) ?? 5
            : 0;
          const allowance = profile.cuttingAllowance + borderExtraAllowance;

          component.cuttingLengths.forEach((length) => {
            const rawLength = length + allowance;

            // Hard safety check: no individual cut may exceed MAX_STOCK_LENGTH_MM.
            if (rawLength > MAX_STOCK_LENGTH_MM) {
              throw new Error(
                `Calculated cut length ${rawLength.toFixed(
                  1,
                )} mm exceeds maximum stock length ${MAX_STOCK_LENGTH_MM} mm for profile "${profile.name}". ` +
                  'Please adjust dimensions or split this element into multiple parts.',
              );
            }
          });
        });

        // Configure enhanced adaptive solver with ML prediction
        const solverConfig: AdaptiveSolverConfig = {
          maxSolvingTime: 60, // 60 seconds max
          complexityThresholds: {
            simple: 50, // Use greedy for <50 cuts
            medium: 500, // Use LP for 50-500, genetic for 500+
          },
          timeConstraint: 'fast', // Default to fast, can be made configurable
          optimalityTarget: 'balanced',
          enableMLPrediction: true, // Enable ML-based algorithm prediction
          enableCaching: true, // Enable result caching
          enableRealtimePresolver: true, // Enable real-time pre-solver
          enableProgressiveOptimization: true, // Enable progressive optimization
        };

        // Use enhanced adaptive solver with ML prediction and caching
        const adaptiveSolver = new EnhancedAdaptiveSolver(solverConfig);
        const startTime = performance.now();
        
        const result = await adaptiveSolver.solveEnhanced(
          {
            components, // Original components with raw cuttingLengths
            profiles,
            defaultStockLength: 6000,
            systemPackId: currentProject?.systemPackId, // Pass system pack for calibration lookup
          },
          profiles,
          {
            onProgress: (progress, intermediateResult) => {
              // Optional: Show progress to user
              if (intermediateResult && progress < 100) {
                console.log(`Optimization progress: ${progress}%`);
              }
            },
          }
        );
        
        const solveTime = performance.now() - startTime;
        
        // Collect training data for ML model
        try {
          const complexity = (adaptiveSolver as any).analyzeComplexity(
            { components, profiles },
            profiles,
          );
          const algorithm = (adaptiveSolver as any).selectAlgorithm(complexity);

          await trainingDataCollector.collectTrainingData(
            result,
            complexity,
            algorithm,
            solveTime,
            userId || 'anonymous',
            currentProject?.id,
          );
        } catch (error) {
          console.warn('Failed to collect training data:', error);
          // Don't fail optimization if training data collection fails
        }

        // Calculate hardware cost (preserving existing logic)
        const hardwareCost = components.reduce(
          (sum, comp) => sum + comp.hardware.reduce((hSum, _h) => hSum + 5, 0),
          0,
        );

        // Update cost breakdown with hardware cost
        result.costBreakdown.hardwareCost = hardwareCost;
        result.costBreakdown.totalCost =
          result.costBreakdown.materialCost +
          result.costBreakdown.laborCost +
          result.costBreakdown.hardwareCost +
          result.costBreakdown.glazingCost;

        setIsGeneratingCuttingPlan(false);
        workspaceDispatch({ type: 'SET_OPTIMIZATION_RESULT', payload: result });
        // End optimization tracking
        optimizationTracker.end();
        return result;
      } catch (error) {
        setIsGeneratingCuttingPlan(false);
        console.error('Error generating cutting plan:', error);
        // End tracking even on error
        optimizationTracker.end();
        throw error;
      }
    },
    [workspaceDispatch, currentProject?.id, currentProject?.systemPackId, userId]
  );

  const handleMeasurementComplete = useCallback(
    async (data: MeasurementData) => {
      try {
        setProjectError(null);

        // Check subscription limits
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { featureGates } = await import('@/lib/subscription/FeatureGates');
          const canCreate = await featureGates.canCreateProject(user.id);
          if (!canCreate.allowed) {
            setProjectError(canCreate.reason || 'Project limit reached');
            return;
          }
        }

        if (!projectMeta) {
          throw new Error('Please create a project header before measuring.');
        }
        
        const width = Number(data.width);
        const height = Number(data.height);
        
        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
          throw new Error('Invalid measurement data provided');
        }

        const resolvedSystemPackId = data.systemPackId || projectMeta.systemPackId;

        // Determine pose index and reuse order number per project so that
        // when the operator adds a new pose, it becomes POS-002, POS-003, etc.
        const existingForProject = jobs.filter(
          (job) => job.projectCode && job.projectCode === projectMeta.projectCode,
        );

        const poseIndex = existingForProject.length + 1;

        // Increment project count for subscription
        if (user) {
          const { subscriptionManager } = await import('@/lib/subscription/SubscriptionManager');
          await subscriptionManager.incrementProjectCount(user.id);
        }

        const baseOrderNumber =
          projectMeta.orderNumber?.trim() ||
          existingForProject[0]?.orderNumber ||
          `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const posNumber = `POS-${poseIndex.toString().padStart(3, '0')}`;
        const positionCodeBase = projectMeta.projectCode || baseOrderNumber;
        const positionCode = `${positionCodeBase}-P${poseIndex.toString().padStart(2, '0')}`;

        const newProject: WindowUnit = {
          id: `proj_${Date.now()}`,
          orderNumber: baseOrderNumber,
          posNumber,
          type: data.windowType || 'sliding_window',
          components: [],
          overallWidth: width,
          overallHeight: height,
          color: String(data.color) || 'Silver',
          glazing: {
            type: data.glazingType || 'double',
            color: data.glassColor || 'clear',
            thickness: 24,
            spacer: 12,
            gasFill: 'argon'
          },
          hardware: sampleHardware,
          quantity: 1,
          status: 'design',
          optimization: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          orderDate: projectMeta.orderDate ? new Date(projectMeta.orderDate) : undefined,
          customer: projectMeta.clientName,
          systemPackId: resolvedSystemPackId,
          projectCode: projectMeta.projectCode,
          customerCode: projectMeta.customerCode,
          positionCode,
          positionMeta: {
            flatNumber: data.flatNumber || undefined,
            buildingBlock: data.buildingBlock || undefined,
            floor: data.floor || undefined,
            unitOrApartment: data.unitOrApartment || undefined,
            elevation: data.elevation || undefined,
            roomOrZone: data.roomOrZone || undefined,
            windowIndex: data.windowIndex || undefined,
            remarks: data.remarks || undefined,
          } as any,
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
    [addOrUpdateJob, setSelectedJob, projectMeta, setActiveTab, workspaceDispatch, jobs]
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

      // Lightweight consistency check between design components and generated optimisation
      if (components.length > 0 && optimization.cuttingPlan.length > 0) {
        const issues: string[] = [];

        optimization.cuttingPlan.forEach((plan) => {
          const totalCutLength = plan.cuts.reduce((sum, cut) => sum + cut.length, 0);
          if (totalCutLength > plan.stockLength * 1.001) {
            issues.push(
              `${plan.profile.name}: total cut length ${totalCutLength.toFixed(
                1,
              )}mm exceeds stock length ${plan.stockLength.toFixed(1)}mm (per bar model).`,
            );
          }
        });

        if (issues.length > 0) {
          setProjectError(
            `Optimisation/check mismatch detected:\n${issues
              .map((s) => `• ${s}`)
              .join('\n')}\nPlease review components or stock lengths before sending to production.`,
          );
        }
      }
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
  },     [currentProject, inventory, generateCuttingPlan, addOrUpdateJob, setSelectedJob, workspaceDispatch]);

  const handleHardwareUpdate = useCallback((hardware: any[]) => {
    if (!currentProject) return;

    const updatedProject: WindowUnit = {
      ...currentProject,
      hardware,
      updatedAt: new Date(),
    };

    workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: updatedProject });
    addOrUpdateJob(updatedProject);
  }, [currentProject, addOrUpdateJob, workspaceDispatch]);

  const handleSmartDrawApply = useCallback(
    (components: WindowComponent[]) => {
      if (!currentProject) {
        setProjectError('No project available. Please complete the measurement phase first.');
        return;
      }

      try {
        setProjectError(null);

        if (!components || components.length === 0) {
          throw new Error('No components provided from Smart Draw layout.');
        }

        const designedProject: WindowUnit = {
          ...currentProject,
          components,
          status: 'design',
          updatedAt: new Date(),
        };

        workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: designedProject });
        addOrUpdateJob(designedProject);
        setSelectedJob(designedProject.id);

        setPendingLayoutComponents(components);
        setShowLayoutNextStep(true);
      } catch (error) {
        console.error('Error applying SmartDraw layout:', error);
        setProjectError(
          error instanceof Error ? error.message : 'Failed to apply Smart Draw layout',
        );
      }
    },
    [currentProject, addOrUpdateJob, setSelectedJob, workspaceDispatch],
  );

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
  }, [currentProject, addOrUpdateJob, setSelectedJob, workspaceDispatch, inventory]);

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
                {/* Note: Could be replaced with ProgressLoader component for better UX */}
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
                {activeWorkshopLabel && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-900/80 border border-orange-500/40 px-3 py-1 text-[11px] text-orange-200">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="uppercase tracking-[0.18em] text-orange-300/90">
                      Workshop
                    </span>
                    <span className="font-medium text-orange-100 truncate max-w-[220px] md:max-w-xs">
                      {activeWorkshopLabel}
                    </span>
                  </div>
                )}
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
                  {projectMeta && (
                    <div className="hidden md:flex flex-col items-end text-[11px] text-gray-400 mr-2">
                      <span className="text-gray-300">
                        Active project:{' '}
                        <span className="text-gray-100 font-semibold">
                          {projectMeta.projectName || 'Untitled'}
                        </span>
                      </span>
                      <span className="text-gray-500">
                        {projectMeta.projectCode && (
                          <>
                            Code: <span className="font-mono">{projectMeta.projectCode}</span>{' '}
                          </>
                        )}
                        for <span className="text-gray-200">{projectMeta.clientName}</span>
                      </span>
                    </div>
                  )}
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
                {projectMeta && !currentProject && (
                  <div className="px-3 py-2 rounded-lg bg-emerald-900/20 border border-emerald-500/50 text-[11px] text-emerald-100">
                    Project{' '}
                    {projectMeta.projectCode && (
                      <span className="font-mono">{projectMeta.projectCode}</span>
                    )}{' '}
                    for <span className="font-semibold">{projectMeta.clientName}</span> created.
                    <span className="ml-1 text-emerald-200">
                      Start measuring to add poses to this project.
                    </span>
                  </div>
                )}
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
            performanceInsights={{
              optimizationSpeed: '2.5x faster',
              wasteReduction: '12% average',
              mlAccuracy: '94% prediction rate',
              remnantUtilization: '15% increase'
            }}
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
                  {currentProject && currentProject.status !== 'measuring' && (
                    <Alert className="mb-4 bg-yellow-900/30 border-yellow-500/60">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Edit existing project measurements</AlertTitle>
                      <AlertDescription className="text-xs">
                        You are editing measurements for an existing project that may already have
                        design, optimization, or production data. Changing dimensions can invalidate
                        existing poses, cutting plans, and reports. Proceed carefully and coordinate
                        with production if this order is already scheduled.
                      </AlertDescription>
                    </Alert>
                  )}
                  {/* Existing project + pose selector so operators can reopen or extend a saved project */}
                  {existingProjectGroups.length > 0 && (
                    <div className="mb-4 space-y-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <p className="text-xs text-gray-400">
                          Select an existing project to continue, then choose whether to edit a pose or add a new one.
                        </p>
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] text-gray-300">Existing project</label>
                          <select
                            className="h-8 rounded-md bg-gray-900 border border-gray-700 text-xs px-2 text-gray-100"
                            value={selectedExistingProjectKey}
                            onChange={(e) => {
                              const key = e.target.value;
                              setSelectedExistingProjectKey(key);
                              setSelectedExistingPoseId('');
                            }}
                          >
                            <option value="">Select…</option>
                            {existingProjectGroups.map((group) => (
                              <option key={group.key} value={group.key}>
                                {group.label} ({group.jobs.length} poses)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedExistingProjectKey && (
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between rounded-lg border border-gray-700 bg-gray-900/40 p-3">
                          <div className="flex flex-col gap-2">
                            <label className="text-[11px] text-gray-300">Pose in selected project</label>
                            <select
                              className="h-8 w-full md:w-64 rounded-md bg-gray-900 border border-gray-700 text-xs px-2 text-gray-100"
                              value={selectedExistingPoseId}
                              onChange={(e) => setSelectedExistingPoseId(e.target.value)}
                            >
                              <option value="">Select pose…</option>
                              {existingProjectGroups
                                .find((g) => g.key === selectedExistingProjectKey)
                                ?.jobs.map((unit) => (
                                  <option key={unit.id} value={unit.id}>
                                    {unit.posNumber} · {unit.overallWidth.toFixed(0)} ×{' '}
                                    {unit.overallHeight.toFixed(0)} mm
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!selectedExistingPoseId}
                              onClick={() => {
                                if (!selectedExistingPoseId) return;
                                const job = jobs.find((j) => j.id === selectedExistingPoseId);
                                if (!job) return;

                                // Ensure header meta is present for this project
                                setProjectMeta(deriveProjectMetaFromJob(job));

                                workspaceDispatch({
                                  type: 'SET_CURRENT_PROJECT',
                                  payload: job,
                                });
                                setSelectedJob(job.id);
                                setActiveTab('design');
                              }}
                            >
                              Edit selected pose
                            </Button>
                            <Button
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600"
                              onClick={() => {
                                const group = existingProjectGroups.find(
                                  (g) => g.key === selectedExistingProjectKey,
                                );
                                const baseJob = group?.jobs[0];
                                if (!baseJob) return;

                                // Use the first pose of the project to reconstruct the project header,
                                // then start a fresh measuring session for a new pose.
                                setProjectMeta(deriveProjectMetaFromJob(baseJob));
                                workspaceDispatch({
                                  type: 'SET_CURRENT_PROJECT',
                                  payload: null,
                                });
                                workspaceDispatch({
                                  type: 'SET_MEASUREMENT_DATA',
                                  payload: null,
                                });
                                setShowLayoutNextStep(false);
                                setPendingLayoutComponents(null);
                                setMeasurementSessionId((prev) => prev + 1);
                                setActiveTab('measuring');
                              }}
                            >
                              Add new pose to this project
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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
                          key={measurementSessionId}
                          onMeasurementComplete={handleMeasurementComplete}
                          systemPackId={undefined}
                          region={projectMeta.region}
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
                      <div className="flex flex-col items-end gap-2">
                        {/* Pose selector: choose which position/unit of the project to engage in design */}
                        {relatedPositions.length > 0 && (
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] text-gray-400">Active pose</label>
                            <select
                              className="h-8 rounded-md bg-gray-900 border border-gray-700 text-xs px-2 text-gray-100"
                              value={currentProject.id}
                              onChange={(e) => {
                                const id = e.target.value;
                                const target = relatedPositions.find((u) => u.id === id);
                                if (!target) return;
                                workspaceDispatch({
                                  type: 'SET_CURRENT_PROJECT',
                                  payload: target,
                                });
                                setSelectedJob(target.id);
                              }}
                            >
                              {relatedPositions.map((unit) => (
                                <option key={unit.id} value={unit.id}>
                                  {unit.posNumber} · {unit.overallWidth.toFixed(0)} ×{' '}
                                  {unit.overallHeight.toFixed(0)} mm
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
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
                              workspaceDispatch({
                                type: 'SET_CURRENT_PROJECT',
                                payload: updated,
                              });
                              addOrUpdateJob(updated);
                            }}
                          />
                        </div>
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
                      <>
                        {showLayoutNextStep && currentProject && (
                          <Alert className="mb-4 bg-blue-900/20 border-blue-500">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="space-y-1 text-xs md:text-sm">
                              <div>
                                Layout applied for pose{' '}
                                <span className="font-mono">{currentProject.posNumber}</span> (
                                qty {currentProject.quantity ?? 1}).
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    // Start a fresh measuring session for the next pose
                                    workspaceDispatch({
                                      type: 'SET_CURRENT_PROJECT',
                                      payload: null,
                                    });
                                    workspaceDispatch({
                                      type: 'SET_MEASUREMENT_DATA',
                                      payload: null,
                                    });
                                    setShowLayoutNextStep(false);
                                    setPendingLayoutComponents(null);
                                    setMeasurementSessionId((prev) => prev + 1);
                                    setActiveTab('measuring');
                                  }}
                                >
                                  Add another pose to this project
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs bg-orange-500 hover:bg-orange-600"
                                  onClick={() => {
                                    if (pendingLayoutComponents && pendingLayoutComponents.length) {
                                      void handleDesignComplete(pendingLayoutComponents);
                                    }
                                    setShowLayoutNextStep(false);
                                    setPendingLayoutComponents(null);
                                  }}
                                >
                                  Proceed to cutting optimisation
                                </Button>
                              </div>
                            </AlertDescription>
                          </Alert>
                        )}
                        <DesignInterface
                          project={currentProject}
                          profiles={inventory}
                          relatedPositions={relatedPositions}
                          onSelectPosition={(id) => {
                            const target = relatedPositions.find((u) => u.id === id);
                            if (!target) return;
                            workspaceDispatch({
                              type: 'SET_CURRENT_PROJECT',
                              payload: target,
                            });
                            setSelectedJob(target.id);
                          }}
                          onDesignComplete={handleDesignComplete}
                          onSmartDrawApply={handleSmartDrawApply}
                          onHardwareUpdate={handleHardwareUpdate}
                        />
                        
                        {/* Calibration Wizard Integration */}
                        {currentProject && currentProject.systemPackId && inventory.length > 0 && (
                          <div className="mt-6 border-t border-gray-700 pt-6">
                            <Suspense fallback={
                              <FabricatorLoader 
                                stage="Loading calibration wizard..." 
                                progress={0}
                              />
                            }>
                              <CalibrationWizard
                                profile={inventory.find((p) => 
                                  currentProject.components?.some((c) => c.profile.id === p.id)
                                ) || inventory[0]}
                                systemPackId={currentProject.systemPackId || ''}
                                userId={userId}
                                onCalibrationComplete={(_calibration) => {
                                  // Update project with calibrated profiles
                                  const updatedProject = {
                                    ...currentProject,
                                    // Calibration is stored in profile specifications
                                  };
                                  workspaceDispatch({
                                    type: 'SET_CURRENT_PROJECT',
                                    payload: updatedProject,
                                  });
                                }}
                              />
                            </Suspense>
                          </div>
                        )}
                      </>
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
                <CardContent className="pt-4 space-y-6">
                  {/* Optimization Strategy Equalizer - Pre-optimization control */}
                  {userId && (
                    <ErrorBoundary level="component">
                      <Suspense
                        fallback={
                          <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                        }
                      >
                        <OptimizationEqualizer
                          userId={userId}
                          profiles={inventory}
                          onStrategyChange={(strategy) => {
                            // Store strategy for use in optimization
                            // This will be passed to generateCuttingPlan
                            console.log('Optimization strategy changed:', strategy);
                          }}
                        />
                      </Suspense>
                    </ErrorBoundary>
                  )}

                  {/* Production Command Center */}
                  <ErrorBoundary level="component">
                    <Suspense
                      fallback={
                        <div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <ProductionCommand 
                        project={currentProject}
                        optimization={optimizationResults} 
                        isGenerating={isGeneratingCuttingPlan}
                        profiles={inventory}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>

              {/* Personal Analytics Dashboard */}
              {userId && (
                <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-purple-400" />
                      </div>
                      <div>
                        Personal Analytics
                        <CardDescription className="text-lg text-gray-300 mt-1">
                          Insights from your calibration data to improve accuracy
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
                        <PersonalAnalyticsDashboard userId={userId} />
                      </Suspense>
                    </ErrorBoundary>
                  </CardContent>
                </Card>
              )}
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

                  {/* Smart Profile Import Tool – Multi-format with K-factor learning */}
                  <div className="mt-4">
                    <Suspense
                      fallback={
                        <div className="h-24 rounded-lg bg-gray-800/60 animate-pulse" />
                      }
                    >
                      <ProfileImportTool
                        userId={userId}
                        existingProfiles={inventory}
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


          {/* Feedback button for stabilization phase */}
          <Suspense fallback={null}>
            <FeedbackButton jobId={currentProject?.id} />
          </Suspense>

          {/* New Project Wizard – mandatory header before measuring */}
          <Suspense fallback={null}>
            <NewProjectWizard
              open={showProjectWizard}
              onOpenChange={setShowProjectWizard}
              initialMeta={projectMeta || undefined}
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


          {/* Contextual Tooltips */}
          <ContextualTooltips
            tooltips={[
              {
                id: 'measuring-tab',
                title: 'Start Here: Smart Measuring',
                description: 'Click here to begin measuring window dimensions using our AI-powered tools.',
                targetSelector: '[data-tutorial="measuring-tab"]',
                trigger: 'after-delay',
                delay: 5000,
                priority: 10,
                condition: () => activeTab === 'measuring',
              },
              {
                id: 'design-tab',
                title: 'AI-Powered Design',
                description: 'After measuring, use this tab to design your window configuration with AI assistance.',
                targetSelector: '[data-tutorial="design-tab"]',
                trigger: 'after-delay',
                delay: 3000,
                priority: 9,
                condition: () => activeTab === 'design' && currentProject !== null,
              },
            ]}
            enabled={true}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FabricatorWorkflow;