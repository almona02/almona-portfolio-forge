import { useEffect, useState, useRef } from "react";
import { ServiceCard } from "@/components/services/ServiceCard";
import { EmergencyServiceDialog } from "@/components/services/EmergencyServiceDialog";
import { FormSkeleton } from "@/components/ui/FormSkeleton";
import { ServiceViewToggle } from "@/components/services/ServiceViewToggle";
import { SimpleServicesView } from "@/components/services/SimpleServicesView";
import { lazy, Suspense } from "react";

// Lazy loaded components
const MachineRegistrationEnhanced = lazy(() =>
  import("@/components/services/MachineRegistration").then((module) => ({
    default: module.MachineRegistrationEnhanced,
  }))
);
const MaintenanceDashboard = lazy(() =>
  import("@/components/services/MaintenanceDashboard").then((module) => ({
    default: module.MaintenanceDashboard,
  }))
);
const PredictiveMaintenanceEngine = lazy(() =>
  import("@/components/services/PredictiveMaintenanceEngine")
);

import { OperatorTrainingIncentiveDialog } from "@/components/services/OperatorTrainingIncentiveDialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui/ui/tabs";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { withErrorBoundary } from '@/hocs/withErrorBoundary';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { buildNavigationState } from '@/lib/ticketing/unifiedTicketing';
import TicketWizardDialog from '@/components/support/TicketWizardDialog';
import { UnifiedTicketFormData } from '@/lib/validation/ticket';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { canCreateServiceTicket, trackServiceTicketBlocked } from '@/lib/permissions/tickets';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Factory,
  Gauge,
  Shield,
  TrendingUp,
  Brain,
  CircuitBoard,
  BarChart3,
  Activity,
  Camera,
  Vibrate,
  Thermometer,
} from "lucide-react";

// AI-Powered Maintenance Data Types
interface PredictiveAlert {
  id: string;
  machineId: string;
  machineName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  issue: string;
  predictedFailureDate: string;
  confidence: number;
  recommendedActions: string[];
  sensorsInvolved: string[];
}

interface MachineHealth {
  machineId: string;
  name: string;
  type: 'cutting' | 'milling' | 'welding' | 'assembly';
  status: 'optimal' | 'degraded' | 'maintenance_required' | 'critical';
  healthScore: number;
  lastMaintenance: string;
  nextScheduled: string;
  operationalHours: number;
  sensorReadings: SensorData[];
}

interface SensorData {
  type: 'vibration' | 'temperature' | 'pressure' | 'acoustic' | 'current';
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'alert';
  trend: 'stable' | 'increasing' | 'decreasing';
}

