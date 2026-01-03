/**
 * LME Pricing Service
 * Fetches real-time metal prices from London Metal Exchange (LME) API
 * Falls back to cached prices if API is unavailable
 */

export interface LMEPrice {
  metal: 'aluminum' | 'copper' | 'zinc';
  pricePerKg: number; // Price in USD per kg
  currency: string;
  timestamp: Date;
  source: 'lme' | 'cache' | 'fallback';
}

export interface LMEPricingCache {
  prices: Record<string, LMEPrice>;
  lastUpdated: Date;
}

class LmePricingService {
  private cache: LMEPricingCache = {
    prices: {},
    lastUpdated: new Date(0),
  };

  private readonly CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache
  private readonly FALLBACK_ALUMINUM_PRICE = 2.5; // USD per kg fallback

  /**
   * Get current aluminum price from LME
   * Uses cache if available and fresh, otherwise fetches from API
   */
  async getAluminumPrice(): Promise<number> {
    try {
      // Check cache first
      const cachedPrice = this.getCachedPrice('aluminum');
      if (cachedPrice && this.isCacheValid()) {
        return cachedPrice.pricePerKg;
      }

      // Try to fetch from LME API
      // Note: In production, replace with actual LME API endpoint
      const price = await this.fetchLMEPrice('aluminum');

      // Update cache
      this.updateCache('aluminum', price);

      return price.pricePerKg;
    } catch (error) {
      console.warn('Failed to fetch LME price, using fallback:', error);
      
      // Return cached price if available, otherwise fallback
      const cachedPrice = this.getCachedPrice('aluminum');
      return cachedPrice?.pricePerKg || this.FALLBACK_ALUMINUM_PRICE;
    }
  }

  /**
   * Fetch price from LME API
   * Note: This is a placeholder - replace with actual LME API integration
   */
  private async fetchLMEPrice(_metal: 'aluminum' | 'copper' | 'zinc'): Promise<LMEPrice> {
    // TODO: Replace with actual LME API call
    // Example: https://www.lme.com/api/pricing/{metal}
    
    // For now, simulate API call with a mock response
    // In production, use actual LME API:
    // const response = await fetch('https://api.lme.com/v1/prices/aluminum');
    // const data = await response.json();
    
    const mockPrice: LMEPrice = {
      metal: 'aluminum',
      pricePerKg: 2.45, // Mock price in USD per kg
      currency: 'USD',
      timestamp: new Date(),
      source: 'lme',
    };

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return mockPrice;
  }

  /**
   * Get cached price
   */
  private getCachedPrice(metal: string): LMEPrice | null {
    return this.cache.prices[metal] || null;
  }

  /**
   * Update cache with new price
   */
  private updateCache(metal: string, price: LMEPrice): void {
    this.cache.prices[metal] = price;
    this.cache.lastUpdated = new Date();
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    const now = new Date();
    const age = now.getTime() - this.cache.lastUpdated.getTime();
    return age < this.CACHE_DURATION_MS;
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache = {
      prices: {},
      lastUpdated: new Date(0),
    };
  }

  /**
   * Get all cached prices
   */
  getCachedPrices(): LMEPricingCache {
    return { ...this.cache };
  }
}

// Export singleton instance
export const lmePricingService = new LmePricingService();

