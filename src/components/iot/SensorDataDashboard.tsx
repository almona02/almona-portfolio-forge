import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { 
  Thermometer,
  Gauge,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  RefreshCw,
  Bell
} from 'lucide-react';
import { 
  SensorReading, 
  DigitalTwinData,
  SensorType,
  PredictedFailure,
  useIoTSensorData,
  IoTDataProcessor,
  iotSensorService
} from '@/lib/iot/sensorIntegration';
import { toast } from 'sonner';

// Real-time chart component (simplified - in production would use Chart.js or similar)
const MiniChart: React.FC<{ 
  data: number[], 
  label: string, 
  color: string,
  unit: string 
}> = ({ data, label, color, unit }) => {
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue;

  return (
    <div className="w-full h-20 relative">
      <div className="absolute inset-0 flex items-end justify-between">
        {data.slice(-20).map((value, index) => {
          const height = range > 0 ? ((value - minValue) / range) * 100 : 50;
          return (
            <div
              key={index}
              className={`w-1 ${color} rounded-t`}
              style={{ height: `${Math.max(height, 5)}%` }}
            />
          );
        })}
      </div>
      <div className="absolute top-0 left-0 text-xs text-gray-400">
        {label}: {data[data.length - 1]?.toFixed(2)} {unit}
      </div>
    </div>
  );
};

