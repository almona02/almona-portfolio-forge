/**
 * @file process_truth.ts
 * @description Process Truth Domain
 * 
 * AICS-001 Reference: Section 6.3.4
 * 
 * Defines the required sequences, dependencies, and timing of fabrication operations.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export interface ProcessTruth {
  version: string;
  schema: ProcessSchema;
  validationRules: ProcessValidationRule[];
  provenance: ProcessProvenance;
  aics001Reference: 'AICS-001 Section 6.3.4';
}

export interface ProcessSchema {
  processId: string;
  name: string;
  sequence: ProcessStep[];
  dependencies: ProcessDependency[];
  timing: ProcessTiming;
  requirements: ProcessRequirements;
}

export interface ProcessStep {
  stepId: string;
  order: number;
  name: string;
  type: 'cutting' | 'machining' | 'assembly' | 'inspection' | 'finishing';
  duration: number; // minutes
  required: boolean;
  parallelizable: boolean;
}

export interface ProcessDependency {
  from: string; // Step ID
  to: string; // Step ID
  type: 'sequential' | 'parallel' | 'conditional';
  condition?: string;
}

export interface ProcessTiming {
  estimatedTotal: number; // minutes
  criticalPath: string[]; // Step IDs
  bufferTime: number; // minutes
}

export interface ProcessRequirements {
  materials: string[]; // Material IDs
  tools: string[]; // Tool IDs
  machines: string[]; // Machine IDs
  operators: number;
  certifications?: string[];
}

export interface ProcessValidationRule {
  ruleId: string;
  description: string;
  deterministic: boolean;
  source: 'AICS-001' | 'Engineering Standard' | 'Workshop';
  constraint: (process: ProcessSchema) => boolean;
}

export interface ProcessProvenance {
  source: 'Engineering' | 'Workshop' | 'Standard';
  timestamp: Date;
  validator: string;
  reference?: string;
}

