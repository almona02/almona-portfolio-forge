// src/components/fabricator/drafting/types/materialAware.ts

/**
 * Material-Aware Design Types
 * Extends basic drafting types with material and system pack awareness
 */

import type { WindowGrid } from '@/types/fabricator';
import type { Point, Rectangle } from './drafting';

export type MaterialType = 'aluminum' | 'upvc' | 'wood';

export interface MaterialAwareRectangle extends Rectangle {
  material: MaterialType;
  systemPackId?: string;
  profileDepth: number; // mm
  glazingPocket: {
    depth: number; // mm
    width: number; // mm
    clearance: number; // mm
  };
  thermalBreak?: {
    width: number; // mm
    material: string;
  };
  constraints: {
    minWidth: number;
    maxWidth: number;
    minHeight: number;
    maxHeight: number;
    maxArea?: number; // m²
  };
  /** Per-frame grid (sash layout, mullions); when present, overrides template-derived grid */
  grid?: WindowGrid;
}

export interface HardwarePlacement {
  id: string;
  type: 'hinge' | 'handle' | 'lock' | 'roller' | 'corner_key' | 'gasket';
  position: Point;
  orientation: 'horizontal' | 'vertical';
  specifications: {
    model: string;
    supplierCode?: string;
    loadCapacity?: number; // kg
    egyptianStandard: boolean;
    positionFromBottom?: number; // mm (for handles: 1100mm standard)
    positionFromTop?: number; // mm (for hinges: 150mm standard)
  };
}

export interface StructuralElement {
  id: string;
  type: 'mullion' | 'transom' | 'reinforcement';
  material: MaterialType;
  position: number; // mm from start
  dimensions: {
    width: number; // mm
    depth: number; // mm
    height: number; // mm
  };
  reinforcement?: {
    type: 'steel' | 'aluminum';
    dimensions: { width: number; height: number }; // mm
  };
  structuralType?: 'standard' | 'structural' | 'corner' | 'thermal_break';
}

export interface MaterialSpec {
  material: MaterialType;
  systemPackId: string;
  profileDepth: number;
  glazingPocket: {
    depth: number;
    width: number;
    clearance: number;
  };
  thermalBreak?: {
    width: number;
    material: string;
  };
  maxSpanWithoutMullion: number; // mm
  requiresReinforcementAbove: number; // mm span
  cornerConnection: 'miter' | 'welded' | 'corner_key';
  weldingBurnOff?: number; // mm (for UPVC)
  
  // Costing Data
  weightKgPerMeter?: number; // Average weight for main profile
  pricePerKg?: number; // Base aluminum price
  glassPricePerM2?: number; // Base glass price
}

