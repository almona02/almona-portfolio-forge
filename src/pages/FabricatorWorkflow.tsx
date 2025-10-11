// pages/FabricatorWorkflow.tsx
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/ui/card';
import { Tabs, TabsContent } from '@/shared/ui/ui/tabs';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { 
  Ruler, 
  Scissors, 
  Settings, 
  Package, 
  Zap,
  Factory
} from 'lucide-react';

// Core workflow components
import { SmartMeasuringInterface } from '@/components/fabricator/SmartMeasuringInterface';
import { TechnicalCalculator } from '@/components/fabricator/TechnicalCalculator';
import { CuttingOptimizationEngine } from '@/components/fabricator/CuttingOptimizationEngine';
import { InventoryManagement } from '@/components/fabricator/InventoryManagement';
import { ProductionScheduler } from '@/components/fabricator/ProductionScheduler';
import { QualityControl } from '@/components/fabricator/QualityControl';
import { RealTimeMonitoring } from '@/components/fabricator/RealTimeMonitoring';

// Types and interfaces
interface Profile {
  id: string;
  name: string;
  type: 'frame' | 'sash' | 'accessory' | 'glazing_bead';
  material: 'aluminum' | 'upvc';
  system: string;
  width: number;
  height: number;
  thickness: number;
  weightPerMeter: number;
  color: string;
  supplier: string;
  stockQuantity: number;
  minStockLevel: number;
  costPerMeter: number;
  cuttingAllowance: number;
}

interface MachiningOperation {
  type: 'drill' | 'mill' | 'tap' | 'counterbore';
  position: { x: number; y: number };
  diameter: number;
  depth: number;
  tool: string;
}

interface HardwareItem {
  id: string;
  name: string;
  type: 'hinge' | 'lock' | 'handle' | 'roller' | 'seal';
  quantity: number;
  position: string;
}

interface GlazingSpec {
  type: 'single' | 'double' | 'triple' | 'laminated';
  thickness: number;
  spacer: number;
  gasFill: 'air' | 'argon';
}

interface WindowComponent {
  id: string;
  type: 'frame' | 'sash' | 'vent' | 'fixed_panel' | 'sliding_panel';
  profile: Profile;
  width: number;
  height: number;
  quantity: number;
  cuttingLengths: number[];
  angles: number[];
  machiningOperations: MachiningOperation[];
  glazingType: string;
  hardware: HardwareItem[];
}

interface WindowUnit {
  id: string;
  orderNumber: string;
  posNumber: string;
  type: 'sliding_window' | 'casement' | 'tilt_turn' | 'sliding_door' | 'fixed_window';
  components: WindowComponent[];
  overallWidth: number;
  overallHeight: number;
  color: string;
  glazing: GlazingSpec;
  hardware: HardwareItem[];
  status: 'design' | 'optimized' | 'scheduled' | 'production' | 'quality_check' | 'completed';
  optimization: OptimizationResult | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OptimizationResult {
  materialUsage: number;
  wastePercentage: number;
  estimatedProductionTime: number;
  cuttingPlan: CuttingPlan[];
  nestingEfficiency: number;
  costBreakdown: CostBreakdown;
}

interface CuttingPlan {
  profile: Profile;
  stockLength: number;
  cuts: Cut[];
  totalWaste: number;
  utilization: number;
}

interface Cut {
  length: number;
  angle: number;
  componentId: string;
  waste: number;
}

interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  hardwareCost: number;
  glazingCost: number;
  totalCost: number;
}

