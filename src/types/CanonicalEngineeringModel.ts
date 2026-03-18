// src/types/CanonicalEngineeringModel.ts
/**
 * Canonical Engineering Model - The Single Source of Truth
 * 
 * This is the "Esperanto" that both Wizard and CAD entry modalities must speak.
 * All design tools converge to this model before optimization.
 * 
 * Architectural Principle: Entry-agnostic execution
 * - Wizard creates this directly
 * - CAD converts to this via dataConverters
 * - Optimization consumes this exclusively
 */

import type { WindowUnit } from './fabricator';

export interface CanonicalEngineeringModel {
  // Unique identifier
  id: string;
  
  // Project metadata
  orderNumber: string;
  posNumber?: string;
  customer?: string;
  
  // Geometry (Wizard + CAD converge here)
  geometry: {
    overallWidth: number;
    overallHeight: number;
    
    // Components: Frames, Sashes, Mullions, Transoms
    components: WindowComponent[];
    
    // Grid definition (for wizard mode compatibility)
    grid?: WindowGrid;
    
    // Shape definitions (for CAD mode preservation)
    shapes?: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      dimensions: { width: number; height: number };
      properties?: Record<string, unknown>;
    }>;
  };
  
  // Materials
  materials: {
    // System pack (e.g., 'ALM-9600', 'UPVC-70')
    systemPack: string;
    
    // Profile assignments
    profiles: Array<{
      componentId: string;
      profileId: string;
      profileName: string;
      length: number;
      quantity: number;
    }>;
    
    // Glass specifications
    glass: Array<{
      componentId: string;
      type: string;
      thickness: number;
      area: number;
      weight?: number;
    }>;
    
    // Hardware assignments
    hardware: Array<{
      componentId: string;
      hardwareId: string;
      hardwareName: string;
      quantity: number;
      position?: string;
    }>;
    
    // Accessories
    accessories?: Array<{
      id: string;
      name: string;
      quantity: number;
    }>;
  };
  
  // Metadata (tracks origin and lifecycle)
  metadata: {
    // Entry modality: how this model was created
    entryMode: 'measurement' | 'drafting' | 'import';
    
    // Timestamps
    createdAt: string;
    modifiedAt: string;
    
    // Version for migration compatibility
    version: string;
    
    // User context
    userId?: string;
    projectName?: string;
    
    // Origin snapshot (for reversible conversions)
    originSnapshot?: {
      // Preserve original wizard data
      wizardData?: Partial<WindowUnit>;
      
      // Preserve original CAD data
      draftingData?: {
        shapes: unknown[];
        canvas: unknown;
        templates?: string[];
      };
    };
  };
  
  // Constitutional Compliance (Tier 3 Protected Determinism)
  constitutional: {
    tier: 'Tier 3 Protected Determinism';
    deterministic: true;
    disclaimer: string;
    
    // Audit trail for compliance
    auditTrail: Array<{
      timestamp: string;
      action: string;
      ruleId?: string;
      userId?: string;
      data?: unknown;
    }>;
    
    // Validation status
    validated?: boolean;
    validationErrors?: string[];
  };
  
  // Optimization results (populated after optimization step)
  optimization?: {
    cuttingPlan: unknown;
    materialCost: number;
    wastePercentage: number;
    optimizationAlgorithm: string;
    timestamp: string;
  };
  
  // Production data (populated after production step)
  production?: {
    gcode?: string;
    machineInstructions?: unknown;
    estimatedTime?: number;
    status?: 'pending' | 'in-progress' | 'completed';
  };
}

/**
 * Type guard to check if a model is canonical
 */
export function isCanonicalEngineeringModel(obj: unknown): obj is CanonicalEngineeringModel {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    o.geometry &&
    typeof (o.geometry as Record<string, unknown>).overallWidth === 'number' &&
    typeof (o.geometry as Record<string, unknown>).overallHeight === 'number' &&
    Array.isArray((o.geometry as Record<string, unknown>).components) &&
    o.materials &&
    typeof (o.materials as Record<string, unknown>).systemPack === 'string' &&
    o.metadata &&
    ['measurement', 'drafting', 'import'].includes((o.metadata as Record<string, unknown>).entryMode as string) &&
    o.constitutional &&
    (o.constitutional as Record<string, unknown>).tier === 'Tier 3 Protected Determinism'
  );
}

/**
 * Create a new canonical model with defaults
 */
export function createCanonicalModel(
  entryMode: 'measurement' | 'drafting' | 'import'
): CanonicalEngineeringModel {
  return {
    id: `POSE-${Date.now()}`,
    orderNumber: `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
    geometry: {
      overallWidth: 0,
      overallHeight: 0,
      components: [],
    },
    materials: {
      systemPack: 'default',
      profiles: [],
      glass: [],
      hardware: [],
    },
    metadata: {
      entryMode,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    constitutional: {
      tier: 'Tier 3 Protected Determinism',
      deterministic: true,
      disclaimer: 'Manufacturable instructions only. No AI in execution path.',
      auditTrail: [{
        timestamp: new Date().toISOString(),
        action: 'model_created',
        data: { entryMode },
      }],
    },
  };
}
