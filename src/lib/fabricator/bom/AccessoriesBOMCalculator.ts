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
  async calculateAccessoriesBOM(
    windowUnit: WindowUnit,
    pattern: EgyptianPattern,
    systemPack: SystemPack
  ): Promise<AccessoryItem[]> {
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
      unitPrice: (glazingBeadLength / 1000) * 8, // 8 EGP/meter
      totalCost: (glazingBeadLength / 1000) * 8,
      supplier: this.getSupplier('beads', windowUnit.positionMeta?.buildingBlock)
    });

    // Seals and gaskets (from pattern requirements)
    const patternAny = pattern as any;
    if (patternAny.requiresSeals) {
      accessories.push({
        id: 'seal-primary',
        name: 'Primary Seal (EPDM)',
        category: 'seal',
        quantity: 1,
        unitPrice: (perimeter / 1000) * 12, // 12 EGP/meter
        totalCost: (perimeter / 1000) * 12,
        supplier: this.getSupplier('seals', windowUnit.positionMeta?.buildingBlock)
      });
    }

    // Screws and fasteners (estimated)
    const estimatedScrews = Math.ceil(perimeter / 300); // One screw every 300mm
    accessories.push({
      id: 'screws-standard',
      name: 'Screws M6 (Standard)',
      category: 'fastener',
      quantity: estimatedScrews,
      unitPrice: 0.5, // 0.5 EGP per screw
      totalCost: estimatedScrews * 0.5,
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


