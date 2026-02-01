/**
 * ALMONA ENGINEERING TYPES
 * 
 * Definitions for Structural and Thermal Analysis interoperability.
 * Tier: Gold (Precision Engineering)
 */

export interface StructuralNode {
  id: string;
  x: number;
  y: number;
  z: number;
  // restraints: [tx, ty, tz, rx, ry, rz] (0=free, 1=fixed)
  restraints?: [0|1, 0|1, 0|1, 0|1, 0|1, 0|1]; 
}

export interface StructuralSection {
  id: string;
  name: string;
  area: number; // mm2
  ix: number;   // mm4 (Strong axis)
  iy: number;   // mm4 (Weak axis)
  materialId: string;
}

export interface StructuralMaterial {
  id: string;
  name: string;
  E: number; // Modulus of Elasticity (MPa)
  fy?: number; // Yield Strength (MPa)
  density?: number; // kg/m3
}

export interface StructuralElement {
  id: string;
  type: 'beam' | 'column' | 'truss';
  startNodeId: string;
  endNodeId: string;
  sectionId: string;
  rotation?: number; // degrees
}

export interface StructuralLoad {
  id: string;
  type: 'distributed' | 'point';
  elementId?: string; // for distributed
  nodeId?: string;    // for point
  magnitude: number;  // N/mm or N
  direction: 'x' | 'y' | 'z';
}

export interface StructuralModel {
  projectId: string;
  version: string;
  units: 'mm' | 'm' | 'inch';
  nodes: StructuralNode[];
  materials: StructuralMaterial[];
  sections: StructuralSection[];
  elements: StructuralElement[];
  loads: StructuralLoad[];
}
