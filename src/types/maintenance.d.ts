interface Dealer {
  name: string;
  location: string;
  phone: string;
  address: string;
  partsAvailable?: string[];
  distance?: number; // in km
}

interface MachineDiagnosis {
  timestamp: Date;
  audioDiagnosis: string;
  vibrationDiagnosis: string;
  hasFault: boolean;
  recommendedActions: string[];
  dealers: Dealer[];
}

interface VibrationData {
  x: number | null;
  y: number | null;
  z: number | null;
  timestamp: number;
}

interface AudioAnalysisResult {
  isFaulty: boolean;
  confidence: number;
  faultType?: 'blade' | 'bearing' | 'motor' | 'other';
  frequencyPeaks?: number[];
}

declare module '*.json' {
  const value: {
    modelTopology?: object;
    weightsManifest?: object[];
    [key: string]: unknown;
  };
  export default value;
}
