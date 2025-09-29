import { CuttingMachine, MillingMachine, MaintenanceRule, ROICalculation, PredictiveAlert } from './types';
import { PredictiveAlgorithms } from './algorithms';

export const maintenanceRules: MaintenanceRule[] = [
  {
    parameter: 'Vibration RMS',
    warning: '>2.5 mm/s',
    alert: '>4.0 mm/s',
    critical: '>6.0 mm/s',
    action: 'Check bearings and alignment',
  },
  {
    parameter: 'Bearing Temperature',
    warning: '>70°C',
    alert: '>80°C',
    critical: '>90°C',
    action: 'Check lubrication and cooling',
  },
  {
    parameter: 'Spindle Runout',
    warning: '>0.02 mm',
    alert: '>0.05 mm',
    critical: '>0.10 mm',
    action: 'Inspect spindle bearings',
  },
  {
    parameter: 'Acoustic Noise',
    warning: '>75 dB',
    alert: '>85 dB',
    critical: '>95 dB',
    action: 'Check for impacts or cavitation',
  },
];

export const calculateROI = (downtimeCost: number = 1000): ROICalculation => {
  const traditionalDowntime = 120; // hours/year
  const predictiveDowntime = 24; // hours/year
  const implementationCost = 50000; // $50k implementation

  const annualSavings = (traditionalDowntime - predictiveDowntime) * downtimeCost;
  const roiPercentage = ((annualSavings - implementationCost) / implementationCost) * 100;
  const paybackPeriod = implementationCost / annualSavings;

  return {
    traditionalDowntime,
    predictiveDowntime,
    downtimeCost,
    implementationCost,
    annualSavings,
    roiPercentage,
    paybackPeriod,
  };
};

export const generateMockCuttingMachines = (): CuttingMachine[] => {
  const vibrationData = Array.from({ length: 1000 }, () => Math.random() * 3 + 1); // 1-4 mm/s
  const vibrationAnalysis = PredictiveAlgorithms.analyzeVibration(vibrationData);

  return [
    {
      id: 'YM-CUT-5000',
      name: 'YILMAZ Double Head Cutting Machine',
      type: 'double_head',
      status: 'degraded',
      healthScore: 67,
      sensorData: [
        { type: 'vibration', value: 4.2, unit: 'mm/s', status: 'warning', trend: 'increasing', timestamp: new Date() },
        { type: 'temperature', value: 68, unit: '°C', status: 'normal', trend: 'stable', timestamp: new Date() },
        { type: 'current', value: 42, unit: 'A', status: 'warning', trend: 'increasing', timestamp: new Date() },
      ],
      vibrationAnalysis,
      thermalAnalysis: {
        bearingTemperatures: [65, 68, 72],
        motorTemperature: 75,
        ambientTemperature: 25,
        rateOfRise: 2.5,
        hotspots: ['front_bearing', 'main_motor'],
      },
      rulPrediction: PredictiveAlgorithms.predictRUL(vibrationAnalysis, 68, 2840),
      operationalHours: 2840,
      lastMaintenance: new Date('2024-01-15'),
      nextScheduled: new Date('2024-02-10'),
    },
  ];
};

export const generateMockMillingMachines = (): MillingMachine[] => {
  const vibrationData = Array.from({ length: 1000 }, () => Math.random() * 2 + 0.5); // 0.5-2.5 mm/s
  const vibrationAnalysis = PredictiveAlgorithms.analyzeVibration(vibrationData);

  return [
    {
      id: 'YM-MILL-3000',
      name: 'Vertical Copy Router',
      type: 'vertical_router',
      status: 'optimal',
      healthScore: 92,
      spindleHealth: 95,
      toolWear: 15,
      sensorData: [
        { type: 'vibration', value: 1.8, unit: 'mm/s', status: 'normal', trend: 'stable', timestamp: new Date() },
        { type: 'temperature', value: 55, unit: '°C', status: 'normal', trend: 'stable', timestamp: new Date() },
        { type: 'acoustic', value: 72, unit: 'dB', status: 'normal', trend: 'stable', timestamp: new Date() },
      ],
      vibrationAnalysis,
      thermalAnalysis: {
        bearingTemperatures: [52, 55, 58],
        motorTemperature: 62,
        ambientTemperature: 24,
        rateOfRise: 0.8,
        hotspots: [],
      },
      rulPrediction: PredictiveAlgorithms.predictRUL(vibrationAnalysis, 55, 1560),
    },
  ];
};

export const generatePredictiveAlerts = (): PredictiveAlert[] => [
  {
    id: '1',
    machineId: 'YM-CUT-5000',
    machineName: 'YILMAZ Double Head Cutting Machine',
    severity: 'high',
    component: 'Main Spindle Bearings',
    issue: 'Increased vibration patterns detected with high-frequency components indicating early bearing failure',
    predictedFailureDate: '2024-02-15',
    confidence: 87,
    recommendedActions: [
      'Schedule bearing replacement within 2 weeks',
      'Monitor vibration levels daily',
      'Check lubrication system for contamination',
      'Verify alignment after replacement',
    ],
    sensorsInvolved: ['vibration', 'acoustic', 'temperature'],
    timestamp: new Date(),
  },
  {
    id: '2',
    machineId: 'YM-MILL-3000',
    machineName: 'Vertical Copy Router',
    severity: 'medium',
    component: 'Tool Changer Mechanism',
    issue: 'Alignment drift detected in automatic tool changer, affecting positioning accuracy',
    predictedFailureDate: '2024-03-01',
    confidence: 72,
    recommendedActions: [
      'Calibrate tool changer alignment',
      'Inspect pneumatic actuators for wear',
      'Verify positioning sensors accuracy',
      'Check mechanical stops and limits',
    ],
    sensorsInvolved: ['position', 'pressure', 'current'],
    timestamp: new Date(),
  },
];


