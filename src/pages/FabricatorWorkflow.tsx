// pages/FabricatorWorkflow.tsx
import ErrorBoundary from '@/components/ErrorBoundary';
import { ConsequenceAlert } from '@/components/authority/ConsequenceAlert';
import { OperationModeBadge } from '@/components/authority/OperationModeBadge';
import { OutputClarity } from '@/components/authority/OutputClarity';
import { EgyptianConstraintsCard } from '@/components/fabricator/EgyptianConstraintsCard';
import { PersonaContextLayer } from '@/components/persona/PersonaContextLayer';
import { EGYPTIAN_PATTERNS } from '@/data/egyptian-window-patterns';
import { useOperationMode } from '@/hooks/useOperationMode';
import { usePersona } from '@/hooks/usePersona';
import { track } from '@/lib/analytics';
import { enhanceValidationWithConsequences } from '@/lib/authority/consequenceMapper';
import { generateConstitutionalMetadata, validateConstitutionalCompliance } from '@/lib/authority/constitutionalValidation';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent } from '@/shared/ui/ui/tabs';
import { LazyAnimatePresence, LazyMotionDiv } from '@/utils/lazyMotion';
import {
    AlertCircle,
    BarChart3,
    Box,
    CheckCircle2,
    Clock,
    Factory,
    Loader2,
    Package,
    Ruler,
    Scissors,
    Search,
    Settings,
    Share2,
    Zap,
} from 'lucide-react';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// NOTE: Heavy Fabricator Pro modules are lazy‑loaded per tab to keep
// initial bundle size and TTI low for heavy‑duty usage.
// PHASE 4: Using lazyRetry for better reliability
import { lazyRetry } from '@/utils/lazyImport';

