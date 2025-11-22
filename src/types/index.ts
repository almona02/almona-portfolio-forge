export * from './product';
export * from './certification';
export * from './machine'; // existing simple Machine (maybe different context)
export * from './fabricator';

// Core types used by Yilmaz machines dataset
export interface PowerSpecification {
  voltage: string; // e.g. '400V'
  frequency: string; // '50Hz'
  phase: string; // '1' | '3'
  consumption: string; // pattern: '<number> kW'
}

export type SafetyStandard = 'TwoHandOperation' | 'AutomaticGuards' | 'EmergencyStop';

export interface Machine {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  specPdf?: string;
  youtubeUrl?: string;
  category: string;
  featured?: boolean;
  releaseDate: string;
  type: string;
  powerSpec: PowerSpecification;
  dimensions?: {
    length?: string;
    width?: string;
    height?: string;
  };
  tags?: string[];
  specifications?: string[];
  certifications?: string[];
  safetyFeatures?: SafetyStandard[];
  egyptianCompliance?: {
    standard?: string;
    certificateNumber?: string;
    issueDate?: string;
  };
  // Optional future fields
  airSpec?: {
    consumption?: string; // e.g. '250 L/min'
    pressure?: string;    // e.g. '6 bar'
  };
}
