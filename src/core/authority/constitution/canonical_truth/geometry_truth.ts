/**
 * @file geometry_truth.ts
 * @description Geometry Truth Domain
 * 
 * AICS-001 Reference: Section 6.3.1
 * 
 * Defines the authoritative representation of physical shapes,
 * dimensions, and spatial relationships.
 * 
 * Key Principle: "Geometry is exact, not approximate" (AICS-001)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export interface GeometryTruth {
  version: string;
  schema: GeometrySchema;
  validationRules: GeometryValidationRule[];
  provenance: GeometryProvenance;
  
  // Key principle: "Units are explicit and immutable"
  units: 'mm' | 'inch' | 'cm';
  precision: number; // e.g., 0.01mm
  
  // Reference to canonical spec
  aics001Reference: 'AICS-001 Section 6.3.1';
}

export interface GeometrySchema {
  // Formal schema based on AICS-001
  points: PointDefinition[];
  vectors: VectorDefinition[];
  edges: EdgeDefinition[];
  faces: FaceDefinition[];
  referenceFrames: ReferenceFrame[];
}

export interface PointDefinition {
  id: string;
  coordinates: [number, number, number];
  units: 'mm' | 'inch' | 'cm';
  precision: number;
}

export interface VectorDefinition {
  id: string;
  from: string; // Point ID
  to: string; // Point ID
  magnitude: number;
  direction: [number, number, number];
}

export interface EdgeDefinition {
  id: string;
  start: string; // Point ID
  end: string; // Point ID
  type: 'line' | 'arc' | 'curve';
  parameters?: Record<string, number>;
}

export interface FaceDefinition {
  id: string;
  edges: string[]; // Edge IDs
  normal: [number, number, number];
  area: number;
}

export interface ReferenceFrame {
  id: string;
  origin: string; // Point ID
  axes: {
    x: [number, number, number];
    y: [number, number, number];
    z: [number, number, number];
  };
}

export interface GeometryValidationRule {
  ruleId: string;
  description: string;
  deterministic: boolean; // AICS-001: "Deterministic constraints are non-negotiable"
  source: 'AICS-001' | 'Engineering Standard' | 'Machine Limit';
  validationFn?: (geometry: GeometrySchema) => boolean;
}

export interface GeometryProvenance {
  source: 'DXF' | 'DWG' | 'Archetype' | 'Manual';
  timestamp: Date;
  validator: string;
  sourceFile?: string;
  sourceHash?: string; // Cryptographic hash of source
}

