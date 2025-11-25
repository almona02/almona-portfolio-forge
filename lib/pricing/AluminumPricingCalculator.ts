// lib/pricing/AluminumPricingCalculator.ts

export interface PricingSettings {
  aluminumPricePerKg: number;
  markupPercentage: number;
  cuttingCostPerMeter: number;
  finishingCostPerMeter: number;
  region: 'egypt' | 'turkey' | 'global';
  currency: string;
}

export class AluminumPricingCalculator {
  private static defaultSettings: PricingSettings = {
    aluminumPricePerKg: 6.5,
    markupPercentage: 30,
    cuttingCostPerMeter: 0.5,
    finishingCostPerMeter: 1.2,
    region: 'egypt',
    currency: 'USD',
  };

  static calculateCost(
    weightPerMeter: number,
    length: number,
    settings: Partial<PricingSettings> = {}
  ) {
    const effectiveSettings = { ...this.defaultSettings, ...settings };

    const materialCost = weightPerMeter * length * effectiveSettings.aluminumPricePerKg;
    const cuttingCost = effectiveSettings.cuttingCostPerMeter * length;
    const finishingCost = effectiveSettings.finishingCostPerMeter * length;

    const totalCost = materialCost + cuttingCost + finishingCost;
    const finalPrice = totalCost * (1 + effectiveSettings.markupPercentage / 100);

    return {
      materialCost,
      cuttingCost,
      finishingCost,
      totalCost,
      finalPrice,
      pricePerMeter: finalPrice / length,
      settings: effectiveSettings,
    };
  }

  static updateGlobalPricing(newPricePerKg: number, settings: Partial<PricingSettings> = {}) {
    this.defaultSettings = {
      ...this.defaultSettings,
      ...settings,
      aluminumPricePerKg: newPricePerKg,
    };
    return this.defaultSettings;
  }

  static getCurrentPricing() {
    return { ...this.defaultSettings };
  }
}


