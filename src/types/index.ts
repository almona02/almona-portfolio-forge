// Strict voltage types for Egyptian market
export type Voltage = '230V' | '400V' | '220V' | '380V';

// Power consumption with strict typing
export type PowerRating = `${number} kW` | `${number}.${number} kW` | `${string} kW`;

// Egyptian and international certifications
export type Certification = 
  | 'CE' 
  | 'ISO9001' 
  | 'ISO14001'
  | 'ES1109' // Egyptian Industrial Standard
  | 'EOS' // Egyptian Organization for Standardization
  | 'NTRA' // National Telecom Regulatory Authority (Egypt)
  | 'IEC' // International Electrotechnical Commission
  | 'ANSI';

// Machine categories with Egyptian market focus
export type MachineCategory = 
  | 'cutting-machines'
  | 'welding-machines'
  | 'processing-centers'
  | 'fabrication-equipment'
  | 'accessories';

// Safety standards for Egyptian industrial zones
export type SafetyStandard = 
  | 'TwoHandOperation'
  | 'AutomaticGuards'
  | 'EmergencyStop'
  | 'LightCurtains'
  | 'PneumaticSafety';

// Egyptian governorates for logistics
export type EgyptianGovernorate = 
  | 'Cairo'
  | 'Alexandria'
  | 'Giza'
  | 'Qalyubia'
  | 'Port Said'
  | 'Suez'
  | 'Luxor'
  | 'Aswan'
  | 'Red Sea'
  | 'Beheira'
  | 'Gharbia'
  | 'Kafr el-Sheikh'
  | 'Dakahlia'
  | 'Damietta'
  | 'Sharqia'
  | 'Ismailia'
  | 'Fayoum'
  | 'Beni Suef'
  | 'Minya'
  | 'Asyut'
  | 'Sohag'
  | 'Qena'
  | 'North Sinai'
  | 'South Sinai'
  | 'New Valley'
  | 'Matrouh';

// Power specifications with Egyptian electrical standards
export interface PowerSpecification {
  voltage: Voltage;
  frequency: '50Hz' | '60Hz';
  phase: '1' | '3';
  consumption: PowerRating;
  amperage?: `${number}A`;
}

// Enhanced Machine interface with strict typing
export interface Machine {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: MachineCategory;
  featured?: boolean;
  releaseDate: string;
  tags?: string[];
  
  // Strict typed specifications
  type: string;
  powerSpec: PowerSpecification;
  dimensions: {
    length: `${number}mm` | `${number}m`;
    width: `${number}mm` | `${number}m`;
    height: `${number}mm` | `${number}m`;
    weight?: `${number}kg` | `${number}t`;
  };
  
  specifications: string[];
  certifications?: Certification[];
  safetyFeatures?: SafetyStandard[];
  
  // Optional media
  specPdf?: string;
  youtubeUrl?: string;
  
  // Egyptian market specific
  egyptianCompliance?: {
    standard: 'ES1109' | 'EOS';
    certificateNumber?: string;
    issueDate?: string;
  };
  
  // Pricing for Egyptian market
  pricing?: {
    currency: 'EGP' | 'USD' | 'EUR';
    basePrice?: number;
    installationCost?: number;
    warrantyYears?: number;
  };
}

// Enhanced Product interface
export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  featured?: boolean;
  releaseDate: string;
  tags?: string[];
}

// Part interface with compatibility tracking
export interface Part extends Product {
  partNumber: string;
  compatibility: string[];
  specifications: string[];
  material?: string;
  weight?: `${number}g` | `${number}kg`;
  warranty?: `${number} months` | `${number} years`;
}

// Profile interface for ALFAPEN products
export interface Profile extends Product {
  material: 'UPVC' | 'Aluminum' | 'Steel';
  color: string;
  applications: string[];
  thermalProperties?: {
    uValue?: `${number} W/m²K`;
    thermalBreak?: boolean;
  };
  dimensions?: {
    width?: `${number}mm`;
    height?: `${number}mm`;
    thickness?: `${number}mm`;
  };
}

// Logistics and shipping types for Egyptian market
export interface ShippingOption {
  method: 'NileRiver' | 'RedSeaPort' | 'LandTransport' | 'AirFreight';
  from: EgyptianGovernorate;
  to: EgyptianGovernorate;
  estimatedDays: number;
  cost: {
    amount: number;
    currency: 'EGP';
  };
  tracking?: boolean;
}

// Service request types
export interface ServiceRequest {
  id: string;
  machineId: string;
  type: 'maintenance' | 'repair' | 'installation' | 'training';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  governorate: EgyptianGovernorate;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed';
  createdAt: string;
  estimatedCompletion?: string;
}

// Maintenance and diagnostic types
export interface Dealer {
  name: string;
  location: string;
  phone: string;
  address: string;
  partsAvailable?: string[];
  distance?: number; // in km
}

export interface MachineDiagnosis {
  timestamp: Date;
  audioDiagnosis: string;
  vibrationDiagnosis: string;
  hasFault: boolean;
  recommendedActions: string[];
  dealers: Dealer[];
}

export interface VibrationData {
  x: number | null;
  y: number | null;
  z: number | null;
  timestamp: number;
}

export interface AudioAnalysisResult {

  isFaulty: boolean;

  confidence: number;

  faultType?: 'blade' | 'bearing' | 'motor' | 'other';

  frequencyPeaks?: number[];

}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'technician' | 'admin';
  company?: string;
  phone?: string;
  machines: string[]; // Array of machine IDs
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  machineId?: string; // Link to specific machine
  userId: string; // Link to user
  createdAt: string;
  updatedAt: string;
  attachments?: string[];
}
