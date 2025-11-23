// pages/FabricatorWorkflow.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

import { SmartMeasuringInterface } from '@/components/fabricator/SmartMeasuringInterface';
import { TechnicalCalculator } from '@/components/fabricator/TechnicalCalculator';
import { CuttingOptimizationEngine } from '@/components/fabricator/CuttingOptimizationEngine';
import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { ProfileManagement } from '@/components/fabricator/ProfileManagement';
import { supabase } from '@/lib/supabase';
import { ProductionScheduler } from '@/components/fabricator/ProductionScheduler';
import { QualityControl } from '@/components/fabricator/QualityControl';
import { RealTimeMonitoring } from '@/components/fabricator/RealTimeMonitoring';
import { Window3DGenerator } from '@/components/fabricator/Window3DGenerator';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ClientPortalManager } from '@/modules/client-portal';

import { parseLegacyOrderData } from '@/lib/legacyDataParser';
import { WindowUnit, Profile, OptimizationResult, WindowComponent, CuttingPlan, Cut, MeasurementData } from '@/types/fabricator';
import { validateProject } from '@/lib/fabricatorValidation';

const sampleHardware = [
  { id: 'hinge_1', name: 'Casement Hinge', type: 'hinge', quantity: 2, position: 'side' },
  { id: 'lock_1', name: 'Multi-point Lock', type: 'lock', quantity: 1, position: 'side' },
  { id: 'handle_1', name: 'Lever Handle', type: 'handle', quantity: 1, position: 'center' }
];

