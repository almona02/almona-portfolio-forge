// IoT Sensor Integration Framework for Industry 4.0
// Handles real-time sensor data collection, processing, and analytics

import React from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// IoT Sensor Types and Interfaces
export interface SensorReading {
  sensor_id: string;
  machine_id: string;
  timestamp: Date;
  value: number;
  unit: string;
  quality: 'good' | 'uncertain' | 'bad';
  metadata?: Record<string, any>;
}

export interface SensorConfiguration {
  id: string;
  machine_id: string;
  type: SensorType;
  name: string;
  description: string;
  unit: string;
  min_value: number;
  max_value: number;
  warning_threshold: number;
  critical_threshold: number;
  sampling_rate: number; // Hz
  enabled: boolean;
  calibration_offset: number;
  calibration_factor: number;
}

export type SensorType = 
  | 'temperature' 
  | 'pressure' 
  | 'vibration' 
  | 'current' 
  | 'voltage' 
  | 'power' 
  | 'flow_rate' 
  | 'level' 
  | 'speed' 
  | 'torque'
  | 'humidity'
  | 'acoustic';

export interface DigitalTwinData {
  machine_id: string;
  timestamp: Date;
  operational_state: 'running' | 'idle' | 'maintenance' | 'error' | 'offline';
  performance_metrics: {
    efficiency: number;
    oee: number; // Overall Equipment Effectiveness
    quality_score: number;
    availability: number;
    throughput: number;
  };
  health_indicators: {
    overall_health: number;
    component_health: Record<string, number>;
    predicted_failures: PredictedFailure[];
    maintenance_score: number;
  };
  sensor_summary: Record<string, SensorSummary>;
  alerts: Alert[];
}

export interface SensorSummary {
  current_value: number;
  avg_value: number;
  min_value: number;
  max_value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  status: 'normal' | 'warning' | 'critical';
}

export interface PredictedFailure {
  component: string;
  probability: number;
  estimated_days: number;
  recommended_action: string;
  confidence: number;
}

export interface Alert {
  id: string;
  type: 'sensor_threshold' | 'prediction' | 'anomaly' | 'maintenance';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  sensor_id?: string;
  related_data?: any;
}

// Real-time sensor data processing
class IoTSensorService {
  private websocketUrl: string;
  private websocket: WebSocket | null = null;
  private reconnectInterval = 5000;
  private isConnected = false;
  private subscribers: Map<string, (data: SensorReading) => void> = new Map();
  private digitalTwinSubscribers: Map<string, (data: DigitalTwinData) => void> = new Map();
  private sensorConfigs: Map<string, SensorConfiguration> = new Map();

  constructor() {
    // In production, this would be your IoT platform WebSocket URL
    this.websocketUrl = import.meta.env.VITE_IOT_WEBSOCKET_URL || 'wss://api.almona.com/iot/ws';
    this.initializeConnection();
    this.loadSensorConfigurations();
  }

  // Initialize WebSocket connection to IoT platform
  private initializeConnection() {
    try {
      this.websocket = new WebSocket(this.websocketUrl);
      
      this.websocket.onopen = () => {
        this.isConnected = true;
        console.log('IoT WebSocket connected');
        toast.success('Connected to IoT platform');
      };

      this.websocket.onmessage = (event) => {
        this.handleIncomingData(JSON.parse(event.data));
      };

      this.websocket.onclose = () => {
        this.isConnected = false;
        console.log('IoT WebSocket disconnected');
        this.scheduleReconnection();
      };

      this.websocket.onerror = (error) => {
        console.error('IoT WebSocket error:', error);
        toast.error('IoT connection error');
      };

    } catch (error) {
      console.error('Failed to initialize IoT connection:', error);
      this.scheduleReconnection();
    }
  }

  // Schedule reconnection attempt
  private scheduleReconnection() {
    setTimeout(() => {
      if (!this.isConnected) {
        console.log('Attempting IoT reconnection...');
        this.initializeConnection();
      }
    }, this.reconnectInterval);
  }

  // Handle incoming sensor data
  private handleIncomingData(data: any) {
    if (data.type === 'sensor_reading') {
      const reading = this.processSensorReading(data.payload);
      
      // Notify subscribers
      this.subscribers.forEach(callback => callback(reading));
      
      // Store in database
      this.storeSensorReading(reading);
      
      // Check thresholds and generate alerts
      this.checkThresholds(reading);
      
    } else if (data.type === 'digital_twin_update') {
      const digitalTwin = data.payload as DigitalTwinData;
      
      // Notify digital twin subscribers
      this.digitalTwinSubscribers.forEach(callback => callback(digitalTwin));
      
      // Update machine status in database
      this.updateMachineStatus(digitalTwin);
    }
  }