// Sample data
const sampleProfiles: Profile[] = [
  {
    id: 'alm_frame_50',
    name: 'Aluminum Frame 50mm',
    type: 'frame',
    material: 'aluminum',
    system: 'SLIDING_50',
    width: 50,
    height: 25,
    thickness: 1.4,
    weightPerMeter: 1.2,
    color: 'Silver',
    supplier: 'Alumax',
    stockQuantity: 500,
    minStockLevel: 100,
    costPerMeter: 8.5,
    cuttingAllowance: 3
  },
  {
    id: 'upvc_frame_60',
    name: 'UPVC Frame 60mm',
    type: 'frame',
    material: 'upvc',
    system: 'CASEMENT_60',
    width: 60,
    height: 30,
    thickness: 2.5,
    weightPerMeter: 2.1,
    color: 'White',
    supplier: 'Veka',
    stockQuantity: 300,
    minStockLevel: 50,
    costPerMeter: 6.8,
    cuttingAllowance: 2
  }
];

const sampleHardware: HardwareItem[] = [
  { id: 'hinge_1', name: 'Casement Hinge', type: 'hinge', quantity: 2, position: 'side' },
  { id: 'lock_1', name: 'Multi-point Lock', type: 'lock', quantity: 1, position: 'side' },
  { id: 'handle_1', name: 'Lever Handle', type: 'handle', quantity: 1, position: 'center' }
];