const SmartMeasuringInterface = lazyRetry(
  () => import('@/components/fabricator/SmartMeasuringInterface').then((m) => ({
    default: m.SmartMeasuringInterface,
  })),
  'SmartMeasuringInterface'
);
const DesignInterface = lazyRetry(
  () => import('@/components/fabricator/DesignInterface').then((m) => ({
    default: m.DesignInterface,
  })),
  'DesignInterface'
);
const ProductionCommand = lazyRetry(
  () => import('@/components/fabricator/ProductionCommand').then((m) => ({
    default: m.ProductionCommand,
  })),
  'ProductionCommand'
);
const OptimizationEqualizer = lazyRetry(
  () => import('@/components/fabricator/OptimizationEqualizer').then((m) => ({
    default: m.OptimizationEqualizer,
  })),
  'OptimizationEqualizer'
);
const PersonalAnalyticsDashboard = lazyRetry(
  () => import('@/components/fabricator/PersonalAnalyticsDashboard').then((m) => ({
    default: m.PersonalAnalyticsDashboard,
  })),
  'PersonalAnalyticsDashboard'
);
const InventoryDashboard = lazyRetry(
  () => import('@/components/fabricator/InventoryDashboard').then((m) => ({
    default: m.InventoryDashboard,
  })),
  'InventoryDashboard'
);
const ProfileManagement = lazyRetry(
  () => import('@/components/fabricator/ProfileManagement').then((m) => ({
    default: m.ProfileManagement,
  })),
  'ProfileManagement'
);
const SystemPackManagement = lazyRetry(
  () => import('@/components/fabricator/SystemPackManagement').then((m) => ({
    default: m.SystemPackManagement,
  })),
  'SystemPackManagement'
);
const ProfileImportTool = lazyRetry(
  () => import('@/components/fabricator/ProfileImportTool').then((m) => ({
    default: m.ProfileImportTool,
  })),
  'ProfileImportTool'
);
const ProductionScheduler = lazyRetry(
  () => import('@/components/fabricator/ProductionScheduler').then((m) => ({
    default: m.ProductionScheduler,
  })),
  'ProductionScheduler'
);
const QualityControl = lazyRetry(
  () => import('@/components/fabricator/QualityControl').then((m) => ({
    default: m.QualityControl,
  })),
  'QualityControl'
);
const RealTimeMonitoring = lazyRetry(
  () => import('@/components/fabricator/RealTimeMonitoring').then((m) => ({
    default: m.RealTimeMonitoring,
  })),
  'RealTimeMonitoring'
);
const PrecisionDesignInterface = lazyRetry(
  () => import('@/components/fabricator/PrecisionDesignInterface').then((m) => ({
    default: m.PrecisionDesignInterface,
  })),
  'PrecisionDesignInterface'
);
const JobSummaryPanel = lazyRetry(
  () => import('@/components/fabricator/JobSummaryPanel').then((m) => ({
    default: m.JobSummaryPanel,
  })),
  'JobSummaryPanel'
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
const RealTimeQuote = React.lazy(() =>
  import('@/components/fabricator/RealTimeQuote').then((m) => ({
    default: m.RealTimeQuote,
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

import { EnhancedAdaptiveSolver } from '@/algorithms/EnhancedAdaptiveSolver';
import { AnatolianCockpit } from '@/components/fabricator/AnatolianCockpit';
import { BosphorusWorkflowRibbon } from '@/components/fabricator/BosphorusWorkflowRibbon';
import { ContextualTooltips } from '@/components/fabricator/ContextualTooltips';
import { EgyptianProjectWizard } from '@/components/fabricator/EgyptianProjectWizard';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { ROCK60_WINDOW_SYSTEM_TEMPLATE } from '@/data/systemPacks';
import { deriveSystemConstraintsFromProfiles, validateProject, validateProjectWithConstraints } from '@/lib/fabricatorValidation';
import { parseLegacyOrderData } from '@/lib/legacyDataParser';
import { trainingDataCollector } from '@/lib/ml/TrainingDataCollector';
import {
    markFabricatorReady,
    trackFabricatorLoadTime,
    trackInventoryLoad,
    trackOptimization
} from '@/lib/performance';
import { YDTBusinessLayer } from '@/lib/ydt/YDTBusinessLayer';
import { useCompanyBranding } from '@/modules/reporting/useCompanyBranding';
import { useJobsStore } from '@/store/jobsStore';
import {
    AdaptiveSolverConfig,
    isGlazingSpecFlat,
    MeasurementData,
    OptimizationResult,
    Profile,
    WindowComponent,
    WindowUnit,
} from '@/types/fabricator';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const { t } = useTranslation(['fabricator', 'translation']);
  const {
    jobs,
    selectedJobId,
    setSelectedJob,
    addOrUpdateJob,
    loadJobs,
  } = useJobsStore();
  const { state: workspaceState, dispatch: workspaceDispatch } = useFabricatorWorkspace();
  const [activeTab, setActiveTab] = useState(navState?.startTab || 'measuring');
  const { visibleTabs } = usePersona();
  
  // Authority Foundation: Operation Mode
  const { mode, workshopId, isLoading: modeLoading } = useOperationMode();

  // Handle hash navigation (e.g., #inventory) to set active tab
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['measuring', 'design', 'preview3d', 'optimization', 'inventory', 'production', 'quality'].includes(hash)) {
      setActiveTab(hash);
      // Scroll to top of content area after tab change
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [location.hash]);
  const currentProject = (workspaceState.currentProject) || null;
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
  
  // YDT Business Layer for intelligence-driven decisions
  const ydtBusinessLayer = useMemo(() => new YDTBusinessLayer(), []);
  const [showProjectWizard, setShowProjectWizard] = useState(false);
  const [projectMeta, setProjectMeta] = useState<(ProjectHeaderMeta & Record<string, any>) | null>(null);
  const [useEgyptWizard, setUseEgyptWizard] = useState(true);
  const [systemTunedMessage, setSystemTunedMessage] = useState<string | null>(null);
  // Project-created toast message is now handled directly by wizards
  const { branding } = useCompanyBranding();

  // Check for system tuned message from navigation state
  useEffect(() => {
    if (location.state && (location.state).systemTuned) {
      const message = (location.state).systemTunedMessage;
      if (message) {
        setSystemTunedMessage(message);
        // Clear after 5 seconds
        setTimeout(() => setSystemTunedMessage(null), 5000);
        // Clear navigation state
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, location.pathname, navigate]);

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

  // Keep existing project selector aligned with the active project badge
  useEffect(() => {
    if (currentProject) {
      const key = currentProject.projectCode || currentProject.orderNumber || '';
      if (key) {
        setSelectedExistingProjectKey(key);
      }
      setSelectedExistingPoseId(currentProject.id);
    }
  }, [currentProject]);

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
  const deriveProjectMetaFromJob = useCallback((job: WindowUnit): ProjectHeaderMeta => ({
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
  }), []);

  // Filter workflow steps based on persona visible tabs - memoized for performance
  const workflowSteps = useMemo(() => {
    const allWorkflowSteps = [
      {
        id: 'measuring',
        name: t('fabricator:workflow.steps.measuring.name', 'Smart Measuring'),
        icon: Ruler,
        description: t('fabricator:workflow.steps.measuring.description', 'Digital measurement capture'),
      },
      {
        id: 'design',
        name: t('fabricator:workflow.steps.design.name', 'Technical Design'),
        icon: Settings,
        description: t('fabricator:workflow.steps.design.description', 'Component specification'),
      },
      {
        id: 'preview3d',
        name: t('fabricator:workflow.steps.preview3d.name', '3D Preview'),
        icon: Box,
        description: t('fabricator:workflow.steps.preview3d.description', 'Visual model preview'),
      },
      {
        id: 'optimization',
        name: t('fabricator:workflow.steps.optimization.name', 'Cutting Optimization'),
        icon: Scissors,
        description: t('fabricator:workflow.steps.optimization.description', 'Material optimization'),
      },
      {
        id: 'inventory',
        name: t('fabricator:workflow.steps.inventory.name', 'Inventory Check'),
        icon: Package,
        description: t('fabricator:workflow.steps.inventory.description', 'Stock management'),
      },
      {
        id: 'production',
        name: t('fabricator:workflow.steps.production.name', 'Production Planning'),
        icon: Factory,
        description: t('fabricator:workflow.steps.production.description', 'Scheduling & machining'),
      },
      {
        id: 'quality',
        name: t('fabricator:workflow.steps.quality.name', 'Quality Control'),
        icon: Zap,
        description: t('fabricator:workflow.steps.quality.description', 'Inspection & validation'),
      },
    ];
    return allWorkflowSteps.filter(step => visibleTabs.includes(step.id));
  }, [visibleTabs, t]);
  
  // Screen reader announcements for state changes - defined first to avoid TDZ error
  const announceStateChange = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only'; // Screen reader only
    announcement.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, []);

  // Memoize tab change handler to prevent unnecessary re-renders
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    // Announce to screen readers
    const step = workflowSteps.find(s => s.id === tabId);
    if (step) {
      announceStateChange(`Navigated to ${step.name} tab`);
    }
  }, [workflowSteps, announceStateChange]);

  // Redirect logic for hidden tabs
  useEffect(() => {
    if (activeTab && !visibleTabs.includes(activeTab)) {
      // Redirect to first visible tab
      const firstVisibleTab = visibleTabs[0] || 'measuring';
      setActiveTab(firstVisibleTab);
    }
  }, [activeTab, visibleTabs]);

  // Keyboard navigation for workflow tabs
  useEffect(() => {
    const handleKeyboardNavigation = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Arrow keys for tab navigation
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        
        const tabIndex = workflowSteps.findIndex(step => step.id === activeTab);
        
        if (e.key === 'ArrowRight' && tabIndex < workflowSteps.length - 1) {
          const nextTab = workflowSteps[tabIndex + 1].id;
          setActiveTab(nextTab);
          // Announce to screen readers
          announceStateChange(`Navigated to ${workflowSteps[tabIndex + 1].name} tab`);
        } else if (e.key === 'ArrowLeft' && tabIndex > 0) {
          const prevTab = workflowSteps[tabIndex - 1].id;
          setActiveTab(prevTab);
          // Announce to screen readers
          announceStateChange(`Navigated to ${workflowSteps[tabIndex - 1].name} tab`);
        }
      }
      
      // Ctrl/Cmd + D for detail toggle (if preset selector is visible)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        // This will be handled by ArchitecturalPresetSelector component
        // Just prevent default to avoid browser bookmark dialog
      }
    };

    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [activeTab, workflowSteps, announceStateChange]);

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
        workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: job });
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

  // Check for new=true query parameter on mount and location change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newProject = params.get('new');
    
    // Check for new=true query parameter to open wizard
    if (newProject === 'true') {
      setShowProjectWizard(true);
      setActiveTab('measuring');
      // Clear the query parameter from URL after opening wizard
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search, location.pathname]);

  // URL param override for wizard selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wizard = params.get('wizard');
    if (wizard === 'egypt') {
      setUseEgyptWizard(true);
      setShowProjectWizard(true);
    } else if (wizard === 'standard') {
      setUseEgyptWizard(false);
      setShowProjectWizard(true);
    } else {
      // Default: based on region meta if present
      setUseEgyptWizard((projectMeta?.region ?? 'egypt') === 'egypt');
    }
  }, [projectMeta?.region]);

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
          // Preserve all measurement inputs including preset profile selections
          systemProfileSelections: data.systemProfileSelections,
          measurementMode: data.measurementMode,
          wallDeduction: data.wallDeduction,
          manufacturingWidth: data.manufacturingWidth,
          manufacturingHeight: data.manufacturingHeight,
          roughOpeningWidth: data.roughOpeningWidth,
          roughOpeningHeight: data.roughOpeningHeight,
          flyScreenType: data.flyScreenType,
          // Preserve grid layout if set in measuring step
          grid: data.grid,
          // Preserve preset pattern selection
          presetId: data.presetId,
          // Cache pattern data for quick access
          presetData: data.presetId ? (() => {
            const pattern = EGYPTIAN_PATTERNS.find(p => p.id === data.presetId);
            if (!pattern) return undefined;
            return {
              id: pattern.id,
              name: pattern.name,
              type: pattern.type,
              gridSpec: {
                rows: pattern.gridSpec.rows,
                cols: pattern.gridSpec.cols,
                colWidths: pattern.gridSpec.colWidths,
                rowHeights: pattern.gridSpec.rowHeights,
              },
              mullions: pattern.mullions,
              transoms: pattern.transoms,
              constraints: pattern.constraints,
              openingMechanism: pattern.openingMechanism,
            };
          })() : undefined,
        };

        // Don't require components at measurement stage - they'll be added in design phase
        // Technical validation
        const validation = validateProject(newProject, false);
        
        // YDT Business validation (if workshop context available)
        // Note: currentWorkshop is not yet in FabricatorWorkspaceState
        // For now, skip YDT validation or use mode/workshopId from useOperationMode
        if (workshopId) {
          try {
            const ydtValidation = await ydtBusinessLayer.validateProject({
              type: newProject.presetId ? 'residential' : 'residential', // Use presetId to infer type
              location: 'egypt', // Default to egypt for now
              material: newProject.systemPackId || 'aluminum',
              estimatedCost: undefined,
            });
            
            // Add YDT recommendations to validation warnings if any
            if (ydtValidation.recommendations.length > 0) {
              console.log('YDT Recommendations:', ydtValidation.recommendations);
            }
            
            // Log YDT verdict
            if (ydtValidation.ydtVerdict === 'REJECTED') {
              console.warn('YDT Business Validation: Project rejected', ydtValidation.ydtReason);
            }
          } catch (error) {
            console.warn('YDT validation failed, continuing with technical validation:', error);
          }
        }
        if (!validation.isValid) {
          // Enhance errors with consequences before throwing
          const enhancedErrors = validation.errorsWithConsequences || 
            validation.errors.map(e => ({ ...e, consequences: [] }));
          const errorMessages = enhancedErrors
            .map(e => e.message)
            .join(', ');
          throw new Error(errorMessages);
        }
        
        workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject });
        workspaceDispatch({ type: 'SET_MEASUREMENT_DATA', payload: data });
        addOrUpdateJob(newProject);
        setSelectedJob(newProject.id);
        // Increment measurement session ID to prevent wizard from restarting if user goes back
        // This ensures a fresh wizard session for the next measurement
        setMeasurementSessionId((prev) => prev + 1);
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
    [addOrUpdateJob, setSelectedJob, projectMeta, setActiveTab, workspaceDispatch, jobs, workshopId, ydtBusinessLayer, setMeasurementSessionId]
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
      announceStateChange('Design complete. Optimization tab activated.');
      track('fabricator_job_status_changed', {
        jobId: updatedProject.id,
        orderNumber: updatedProject.orderNumber,
        status: updatedProject.status,
      });
    } catch (error) {
      console.error('Error completing design:', error);
      setProjectError(error instanceof Error ? error.message : 'Failed to generate cutting plan');
    }
  }, [currentProject, inventory, generateCuttingPlan, addOrUpdateJob, setSelectedJob, workspaceDispatch, announceStateChange]);

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

  // Shared handler to spawn a new pose (used by measuring tab button and Save & Next in design)
  const handleAddNewPose = useCallback(() => {
    const group = existingProjectGroups.find((g) => g.key === selectedExistingProjectKey);
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
  }, [deriveProjectMetaFromJob, existingProjectGroups, selectedExistingProjectKey, workspaceDispatch]);

  const handleProductionStart = useCallback(() => {
    if (!currentProject) {
      setProjectError('No project available. Please complete the design and optimization phases first.');
      return;
    }

    try {
      setProjectError(null);

      // 🔒 CONSTITUTIONAL CHECKPOINT: Tier 3 Validation
      const constitutionalValidation = validateConstitutionalCompliance(
        currentProject,
        inventory,
        mode
      );
      
      if (!constitutionalValidation.isValid) {
        // Show constitutional errors with consequences
        const enhancedErrors = enhanceValidationWithConsequences(
          constitutionalValidation.errors.map(e => ({
            field: e.field,
            message: e.message
          }))
        );
        
        const errorMessages = enhancedErrors
          .map(e => {
            const consequences = e.consequences && e.consequences.length > 0
              ? `\n  Consequences: ${e.consequences.join(', ')}`
              : '';
            return `• ${e.message}${consequences}`;
          })
          .join('\n');
        
        setProjectError(
          `Constitutional Compliance Failed:\n${errorMessages}`
        );
        return;
      }

      // Apply base validation plus system-specific constraints derived from
      // the profiles currently used in inventory.
      const constraints = deriveSystemConstraintsFromProfiles(inventory);
      const validation = validateProjectWithConstraints(currentProject, constraints);
      if (!validation.isValid) {
        // Enhance errors with consequences before throwing
        const enhancedErrors = validation.errorsWithConsequences || 
          validation.errors.map(e => ({ ...e, consequences: [] }));
        const errorMessages = enhancedErrors
          .map(e => e.message)
          .join(', ');
        throw new Error(errorMessages);
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

      // 🔒 Add Constitutional Metadata to Output
      const constitutionalMetadata = generateConstitutionalMetadata(
        currentProject,
        mode,
        workshopId,
        `PROD-${currentProject.id}-${Date.now()}`
      );

      const updatedProject: WindowUnit = {
        ...currentProject,
        status: 'production',
        updatedAt: new Date(),
        // Add constitutional metadata (if WindowUnit type supports it)
        ...(constitutionalMetadata && {
          constitutionalMetadata: constitutionalMetadata as any
        }),
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
  }, [currentProject, addOrUpdateJob, setSelectedJob, workspaceDispatch, inventory, mode, workshopId]);

  return (
    <ErrorBoundary level="page">
      <PersonaContextLayer>
        {/* Authority Foundation: Operation Mode Badge - Always visible */}
        {!modeLoading && (
          <OperationModeBadge 
          mode={mode} 
          workshopId={workshopId}
        />
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-16 sm:pt-20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl">
          {/* Alert System */}
          <LazyAnimatePresence>
            {inventoryError && (
              <LazyMotionDiv
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
              </LazyMotionDiv>
            )}

            {projectError && (() => {
              // Try to extract consequences from error message
              const errorObj = { field: 'project', message: projectError };
              const enhanced = enhanceValidationWithConsequences([errorObj]);
              const consequences = enhanced[0]?.consequences || [];
              
              return (
                <LazyMotionDiv
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {consequences.length > 0 ? (
                    <ConsequenceAlert consequences={consequences} className="mb-6" />
                  ) : (
                    <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Project Error</AlertTitle>
                      <AlertDescription>
                        {projectError}
                      </AlertDescription>
                    </Alert>
                  )}
                </LazyMotionDiv>
              );
            })()}

            {isLoadingInventory && (
              <LazyMotionDiv
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
              </LazyMotionDiv>
            )}
          </LazyAnimatePresence>

          {/* Header Section - FABRICATOR PRO / AI WORKFLOW v4.0 */}
          <LazyMotionDiv
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              {/* Left: Title and summary */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <Factory className="h-10 w-10 text-amber-400" />
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse ring-2 ring-green-400/40" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold tracking-[0.2em] text-amber-300/80 uppercase">
                      {t('fabricator:workflow.header.fabricator_pro', 'FABRICATOR PRO')}
                    </div>
                    <h1 className="typography-h1 md:text-4xl lg:text-5xl bg-gradient-to-r from-amber-400 via-red-400 to-red-500 bg-clip-text text-transparent">
                      {t('fabricator:workflow.header.ai_workflow', 'AI WORKFLOW v4.0')}
                    </h1>
                  </div>
                </div>
                <p className="text-sm md:text-base text-gray-300 max-w-xl leading-relaxed">
                  {t(
                    'fabricator:workflow.tagline',
                    'Smart aluminum & UPVC fabrication pipeline: Smart Measuring, Technical Design, AI Optimization, Inventory, Production, Quality Control.',
                  )}
                </p>
                {activeWorkshopLabel && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-gray-900/80 border border-amber-500/40 px-3 py-1 text-[11px] text-amber-200">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full animate-pulse status-valid" />
                    <span className="uppercase tracking-[0.18em] text-amber-300/90">
                      {t('fabricator:workflow.workshop_label', 'Workshop')}
                    </span>
                    <span className="font-medium text-amber-100 truncate max-w-[220px] md:max-w-xs">
                      {activeWorkshopLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: System status & search */}
              <div className="w-full lg:w-auto">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Card className="bg-gray-900/70 border-gray-700 card-dark">
                    <CardContent className="py-3 px-4">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">
                        {t('fabricator:workflow.status.system', 'System')}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex h-2 w-2 rounded-full animate-pulse status-valid" />
                        <span className="text-sm font-semibold text-emerald-300">
                          {t('fabricator:workflow.status.optimal', 'Optimal')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/70 border-gray-700 card-dark">
                    <CardContent className="py-3 px-4">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">
                        {t('fabricator:workflow.status.efficiency', 'Efficiency')}
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-sm font-semibold text-amber-300">92.5%</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/70 border-gray-700 card-dark">
                    <CardContent className="py-3 px-4">
                      <div className="text-[10px] uppercase tracking-wide text-gray-400">
                        {t('fabricator:workflow.status.active_jobs', 'Active Jobs')}
                      </div>
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
                    placeholder={t(
                      'fabricator:workflow.search_placeholder',
                      'Search machines, orders...',
                    )}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 card-premium"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Suspense fallback={null}>
                    <Button
                      size="sm"
                      className="btn-primary"
                      onClick={() => {
                        // Reset current context and open a fresh project header wizard
                        workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
                        setProjectMeta(null);
                        setShowProjectWizard(true);
                        setActiveTab('measuring');
                      }}
                    >
                    {t('fabricator:project.new_project', 'New Project')}
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
                    className="btn-primary"
                    onClick={() => navigate('/fabricator-workflow/pro')}
                  >
                    <Factory className="h-3 w-3 mr-1" />
                    {t('fabricator:workflow.mass_production_cta', 'Mass Production')}
                  </Button>
                </div>
              </div>
            </div>
          </LazyMotionDiv>

          {/* Project Header / Context Bar */}
          <LazyMotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 md:p-6 bg-gray-900/40 rounded-xl border border-gray-800 card-dark">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500">
                  {t('fabricator:workflow.module_label', 'MODULE')}
                </p>
                <h2 className="typography-h2 text-xl md:text-2xl font-semibold text-gray-100 flex items-center gap-2">
                  <span>{t('fabricator:workflow.title', 'Fabricator Workflow Pro')}</span>
                  <Badge variant="outline" className="btn-primary">
                    {t('fabricator:workflow.badge_end_to_end', 'End-to-End')}
                  </Badge>
                </h2>
                <p className="text-xs md:text-sm text-gray-400">
                  {t(
                    'fabricator:workflow.module_description',
                    'Complete project lifecycle from measurement to optimization, inventory, production, and quality.',
                  )}
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
                        <Badge variant="outline" className="btn-primary">
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
          </LazyMotionDiv>

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

          {/* Status progress - Compact sticky at top */}
          {currentProject && (
            <Suspense
              fallback={
                <div className="sticky top-0 z-50 h-20 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-amber-600/30 animate-pulse" />
              }
            >
              <WorkflowProgress currentStatus={currentProject.status} />
            </Suspense>
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
                {/* Prestige Quote hidden in measuring/design stages - only show in later workflow stages */}
                {activeTab !== 'measuring' && activeTab !== 'design' && (
                  <CommercialOfferPanel
                    project={currentProject}
                    optimization={optimizationResults}
                  />
                )}
              </Suspense>
            </div>
          )}

          {/* Main Content Area with side context panel */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1">
              <Tabs 
                value={activeTab} 
                onValueChange={handleTabChange} 
                className="space-y-8"
                aria-label="Fabricator workflow steps"
              >
                {/* Measuring Tab */}
            <TabsContent value="measuring" className="space-y-6">
              {/* Main Measuring Card - Enhanced size and prominence */}
              <Card className="bg-gray-800/50 border-gray-700 shadow-glow-strong">
                <CardHeader className="pb-6 px-8 pt-8">
                  <CardTitle className="flex items-center gap-4 text-3xl">
                    <div className="btn-primary p-3">
                      <Ruler className="h-8 w-8 text-amber-400" />
                    </div>
                    <div>
                      Smart Measuring Interface
                      <CardDescription className="text-xl text-gray-300 mt-2">
                        Digital measurement capture with AI-assisted dimension verification and validation
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-8 pb-8 pt-6">
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
                          <label className="typography-label text-[11px] text-gray-300">Existing project</label>
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
                            <label className="typography-label text-[11px] text-gray-300">Pose in selected project</label>
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
                              className="btn-primary"
                          onClick={handleAddNewPose}
                            >
                              Add new pose to this project
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* System Tuned Success Message */}
                  {systemTunedMessage && (
                    <Alert className="mb-4 bg-green-900/20 border-green-500/50">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <AlertTitle className="text-green-300">System Tuned Successfully!</AlertTitle>
                      <AlertDescription className="text-sm text-gray-200 mt-1">
                        {systemTunedMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!projectMeta ? (
                    <div className="border border-dashed border-gray-700 rounded-lg p-10 text-center space-y-5">
                      <p className="text-base text-gray-300 font-semibold">
                        Project header required before measuring
                      </p>
                      <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
                        In professional workflows, each project starts with a clear client, site,
                        currency and system definition. Create the project header to continue.
                      </p>
                      <Button
                        size="default"
                        className="btn-primary text-sm px-8 py-6 h-auto"
                        onClick={() => setShowProjectWizard(true)}
                      >
                        Create Project Header
                      </Button>
                    </div>
                  ) : (
                    <ErrorBoundary level="component">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                          <Suspense
                            fallback={
                              <div className="h-80 rounded-lg bg-gray-800/60 animate-pulse" />
                            }
                          >
                            <SmartMeasuringInterface
                              key={measurementSessionId}
                              onMeasurementComplete={handleMeasurementComplete}
                              systemPackId={projectMeta?.systemPackId}
                              region={projectMeta?.region}
                            />
                          </Suspense>
                        </div>
                        {/* RealTimeQuote moved to InventoryStatusPanel */}
                      </div>
                    </ErrorBoundary>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Design Tab */}
            {visibleTabs.includes('design') && (
              <TabsContent value="design" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="btn-primary">
                        <Settings className="h-6 w-6 text-amber-400" />
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
                            <label className="typography-label text-[11px] text-gray-400">Active pose</label>
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
                          <label className="typography-label text-[11px] text-gray-400">Quantity (poses)</label>
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
                                  onClick={handleAddNewPose}
                                >
                                  Add another pose to this project
                                </Button>
                                <Button
                                  size="sm"
                                  className="btn-primary"
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div className="lg:col-span-2">
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
                              onBackToMeasuring={() => setActiveTab('measuring')}
                              onAddNewPose={handleAddNewPose}
                            />
                          </div>
                          <div className="lg:col-span-1">
                            {currentProject && (
                              <Suspense fallback={<div className="h-64 rounded-lg bg-gray-800/60 animate-pulse" />}>
                                <RealTimeQuote
                                  dimensions={{
                                    width: currentProject.overallWidth,
                                    height: currentProject.overallHeight
                                  }}
                                  materials={{
                                    type: 'aluminum',
                                    systemPackId: currentProject.systemPackId || projectMeta?.systemPackId || 'panda-50'
                                  }}
                                  glazing={currentProject.glazing && isGlazingSpecFlat(currentProject.glazing) ? {
                                    type: currentProject.glazing.type ?? 'double',
                                    thickness: currentProject.glazing.thickness || 24,
                                    segments: []
                                  } : undefined}
                                  egyptianFactors={{
                                    location: projectMeta?.region as any,
                                    installationComplexity: 'simple'
                                  }}
                                  workshopContext={{
                                    location: projectMeta?.region
                                  }}
                                />
                              </Suspense>
                            )}
                          </div>
                        </div>
                        
                        {/* Calibration Wizard removed from Engineering Bay - reduces noise */}
                        {/* Calibration is available in Profile Management / Inventory tabs where it's more appropriate */}
                      </>
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
            )}

            {/* Blueprint Preview Tab */}
            {visibleTabs.includes('preview3d') && (
              <TabsContent value="preview3d" className="space-y-6">
                <OutputClarity type="visual" />
                <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                  <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="btn-primary">
                      <Ruler className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      Blueprint Preview
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Engineering blueprint-style preview with precision dimensions and real-time updates
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
                        <div className="w-full h-[calc(100vh-300px)] min-h-[600px] rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
                          <PrecisionDesignInterface
                            project={currentProject}
                            profiles={inventory}
                            grid={currentProject.grid || { rows: 1, cols: 1, cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }] }}
                            onGridChange={(grid) => {
                              // Update project grid
                              workspaceDispatch({
                                type: 'SET_CURRENT_PROJECT',
                                payload: { ...currentProject, grid },
                              });
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-center py-16">
                          <Ruler className="h-20 w-20 text-gray-600 mx-auto mb-4" />
                          <h3 className="typography-h3 mb-3 text-gray-400">No Project Available</h3>
                          <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Please complete the measurement and design phases first to generate a blueprint preview of your window project.
                          </p>
                          <Button 
                            onClick={() => setActiveTab('measuring')}
                            className="btn-primary"
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
            )}

            {/* Optimization Tab */}
            {visibleTabs.includes('optimization') && (
              <TabsContent value="optimization" className="space-y-6">
                <OutputClarity type="production" />
                <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                  <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="btn-primary">
                      <Scissors className="h-6 w-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div>
                        {t('cutting_optimization.title', 'AI-Powered Cutting Optimization')}
                        <CardDescription className="text-lg text-gray-300 mt-1">
                          {t('cutting_optimization.description', 'Advanced algorithms for material optimization, waste reduction, and cost efficiency')}
                        </CardDescription>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-primary"
                          onClick={() => navigate('/fabricator-workflow/pro')}
                        >
                          <Factory className="h-3 w-3 mr-1" />
                          {t('cutting_optimization.mass_production', 'Mass Production')}
                        </Button>
                        <span className="text-[11px] text-gray-400">
                          {t('cutting_optimization.open_mass_production', 'Open Mass Production Cockpit to batch-optimize across all optimized jobs.')}
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
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <BarChart3 className="h-6 w-6 text-amber-400" />
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
            )}

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-8">
              {/* System Pack Management - FIRST */}
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Settings className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      System Pack Management
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        View all system packs, check tuning status, and configure Frame/Sash profiles for accurate cut lists
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
                      <SystemPackManagement />
                    </Suspense>
                  </ErrorBoundary>
                </CardContent>
              </Card>

              {/* Profile Management */}
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="btn-primary">
                      <Package className="h-6 w-6 text-amber-400" />
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
                    <div className="btn-primary">
                      <Package className="h-6 w-6 text-amber-400" />
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
                    <div className="btn-primary">
                      <Factory className="h-6 w-6 text-amber-400" />
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
                    <div className="btn-primary">
                      <Zap className="h-6 w-6 text-amber-400" />
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
                {/* Prestige Quote hidden in measuring/design stages - only show in later workflow stages */}
                {activeTab !== 'measuring' && activeTab !== 'design' && (
                  <CommercialOfferPanel
                    project={currentProject}
                    optimization={optimizationResults}
                  />
                )}
                {/* Pricing Preview shown in optimization/production/quality stages */}
                {(activeTab === 'optimization' || activeTab === 'production' || activeTab === 'quality') && (
                  <PricingPreview
                    project={currentProject}
                    profiles={inventory}
                    accessories={[]}
                    region={(projectMeta?.region ?? 'global') as any}
                  />
                )}
              </Suspense>
            </div>
          </div>

          {/* Real-time Monitoring Section */}
          {(activeTab === 'production' || activeTab === 'quality') && (
            <LazyMotionDiv
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
            </LazyMotionDiv>
          )}

          {/* Positions & Flats Overview */}
          <LazyMotionDiv
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
          </LazyMotionDiv>

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

          {/* New Project Wizard – Egyptian-first flow with fallback and edit shortcut */}
          {useEgyptWizard ? (
            <EgyptianProjectWizard
              open={showProjectWizard}
              onOpenChange={setShowProjectWizard}
              initialMeta={projectMeta || undefined}
              onFallback={() => {
                setUseEgyptWizard(false);
                setShowProjectWizard(true);
              }}
              onSubmit={(meta) => {
                const projectCode = `FP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
                const customerCode = `FC-${meta.clientName
                  .replace(/\s+/g, '')
                  .toUpperCase()
                  .slice(0, 3)}-${Date.now().toString(36).toUpperCase().slice(-3)}`;
                const newProjectMeta = { ...meta, projectCode, customerCode };
                setProjectMeta(newProjectMeta);
                setUseEgyptWizard(true);
                setShowProjectWizard(false);
                
                // CREATE AND PERSIST THE PROJECT as a WindowUnit
                const newProject: WindowUnit = {
                  id: `project-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                  orderNumber: projectCode,
                  posNumber: '1',
                  type: 'window',
                  components: [],
                  overallWidth: 1200, // Default dimensions
                  overallHeight: 1400,
                  color: '#FFFFFF',
                  glazing: { type: 'clear', thickness: 24 },
                  hardware: [],
                  status: 'draft',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  customer: meta.clientName,
                  projectCode,
                  systemPackId: meta.systemPackId,
                  quantity: 1,
                  positionMeta: {
                    siteName: meta.siteName,
                    elevation: meta.siteName,
                    governorate: meta.governorate,
                    windZone: meta.windZone,
                    exposure: meta.exposure,
                    floorLevel: meta.floorLevel,
                    usageType: meta.usageType,
                    baseShape: meta.baseShape,
                    openingType: meta.openingType,
                  },
                };
                
                // Save to jobs store (this will also persist to Supabase in the background)
                addOrUpdateJob(newProject);
                
                // Set as current project in workspace
                workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: newProject });
                
                // Set as selected job
                setSelectedJob(newProject.id);
                
                // Navigate directly to drafting center (gold tier DraftingWorkbench) after project creation
                navigate('/fabricator/workflow/engineering-bay?mode=drafting');
                
                // Show success message
                toast.success(t('fabricator:project.created', 'Project created successfully. Opening drafting center...'));
              }}
            />
          ) : (
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
                  const newProjectMeta = { ...meta, projectCode, customerCode };
                  setProjectMeta(newProjectMeta);
                  setShowProjectWizard(false);
                  // Navigate directly to drafting center (gold tier DraftingWorkbench) after project creation
                  navigate('/fabricator/workflow/engineering-bay?mode=drafting');
                  // Reset any existing project in workspace context
                  workspaceDispatch({ type: 'SET_CURRENT_PROJECT', payload: null });
                  // Show success message
                  toast.success(t('fabricator:project.created', 'Project created successfully. Opening drafting center...'));
                }}
              />
            </Suspense>
          )}

          {projectMeta?.egyptianConstraints && (
            <div className="mt-4">
              <EgyptianConstraintsCard
                constraints={projectMeta.egyptianConstraints}
                onEdit={() => {
                  setUseEgyptWizard(true);
                  setShowProjectWizard(true);
                }}
              />
            </div>
          )}


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
      </PersonaContextLayer>
    </ErrorBoundary>
  );
};

export default FabricatorWorkflow;