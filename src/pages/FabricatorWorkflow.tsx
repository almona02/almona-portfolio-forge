// pages/FabricatorWorkflow.tsx
import React, { useState, useCallback, useEffect } from 'react';
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

import { SmartMeasuringInterface } from '@/components/fabricator/SmartMeasuringInterface';
import { TechnicalCalculator } from '@/components/fabricator/TechnicalCalculator';
import { CuttingOptimizationEngine } from '@/components/fabricator/CuttingOptimizationEngine';
import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { ProfileManagement } from '@/components/fabricator/ProfileManagement';
import { ElsherifImportWizard } from '@/components/fabricator/ElsherifImportWizard';
import { supabase } from '@/lib/supabase';
import { ProductionScheduler } from '@/components/fabricator/ProductionScheduler';
import { QualityControl } from '@/components/fabricator/QualityControl';
import { RealTimeMonitoring } from '@/components/fabricator/RealTimeMonitoring';
import { Window3DGenerator } from '@/components/fabricator/Window3DGenerator';
import { JobSummaryPanel } from '@/components/fabricator/JobSummaryPanel';
import { InventoryStatusPanel } from '@/components/fabricator/InventoryStatusPanel';
import { QuickReportsPanel } from '@/components/fabricator/QuickReportsPanel';
import { WorkflowProgress } from '@/components/fabricator/WorkflowProgress';
import { FeedbackButton } from '@/components/fabricator/FeedbackButton';
import { track } from '@/lib/analytics';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ClientPortalManager } from '@/modules/client-portal';
import { Rock60CuttingSummary } from '@/components/fabricator/Rock60CuttingSummary';

import { parseLegacyOrderData } from '@/lib/legacyDataParser';
import { WindowUnit, Profile, OptimizationResult, WindowComponent, CuttingPlan, Cut, MeasurementData } from '@/types/fabricator';
import { validateProject } from '@/lib/fabricatorValidation';
import { useJobsStore } from '@/store/jobsStore';
import { useLocation } from 'react-router-dom';

const sampleHardware = [
  { id: 'hinge_1', name: 'Casement Hinge', type: 'hinge', quantity: 2, position: 'side' },
  { id: 'lock_1', name: 'Multi-point Lock', type: 'lock', quantity: 1, position: 'side' },
  { id: 'handle_1', name: 'Lever Handle', type: 'handle', quantity: 1, position: 'center' }
];

