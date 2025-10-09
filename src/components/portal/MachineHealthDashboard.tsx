import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Thermometer,
  Gauge,
  Settings,
  Calendar,
  Wrench,
  TrendingUp,
  Bell,
  RefreshCw,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { SensorDataDashboard } from '@/components/iot/SensorDataDashboard';

// Types for machine health data
interface MachineMetrics {
  id: string;
  name: string;
  model: string;
  status: 'running' | 'idle' | 'maintenance' | 'offline' | 'error';
  health_score: number;
  temperature: number;
  pressure: number;
  vibration: number;
  runtime_hours: number;
  efficiency: number;
  last_maintenance: string;
  next_maintenance: string;
  alerts_count: number;
  digital_twin_code?: string;
  location?: string;
}

interface Alert {
  id: string;
  machine_id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

interface MaintenanceSchedule {
  id: string;
  machine_id: string;
  type: 'preventive' | 'corrective' | 'emergency';
  scheduled_date: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export const MachineHealthDashboard: React.FC = () => {
  const { user } = useAuth();
  const [machines, setMachines] = useState<MachineMetrics[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch machine health data
  const fetchMachineHealth = async () => {
    if (!user) return;

    try {
      // In a real implementation, this would fetch from IoT sensors or machine APIs
      // For now, we'll simulate realistic machine data
      const mockMachines: MachineMetrics[] = [
        {
          id: '1',
          name: 'YILMAZ AIM 7420',
          model: 'AIM 7420',
          status: 'running',
          health_score: 92,
          temperature: 65,
          pressure: 8.5,
          vibration: 0.2,
          runtime_hours: 2847,
          efficiency: 94,
          last_maintenance: '2024-11-15T08:00:00Z',
          next_maintenance: '2024-12-15T08:00:00Z',
          alerts_count: 1,
          digital_twin_code: 'DTC-2024-AIM7420X1',
          location: 'Production Line A'
        },
        {
          id: '2', 
          name: 'YILMAZ CDC 600',
          model: 'CDC 600',
          status: 'maintenance',
          health_score: 78,
          temperature: 72,
          pressure: 7.2,
          vibration: 0.8,
          runtime_hours: 4521,
          efficiency: 87,
          last_maintenance: '2024-12-01T10:00:00Z',
          next_maintenance: '2024-12-20T10:00:00Z',
          alerts_count: 3,
          digital_twin_code: 'DTC-2024-CDC600Y2',
          location: 'Production Line B'
        }
      ];

      const mockAlerts: Alert[] = [
        {
          id: '1',
          machine_id: '1',
          type: 'warning',
          message: 'Temperature slightly elevated (65°C). Monitor closely.',
          timestamp: '2024-12-10T14:30:00Z',
          acknowledged: false
        },
        {
          id: '2',
          machine_id: '2',
          type: 'critical',
          message: 'Excessive vibration detected. Immediate inspection required.',
          timestamp: '2024-12-10T12:15:00Z',
          acknowledged: false
        }
      ];

      const mockMaintenance: MaintenanceSchedule[] = [
        {
          id: '1',
          machine_id: '1',
          type: 'preventive',
          scheduled_date: '2024-12-15T08:00:00Z',
          description: 'Routine lubrication and belt inspection',
          status: 'pending'
        },
        {
          id: '2',
          machine_id: '2',
          type: 'corrective',
          scheduled_date: '2024-12-12T09:00:00Z',
          description: 'Vibration analysis and bearing replacement',
          status: 'in_progress'
        }
      ];

      setMachines(mockMachines);
      setAlerts(mockAlerts);
      setMaintenance(mockMaintenance);
      
      if (mockMachines.length > 0 && !selectedMachine) {
        setSelectedMachine(mockMachines[0].id);
      }
    } catch (error) {
      console.error('Error fetching machine health:', error);
      toast.error('Failed to fetch machine health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    fetchMachineHealth();

    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      if (!refreshing) {
        fetchMachineHealth();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMachineHealth();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'idle': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'maintenance': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'offline': return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
      case 'error': return 'bg-red-500/20 text-red-300 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-400" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const selectedMachineData = machines.find(m => m.id === selectedMachine);
  const selectedAlerts = alerts.filter(a => a.machine_id === selectedMachine);
  const selectedMaintenance = maintenance.filter(m => m.machine_id === selectedMachine);

  if (loading) {
    return (
      <Card className="bg-almona-dark/60 border-almona-light/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-almona-orange" />
            Machine Health Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-almona-orange"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-almona-dark/60 border-almona-light/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-400" />
              Active Machines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {machines.filter(m => m.status === 'running').length}
            </div>
            <p className="text-xs text-gray-400">out of {machines.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-almona-dark/60 border-almona-light/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {alerts.filter(a => !a.acknowledged).length}
            </div>
            <p className="text-xs text-gray-400">require attention</p>
          </CardContent>
        </Card>

        <Card className="bg-almona-dark/60 border-almona-light/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4 text-blue-400" />
              Pending Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {maintenance.filter(m => m.status === 'pending').length}
            </div>
            <p className="text-xs text-gray-400">scheduled tasks</p>
          </CardContent>
        </Card>

        <Card className="bg-almona-dark/60 border-almona-light/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-almona-orange" />
              Avg Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-almona-orange">
              {Math.round(machines.reduce((acc, m) => acc + m.efficiency, 0) / machines.length)}%
            </div>
            <p className="text-xs text-gray-400">overall performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine List */}
        <Card className="bg-almona-dark/60 border-almona-light/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-almona-orange" />
                Machines
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {machines.map((machine) => (
              <motion.div
                key={machine.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedMachine === machine.id
                    ? 'bg-almona-orange/20 border-almona-orange/50'
                    : 'bg-almona-dark/40 border-almona-light/20 hover:border-almona-orange/30'
                }`}
                onClick={() => setSelectedMachine(machine.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{machine.name}</h4>
                  <Badge className={getStatusColor(machine.status)} variant="secondary">
                    {machine.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Health: <span className={getHealthScoreColor(machine.health_score)}>{machine.health_score}%</span></span>
                  {machine.alerts_count > 0 && (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertTriangle className="h-3 w-3" />
                      {machine.alerts_count}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Machine Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedMachineData && (
            <>
              {/* Machine Header */}
              <Card className="bg-almona-dark/60 border-almona-light/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-almona-orange" />
                        {selectedMachineData.name}
                      </CardTitle>
                      <p className="text-sm text-gray-400 mt-1">
                        {selectedMachineData.location} • Twin Code: {selectedMachineData.digital_twin_code}
                      </p>
                    </div>
                    <Badge className={getStatusColor(selectedMachineData.status)} variant="secondary">
                      {selectedMachineData.status}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              {/* Metrics Tabs */}
              <Tabs defaultValue="metrics" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-almona-dark/80">
                  <TabsTrigger value="metrics">Overview</TabsTrigger>
                  <TabsTrigger value="iot">IoT Sensors</TabsTrigger>
                  <TabsTrigger value="alerts">Alerts</TabsTrigger>
                  <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                </TabsList>

                <TabsContent value="metrics" className="space-y-4">
                  {/* Health Score */}
                  <Card className="bg-almona-dark/60 border-almona-light/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Health Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className={`text-3xl font-bold ${getHealthScoreColor(selectedMachineData.health_score)}`}>
                          {selectedMachineData.health_score}%
                        </div>
                        <div className="flex-1">
                          <Progress 
                            value={selectedMachineData.health_score} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Live Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-almona-dark/60 border-almona-light/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Thermometer className="h-4 w-4 text-red-400" />
                          <span className="text-sm font-medium">Temperature</span>
                        </div>
                        <div className="text-2xl font-bold">{selectedMachineData.temperature}°C</div>
                        <Progress 
                          value={(selectedMachineData.temperature / 100) * 100} 
                          className="h-1 mt-2"
                        />
                      </CardContent>
                    </Card>

                    <Card className="bg-almona-dark/60 border-almona-light/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Gauge className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium">Pressure</span>
                        </div>
                        <div className="text-2xl font-bold">{selectedMachineData.pressure} bar</div>
                        <Progress 
                          value={(selectedMachineData.pressure / 10) * 100} 
                          className="h-1 mt-2"
                        />
                      </CardContent>
                    </Card>

                    <Card className="bg-almona-dark/60 border-almona-light/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium">Vibration</span>
                        </div>
                        <div className="text-2xl font-bold">{selectedMachineData.vibration} mm/s</div>
                        <Progress 
                          value={(selectedMachineData.vibration / 2) * 100} 
                          className="h-1 mt-2"
                        />
                      </CardContent>
                    </Card>

                    <Card className="bg-almona-dark/60 border-almona-light/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-medium">Efficiency</span>
                        </div>
                        <div className="text-2xl font-bold">{selectedMachineData.efficiency}%</div>
                        <Progress 
                          value={selectedMachineData.efficiency} 
                          className="h-1 mt-2"
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="iot" className="space-y-4">
                  <SensorDataDashboard machineId={selectedMachineData.id} />
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                  {selectedAlerts.length > 0 ? (
                    selectedAlerts.map((alert) => (
                      <Card key={alert.id} className="bg-almona-dark/60 border-almona-light/20">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {getAlertIcon(alert.type)}
                            <div className="flex-1">
                              <p className="font-medium">{alert.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(alert.timestamp).toLocaleString()}
                              </p>
                            </div>
                            {!alert.acknowledged && (
                              <Button size="sm" variant="outline">
                                Acknowledge
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="bg-almona-dark/60 border-almona-light/20">
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                        <p className="text-gray-400">No active alerts for this machine</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="maintenance" className="space-y-4">
                  {selectedMaintenance.length > 0 ? (
                    selectedMaintenance.map((task) => (
                      <Card key={task.id} className="bg-almona-dark/60 border-almona-light/20">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                              <Calendar className="h-4 w-4 text-blue-400 mt-1" />
                              <div>
                                <p className="font-medium">{task.description}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Scheduled: {new Date(task.scheduled_date).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              variant="outline"
                              className={
                                task.status === 'completed' ? 'border-green-500 text-green-400' :
                                task.status === 'in_progress' ? 'border-yellow-500 text-yellow-400' :
                                'border-gray-500 text-gray-400'
                              }
                            >
                              {task.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="bg-almona-dark/60 border-almona-light/20">
                      <CardContent className="p-8 text-center">
                        <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-400">No scheduled maintenance for this machine</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MachineHealthDashboard;