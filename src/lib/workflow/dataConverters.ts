// src/lib/workflow/dataConverters.ts
/**
 * Data Converters - Translation Layer Between Entry Modalities
 * 
 * These converters bridge the gap between different entry modalities
 * and the canonical engineering model.
 * 
 * Conversion Philosophy:
 * - Wizard → Canonical: Nearly 1:1 (wizard already speaks canonical)
 * - CAD → Canonical: Complex (must infer grid from shapes)
 * - Canonical → CAD: Preserve fidelity via originSnapshot
 */

import type { DraftingOutput } from '@/components/fabricator/drafting/types/drafting';
import type { CanonicalEngineeringModel } from '@/types/CanonicalEngineeringModel';
import type { WindowUnit } from '@/types/fabricator';

/**
 * Convert Wizard (SmartMeasuringInterface) output to Canonical Model
 * 
 * This is the easy conversion - wizard already produces structured data
 */
export function wizardToCanonical(unit: WindowUnit): CanonicalEngineeringModel {
  return {
    id: unit.id,
    orderNumber: unit.orderNumber || `ORD-${Date.now()}`,
    posNumber: unit.posNumber,
    customer: unit.customer,
    
    geometry: {
      overallWidth: typeof unit.overallWidth === 'number' 
        ? unit.overallWidth 
        : parseFloat(String(unit.overallWidth)),
      overallHeight: typeof unit.overallHeight === 'number'
        ? unit.overallHeight
        : parseFloat(String(unit.overallHeight)),
      components: unit.components || [],
      grid: unit.grid,
    },
    
    materials: {
      systemPack: unit.systemPackId || 'default',
      profiles: [], // Will be populated from components
      glass: (unit.glazing ? [unit.glazing] : []).map((g: any) => ({
        componentId: g.componentId || '',
        type: g.type || 'standard',
        thickness: g.thickness || 4,
        area: g.area || 0,
        weight: g.weight,
      })),
      hardware: (unit.hardware || []).map((h: any) => ({
        componentId: h.componentId || '',
        hardwareId: h.id || '',
        hardwareName: h.name || '',
        quantity: h.quantity || 1,
        position: h.position,
      })),
      accessories: [],
    },
    
    metadata: {
      entryMode: 'measurement',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: '1.0.0',
      userId: undefined,
      projectName: undefined,
      originSnapshot: {
        wizardData: unit,
      },
    },
    
    constitutional: {
      tier: 'Tier 3 Protected Determinism',
      deterministic: true,
      disclaimer: 'Manufacturable instructions only. No AI in execution path.',
      auditTrail: [{
        timestamp: new Date().toISOString(),
        action: 'wizard_to_canonical_conversion',
        data: { sourceId: unit.id },
      }],
    },
  };
}

/**
 * Convert CAD (DraftingWorkbench) output to Canonical Model
 * 
 * This is the complex conversion - must infer semantic structure from shapes
 */
export function cadToCanonical(drafting: DraftingOutput): CanonicalEngineeringModel {
  // DraftingOutput has: template, windowUnit, validationResult, timestamp
  // Note: windowUnit is not in the official DraftingOutput type but may be present at runtime
  // This is a temporary workaround until we update the DraftingOutput interface
  const windowUnit = (drafting as any).windowUnit;
  
  if (!windowUnit) {
    // Fallback: create minimal canonical model
    return {
      id: `POSE-${Date.now()}`,
      orderNumber: `ORD-${Date.now()}`,
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
        entryMode: 'drafting',
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
          action: 'cad_to_canonical_conversion',
          data: { note: 'No windowUnit available' },
        }],
      },
    };
  }
  
  return {
    id: windowUnit.id,
    orderNumber: windowUnit.orderNumber || `ORD-${Date.now()}`,
    
    geometry: {
      overallWidth: typeof windowUnit.overallWidth === 'number'
        ? windowUnit.overallWidth
        : parseFloat(String(windowUnit.overallWidth)),
      overallHeight: typeof windowUnit.overallHeight === 'number'
        ? windowUnit.overallHeight
        : parseFloat(String(windowUnit.overallHeight)),
      components: windowUnit.components || [],
    },
    
    materials: {
      systemPack: windowUnit.systemPackId || 'default',
      profiles: [],
      glass: windowUnit.glazing ? [windowUnit.glazing].map((g: any) => ({
        componentId: g.componentId || '',
        type: g.type || 'standard',
        thickness: g.thickness || 4,
        area: 0,
      })) : [],
      hardware: (windowUnit.hardware || []).map((h: any) => ({
        componentId: h.componentId || '',
        hardwareId: h.id || '',
        hardwareName: h.name || '',
        quantity: h.quantity || 1,
      })),
    },
    
    metadata: {
      entryMode: 'drafting',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: '1.0.0',
      originSnapshot: {
        draftingData: {
          shapes: [],
          canvas: {},
          templates: drafting.template ? [String(drafting.template)] : [],
        },
      },
    },
    
    constitutional: {
      tier: 'Tier 3 Protected Determinism',
      deterministic: true,
      disclaimer: 'Manufacturable instructions only. No AI in execution path.',
      auditTrail: [{
        timestamp: new Date().toISOString(),
        action: 'cad_to_canonical_conversion',
        data: { sourceId: windowUnit.id },
      }],
    },
  };
}

