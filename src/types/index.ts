export * from './certification';
export * from './fabricator';
export * from './machine'; // existing simple Machine (maybe different context)
export * from './product';

// Core types used by Yilmaz machines dataset
export interface PowerSpecification {
  voltage: string; // e.g. '400V'
  frequency: string; // '50Hz'
  phase: string; // '1' | '3'
  consumption: string; // pattern: '<number> kW'
  amperage?: string; // e.g. '25A'
}

export type SafetyStandard = 
  | 'TwoHandOperation' 
  | 'AutomaticGuards' 
  | 'EmergencyStop'
  | 'LowPressureControl'
  | 'SafetyFence'
  | 'AutoClosingGuards'
  | 'PressureControlValves'
  | 'PhaseControl'
  | 'ProfileLiftingSystem'
  | 'ElectronicBraking'
  | 'PneumaticBraking'
  | 'OperatorSafetyBarrier';

export interface Machine {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  specPdf?: string;
  youtubeUrl?: string;
  modelPath?: string;
  has3DModel?: boolean;
  category: string;
  subcategory?: string; // e.g., "copy-routers", "end-milling", "cnc-routers"
  featured?: boolean;
  releaseDate: string;
  type: string;
  powerSpec: PowerSpecification;
  airSpec?: {
    consumption?: string; // e.g. '24 L/min'
    pressure?: string;    // e.g. '6-8 bar'
  };
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
  };
  weight?: {
    net?: string;   // e.g. '328 kg'
    gross?: string; // e.g. '373 kg'
  };
  workingCapacity?: {
    x1?: string;
    x2?: string;
    y1?: string;
    y2?: string;
    z1?: string;
    z2?: string;
  };
  spindleSpeed?: string;  // e.g. '12,000 RPM'
  spindlePower?: string;  // e.g. '2.2 kW'
  cutterBits?: string;    // e.g. '2x Ø10xL100mm / Ø5xL100mm'
  toolCollet?: string;    // e.g. 'ER 16'
  clampingCapacity?: {
    widthMax?: string;
    widthMin?: string;
    heightMax?: string;
    heightMin?: string;
    lengthMax?: string;
    lengthMin?: string;
  };
  sawBlade?: {
    diameter?: string;
    bore?: string;
    speed?: string;
    motorPower?: string;
  };
  cuttingCapacity?: {
    maxLength5m?: string;
    maxLength7m?: string;
    at90deg?: string;
    at45degInward?: string;
    at45degOutward?: string;
    minLength?: string;
    maxWidth90?: string;
    maxWidth45?: string;
  };
  angularCapacity?: {
    tilting?: string;
    pivotingInward?: string;
    pivotingOutward?: string;
    compound?: string;
    presetAngles?: string;
  };
  weldingCapacity?: {
    heightMax?: string;
    heightMin?: string;
    widthMax?: string;
    widthMin?: string;
    angleRange?: string;
  };
  millingCapacity?: {
    widthMax?: string;
    heightMax?: string;
  };
  temperatureRange?: string;
  weldingOptions?: string;
  cncAxes?: number;
  millingMotors?: number;
  tripleHoleMotor?: number;
  processingCapacity?: string;
  profileCapacity?: {
    minLength?: string;
    maxLength?: string;
    minProfile?: string;
    maxProfile?: string;
    loadingCapacity?: string;
  };
  axisSpeed?: string;
  infeedSpeed?: string;
  cleaningTools?: number;
  frameCapacity?: {
    maxFrame?: string;
    minFrame?: string;
    maxRobotFrame?: string;
    maxCleaningFrame?: string;
  };
  tags?: string[];
  specifications?: string[];
  standardAccessories?: string[];
  optionalAccessories?: string[];
  certifications?: string[];
  safetyFeatures?: SafetyStandard[];
  egyptianCompliance?: {
    standard?: string;
    certificateNumber?: string;
    issueDate?: string;
  };
}
