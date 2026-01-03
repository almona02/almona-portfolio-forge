/**
 * Scrap Value Engine - Hidden Profit Calculator
 * 
 * Calculates the hidden profit from scrap/offcuts:
 * - Scrap weight from optimization
 * - Current scrap market price
 * - Maalem advice on scrap management
 */

export interface ScrapAnalysis {
  scrapWeight: number; // kg
  estimatedValue: number; // EGP
  currentScrapPrice: number; // EGP per kg
  maalemAdvice: string;
  maalemAdviceArabic: string;
  recommendations: string[];
}

export interface OptimizationResult {
  wasteWeight: number; // kg
  materialType: 'aluminum' | 'upvc' | 'mixed';
  totalWeight: number; // kg
}

/**
 * Scrap Value Engine
 */
export class ScrapValueEngine {
  private scrapPrices: Record<string, number> = {
    aluminum_6063: 35, // EGP per kg
    aluminum_6061: 38,
    upvc: 8,
    mixed: 25,
  };

  /**
   * Calculate hidden profit from scrap
   */
  async calculateHiddenProfit(
    optimizationResult: OptimizationResult
  ): Promise<ScrapAnalysis> {
    const scrapWeight = optimizationResult.wasteWeight;
    const materialType = optimizationResult.materialType;
    
    // Get current scrap price
    const scrapPriceKey = materialType === 'aluminum' ? 'aluminum_6063' : 
                          materialType === 'upvc' ? 'upvc' : 'mixed';
    const currentScrapPrice = this.scrapPrices[scrapPriceKey] || 25;
    
    // Calculate value
    const estimatedValue = scrapWeight * currentScrapPrice;
    
    // Generate maalem advice
    const advice = this.generateMaalemAdvice(scrapWeight, estimatedValue, materialType);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(scrapWeight, estimatedValue);

    return {
      scrapWeight,
      estimatedValue: Math.round(estimatedValue),
      currentScrapPrice,
      maalemAdvice: advice.english,
      maalemAdviceArabic: advice.arabic,
      recommendations,
    };
  }

  /**
   * Generate maalem advice
   */
  private generateMaalemAdvice(
    scrapWeight: number,
    value: number,
    _materialType: string
  ): { english: string; arabic: string } {
    if (scrapWeight < 5) {
      return {
        english: 'Small amount of scrap. Keep it for small repairs.',
        arabic: 'كمية صغيرة من الهالك. خليها للصيانات الصغيرة.',
      };
    } else if (scrapWeight < 20) {
      return {
        english: `You have ${scrapWeight.toFixed(1)} kg of scrap worth approximately ${value.toFixed(0)} EGP. This covers transport and tea costs.`,
        arabic: `عندك ${scrapWeight.toFixed(1)} كيلو هالك. دول يعملوا حوالي ${value.toFixed(0)} جنيه بيع خرده. دول مصاريف النقل والشاي، متسيبهمش للصنايعية يضيعوهم.`,
      };
    } else {
      return {
        english: `You have ${scrapWeight.toFixed(1)} kg of scrap worth approximately ${value.toFixed(0)} EGP. This is significant - collect and sell it.`,
        arabic: `عندك ${scrapWeight.toFixed(1)} كيلو هالك. دول يعملوا حوالي ${value.toFixed(0)} جنيه بيع خرده. الكمية دي كبيرة، اجمعها وبيعها.`,
      };
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(scrapWeight: number, value: number): string[] {
    const recommendations: string[] = [];

    if (scrapWeight > 10) {
      recommendations.push('Collect scrap in designated area');
      recommendations.push('Sell to scrap dealer monthly');
      recommendations.push('Track scrap value as hidden profit');
    }

    if (value > 500) {
      recommendations.push('This scrap value is significant - don\'t waste it');
      recommendations.push('Consider dedicating a worker to collect scrap');
    }

    return recommendations;
  }

  /**
   * Update scrap prices
   */
  updateScrapPrices(prices: Partial<Record<string, number>>): void {
    this.scrapPrices = { ...this.scrapPrices, ...prices };
  }

  /**
   * Get current scrap prices
   */
  getScrapPrices(): Record<string, number> {
    return { ...this.scrapPrices };
  }
}

