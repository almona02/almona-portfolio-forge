/**
 * EgyptianPricingEngine - Local Pricing Integration
 * 
 * Provides Egyptian market pricing for:
 * - Hardware (by supplier and region)
 * - Glazing (by type and size)
 * - Labor (by region and skill level)
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 13)
 */

import type { FabricationData } from '@/types/fabricator';

/**
 * EgyptianPricingEngine - Egyptian market pricing engine
 */
export class EgyptianPricingEngine {
  // Hardware pricing (EGP per unit)
  private readonly HARDWARE_PRICES: Record<string, number> = {
    'hinge': 25, // EGP per hinge
    'handle': 45, // EGP per handle
    'lock': 60, // EGP per lock
    'roller': 8, // EGP per roller
    'corner_key': 3, // EGP per corner key
    'gasket': 2, // EGP per meter
    'other': 20 // EGP default
  };

  // Glazing pricing (EGP per m²)
  private readonly GLAZING_PRICES: Record<string, number> = {
    'single': 150, // EGP/m²
    'double': 250, // EGP/m²
    'triple': 350 // EGP/m²
  };

  // Labor rates (EGP per hour)
  private readonly LABOR_RATES: Record<string, number> = {
    'Cairo': 50, // EGP/hour
    'Alexandria': 55, // EGP/hour (coastal, slightly higher)
    'Upper_Egypt': 45, // EGP/hour
    'default': 50 // EGP/hour
  };

  /**
   * Calculate hardware cost
   */
  async calculateHardwareCost(
    hardware: FabricationData['hardware'],
    location?: string
  ): Promise<number> {
    let totalCost = 0;

    hardware.forEach(item => {
      const basePrice = this.HARDWARE_PRICES[item.category] || this.HARDWARE_PRICES['other'];
      const locationMultiplier = this.getLocationMultiplier(location);
      totalCost += basePrice * item.quantity * locationMultiplier;
    });

    return totalCost;
  }

  /**
   * Calculate glazing cost
   */
  async calculateGlazingCost(
    glazing: FabricationData['glazing'],
    location?: string
  ): Promise<number> {
    let totalCost = 0;

    glazing.forEach(pane => {
      const glazingType = pane.dimensions.thickness <= 5 ? 'single' : 
                          pane.dimensions.thickness <= 12 ? 'double' : 'triple';
      const pricePerM2 = this.GLAZING_PRICES[glazingType] || this.GLAZING_PRICES['double'];
      const area = (pane.dimensions.width * pane.dimensions.height) / 1_000_000; // m²
      const locationMultiplier = this.getLocationMultiplier(location);
      totalCost += area * pricePerM2 * locationMultiplier;
    });

    return totalCost;
  }

  /**
   * Calculate labor cost
   */
  async calculateLaborCost(
    timeMinutes: number,
    location?: string
  ): Promise<number> {
    const locationKey = this.getLocationKey(location);
    const hourlyRate = this.LABOR_RATES[locationKey] || this.LABOR_RATES['default'];
    const hours = timeMinutes / 60;
    return hours * hourlyRate;
  }

  /**
   * Get location key for pricing
   */
  private getLocationKey(location?: string): string {
    if (!location) return 'default';
    const locationLower = location.toLowerCase();

    if (locationLower.includes('alexandria') || locationLower.includes('coastal')) {
      return 'Alexandria';
    }
    if (locationLower.includes('upper') || locationLower.includes('luxor') || locationLower.includes('aswan')) {
      return 'Upper_Egypt';
    }
    return 'Cairo';
  }

  /**
   * Get location multiplier for pricing adjustments
   */
  private getLocationMultiplier(location?: string): number {
    // Small adjustments based on location (typically 0.95-1.05)
    const locationKey = this.getLocationKey(location);
    if (locationKey === 'Upper_Egypt') return 0.95; // Slightly cheaper
    if (locationKey === 'Alexandria') return 1.05; // Slightly more expensive (coastal)
    return 1.0; // Cairo (baseline)
  }
}