export const FabricatorWorkflow: React.FC = () => {
  const location = useLocation();
  const navState = (location.state as { jobId?: string; startTab?: string } | null) || null;
  const {
    jobs,
    selectedJobId,
    setSelectedJob,
    addOrUpdateJob,
  } = useJobsStore();

  const [activeTab, setActiveTab] = useState(navState?.startTab || 'measuring');
  const [currentProject, setCurrentProject] = useState<WindowUnit | null>(null);
  const [projects, setProjects] = useState<WindowUnit[]>([]);
  const [inventory, setInventory] = useState<Profile[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult | null>(null);
  const [isGeneratingCuttingPlan, setIsGeneratingCuttingPlan] = useState(false);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [showClientPortal, setShowClientPortal] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

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
        setCurrentProject(job);
        setOptimizationResults(job.optimization);
      }
    }
  }, [jobs, navState, selectedJobId, setSelectedJob]);

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
        
        setInventory(legacyData.profiles);
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

          const cut: Cut = {
            length: length + allowance,
            angle,
            componentId: component.id,
            componentType: (specs.profileRole as string | undefined) || undefined,
            waste: allowance,
          };
          cuts.push(cut);
          profileWaste += allowance;
        });

        const stockLength = 6000;
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

      const result: OptimizationResult = {
        materialUsage: totalMaterialCost,
        wastePercentage:
          (totalWaste /
            (totalWaste +
              cuttingPlan.reduce((sum, plan) => sum + plan.cuts.reduce((cutSum, cut) => cutSum + cut.length, 0), 0))) *
          100,
        estimatedProductionTime: components.length * 2.5,
        cuttingPlan,
        nestingEfficiency: 92.5,
        costBreakdown: {
          materialCost: totalMaterialCost,
          laborCost: totalMaterialCost * 0.3,
          hardwareCost: components.reduce(
            (sum, comp) => sum + comp.hardware.reduce((hSum, _h) => hSum + 5, 0),
            0
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
        return result;
      } catch (error) {
        setIsGeneratingCuttingPlan(false);
        console.error('Error generating cutting plan:', error);
        throw error;
      }
    },
    []
  );

  const handleMeasurementComplete = useCallback((data: MeasurementData) => {
    try {
      setProjectError(null);
      
      const width = Number(data.width);
      const height = Number(data.height);
      
      if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        throw new Error('Invalid measurement data provided');
      }

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
        updatedAt: new Date()
      };

      // Don't require components at measurement stage - they'll be added in design phase
      const validation = validateProject(newProject, false);
      if (!validation.isValid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }
      
      setCurrentProject(newProject);
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
  }, [addOrUpdateJob, setSelectedJob]);

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

      const updatedProject: WindowUnit = {
        ...currentProject,
        components,
        status: 'optimized',
        updatedAt: new Date()
      };

      const optimization = await generateCuttingPlan(components, inventory);
      updatedProject.optimization = optimization;
      
      setCurrentProject(updatedProject);
      setOptimizationResults(optimization);
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
  }, [currentProject, inventory, generateCuttingPlan, addOrUpdateJob, setSelectedJob]);

  const handleProductionStart = useCallback(() => {
    if (!currentProject) {
      setProjectError('No project available. Please complete the design and optimization phases first.');
      return;
    }

    try {
      setProjectError(null);
      
      const validation = validateProject(currentProject);
      if (!validation.isValid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }

      const updatedProject = {
        ...currentProject,
        status: 'production',
        updatedAt: new Date()
      };
      
      setCurrentProject(updatedProject);
      setProjects(prev => [...prev, updatedProject]);
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
  }, [currentProject, addOrUpdateJob, setSelectedJob]);

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
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-orange-500/10 text-orange-300 border-orange-500/40 text-[11px]">
                        <Clock className="h-3 w-3 mr-1" />
                        {currentProject.orderNumber}
                      </Badge>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-300 border-green-500/40 text-[11px] capitalize">
                        {currentProject.status}
                      </Badge>
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

          {/* Workflow Steps (acts as page-local navbar) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* Horizontal scroll on small screens, full grid with no horizontal scroll on md+ */}
            <div className="mb-6">
              <div className="flex gap-3 pb-2 overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-7 md:gap-3 md:pb-0 md:overflow-visible">
                {workflowSteps.map((step, index) => {
                  const status = getStepStatus(step.id);
                  const isCompleted = status === 'completed';
                  const isCurrent = status === 'current';
                  
                  return (
                    <motion.button
                      type="button"
                      key={step.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative min-w-[160px] md:min-w-0 p-4 rounded-xl border-2 text-left cursor-pointer transition-all duration-300 ${
                        isCurrent
                          ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/25'
                          : isCompleted
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                      onClick={() => setActiveTab(step.id)}
                    >
                      {/* Connection Line (desktop only) */}
                      {index < workflowSteps.length - 1 && (
                        <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-gray-600"></div>
                      )}
                      
                      {/* Step Status Indicator */}
                      <div className="absolute -top-2 -right-2">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        ) : isCurrent ? (
                          <div className="w-5 h-5 bg-orange-400 rounded-full animate-pulse"></div>
                        ) : (
                          <div className="w-5 h-5 bg-gray-600 rounded-full"></div>
                        )}
                      </div>

                      <step.icon className={`h-8 w-8 mx-auto mb-3 ${
                        isCurrent ? 'text-orange-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                      }`} />
                      <h3 className={`font-semibold text-xs md:text-sm mb-1 text-center ${
                        isCurrent ? 'text-orange-300' : isCompleted ? 'text-green-300' : 'text-gray-400'
                      }`}>
                        {step.name}
                      </h3>
                      <p className="hidden md:block text-xs text-gray-500 text-center">{step.description}</p>
                      
                      {/* Step Number */}
                      <div className={`absolute -bottom-2 -left-2 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                        isCurrent 
                          ? 'bg-orange-500 text-white' 
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            {/* Progress Bar */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">Project Progress</span>
                  {currentProject && (
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                      {currentProject.type.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-400">
                    Step {currentStepIndex + 1} of {workflowSteps.length}
                  </span>
                  <span className="text-sm font-bold text-orange-400">
                    {Math.round(((currentStepIndex + 1) / workflowSteps.length) * 100)}%
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Progress 
                  value={((currentStepIndex + 1) / workflowSteps.length) * 100} 
                  className="h-3 bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Measurement</span>
                  <span>Quality Control</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Status progress */}
          {currentProject && (
            <div className="mb-6">
              <WorkflowProgress currentStatus={currentProject.status} />
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
              <JobSummaryPanel project={currentProject} />
              <InventoryStatusPanel project={currentProject} />
              <QuickReportsPanel
                project={currentProject}
                optimization={optimizationResults}
              />
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
                  <ErrorBoundary level="component">
                    <SmartMeasuringInterface onMeasurementComplete={handleMeasurementComplete} />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

                {/* Design Tab */}
            <TabsContent value="design" className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="pb-4">
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
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <TechnicalCalculator 
                      project={currentProject} 
                      onDesignComplete={handleDesignComplete} 
                      profiles={inventory} 
                    />
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
                    <div>
                      AI-Powered Cutting Optimization
                      <CardDescription className="text-lg text-gray-300 mt-1">
                        Advanced algorithms for material optimization, waste reduction, and cost efficiency
                      </CardDescription>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ErrorBoundary level="component">
                    <CuttingOptimizationEngine 
                      project={currentProject}
                      optimization={optimizationResults} 
                      isGenerating={isGeneratingCuttingPlan} 
                    />
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
                    <ProfileManagement 
                      userId={userId}
                      onProfilesUpdate={(updatedProfiles) => {
                        setInventory(updatedProfiles);
                      }}
                    />
                  </ErrorBoundary>

                  {/* ELSHERIF Catalog Import – ROCK60 45° optimized profiles */}
                  <div className="mt-4">
                    <ElsherifImportWizard
                      userId={userId}
                      onProfilesImported={(importedProfiles) => {
                        // Merge into current inventory so optimization engine can use them immediately
                        setInventory((prev) => [...prev, ...importedProfiles]);
                      }}
                    />
                  </div>

                  {/* ROCK 60 – 2D cutting list summary for 45° configuration */}
                  {inventory.length > 0 && (
                    <div className="mt-4">
                      <Rock60CuttingSummary profiles={inventory} />
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
                    <InventoryDashboard 
                      inventory={inventory} 
                      project={currentProject}
                      userId={userId}
                    />
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
                    <ProductionScheduler 
                      project={currentProject} 
                      onProductionStart={handleProductionStart} 
                    />
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
                    <QualityControl project={currentProject} />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
              </Tabs>
            </div>

            {/* Desktop context panel */}
            <div className="hidden lg:block w-80 flex-shrink-0 space-y-4">
              <JobSummaryPanel project={currentProject} />
              <InventoryStatusPanel project={currentProject} />
              <QuickReportsPanel
                project={currentProject}
                optimization={optimizationResults}
              />
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
              <RealTimeMonitoring projects={projects} />
            </motion.div>
          )}

          {/* Client Portal Modal */}
          {showClientPortal && currentProject && (
            <ClientPortalManager
              project={currentProject}
              onClose={() => setShowClientPortal(false)}
            />
          )}

          {/* Feedback button for stabilization phase */}
          <FeedbackButton jobId={currentProject?.id} />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FabricatorWorkflow;