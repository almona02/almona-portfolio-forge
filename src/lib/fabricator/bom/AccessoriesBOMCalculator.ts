/**
 * AccessoriesBOMCalculator - Accessories Calculations
 * 
 * Calculates accessory quantities:
 * - Glazing beads
 * - Seals and gaskets
 * - Screws and fasteners
 * - Other pattern-specific accessories
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 11)
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack, WindowUnit } from '@/types/fabricator';
import {
    ACCESSORY_PRICES_EGP,
    FASTENER_CONSTANTS,
    UNIT_CONVERSION,
} from './accessoriesBOMConstants';

export interface AccessoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number; // EGP
  totalCost: number; // EGP
  supplier: string;
}

/**
 * AccessoriesBOMCalculator - Accessory quantity calculation engine
 */
export class AccessoriesBOMCalculator {
  /**
   * Calculate accessories BOM from pattern
   */
  calculateAccessoriesBOM(
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    _systemPack: SystemPack
  ): AccessoryItem[] {
    const accessories: AccessoryItem[] = [];
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const perimeter = (width + height) * 2;

    // Glazing beads (standard: perimeter length)
    const glazingBeadLength = perimeter;
    accessories.push({
      id: 'glazing-bead-standard',
      name: 'Glazing Bead (Standard)',
      category: 'glazing_bead',
      quantity: 1,
      unitPrice: (glazingBeadLength / UNIT_CONVERSION.MM_PER_METER) * ACCESSORY_PRICES_EGP.GLAZING_BEAD_PER_METER,
      totalCost: (glazingBeadLength / UNIT_CONVERSION.MM_PER_METER) * ACCESSORY_PRICES_EGP.GLAZING_BEAD_PER_METER,
      supplier: this.getSupplier('beads', windowUnit.positionMeta?.buildingBlock)
    });

    // Seals and gaskets (from pattern requirements)
    const requiresSeals = 'requiresSeals' in pattern && (pattern as Record<string, unknown>).requiresSeals === true;
    if (requiresSeals) {
      accessories.push({
        id: 'seal-primary',
        name: 'Primary Seal (EPDM)',
        category: 'seal',
        quantity: 1,
        unitPrice: (perimeter / UNIT_CONVERSION.MM_PER_METER) * ACCESSORY_PRICES_EGP.PRIMARY_SEAL_PER_METER,
        totalCost: (perimeter / UNIT_CONVERSION.MM_PER_METER) * ACCESSORY_PRICES_EGP.PRIMARY_SEAL_PER_METER,
        supplier: this.getSupplier('seals', windowUnit.positionMeta?.buildingBlock)
      });
    }

    // Screws and fasteners (estimated)
    const estimatedScrews = Math.ceil(perimeter / FASTENER_CONSTANTS.SCREW_SPACING_MM);
    accessories.push({
      id: 'screws-standard',
      name: 'Screws M6 (Standard)',
      category: 'fastener',
      quantity: estimatedScrews,
      unitPrice: ACCESSORY_PRICES_EGP.SCREW_STANDARD,
      totalCost: estimatedScrews * ACCESSORY_PRICES_EGP.SCREW_STANDARD,
      supplier: this.getSupplier('fasteners', windowUnit.positionMeta?.buildingBlock)
    });

    return accessories;
  }

  /**
   * Get supplier based on location
   */
  private getSupplier(category: 'beads' | 'seals' | 'fasteners', location?: string): string {
    const locationLower = (location || 'Cairo').toLowerCase();

    if (locationLower.includes('alexandria') || locationLower.includes('coastal')) {
      const suppliers: Record<string, string> = {
        beads: 'Mediterranean Hardware Co.',
        seals: 'Mediterranean Seals Co.',
        fasteners: 'Mediterranean Hardware Co.'
      };
      return suppliers[category] || 'Mediterranean Supplies';
    }

    // Default: Cairo suppliers
    const suppliers: Record<string, string> = {
      beads: 'Cairo Hardware Distributors',
      seals: 'Cairo Seals & Gaskets',
      fasteners: 'Cairo Hardware Distributors'
    };
    return suppliers[category] || 'Cairo Supplies';
  }
}


