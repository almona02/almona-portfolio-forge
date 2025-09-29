export interface SensorData {
  type: 'vibration' | 'temperature' | 'acoustic' | 'pressure' | 'current';
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'alert';
  trend: 'stable' | 'increasing' | 'decreasing';
  timestamp: Date;
}

export interface VibrationAnalysis {
  rms: number;        // Root Mean Square - Overall vibration energy
  peak: number;       // Maximum amplitude - Impact detection
  kurtosis: number;   // Sharpness of peaks - Bearing defects (normal: 3, >4 indicates issues)
  frequencyDomain: {
    lowBand: number;  // 0-100 Hz - Imbalance
    midBand: number;  // 100-1000 Hz - Misalignment  
    highBand: number; // 1000+ Hz - Bearing defects
  };
}

export interface ThermalAnalysis {
  bearingTemperatures: number[];
  motorTemperature: number;
  ambientTemperature: number;
  rateOfRise: number; // °C per hour
  hotspots: string[];
}

export interface RULPrediction {
  currentHealth: number; // 0-100%
  degradationRate: number; // % per hour
  predictedFailure: Date;
  confidence: number; // 0-100%
  failureMode: 'bearing' | 'belt' | 'alignment' | 'electrical' | 'blade_wear';
  recommendedActions: string[];
}

export interface CuttingMachine {
  id: string;
  name: string;
  type: 'single_head' | 'double_head' | 'cnc_cutting';
  status: 'optimal' | 'degraded' | 'maintenance_required' | 'critical';
  healthScore: number;
  sensorData: SensorData[];
  vibrationAnalysis: VibrationAnalysis;
  thermalAnalysis: ThermalAnalysis;
  rulPrediction: RULPrediction;
  operationalHours: number;
  lastMaintenance: Date;
  nextScheduled: Date;
}

export interface MillingMachine {
  id: string;
  name: string;
  type: 'vertical_router' | 'end_mill' | 'processing_center';
  status: 'optimal' | 'degraded' | 'maintenance_required' | 'critical';
  healthScore: number;
  spindleHealth: number;
  toolWear: number;
  sensorData: SensorData[];
  vibrationAnalysis: VibrationAnalysis;
  thermalAnalysis: ThermalAnalysis;
  rulPrediction: RULPrediction;
}

export interface PredictiveAlert {
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
  timestamp: Date;
}

export interface MaintenanceRule {
  parameter: string;
  warning: string;
  alert: string;
  critical: string;
  action: string;
}

export interface ROICalculation {
  traditionalDowntime: number; // hours/year
  predictiveDowntime: number; // hours/year
  downtimeCost: number; // $/hour
  implementationCost: number;
  annualSavings: number;
  roiPercentage: number;
  paybackPeriod: number; // years
}


