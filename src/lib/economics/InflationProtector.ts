/**
 * Inflation Protector - Economic Reality Engine
 * 
 * Protects quotes from Egyptian market volatility:
 * - Currency fluctuation (USD/EGP)
 * - Material price volatility
 * - Dynamic quote validity
 * - Maalem-style warnings
 */

export interface ProtectedQuote {
  originalPrice: number;
  protectedPrice: number;
  validity: string; // e.g., "Valid for 48 hours only"
  inflationBuffer: number;
  warning?: string;
  warningArabic?: string;
  marketVolatility: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

export interface MarketConditions {
  usd_egp_rate: number;
  aluminum_raw_price: number; // EGP per ton
  volatility_index: 'high' | 'medium' | 'low';
  lastUpdated: string;
}

/**
 * Inflation Protector - Protects quotes from market volatility
 */
export class InflationProtector {
  private currentMarket: MarketConditions;

  constructor() {
    // Initialize with current market conditions
    // In production, this would fetch from API
    this.currentMarket = {
      usd_egp_rate: 48.5,
      aluminum_raw_price: 185000, // EGP per ton
      volatility_index: 'high',
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Protect quote from inflation
   */
  async protectQuote(quote: { price: number; materials: string[] }): Promise<ProtectedQuote> {
    // 1. Check quote validity based on volatility
    const validityPeriod = this.calculateValidity(this.currentMarket.volatility_index);

    // 2. Calculate inflation buffer
    const inflationBuffer = this.calculateBuffer(quote.materials, this.currentMarket);

    // 3. Generate maalem warning
    const warning = this.generateMaalemWarning(validityPeriod, this.currentMarket.volatility_index);

    return {
      originalPrice: quote.price,
      protectedPrice: quote.price + inflationBuffer,
      validity: validityPeriod,
      inflationBuffer,
      warning: warning.english,
      warningArabic: warning.arabic,
      marketVolatility: this.currentMarket.volatility_index,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate quote validity period
   */
  private calculateValidity(volatility: 'high' | 'medium' | 'low'): string {
    const validityMap = {
      high: '24 hours',
      medium: '48 hours',
      low: '7 days',
    };

    return `Valid for ${validityMap[volatility]} only`;
  }

  /**
   * Calculate inflation buffer
   */
  private calculateBuffer(
    materials: string[],
    market: MarketConditions
  ): number {
    // Base buffer: 2-5% depending on volatility
    const baseBufferPercent = {
      high: 0.05, // 5%
      medium: 0.03, // 3%
      low: 0.02, // 2%
    };

    // Check if materials are import-dependent (aluminum, hardware)
    const importDependent = materials.some(m => 
      m.toLowerCase().includes('aluminum') || 
      m.toLowerCase().includes('hardware')
    );

    // Increase buffer if import-dependent (currency risk)
    const bufferMultiplier = importDependent ? 1.5 : 1.0;

    // Would calculate based on actual quote price
    // For now, return percentage
    return baseBufferPercent[market.volatility_index] * bufferMultiplier;
  }

  /**
   * Generate maalem-style warning
   */
  private generateMaalemWarning(
    validity: string,
    volatility: 'high' | 'medium' | 'low'
  ): { english: string; arabic: string } {
    if (volatility === 'high') {
      return {
        english: 'Market is volatile. Give customer today\'s price only, and warn that price may increase if USD rate changes.',
        arabic: 'يا ريس، السوق بيتحرك. ادي العميل سعر النهاردة بس، وقوله لو الدولار زاد السعر هيزيد.',
      };
    } else if (volatility === 'medium') {
      return {
        english: 'Prices are somewhat stable, you can give a week validity.',
        arabic: 'الأسعار مستقرة نوعاً ما، ممكن تديه مهلة أسبوع.',
      };
    } else {
      return {
        english: 'Market is stable, standard validity applies.',
        arabic: 'السوق مستقر، السعر صحيح لمدة أسبوع.',
      };
    }
  }

  /**
   * Update market conditions
   */
  updateMarketConditions(conditions: Partial<MarketConditions>): void {
    this.currentMarket = {
      ...this.currentMarket,
      ...conditions,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get current market conditions
   */
  getMarketConditions(): MarketConditions {
    return this.currentMarket;
  }
}

