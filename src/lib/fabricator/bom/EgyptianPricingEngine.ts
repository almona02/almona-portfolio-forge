/**
 * EgyptianPricingEngine - Local Pricing Integration
 * 
 * Provides Egyptian market pricing for:
 * - Hardware (by supplier and region)
 * - Glazing (by type and size)
 * - Labor (by region and skill level)
 * 
 * Enhanced to use system_pricing when available (from SystemPricingService)
 * Falls back to constants if system_pricing not configured (backward compatibility)
 * 
 * @since Phase 2: Preset-Aware BOM System (Week 13)
 * @enhanced Pricing Tuning Studio - Gold Tier Enhancement
 */

import type { FabricationData } from '@/types/fabricator';
import type { SystemPricingState } from '@/types/pricing';
import {
    GLAZING_PRICES_EGP_PER_M2,
    GLAZING_TYPE_THRESHOLDS,
    HARDWARE_PRICES_EGP,
    LABOR_RATES_EGP_PER_HOUR,
    LOCATION_MULTIPLIERS,
    TIME_CONVERSION,
} from './egyptianPricingConstants';

/**
 * Optional system pricing context for enhanced pricing calculations
 */
export interface SystemPricingContext {
  systemPricing?: SystemPricingState;
  systemName?: string;
  profileId?: string;
}

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
    'shutter_winder': HARDWARE_PRICES_EGP.SHUTTER_WINDER,
    'shutter_strap': HARDWARE_PRICES_EGP.SHUTTER_STRAP,
    'shutter_motor': HARDWARE_PRICES_EGP.SHUTTER_MOTOR,
    'screen_roller': HARDWARE_PRICES_EGP.SCREEN_ROLLER,
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
   * Enhanced to use system_pricing when available
   */
  async calculateHardwareCost(
    hardware: FabricationData['hardware'],
    location?: string,
    systemPricingContext?: SystemPricingContext
  ): Promise<number> {
    let totalCost = 0;

    // Check if system_pricing is available
    const systemPricing = systemPricingContext?.systemPricing;

    hardware.forEach(item => {
      let basePrice: number;

      // Try to use system_pricing hardware prices if available
      if (systemPricing?.hardware) {
        // Map hardware category/code to system_pricing keys
        // Hardware codes from system_pricing are like '0253', '0707', 'KIT 10451'
        // We need to map from category to code
        const hardwareCodeMap: Record<string, string> = {
          'hinge': '0253',
          'handle': '0707',
          'lock': 'KIT 10451',
        };

        const hardwareCode = hardwareCodeMap[item.category] || item.supplierCode;
        if (hardwareCode && systemPricing.hardware[hardwareCode]) {
          basePrice = systemPricing.hardware[hardwareCode];
        } else {
          // Fallback to constants
          basePrice = this.HARDWARE_PRICES[item.category] || this.HARDWARE_PRICES['other'];
        }
      } else {
        // Use constants (backward compatibility)
        basePrice = this.HARDWARE_PRICES[item.category] || this.HARDWARE_PRICES['other'];
      }

      const locationMultiplier = this.getLocationMultiplier(location);
      totalCost += basePrice * item.quantity * locationMultiplier;
    });

    return totalCost;
  }

  /**
   * Calculate glazing cost
   * Enhanced to use system_pricing when available
   */
  async calculateGlazingCost(
    glazing: FabricationData['glazing'],
    location?: string,
    systemPricingContext?: SystemPricingContext
  ): Promise<number> {
    let totalCost = 0;

    // Check if system_pricing is available
    const systemPricing = systemPricingContext?.systemPricing;

    glazing.forEach(pane => {
      const glazingType = pane.dimensions.thickness <= GLAZING_TYPE_THRESHOLDS.SINGLE_MAX_THICKNESS_MM
        ? 'single'
        : pane.dimensions.thickness <= GLAZING_TYPE_THRESHOLDS.DOUBLE_MAX_THICKNESS_MM
        ? 'double'
        : 'triple';

      let pricePerM2: number;

      // Try to use system_pricing glazing types if available
      if (systemPricing?.glazingTypes && systemPricing.glazingTypes.length > 0) {
        const glazingTypeData = systemPricing.glazingTypes.find((gt) => gt.id === glazingType);
        if (glazingTypeData && glazingTypeData.pricePerSquareMeter > 0) {
          pricePerM2 = glazingTypeData.pricePerSquareMeter;
        } else {
          // Fallback to constants
          pricePerM2 = this.GLAZING_PRICES[glazingType] || this.GLAZING_PRICES['double'];
        }
      } else {
        // Use constants (backward compatibility)
        pricePerM2 = this.GLAZING_PRICES[glazingType] || this.GLAZING_PRICES['double'];
      }

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


