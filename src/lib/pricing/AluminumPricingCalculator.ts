export type PricingRegion = 'egypt' | 'turkey' | 'global';

export interface PricingSettings {
  aluminumPricePerKg: number;
  markupPercentage: number;
  cuttingCostPerMeter: number;
  finishingCostPerMeter: number;
  region: PricingRegion;
  currency: string;
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

  static calculateCost(
    weightPerMeterKg: number,
    lengthMeters: number,
    settings: Partial<PricingSettings> = {},
  ): PricingBreakdown {
    const effectiveSettings: PricingSettings = {
      ...this.defaultSettings,
      ...settings,
    };

    const materialCost =
      weightPerMeterKg * lengthMeters * effectiveSettings.aluminumPricePerKg;
    const cuttingCost = effectiveSettings.cuttingCostPerMeter * lengthMeters;
    const finishingCost =
      effectiveSettings.finishingCostPerMeter * lengthMeters;

    const totalCost = materialCost + cuttingCost + finishingCost;
    const finalPrice =
      totalCost * (1 + effectiveSettings.markupPercentage / 100);

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