const Services = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  // View state reserved for future use (list/map)
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [operatorTrainingOpen, setOperatorTrainingOpen] = useState(false);
  const [ticketWizardOpen, setTicketWizardOpen] = useState(false);
  const [ticketInitialValues, setTicketInitialValues] = useState<Partial<UnifiedTicketFormData> | undefined>(undefined);
  
  // Predictive Maintenance State
  const [predictiveAlerts, setPredictiveAlerts] = useState<PredictiveAlert[]>([]);
  const [machineHealth, setMachineHealth] = useState<MachineHealth[]>([]);
  const [realTimeData, setRealTimeData] = useState<boolean>(false);
  // Selected machine state reserved for future use

  // Simulated real-time data stream
  const dataStreamRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = "AI Industrial Services - ALMONA";
    loadPredictiveData();
    
    // Start simulated real-time data
    if (realTimeData) {
      dataStreamRef.current = setInterval(updateRealTimeData, 5000);
    }

    return () => {
      if (dataStreamRef.current) {
        clearInterval(dataStreamRef.current);
        dataStreamRef.current = null;
      }
    };
  }, [realTimeData]);

  const loadPredictiveData = () => {
    // Simulated AI-powered predictive data
    const mockAlerts: PredictiveAlert[] = [
      {
        id: '1',
        machineId: 'YM-CUT-5000',
        machineName: 'YILMAZ Double Head Cutting Machine',
        severity: 'high',
        component: 'Main Spindle Bearings',
        issue: 'Increased vibration patterns detected',
        predictedFailureDate: '2024-02-15',
        confidence: 87,
        recommendedActions: [
          'Schedule bearing replacement within 2 weeks',
          'Monitor vibration levels daily',
          'Check lubrication system'
        ],
        sensorsInvolved: ['vibration', 'acoustic', 'temperature']
      },
      {
        id: '2',
        machineId: 'YM-MILL-3000',
        machineName: 'Vertical Copy Router',
        severity: 'medium',
        component: 'Tool Changer Mechanism',
        issue: 'Alignment drift detected',
        predictedFailureDate: '2024-03-01',
        confidence: 72,
        recommendedActions: [
          'Calibrate tool changer alignment',
          'Inspect pneumatic actuators',
          'Verify positioning sensors'
        ],
        sensorsInvolved: ['position', 'pressure', 'current']
      }
    ];

    const mockHealth: MachineHealth[] = [
      {
        machineId: 'YM-CUT-5000',
        name: 'Double Head Cutting Machine',
        type: 'cutting',
        status: 'degraded',
        healthScore: 67,
        lastMaintenance: '2024-01-15',
        nextScheduled: '2024-02-10',
        operationalHours: 2840,
        sensorReadings: [
          { type: 'vibration', value: 4.2, unit: 'mm/s', status: 'warning', trend: 'increasing' },
          { type: 'temperature', value: 68, unit: '°C', status: 'normal', trend: 'stable' },
          { type: 'current', value: 42, unit: 'A', status: 'warning', trend: 'increasing' }
        ]
      },
      {
        machineId: 'YM-MILL-3000',
        name: 'Vertical Copy Router',
        type: 'milling',
        status: 'optimal',
        healthScore: 92,
        lastMaintenance: '2024-01-20',
        nextScheduled: '2024-03-15',
        operationalHours: 1560,
        sensorReadings: [
          { type: 'vibration', value: 1.8, unit: 'mm/s', status: 'normal', trend: 'stable' },
          { type: 'temperature', value: 55, unit: '°C', status: 'normal', trend: 'stable' },
          { type: 'acoustic', value: 72, unit: 'dB', status: 'normal', trend: 'stable' }
        ]
      }
    ];

    setPredictiveAlerts(mockAlerts);
    setMachineHealth(mockHealth);
  };

  const updateRealTimeData = () => {
    // Simulate real-time sensor data updates
    setMachineHealth(prev => prev.map(machine => ({
      ...machine,
      sensorReadings: machine.sensorReadings.map(sensor => ({
        ...sensor,
        value: sensor.value + (Math.random() - 0.5) * 2,
        status: sensor.value > 5 ? 'warning' : 'normal'
      }))
    })));
  };

  const toggleRealTimeData = () => {
    setRealTimeData(!realTimeData);
    if (!realTimeData) {
      dataStreamRef.current = setInterval(updateRealTimeData, 5000);
    } else if (dataStreamRef.current) {
      clearInterval(dataStreamRef.current);
      dataStreamRef.current = null;
    }
  };

  

  const launchMaintenanceTicket = (maintenanceType: 'preventive' | 'corrective' | 'emergency') => {
    if (!user) { navigate('/login'); return; }
    if (!canCreateServiceTicket(user.role)) {
      trackServiceTicketBlocked({ role: user.role, reason: 'role_not_whitelisted', maintenanceType });
      toast({
        title: 'Access Restricted',
        description: 'Your role is not permitted to create service tickets.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const draftKey = `ticket_wizard_draft_${user.id}`;
      localStorage.removeItem(draftKey);
    } catch {/* ignore storage errors */}
    
    const ctx = maintenanceType === 'emergency'
      ? { source: 'emergency' as const }
      : { source: 'maintenance' as const, maintenanceType };
    const prefill = buildNavigationState(ctx).prefill;
    
    setTicketInitialValues({
      type: prefill.type as UnifiedTicketFormData['type'],
      maintenance_type: prefill.maintenance_type as UnifiedTicketFormData['maintenance_type'],
      priority: prefill.priority as UnifiedTicketFormData['priority'],
      title: prefill.title,
      description: prefill.description
    });
    setTicketWizardOpen(true);
  };

  const handlePackageSelection = (packageId: string) => {
    if (!user) {
      navigate('/login', { state: { redirect: '/services', package: packageId } });
      return;
    }

    // Create a service package ticket
    const packageTicketData = {
      type: 'service' as const,
      priority: packageId === 'enterprise' ? 'high' as const : 'medium' as const,
      title: `Service Package Request - ${packageId}`,
      description: `Customer interested in ${packageId} service package. Please contact for consultation.`
    };

    setTicketInitialValues(packageTicketData);
    setTicketWizardOpen(true);
  };

  const getStatusColor = (status: MachineHealth['status']) => {
    switch (status) {
      case 'optimal': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'maintenance_required': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: MachineHealth['status']) => {
    switch (status) {
      case 'optimal': return <CheckCircle2 className="h-4 w-4" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4" />;
      case 'maintenance_required': return <Clock className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <main className="flex-grow pt-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="container mx-auto px-4 py-12"
      >
        {/* View Toggle */}
        <ServiceViewToggle viewMode={viewMode} onViewChange={setViewMode} />

        {/* Conditional Rendering */}
        {viewMode === 'simple' ? (
          <SimpleServicesView onPackageSelect={handlePackageSelection} />
        ) : (
          <>
            {/* Enhanced Hero Section with AI Focus */}
            <div className="mb-16 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7 }}
                className="inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20"
              >
                <Brain className="h-6 w-6 text-orange-400" />
                <Badge variant="secondary" className="text-sm font-semibold">
                  AI-POWERED PREDICTIVE MAINTENANCE
                </Badge>
              </motion.div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Industrial AI Services Hub
              </h1>
              <p className="text-xl text-gray-400 max-w-4xl mx-auto leading-relaxed">
                Machine learning-driven predictive maintenance, real-time equipment monitoring, 
                and intelligent lifecycle management for aluminum window and door manufacturing systems.
              </p>
            </div>

        {/* Emergency Service Dialog */}
        <EmergencyServiceDialog 
          open={emergencyDialogOpen} 
          onOpenChange={setEmergencyDialogOpen} 
        />

        {/* Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button 
            onClick={toggleRealTimeData}
            variant={realTimeData ? "default" : "outline"}
            className={realTimeData ? "bg-green-500 hover:bg-green-600" : "electric-border"}
          >
            <Activity className="h-4 w-4 mr-2" />
            {realTimeData ? 'Live Data Active' : 'Enable Live Data'}
          </Button>
          <Link to="/portal">
            <Button variant="outline" className="text-white electric-border">
              <Gauge className="h-4 w-4 mr-2" />
              Customer Portal
            </Button>
          </Link>
          <Link to="/support">
            <Button variant="outline" className="text-white electric-border">
              <Shield className="h-4 w-4 mr-2" />
              AI Support
            </Button>
          </Link>
        </div>

        {/* Predictive Maintenance Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-gray-900 to-black border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">{predictiveAlerts.length}</div>
              <p className="text-xs text-gray-400">
                {predictiveAlerts.filter(a => a.severity === 'critical').length} critical
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Healthy Machines</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {machineHealth.filter(m => m.status === 'optimal').length}
              </div>
              <p className="text-xs text-gray-400">Optimal performance</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Predictive Accuracy</CardTitle>
              <Brain className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">94%</div>
              <p className="text-xs text-gray-400">ML model confidence</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-black border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">37%</div>
              <p className="text-xs text-gray-400">Reduced downtime</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Services Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 max-w-6xl mx-auto mb-12 bg-gradient-to-r from-gray-900 to-black backdrop-blur-sm border border-orange-500/20 p-2 rounded-xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              AI Overview
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Predictive Engine
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Register Machine
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              AI Dashboard
            </TabsTrigger>
          </TabsList>

          {/* AI-Powered Services Overview */}
          <TabsContent value="overview">
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Predictive Alerts Section */}
              <Card className="bg-gradient-to-br from-gray-900 to-black border-orange-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-400">
                    <AlertTriangle className="h-5 w-5" />
                    AI Predictive Alerts
                  </CardTitle>
                  <CardDescription>
                    Machine learning-driven failure predictions and maintenance recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {predictiveAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical' ? 'border-red-500/30 bg-red-500/10' :
                          alert.severity === 'high' ? 'border-orange-500/30 bg-orange-500/10' :
                          'border-yellow-500/30 bg-yellow-500/10'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Factory className="h-4 w-4" />
                              <span className="font-semibold">{alert.machineName}</span>
                              <Badge variant={
                                alert.severity === 'critical' ? 'outline' :
                                alert.severity === 'high' ? 'default' : 'secondary'
                              }>
                                {alert.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm mb-2">{alert.component}: {alert.issue}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              <span>Predicted: {alert.predictedFailureDate}</span>
                              <span>Confidence: {alert.confidence}%</span>
                              <div className="flex items-center gap-1">
                                {alert.sensorsInvolved.map(sensor => (
                                  <Badge key={sensor} variant="outline" className="text-xs">
                                    {sensor}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Progress value={alert.confidence} className="h-2" />
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => launchMaintenanceTicket('preventive')}
                            className="ml-4"
                          >
                            Schedule
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Services Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ServiceCard
                  icon="brain"
                  title="AI Predictive Maintenance"
                  description="Machine learning algorithms predict failures before they happen"
                  features={[
                    "Vibration analysis",
                    "Thermal imaging",
                    "Acoustic monitoring",
                    "95% prediction accuracy"
                  ]}
                  actionText={user ? "View Predictions" : "Login to Access"}
                  onActionClick={() => setActiveTab("predictive")}
                  highlight={true}
                />
                <ServiceCard
                  icon="bolt"
                  title="Emergency Repairs"
                  description="24/7 AI-monitored critical response team"
                  features={[
                    "2-hour response guarantee",
                    "Smart spare parts inventory",
                    "Mobile repair units with IoT",
                    "Real-time technician tracking"
                  ]}
                  actionText={user ? "Emergency Ticket" : "Login for Emergency"}
                  onActionClick={() => launchMaintenanceTicket('emergency')}
                />
                <ServiceCard
                  icon="graduation-cap"
                  title="AI Operator Training"
                  description="Machine-specific certification with performance analytics"
                  features={[
                    "Virtual reality simulations",
                    "Performance benchmarking",
                    "Predictive skill assessment",
                    "Certification tracking"
                  ]}
                  actionText="View Training Programs"
                  onActionClick={() => setOperatorTrainingOpen(true)}
                  highlight={true}
                />
                <ServiceCard
                  icon="factory"
                  title="Fabricator Workflow Pro"
                  description="AI-powered aluminum & UPVC fabrication system with smart optimization"
                  features={[
                    "Smart measuring interface",
                    "Cutting optimization engine",
                    "Real-time monitoring",
                    "Quality control automation"
                  ]}
                  actionText="Launch Fabricator"
                  onActionClick={() => navigate('/fabricator-workflow')}
                  highlight={true}
                />
              </div>

              {/* Machine Health Dashboard */}
              <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CircuitBoard className="h-5 w-5 text-orange-400" />
                    Real-Time Machine Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {machineHealth.map((machine) => (
                      <motion.div
                        key={machine.machineId}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-lg border ${
                          machine.status === 'optimal' ? 'border-green-500/30' :
                          machine.status === 'degraded' ? 'border-yellow-500/30' :
                          machine.status === 'maintenance_required' ? 'border-orange-500/30' :
                          'border-red-500/30'
                        } bg-gradient-to-br from-gray-800/50 to-gray-900/50`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(machine.status)}
                            <span className={`font-semibold ${getStatusColor(machine.status)}`}>
                              {machine.name}
                            </span>
                          </div>
                          <Badge variant="outline">{machine.type}</Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Health Score:</span>
                            <span className="font-semibold">{machine.healthScore}%</span>
                          </div>
                          <Progress value={machine.healthScore} className="h-2" />
                          
                          <div className="flex justify-between text-sm">
                            <span>Operational Hours:</span>
                            <span>{machine.operationalHours}h</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            {machine.sensorReadings.map((sensor, index) => (
                              <div key={index} className="text-xs">
                                <div className="flex items-center gap-1">
                                  {sensor.type === 'vibration' && <Vibrate className="h-3 w-3" />}
                                  {sensor.type === 'temperature' && <Thermometer className="h-3 w-3" />}
                                  {sensor.type === 'acoustic' && <Camera className="h-3 w-3" />}
                                  <span className="capitalize">{sensor.type}:</span>
                                </div>
                                <span className={
                                  sensor.status === 'normal' ? 'text-green-400' :
                                  sensor.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                                }>
                                  {sensor.value} {sensor.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Predictive Maintenance Engine */}
          <TabsContent value="predictive">
            <motion.div
              key="predictive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Suspense fallback={<FormSkeleton />}>
                <PredictiveMaintenanceEngine />
              </Suspense>
            </motion.div>
          </TabsContent>

          {/* Machine Registration */}
          <TabsContent value="register">
            <motion.div
              key="register"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Suspense fallback={<FormSkeleton />}>
                <MachineRegistrationEnhanced />
              </Suspense>
            </motion.div>
          </TabsContent>

          {/* AI Maintenance Dashboard */}
          <TabsContent value="dashboard">
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Suspense fallback={<div className="space-y-4"><FormSkeleton /><FormSkeleton /></div>}>
                <MaintenanceDashboard />
              </Suspense>
            </motion.div>
          </TabsContent>
        </Tabs>
          </>
        )}
      </motion.div>

      {/* Dialogs */}
      <TicketWizardDialog
        open={ticketWizardOpen}
        onOpenChange={setTicketWizardOpen}
        initialValues={ticketInitialValues}
        onTicketCreated={() => {
          setTicketWizardOpen(false);
        }}
      />
      <OperatorTrainingIncentiveDialog
        open={operatorTrainingOpen}
        onOpenChange={setOperatorTrainingOpen}
      />
    </main>
  );
};

const ServicesWithBoundary = withErrorBoundary(Services);
export default ServicesWithBoundary;