// Sensor status indicator
const SensorStatus: React.FC<{
  type: SensorType;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'increasing' | 'decreasing' | 'stable';
  historicalData: number[];
}> = ({ type, value, unit, status, trend, historicalData }) => {
  const getSensorIcon = () => {
    switch (type) {
      case 'temperature': return <Thermometer className="h-5 w-5" />;
      case 'pressure': return <Gauge className="h-5 w-5" />;
      case 'vibration': return <Activity className="h-5 w-5" />;
      case 'current': case 'voltage': case 'power': return <Zap className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'normal': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-400" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-blue-400" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getChartColor = () => {
    switch (status) {
      case 'normal': return 'bg-green-400';
      case 'warning': return 'bg-yellow-400';
      case 'critical': return 'bg-red-400';
    }
  };

  return (
    <Card className="bg-almona-dark/60 border-almona-light/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={getStatusColor()}>
              {getSensorIcon()}
            </div>
            <div>
              <h4 className="font-medium capitalize">{type.replace('_', ' ')}</h4>
              <div className="text-2xl font-bold">{value.toFixed(2)} <span className="text-sm text-gray-400">{unit}</span></div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={`${
              status === 'normal' ? 'bg-green-500/20 text-green-300 border-green-500/50' :
              status === 'warning' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' :
              'bg-red-500/20 text-red-300 border-red-500/50'
            }`}>
              {status}
            </Badge>
            {getTrendIcon()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <MiniChart 
          data={historicalData} 
          label={type}
          color={getChartColor()}
          unit={unit}
        />
      </CardContent>
    </Card>
  );
};

// Predictive maintenance card
const PredictiveMaintenanceCard: React.FC<{
  predictions: PredictedFailure[];
}> = ({ predictions }) => {
  const criticalPredictions = predictions.filter(p => p.probability > 0.7);
  const warningPredictions = predictions.filter(p => p.probability > 0.3 && p.probability <= 0.7);

  return (
    <Card className="bg-almona-dark/60 border-almona-light/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-almona-orange" />
          Predictive Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {criticalPredictions.length > 0 && (
          <div>
            <div className="text-sm font-medium text-red-400 mb-2">Critical Predictions</div>
            {criticalPredictions.map((prediction, index) => (
              <div key={index} className="p-3 bg-red-500/20 rounded-lg border border-red-500/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{prediction.component}</span>
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/50">
                    {Math.round(prediction.probability * 100)}%
                  </Badge>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Estimated failure in {prediction.estimated_days} days
                </div>
                <div className="text-xs text-red-300">
                  {prediction.recommended_action}
                </div>
              </div>
            ))}
          </div>
        )}

        {warningPredictions.length > 0 && (
          <div>
            <div className="text-sm font-medium text-yellow-400 mb-2">Watch List</div>
            {warningPredictions.map((prediction, index) => (
              <div key={index} className="p-3 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{prediction.component}</span>
                  <span className="text-xs text-gray-400">{prediction.estimated_days} days</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {predictions.length === 0 && (
          <div className="text-center py-4 text-gray-400">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
            <div className="text-sm">All systems optimal</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// OEE (Overall Equipment Effectiveness) display
const OEEDisplay: React.FC<{
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}> = ({ availability, performance, quality, oee }) => {
  const getOEEColor = (value: number) => {
    if (value >= 0.85) return 'text-green-400';
    if (value >= 0.65) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-almona-dark/60 border-almona-light/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-almona-orange" />
          Overall Equipment Effectiveness (OEE)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`text-4xl font-bold ${getOEEColor(oee)}`}>
            {Math.round(oee * 100)}%
          </div>
          <div className="text-sm text-gray-400">Overall OEE</div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-semibold">{Math.round(availability * 100)}%</div>
            <div className="text-xs text-gray-400">Availability</div>
            <Progress value={availability * 100} className="h-2 mt-1" />
          </div>
          <div>
            <div className="text-lg font-semibold">{Math.round(performance * 100)}%</div>
            <div className="text-xs text-gray-400">Performance</div>
            <Progress value={performance * 100} className="h-2 mt-1" />
          </div>
          <div>
            <div className="text-lg font-semibold">{Math.round(quality * 100)}%</div>
            <div className="text-xs text-gray-400">Quality</div>
            <Progress value={quality * 100} className="h-2 mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main IoT Sensor Dashboard
export const SensorDataDashboard: React.FC<{
  machineId: string;
}> = ({ machineId }) => {
  const { sensorData, digitalTwinData, isConnected } = useIoTSensorData(machineId);
  const [predictions, setPredictions] = useState<PredictedFailure[]>([]);
  const [oeeData, setOeeData] = useState({
    availability: 0.92,
    performance: 0.95,
    quality: 0.98,
    oee: 0.87
  });
  const [refreshing, setRefreshing] = useState(false);

  // Group sensor data by type for display
  const sensorsByType = React.useMemo(() => {
    const grouped: Record<SensorType, SensorReading[]> = {} as any;
    
    sensorData.forEach(reading => {
      // In a real implementation, you'd need to map sensor_id to sensor type
      // For demo purposes, we'll simulate different sensor types
      const sensorTypes: SensorType[] = ['temperature', 'pressure', 'vibration', 'current'];
      const sensorType = sensorTypes[Math.floor(Math.random() * sensorTypes.length)];
      
      if (!grouped[sensorType]) {
        grouped[sensorType] = [];
      }
      grouped[sensorType].push(reading);
    });

    return grouped;
  }, [sensorData]);

  // Load predictive maintenance data
  useEffect(() => {
    const loadPredictions = async () => {
      try {
        const predictions = await iotSensorService.predictMaintenance(machineId);
        setPredictions(predictions);
      } catch (error) {
        console.error('Failed to load predictions:', error);
      }
    };

    const loadOEE = async () => {
      try {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
        const oee = await iotSensorService.calculateOEE(machineId, { start: startTime, end: endTime });
        setOeeData(oee);
      } catch (error) {
        console.error('Failed to load OEE data:', error);
      }
    };

    loadPredictions();
    loadOEE();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      loadPredictions();
      loadOEE();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [machineId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 2000);
    toast.info('Refreshing sensor data...');
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-almona-dark/60 border-almona-light/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  <Wifi className="h-5 w-5 text-green-400" />
                  <div>
                    <div className="font-medium">Connected to IoT Platform</div>
                    <div className="text-sm text-gray-400">
                      Real-time data streaming • {sensorData.length} readings received
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-400" />
                  <div>
                    <div className="font-medium">IoT Connection Lost</div>
                    <div className="text-sm text-gray-400">
                      Showing cached data • Attempting reconnection...
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sensors" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-almona-dark/80">
          <TabsTrigger value="sensors">Real-Time Sensors</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="sensors" className="space-y-4">
          {/* Sensor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(sensorsByType).map(([type, readings]) => {
              const latestReading = readings[readings.length - 1];
              const historicalValues = readings.map(r => r.value);
              const trend = IoTDataProcessor.calculateTrend(historicalValues);
              
              // Determine status based on mock thresholds
              let status: 'normal' | 'warning' | 'critical' = 'normal';
              if (type === 'temperature' && latestReading.value > 70) status = 'critical';
              else if (type === 'temperature' && latestReading.value > 60) status = 'warning';
              else if (type === 'vibration' && latestReading.value > 0.5) status = 'critical';
              else if (type === 'vibration' && latestReading.value > 0.3) status = 'warning';

              return (
                <SensorStatus
                  key={type}
                  type={type as SensorType}
                  value={latestReading.value}
                  unit={latestReading.unit}
                  status={status}
                  trend={trend}
                  historicalData={historicalValues}
                />
              );
            })}
          </div>

          {/* Digital Twin Summary */}
          {digitalTwinData && (
            <Card className="bg-almona-dark/60 border-almona-light/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-almona-orange" />
                  Digital Twin Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">
                      {Math.round(digitalTwinData.health_indicators.overall_health)}%
                    </div>
                    <div className="text-sm text-gray-400">Health Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">
                      {Math.round(digitalTwinData.performance_metrics.efficiency * 100)}%
                    </div>
                    <div className="text-sm text-gray-400">Efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-almona-orange">
                      {digitalTwinData.operational_state}
                    </div>
                    <div className="text-sm text-gray-400">Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">
                      {digitalTwinData.alerts.length}
                    </div>
                    <div className="text-sm text-gray-400">Active Alerts</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <OEEDisplay {...oeeData} />
          
          {/* Efficiency Trends */}
          <Card className="bg-almona-dark/60 border-almona-light/20">
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-400">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div>Advanced analytics charts would be displayed here</div>
                <div className="text-sm">Integration with Chart.js or similar library</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <PredictiveMaintenanceCard predictions={predictions} />
          
          {/* Maintenance History */}
          <Card className="bg-almona-dark/60 border-almona-light/20">
            <CardHeader>
              <CardTitle>Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-almona-dark/40 rounded-lg">
                  <div>
                    <div className="font-medium">Routine Inspection</div>
                    <div className="text-sm text-gray-400">Next: December 15, 2024</div>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/50">
                    Scheduled
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-almona-dark/40 rounded-lg">
                  <div>
                    <div className="font-medium">Oil Change</div>
                    <div className="text-sm text-gray-400">Next: January 10, 2025</div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                    On Schedule
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SensorDataDashboard;