  // Process and calibrate sensor reading
  private processSensorReading(rawData: any): SensorReading {
    const config = this.sensorConfigs.get(rawData.sensor_id);
    
    let calibratedValue = rawData.value;
    if (config) {
      // Apply calibration: value = (raw_value * factor) + offset
      calibratedValue = (rawData.value * config.calibration_factor) + config.calibration_offset;
      
      // Validate range
      if (calibratedValue < config.min_value || calibratedValue > config.max_value) {
        console.warn(`Sensor ${rawData.sensor_id} value out of range: ${calibratedValue}`);
      }
    }

    return {
      sensor_id: rawData.sensor_id,
      machine_id: rawData.machine_id,
      timestamp: new Date(rawData.timestamp),
      value: calibratedValue,
      unit: rawData.unit,
      quality: rawData.quality || 'good',
      metadata: rawData.metadata
    };
  }

  // Store sensor reading in database
  private async storeSensorReading(reading: SensorReading) {
    try {
      await supabase.from('sensor_readings').insert({
        sensor_id: reading.sensor_id,
        machine_id: reading.machine_id,
        timestamp: reading.timestamp.toISOString(),
        value: reading.value,
        unit: reading.unit,
        quality: reading.quality,
        metadata: reading.metadata
      });
    } catch (error) {
      console.error('Failed to store sensor reading:', error);
    }
  }

  // Check thresholds and generate alerts
  private checkThresholds(reading: SensorReading) {
    const config = this.sensorConfigs.get(reading.sensor_id);
    if (!config) return;

    if (reading.value >= config.critical_threshold) {
      this.generateAlert({
        type: 'sensor_threshold',
        severity: 'critical',
        message: `${config.name} critical threshold exceeded: ${reading.value} ${reading.unit}`,
        sensor_id: reading.sensor_id,
        related_data: { reading, threshold: config.critical_threshold }
      });
    } else if (reading.value >= config.warning_threshold) {
      this.generateAlert({
        type: 'sensor_threshold',
        severity: 'warning',
        message: `${config.name} warning threshold exceeded: ${reading.value} ${reading.unit}`,
        sensor_id: reading.sensor_id,
        related_data: { reading, threshold: config.warning_threshold }
      });
    }
  }

  // Generate and broadcast alert
  private async generateAlert(alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      acknowledged: false,
      ...alertData
    };

