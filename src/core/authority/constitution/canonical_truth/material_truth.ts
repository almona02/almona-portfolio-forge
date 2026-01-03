/**
 * @file material_truth.ts
 * @description Material Truth Domain
 * 
 * AICS-001 Reference: Section 6.3.2
 * 
 * Defines the certified properties and behaviors of physical materials.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export interface MaterialTruth {
  version: string;
  schema: MaterialSchema;
  validationRules: MaterialValidationRule[];
  provenance: MaterialProvenance;
  aics001Reference: 'AICS-001 Section 6.3.2';
}

export interface MaterialSchema {
  materialId: string;
  name: string;
  type: 'aluminum' | 'upvc' | 'steel' | 'composite' | 'other';
  properties: MaterialProperties;
  specifications: MaterialSpecifications;
}

export interface MaterialProperties {
  density: number; // kg/m³
  thermalExpansion: number; // mm/(m·K)
  strength: {
    tensile: number; // MPa
    yield: number; // MPa
  };
  modulus: {
    elastic: number; // GPa
    shear: number; // GPa
  };
}

export interface MaterialSpecifications {
  standard: string; // e.g., "EN 755", "ASTM B221"
  grade: string;
  certification: string[];
  compliance: string[]; // e.g., ["Egyptian Standards", "GCC Standards"]
}

export interface MaterialValidationRule {
  ruleId: string;
  description: string;
  deterministic: boolean;
  source: 'AICS-001' | 'Material Standard' | 'Regulatory';
  property: keyof MaterialProperties | keyof MaterialSpecifications;
  constraint: (value: unknown) => boolean;
}

export interface MaterialProvenance {
  source: 'Manufacturer' | 'Standard' | 'Testing' | 'Workshop';
  timestamp: Date;
  validator: string;
  certification?: string; // Certification document reference
}

