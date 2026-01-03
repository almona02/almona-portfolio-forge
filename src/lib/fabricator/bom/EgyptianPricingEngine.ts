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
import {
    GLAZING_PRICES_EGP_PER_M2,
    GLAZING_TYPE_THRESHOLDS,
    HARDWARE_PRICES_EGP,
    LABOR_RATES_EGP_PER_HOUR,
    LOCATION_MULTIPLIERS,
    TIME_CONVERSION,
} from './egyptianPricingConstants';

/**
 * EgyptianPricingEngine - Egyptian market pricing engine
 */
export class EgyptianPricingEngine {
  // ✅ ENHANCED: Extract pricing constants to dedicated file
  // Hardware pricing (EGP per unit)
  private readonly HARDWARE_PRICES: Record<string, number> = {
    'hinge': HARDWARE_PRICES_EGP.HINGE,
    'handle': HARDWARE_PRICES_EGP.HANDLE,
    'lock': HARDWARE_PRICES_EGP.LOCK,
    'roller': HARDWARE_PRICES_EGP.ROLLER,
    'corner_key': HARDWARE_PRICES_EGP.CORNER_KEY,
    'gasket': HARDWARE_PRICES_EGP.GASKET_PER_METER,
    'other': HARDWARE_PRICES_EGP.OTHER,
  };

  // Glazing pricing (EGP per m²)
  private readonly GLAZING_PRICES: Record<string, number> = {
    'single': GLAZING_PRICES_EGP_PER_M2.SINGLE,
    'double': GLAZING_PRICES_EGP_PER_M2.DOUBLE,
    'triple': GLAZING_PRICES_EGP_PER_M2.TRIPLE,
  };

  // Labor rates (EGP per hour)
  private readonly LABOR_RATES: Record<string, number> = {
    'Cairo': LABOR_RATES_EGP_PER_HOUR.CAIRO,
    'Alexandria': LABOR_RATES_EGP_PER_HOUR.ALEXANDRIA,
    'Upper_Egypt': LABOR_RATES_EGP_PER_HOUR.UPPER_EGYPT,
    'default': LABOR_RATES_EGP_PER_HOUR.DEFAULT,
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
      const glazingType = pane.dimensions.thickness <= GLAZING_TYPE_THRESHOLDS.SINGLE_MAX_THICKNESS_MM
        ? 'single'
        : pane.dimensions.thickness <= GLAZING_TYPE_THRESHOLDS.DOUBLE_MAX_THICKNESS_MM
        ? 'double'
        : 'triple';
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
    const hours = timeMinutes / TIME_CONVERSION.MINUTES_PER_HOUR;
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
    const locationKey = this.getLocationKey(location);
    if (locationKey === 'Upper_Egypt') return LOCATION_MULTIPLIERS.UPPER_EGYPT;
    if (locationKey === 'Alexandria') return LOCATION_MULTIPLIERS.ALEXANDRIA;
    return LOCATION_MULTIPLIERS.CAIRO;
  }
}


