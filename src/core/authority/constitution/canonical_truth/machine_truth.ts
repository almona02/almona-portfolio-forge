/**
 * @file machine_truth.ts
 * @description Machine Truth Domain
 * 
 * AICS-001 Reference: Section 6.3.3
 * 
 * Defines the operational capabilities and limitations of fabrication equipment.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export interface MachineTruth {
  version: string;
  schema: MachineSchema;
  validationRules: MachineValidationRule[];
  provenance: MachineProvenance;
  aics001Reference: 'AICS-001 Section 6.3.3';
}

export interface MachineSchema {
  machineId: string;
  name: string;
  manufacturer: string;
  model: string;
  capabilities: MachineCapabilities;
  limitations: MachineLimitations;
  configuration: MachineConfiguration;
}

export interface MachineCapabilities {
  maxWidth: number; // mm
  maxHeight: number; // mm
  maxDepth: number; // mm
  cuttingSpeed: {
    min: number; // mm/min
    max: number; // mm/min
  };
  toolTypes: string[];
  precision: number; // mm
}

export interface MachineLimitations {
  minCutLength: number; // mm
  maxCutLength: number; // mm
  minCornerRadius: number; // mm
  materialRestrictions: string[];
  safetyConstraints: string[];
}

export interface MachineConfiguration {
  tooling: ToolConfiguration[];
  calibration: CalibrationData;
  maintenance: MaintenanceStatus;
}

export interface ToolConfiguration {
  toolId: string;
  type: string;
  diameter: number; // mm
  length: number; // mm
  status: 'active' | 'maintenance' | 'retired';
}

export interface CalibrationData {
  lastCalibrated: Date;
  calibrationAccuracy: number; // mm
  calibrationCert: string;
}

export interface MaintenanceStatus {
  lastMaintenance: Date;
  nextMaintenance: Date;
  status: 'operational' | 'maintenance_required' | 'out_of_service';
}

export interface MachineValidationRule {
  ruleId: string;
  description: string;
  deterministic: boolean;
  source: 'AICS-001' | 'Manufacturer' | 'Workshop';
  constraint: (machine: MachineSchema, input: unknown) => boolean;
}

export interface MachineProvenance {
  source: 'Manufacturer' | 'Workshop' | 'Calibration';
  timestamp: Date;
  validator: string;
  certification?: string;
}

