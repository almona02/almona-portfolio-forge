import { lmePricingService } from './LmePricingService';

export type PricingRegion = 'egypt' | 'turkey' | 'global';

export interface PricingSettings {
  aluminumPricePerKg: number;
  markupPercentage: number;
  cuttingCostPerMeter: number;
  finishingCostPerMeter: number;
  region: PricingRegion;
  currency: string;
  useLMEPricing?: boolean; // Whether to use LME prices as base
}

export interface PricingBreakdown {
  materialCost: number;
  cuttingCost: number;
  finishingCost: number;
  totalCost: number;
  finalPrice: number;
  pricePerMeter: number;
  settings: PricingSettings;
}

export class AluminumPricingCalculator {
  // Default values are intentionally conservative; user can override in UI
  private static defaultSettings: PricingSettings = {
    aluminumPricePerKg: 6.5,
    markupPercentage: 30,
    cuttingCostPerMeter: 0.5,
    finishingCostPerMeter: 1.2,
    region: 'egypt',
    currency: 'USD',
  };

  static async calculateCost(
    weightPerMeterKg: number,
    lengthMeters: number,
    settings: Partial<PricingSettings> = {},
  ): Promise<PricingBreakdown> {
    const effectiveSettings: PricingSettings = {
      ...this.defaultSettings,
      ...settings,
    };

    // Use LME pricing if enabled
    let aluminumPricePerKg = effectiveSettings.aluminumPricePerKg;
    if (effectiveSettings.useLMEPricing) {
      try {
        const lmePrice = await lmePricingService.getAluminumPrice();
        aluminumPricePerKg = lmePrice;
        // Apply regional adjustments if needed
        if (effectiveSettings.region === 'egypt') {
          // Egyptian market typically has additional costs (import, taxes, etc.)
          aluminumPricePerKg = lmePrice * 1.15; // 15% markup for Egyptian market
        }
      } catch (error) {
        console.warn('Failed to fetch LME price, using default:', error);
        // Fall back to default price
      }
    }

    const materialCost = weightPerMeterKg * lengthMeters * aluminumPricePerKg;
    const cuttingCost = effectiveSettings.cuttingCostPerMeter * lengthMeters;
    const finishingCost = effectiveSettings.finishingCostPerMeter * lengthMeters;

    const totalCost = materialCost + cuttingCost + finishingCost;
    const finalPrice = totalCost * (1 + effectiveSettings.markupPercentage / 100);

    return {
      materialCost,
      cuttingCost,
      finishingCost,
      totalCost,
      finalPrice,
      pricePerMeter: lengthMeters > 0 ? finalPrice / lengthMeters : 0,
      settings: {
        ...effectiveSettings,
        aluminumPricePerKg,
      },
    };
  }

  /**
   * Synchronous version for backward compatibility
   * Uses default pricing without LME
   */
  static calculateCostSync(
    weightPerMeterKg: number,
    lengthMeters: number,
    settings: Partial<PricingSettings> = {},
  ): PricingBreakdown {
    const effectiveSettings: PricingSettings = {
      ...this.defaultSettings,
      ...settings,
      useLMEPricing: false, // Disable LME for sync version
    };

    const materialCost =
      weightPerMeterKg * lengthMeters * effectiveSettings.aluminumPricePerKg;
    const cuttingCost = effectiveSettings.cuttingCostPerMeter * lengthMeters;
    const finishingCost = effectiveSettings.finishingCostPerMeter * lengthMeters;

    const totalCost = materialCost + cuttingCost + finishingCost;
    const finalPrice = totalCost * (1 + effectiveSettings.markupPercentage / 100);

    return {
      materialCost,
      cuttingCost,
      finishingCost,
      totalCost,
      finalPrice,
      pricePerMeter: lengthMeters > 0 ? finalPrice / lengthMeters : 0,
      settings: effectiveSettings,
    };
  }

  static updateGlobalPricing(
    newPricePerKg: number,
    settings: Partial<PricingSettings> = {},
  ): PricingSettings {
    this.defaultSettings = {
      ...this.defaultSettings,
      ...settings,
      aluminumPricePerKg: newPricePerKg,
    };
    return { ...this.defaultSettings };
  }

  static getCurrentPricing(): PricingSettings {
    return { ...this.defaultSettings };
  }
}