export const FabricatorWorkflow: React.FC = () => {
  const [activeTab, setActiveTab] = useState('measuring');
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

  const workflowSteps = [
    { id: 'measuring', name: 'Smart Measuring', icon: Ruler, description: 'Digital measurement capture' },
    { id: 'design', name: 'Technical Design', icon: Settings, description: 'Component specification' },
    { id: 'preview3d', name: '3D Preview', icon: Box, description: 'Visual model preview' },
    { id: 'optimization', name: 'Cutting Optimization', icon: Scissors, description: 'Material optimization' },
    { id: 'inventory', name: 'Inventory Check', icon: Package, description: 'Stock management' },
    { id: 'production', name: 'Production Planning', icon: Factory, description: 'Scheduling & machining' },
    { id: 'quality', name: 'Quality Control', icon: Zap, description: 'Inspection & validation' }
  ];

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

        component.cuttingLengths.forEach((length, index) => {
          const angle = component.angles[index] || 90;
          const cut: Cut = {
            length: length + profile.cuttingAllowance,
            angle,
            componentId: component.id,
            waste: profile.cuttingAllowance,
          };
          cuts.push(cut);
          profileWaste += profile.cuttingAllowance;
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

        totalMaterialCost += (totalCutLength / 1000) * profile.costPerMeter;
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

      const validation = validateProject(newProject);
      if (!validation.isValid) {
        throw new Error(validation.errors.map(e => e.message).join(', '));
      }
      
      setCurrentProject(newProject);
      setActiveTab('design');
    } catch (error) {
      console.error('Error creating project from measurements:', error);
      setProjectError(error instanceof Error ? error.message : 'Failed to create project');
    }
  }, []);

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
      setActiveTab('optimization');
    } catch (error) {
      console.error('Error completing design:', error);
      setProjectError(error instanceof Error ? error.message : 'Failed to generate cutting plan');
    }
  }, [currentProject, inventory, generateCuttingPlan]);

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
      setActiveTab('production');
    } catch (error) {
      console.error('Error starting production:', error);
      setProjectError(error instanceof Error ? error.message : 'Failed to start production');
    }
  }, [currentProject]);

  return (
    <ErrorBoundary level="page">
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-20">
        <div className="container mx-auto px-4 py-8">
          {inventoryError && (
            <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Inventory Loading Error</AlertTitle>
              <AlertDescription>
                {inventoryError}. Some features may be limited. Please refresh the page to retry.
              </AlertDescription>
            </Alert>
          )}

          {projectError && (
            <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Project Error</AlertTitle>
              <AlertDescription>
                {projectError}
              </AlertDescription>
            </Alert>
          )}

          {isLoadingInventory && (
            <Alert className="mb-6 bg-blue-900/20 border-blue-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertTitle>Loading Inventory</AlertTitle>
              <AlertDescription>
                Loading profile data from inventory...
              </AlertDescription>
            </Alert>
          )}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Factory className="h-12 w-12 text-orange-400" />
            <h1 className="text-4xl md:text-5xl font-bold">
              <span className="text-gradient-orange">Fabricator Workflow Pro</span>
            </h1>
          </div>
          <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-6">
            AI-powered aluminum & UPVC fabrication system with smart optimization, 
            real-time monitoring, and predictive maintenance
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-400">92.5%</div>
                <div className="text-sm text-gray-400">Cutting Efficiency</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">45°</div>
                <div className="text-sm text-gray-400">Precision Cuts</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">5cm</div>
                <div className="text-sm text-gray-400">Standard Border</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">AI</div>
                <div className="text-sm text-gray-400">Optimized</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Manufacturing Workflow</h2>
            <div className="flex items-center gap-3">
              {currentProject && (
                <>
                  <Badge variant="outline" className="bg-orange-500/20 text-orange-400">
                    {currentProject.orderNumber}
                  </Badge>
                  <Button
                    onClick={() => setShowClientPortal(true)}
                    className="bg-blue-500 hover:bg-blue-600"
                    size="sm"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share with Client
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {workflowSteps.map((step) => (
              <motion.div
                key={step.id}
                whileHover={{ scale: 1.05 }}
                className={`text-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  activeTab === step.id 
                    ? 'border-orange-500 bg-orange-500/10' 
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
                onClick={() => setActiveTab(step.id)}
              >
                <step.icon className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold text-sm mb-1">{step.name}</h3>
                <p className="text-xs text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Project Progress</span>
              <span className="text-sm text-gray-400">
                {workflowSteps.findIndex(step => step.id === activeTab) + 1} of {workflowSteps.length}
              </span>
            </div>
            <Progress 
              value={((workflowSteps.findIndex(step => step.id === activeTab) + 1) / workflowSteps.length) * 100} 
              className="h-2"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsContent value="measuring" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-6 w-6 text-orange-400" />
                  Smart Measuring Interface
                </CardTitle>
                <CardDescription>
                  Digital measurement capture with AI-assisted dimension verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary level="component">
                  <SmartMeasuringInterface onMeasurementComplete={handleMeasurementComplete} />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-orange-400" />
                  Technical Design & Component Specification
                </CardTitle>
                <CardDescription>
                  Define window components, profiles, and manufacturing specifications
                </CardDescription>
              </CardHeader>
              <CardContent>
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

          <TabsContent value="preview3d" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-6 w-6 text-orange-400" />
                  3D Model Preview
                </CardTitle>
                <CardDescription>
                  Real-time 3D visualization of your window design with interactive controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary level="component">
                  {currentProject ? (
                    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-700">
                      <Window3DGenerator 
                        windowUnit={currentProject}
                        showControls={true}
                        presentationMode={false}
                        showErrorDetection={true}
                        profiles={inventory}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Box className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Project Available</h3>
                      <p className="text-gray-400">
                        Please complete the measurement and design phases first to generate a 3D preview.
                      </p>
                    </div>
                  )}
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-6 w-6 text-orange-400" />
                  AI-Powered Cutting Optimization
                </CardTitle>
                <CardDescription>
                  Advanced algorithms for material optimization and waste reduction
                </CardDescription>
              </CardHeader>
              <CardContent>
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

          <TabsContent value="inventory" className="space-y-6">
            {/* Profile Management Section - Add/Edit Material Profiles */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6 text-orange-400" />
                  Profile Management
                </CardTitle>
                <CardDescription>
                  Add, edit, and manage your material profiles (aluminum, UPVC, wood). Profiles are used for cutting optimization and inventory tracking.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary level="component">
                  <ProfileManagement 
                    userId={userId}
                    onProfilesUpdate={(updatedProfiles) => {
                      // Update inventory when profiles are updated
                      setInventory(updatedProfiles);
                    }}
                  />
                </ErrorBoundary>
              </CardContent>
            </Card>

            {/* Inventory Dashboard Section */}
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6 text-orange-400" />
                  Inventory Management & Stock Control
                </CardTitle>
                <CardDescription>
                  Real-time inventory tracking, stock alerts, and automatic reordering
                </CardDescription>
              </CardHeader>
              <CardContent>
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

          <TabsContent value="production" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-6 w-6 text-orange-400" />
                  Production Planning & Scheduling
                </CardTitle>
                <CardDescription>
                  Machine scheduling, operation sequencing, and real-time monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary level="component">
                  <ProductionScheduler 
                    project={currentProject} 
                    onProductionStart={handleProductionStart} 
                  />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-6 w-6 text-orange-400" />
                  Quality Control & Inspection
                </CardTitle>
                <CardDescription>
                  Automated quality checks and compliance verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary level="component">
                  <QualityControl project={currentProject} />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {(activeTab === 'production' || activeTab === 'quality') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
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
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default FabricatorWorkflow;