/**
 * Convert Canonical Model back to Wizard format
 * 
 * Used when user switches from CAD to Wizard mode
 */
export function canonicalToWizard(canonical: CanonicalEngineeringModel): WindowUnit {
  // If we have the original wizard data, use it
  if (canonical.metadata.originSnapshot?.wizardData) {
    return canonical.metadata.originSnapshot.wizardData as WindowUnit;
  }
  
  // Otherwise, reconstruct from canonical
  return {
    id: canonical.id,
    orderNumber: canonical.orderNumber,
    posNumber: canonical.posNumber,
    customer: canonical.customer,
    type: 'sliding_window', // Default type
    overallWidth: canonical.geometry.overallWidth,
    overallHeight: canonical.geometry.overallHeight,
    components: canonical.geometry.components,
    grid: canonical.geometry.grid,
    systemPackId: canonical.materials.systemPack,
    color: 'Silver', // Default color
    glazing: canonical.materials.glass[0] ? {
      type: canonical.materials.glass[0].type,
      thickness: canonical.materials.glass[0].thickness,
      spacer: 12,
      gasFill: 'argon',
    } : {
      type: 'double',
      thickness: 4,
      spacer: 12,
      gasFill: 'argon',
    },
    hardware: canonical.materials.hardware.map((h: any) => ({
      id: h.hardwareId,
      name: h.hardwareName,
      quantity: h.quantity,
      position: h.position,
      componentId: h.componentId,
    })),
    status: 'design' as const,
    optimization: null,
    createdAt: new Date(canonical.metadata.createdAt),
    updatedAt: new Date(canonical.metadata.modifiedAt),
  } as WindowUnit;
}

/**
 * Convert Canonical Model back to CAD format
 * 
 * Used when user switches from Wizard to CAD mode
 */
export function canonicalToCAD(canonical: CanonicalEngineeringModel): any {
  // If we have the original CAD data, use it
  if (canonical.metadata.originSnapshot?.draftingData) {
    return canonical.metadata.originSnapshot.draftingData;
  }
  
  // Otherwise, reconstruct from canonical
  return {
    projectId: canonical.id,
    orderNumber: canonical.orderNumber,
    systemPack: canonical.materials.systemPack,
    shapes: canonical.geometry.shapes || canonical.geometry.components.map(comp => ({
      id: comp.id,
      type: 'rect_frame', // Default shape type
      position: { x: (comp as any).x || 0, y: (comp as any).y || 0 },
      dimensions: { width: (comp as any).width || 0, height: (comp as any).height || 0 },
      material: (comp as any).material,
      properties: (comp as any).properties,
    })),
    canvas: {
      width: canonical.geometry.overallWidth,
      height: canonical.geometry.overallHeight,
      zoom: 1,
      pan: { x: 0, y: 0 },
    },
  };
}

// ============================================================================
// Helper Functions (Reserved for future CAD shape processing)
// ============================================================================
// These functions will be used when we implement full CAD shape to component conversion