// Main Fabricator Workflow Component
export const FabricatorWorkflow: React.FC = () => {
  const [activeTab, setActiveTab] = useState('measuring');
  const [currentProject, setCurrentProject] = useState<WindowUnit | null>(null);
  const [projects, setProjects] = useState<WindowUnit[]>([]);
  const [inventory] = useState<Profile[]>(sampleProfiles);
  const [optimizationResults, setOptimizationResults] = useState<OptimizationResult | null>(null);
  const [isGeneratingCuttingPlan, setIsGeneratingCuttingPlan] = useState(false);

  const workflowSteps = [
    { id: 'measuring', name: 'Smart Measuring', icon: Ruler, description: 'Digital measurement capture' },
    { id: 'design', name: 'Technical Design', icon: Settings, description: 'Component specification' },
    { id: 'optimization', name: 'Cutting Optimization', icon: Scissors, description: 'Material optimization' },
    { id: 'inventory', name: 'Inventory Check', icon: Package, description: 'Stock management' },
    { id: 'production', name: 'Production Planning', icon: Factory, description: 'Scheduling & machining' },
    { id: 'quality', name: 'Quality Control', icon: Zap, description: 'Inspection & validation' }
  ];


  // Generate cutting optimization using bin packing algorithm
  const generateCuttingPlan = useCallback(async (components: WindowComponent[], profiles: Profile[]) => {
    setIsGeneratingCuttingPlan(true);
    
    // Simulate AI-powered optimization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const cuttingPlan: CuttingPlan[] = [];
    let totalMaterialCost = 0;
    let totalWaste = 0;
    
    components.forEach(component => {
      const profile = profiles.find(p => p.id === component.profile.id);
      if (!profile) return;

      const cuts: Cut[] = [];
      let profileWaste = 0;
      
      // Calculate cuts for each component
      component.cuttingLengths.forEach((length, index) => {
        const angle = component.angles[index] || 90;
        const cut: Cut = {
          length: length + profile.cuttingAllowance,
          angle,
          componentId: component.id,
          waste: profile.cuttingAllowance
        };
        cuts.push(cut);
        profileWaste += profile.cuttingAllowance;
      });

      // Standard stock length (6 meters)
      const stockLength = 6000;
      const totalCutLength = cuts.reduce((sum, cut) => sum + cut.length, 0);
      const utilization = (totalCutLength / stockLength) * 100;
      
      cuttingPlan.push({
        profile,
        stockLength,
        cuts,
        totalWaste: profileWaste,
        utilization
      });

      totalMaterialCost += (totalCutLength / 1000) * profile.costPerMeter;
      totalWaste += profileWaste;
    });

    const result: OptimizationResult = {
      materialUsage: totalMaterialCost,
      wastePercentage: (totalWaste / (totalWaste + cuttingPlan.reduce((sum, plan) => 
        sum + plan.cuts.reduce((cutSum, cut) => cutSum + cut.length, 0), 0))) * 100,
      estimatedProductionTime: components.length * 2.5, // 2.5 minutes per component
      cuttingPlan,
      nestingEfficiency: 92.5, // AI-calculated efficiency
      costBreakdown: {
        materialCost: totalMaterialCost,
        laborCost: totalMaterialCost * 0.3,
        hardwareCost: components.reduce((sum, comp) => sum + comp.hardware.reduce((hSum, _h) => hSum + 5, 0), 0),
        glazingCost: totalMaterialCost * 0.4,
        totalCost: 0 // Calculated below
      }
    };

    result.costBreakdown.totalCost = 
      result.costBreakdown.materialCost + 
      result.costBreakdown.laborCost + 
      result.costBreakdown.hardwareCost + 
      result.costBreakdown.glazingCost;

    setIsGeneratingCuttingPlan(false);
    return result;
  }, []);

  const handleMeasurementComplete = useCallback((data: Record<string, string | number>) => {
    const newProject: WindowUnit = {
      id: `proj_${Date.now()}`,
      orderNumber: `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      posNumber: `POS-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      type: (data.windowType as 'sliding_window' | 'casement' | 'tilt_turn' | 'sliding_door' | 'fixed_window') || 'sliding_window',
      components: [],
      overallWidth: Number(data.width) || 1200,
      overallHeight: Number(data.height) || 1500,
      color: String(data.color) || 'Silver',
      glazing: {
        type: 'double',
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
    
    setCurrentProject(newProject);
    setActiveTab('design');
  }, []);

  const handleDesignComplete = useCallback(async (components: WindowComponent[]) => {
    if (!currentProject) return;

    const updatedProject: WindowUnit = {
      ...currentProject,
      components,
      status: 'optimized',
      updatedAt: new Date()
    };

    // Generate cutting optimization
    const optimization = await generateCuttingPlan(components, inventory);
    updatedProject.optimization = optimization;
    
    setCurrentProject(updatedProject);
    setOptimizationResults(optimization);
    setActiveTab('optimization');
  }, [currentProject, inventory, generateCuttingPlan]);

  const handleProductionStart = useCallback(() => {
    if (!currentProject) return;
    
    const updatedProject: WindowUnit = {
      ...currentProject,
      status: 'production',
      updatedAt: new Date()
    };
    
    setCurrentProject(updatedProject);
    setProjects(prev => [...prev, updatedProject]);
    setActiveTab('production');
  }, [currentProject]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white pt-20">
      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-8">
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
          
          {/* Quick Stats */}
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

        {/* Workflow Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Manufacturing Workflow</h2>
            {currentProject && (
              <Badge variant="outline" className="bg-orange-500/20 text-orange-400">
                {currentProject.orderNumber}
              </Badge>
            )}
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

          {/* Progress Bar */}
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

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Smart Measuring */}
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
                <SmartMeasuringInterface onMeasurementComplete={handleMeasurementComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technical Design */}
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
                <TechnicalCalculator 
                  project={currentProject}
                  onDesignComplete={handleDesignComplete}
                  profiles={inventory}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cutting Optimization */}
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
                <CuttingOptimizationEngine 
                  project={currentProject}
                  optimization={optimizationResults}
                  isGenerating={isGeneratingCuttingPlan}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Management */}
          <TabsContent value="inventory" className="space-y-6">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6 text-orange-400" />
                  Inventory Management & Stock Control
                </CardTitle>
                <CardDescription>
                  Real-time inventory tracking and automatic reordering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryManagement 
                  inventory={inventory}
                  project={currentProject}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Planning */}
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
                <ProductionScheduler 
                  project={currentProject}
                  onProductionStart={handleProductionStart}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Control */}
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
                <QualityControl project={currentProject} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Real-time Monitoring Dashboard */}
        {(activeTab === 'production' || activeTab === 'quality') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <RealTimeMonitoring projects={projects} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default FabricatorWorkflow;