    try {
      // Store alert in database
      await supabase.from('iot_alerts').insert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp.toISOString(),
        acknowledged: alert.acknowledged,
        sensor_id: alert.sensor_id,
        related_data: alert.related_data
      });

      // Show notification to user
      if (alert.severity === 'critical') {
        toast.error(alert.message, { duration: 10000 });
      } else if (alert.severity === 'warning') {
        toast.warning(alert.message, { duration: 5000 });
      }

    } catch (error) {
      console.error('Failed to generate alert:', error);
    }
  }

  // Update machine status based on digital twin data
  private async updateMachineStatus(digitalTwin: DigitalTwinData) {
    try {
      await supabase.from('machines').update({
        status: digitalTwin.operational_state,
        health_score: digitalTwin.health_indicators.overall_health,
        efficiency: digitalTwin.performance_metrics.efficiency,
        last_updated: digitalTwin.timestamp.toISOString()
      }).eq('id', digitalTwin.machine_id);
    } catch (error) {
      console.error('Failed to update machine status:', error);
    }
  }

  // Load sensor configurations from database
  private async loadSensorConfigurations() {
    try {
      const { data, error } = await supabase
        .from('sensor_configurations')
        .select('*')
        .eq('enabled', true);

      if (error) throw error;

      data?.forEach(config => {
        this.sensorConfigs.set(config.id, config);
      });

      console.log(`Loaded ${data?.length || 0} sensor configurations`);
    } catch (error) {
      console.error('Failed to load sensor configurations:', error);
    }
  }

  // Public API Methods

  // Subscribe to sensor readings for a specific machine
  public subscribeMachineData(machineId: string, callback: (data: SensorReading) => void): () => void {
    const subscriptionId = `machine_${machineId}_${Date.now()}`;
    
    const filteredCallback = (data: SensorReading) => {
      if (data.machine_id === machineId) {
        callback(data);
      }
    };
    
    this.subscribers.set(subscriptionId, filteredCallback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriptionId);
    };
  }

  // Subscribe to digital twin updates
  public subscribeDigitalTwin(machineId: string, callback: (data: DigitalTwinData) => void): () => void {
    const subscriptionId = `twin_${machineId}_${Date.now()}`;
    
    const filteredCallback = (data: DigitalTwinData) => {
      if (data.machine_id === machineId) {
        callback(data);
      }
    };
    
    this.digitalTwinSubscribers.set(subscriptionId, filteredCallback);
    
    return () => {
      this.digitalTwinSubscribers.delete(subscriptionId);
    };
  }

  // Get historical sensor data
  public async getHistoricalData(
    machineId: string, 
    sensorType: SensorType,
    startTime: Date,
    endTime: Date
  ): Promise<SensorReading[]> {
    try {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select(`
          *,
          sensor_configurations!inner(type)
        `)
        .eq('machine_id', machineId)
        .eq('sensor_configurations.type', sensorType)
        .gte('timestamp', startTime.toISOString())
        .lte('timestamp', endTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return data?.map(row => ({
        sensor_id: row.sensor_id,
        machine_id: row.machine_id,
        timestamp: new Date(row.timestamp),
        value: row.value,
        unit: row.unit,
        quality: row.quality,
        metadata: row.metadata
      })) || [];

    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      return [];
    }
  }

  // Calculate machine OEE (Overall Equipment Effectiveness)
  public calculateOEE(machineId: string, period: { start: Date; end: Date }): Promise<{
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  }> {
    // Simplified OEE calculation - in production this would be more complex
    return new Promise(resolve => {
      setTimeout(() => {
        const mockOEE = {
          availability: 0.92, // 92%
          performance: 0.95,  // 95%
          quality: 0.98,      // 98%
          oee: 0.92 * 0.95 * 0.98 // 85.7%
        };
        resolve(mockOEE);
      }, 100);
    });
  }

  // Predict maintenance needs using ML
  public async predictMaintenance(machineId: string): Promise<PredictedFailure[]> {
    // In production, this would call ML models running on your IoT platform
    return new Promise(resolve => {
      setTimeout(() => {
        const predictions: PredictedFailure[] = [
          {
            component: 'Motor Bearings',
            probability: 0.78,
            estimated_days: 12,
            recommended_action: 'Schedule bearing replacement',
            confidence: 0.85
          },
          {
            component: 'Hydraulic System',
            probability: 0.23,
            estimated_days: 45,
            recommended_action: 'Monitor hydraulic pressure',
            confidence: 0.65
          }
        ];
        resolve(predictions);
      }, 200);
    });
  }

  // Connection status
  public isConnectedToPlatform(): boolean {
    return this.isConnected;
  }

  // Send command to machine (if supported)
  public sendMachineCommand(machineId: string, command: string, parameters?: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.websocket) {
        reject(new Error('Not connected to IoT platform'));
        return;
      }

      const message = {
        type: 'machine_command',
        payload: {
          machine_id: machineId,
          command,
          parameters,
          timestamp: new Date().toISOString()
        }
      };

      try {
        this.websocket.send(JSON.stringify(message));
        resolve(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Cleanup
  public disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.subscribers.clear();
    this.digitalTwinSubscribers.clear();
  }
}

// Utility functions for IoT data processing
export class IoTDataProcessor {
  // Calculate moving average for smoothing sensor data
  static calculateMovingAverage(values: number[], windowSize: number): number[] {
    const result: number[] = [];
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = values.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(average);
    }
    
    return result;
  }

  // Detect anomalies using statistical methods
  static detectAnomalies(values: number[], threshold: number = 2): number[] {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return values.map((value, index) => {
      const zScore = Math.abs(value - mean) / stdDev;
      return zScore > threshold ? index : -1;
    }).filter(index => index !== -1);
  }

  // Calculate trend (slope) of sensor data
  static calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) increasing++;
      else if (values[i] < values[i - 1]) decreasing++;
    }
    
    const threshold = values.length * 0.6; // 60% of values should follow trend
    
    if (increasing > threshold) return 'increasing';
    if (decreasing > threshold) return 'decreasing';
    return 'stable';
  }

  // Calculate equipment efficiency metrics
  static calculateEfficiency(
    actualOutput: number,
    plannedOutput: number,
    actualTime: number,
    plannedTime: number
  ): number {
    const timeEfficiency = plannedTime / actualTime;
    const outputEfficiency = actualOutput / plannedOutput;
    return Math.min(timeEfficiency * outputEfficiency, 1.0); // Cap at 100%
  }
}

// React hooks for IoT integration  
export const useIoTSensorData = (machineId: string) => {
  const [sensorData, setSensorData] = React.useState<SensorReading[]>([]);
  const [digitalTwinData, setDigitalTwinData] = React.useState<DigitalTwinData | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    const service = new IoTSensorService();
    setIsConnected(service.isConnectedToPlatform());

    // Subscribe to sensor data
    const unsubscribeSensor = service.subscribeMachineData(machineId, (reading) => {
      setSensorData(prev => [...prev.slice(-99), reading]); // Keep last 100 readings
    });

    // Subscribe to digital twin updates
    const unsubscribeTwin = service.subscribeDigitalTwin(machineId, (data) => {
      setDigitalTwinData(data);
    });

    return () => {
      unsubscribeSensor();
      unsubscribeTwin();
      service.disconnect();
    };
  }, [machineId]);

  return {
    sensorData,
    digitalTwinData,
    isConnected
  };
};

// Singleton service instance
export const iotSensorService = new IoTSensorService();

export default iotSensorService;
