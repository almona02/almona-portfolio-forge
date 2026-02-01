/**
 * System Pricing Service
 * 
 * Unified service layer to bridge Rock60PricingSetup/PricingTuningStudio with PricingEngine.
 * Provides seamless integration between system_pricing (stored in profile specifications)
 * and BOM/quote calculations.
 * 
 * Features:
 * - Load system pricing from profile specifications
 * - Transform system_pricing format to PricingEngine format
 * - Provide unified API for price lookups (profiles, hardware, glazing)
 * - Handle legacy rock60_pricing key migration
 * - Support multi-currency conversion
 * - Cache pricing data for performance
 * - Support both workshop (constants) and enterprise (system_pricing) modes
 * 
 * @since Pricing Tuning Studio - Gold Tier Enhancement
 */

import { convertCurrency } from '@/lib/currencyExchange';
import {
    GLAZING_PRICES_EGP_PER_M2,
    HARDWARE_PRICES_EGP,
} from '@/lib/fabricator/bom/egyptianPricingConstants';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/fabricator';
import type {
    GlazingPriceResult,
    HardwarePriceResult,
    PricingImpactPreview,
    ProfilePriceResult,
    SystemPricingState,
} from '@/types/pricing';
import type { Currency } from './PricingEngine';

/**
 * Pricing cache entry
 */
interface PricingCacheEntry {
  data: SystemPricingState;
  timestamp: number;
  profileId: string;
  systemName: string;
}

/**
 * SystemPricingService - Unified pricing service layer
 */
export class SystemPricingService {
  private static instance: SystemPricingService;
  private pricingCache: Map<string, PricingCacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SystemPricingService {
    if (!SystemPricingService.instance) {
      SystemPricingService.instance = new SystemPricingService();
    }
    return SystemPricingService.instance;
  }

  /**
   * Load system pricing from profile specifications
   * Supports both system_pricing (new) and rock60_pricing (legacy) keys
   */
  async getSystemPricing(
    profileId: string,
    systemName?: string
  ): Promise<SystemPricingState | null> {
    // Check cache first
    const cacheKey = `${profileId}_${systemName || 'default'}`;
    const cached = this.pricingCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('fabricator_profiles')
        .select('specifications, system_brand')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        return null;
      }

      const specs = data.specifications || {};
      
      // Try system_pricing first (new format), fallback to rock60_pricing (legacy)
      const pricing = (specs.system_pricing || specs.rock60_pricing) as
        | (SystemPricingState & { initialized?: boolean })
        | undefined;

      if (!pricing) {
        return null;
      }

      // Cache the result
      this.pricingCache.set(cacheKey, {
        data: pricing,
        timestamp: Date.now(),
        profileId,
        systemName: systemName || '',
      });

      return pricing;
    } catch (error) {
      console.error('Error loading system pricing:', error);
      return null;
    }
  }

  /**
   * Calculate profile price using system_pricing
   * Falls back to constants if system_pricing not available
   */
  async calculateProfilePrice(
    profileCode: string,
    quantity: number,
    systemName: string,
    profile: Profile,
    targetCurrency?: Currency
  ): Promise<ProfilePriceResult> {
    const pricing = await this.getSystemPricing(profile.id, systemName);

    // If system_pricing exists and has price for this profile code
    if (pricing?.profilePrices?.[profileCode]) {
      let price = pricing.profilePrices[profileCode];

      // Convert currency if needed
      if (targetCurrency && pricing.currency !== targetCurrency) {
        const converted = await convertCurrency(
          price,
          pricing.currency as Currency,
          targetCurrency
        );
        price = converted.amount;
      }

      return {
        price: price * quantity,
        currency: (targetCurrency || pricing.currency) as Currency,
        source: 'system_pricing',
        profileCode,
        systemName,
      };
    }

    // Fallback to profile costPerMeter
    if (profile.costPerMeter > 0) {
      let price = profile.costPerMeter * quantity;

      // Convert currency if needed (assume EGP base)
      if (targetCurrency && targetCurrency !== 'EGP') {
        const converted = await convertCurrency(price, 'EGP', targetCurrency);
        price = converted.amount;
      }

      return {
        price,
        currency: (targetCurrency || 'EGP') as Currency,
        source: 'default',
        profileCode,
        systemName,
      };
    }

    // Last resort: return 0
    return {
      price: 0,
      currency: (targetCurrency || 'EGP') as Currency,
      source: 'default',
      profileCode,
      systemName,
    };
  }

  /**
   * Calculate hardware price using system_pricing
   * Falls back to Egyptian constants if not available
   */
  async calculateHardwarePrice(
    hardwareCode: string,
    quantity: number,
    systemName: string,
    profileId: string,
    targetCurrency?: Currency
  ): Promise<HardwarePriceResult> {
    const pricing = await this.getSystemPricing(profileId, systemName);

    // If system_pricing exists and has hardware price
    if (pricing?.hardware?.[hardwareCode]) {
      let price = pricing.hardware[hardwareCode];

      // Convert currency if needed
      if (targetCurrency && pricing.currency !== targetCurrency) {
        const converted = await convertCurrency(
          price,
          pricing.currency as Currency,
          targetCurrency
        );
        price = converted.amount;
      }

      return {
        price: price * quantity,
        currency: (targetCurrency || pricing.currency) as Currency,
        source: 'system_pricing',
        hardwareCode,
      };
    }

    // Fallback to constants (map hardware codes to constants)
    const hardwareConstants: Record<string, number> = {
      '0253': HARDWARE_PRICES_EGP.HINGE * 2, // Hinges (2 pcs)
      '0707': HARDWARE_PRICES_EGP.HANDLE, // Handle
      'KIT 10451': HARDWARE_PRICES_EGP.LOCK, // Locking Kit
    };

    let price = hardwareConstants[hardwareCode] || HARDWARE_PRICES_EGP.OTHER;

    // Convert currency if needed (assume EGP base for constants)
    if (targetCurrency && targetCurrency !== 'EGP') {
      const converted = await convertCurrency(price, 'EGP', targetCurrency);
      price = converted.amount;
    }

    return {
      price: price * quantity,
      currency: (targetCurrency || 'EGP') as Currency,
      source: 'constants',
      hardwareCode,
    };
  }

  /**
   * Calculate glazing price using system_pricing
   * Falls back to Egyptian constants if not available
   */
  async calculateGlazingPrice(
    glazingTypeId: string,
    area: number, // in square meters
    systemName: string,
    profileId: string,
    targetCurrency?: Currency
  ): Promise<GlazingPriceResult> {
    const pricing = await this.getSystemPricing(profileId, systemName);

    // If system_pricing exists and has glazing type
    if (pricing?.glazingTypes) {
      const glazingType = pricing.glazingTypes.find((gt) => gt.id === glazingTypeId);
      if (glazingType && glazingType.pricePerSquareMeter > 0) {
        let pricePerM2 = glazingType.pricePerSquareMeter;

        // Convert currency if needed
        if (targetCurrency && pricing.currency !== targetCurrency) {
          const converted = await convertCurrency(
            pricePerM2,
            pricing.currency as Currency,
            targetCurrency
          );
          pricePerM2 = converted.amount;
        }

        return {
          pricePerSquareMeter: pricePerM2,
          currency: (targetCurrency || pricing.currency) as Currency,
          source: 'system_pricing',
          glazingTypeId,
        };
      }
    }

    // Fallback to constants (map type IDs to constants)
    const glazingConstants: Record<string, number> = {
      single: GLAZING_PRICES_EGP_PER_M2.SINGLE,
      double: GLAZING_PRICES_EGP_PER_M2.DOUBLE,
      triple: GLAZING_PRICES_EGP_PER_M2.TRIPLE,
    };

    let pricePerM2 = glazingConstants[glazingTypeId] || GLAZING_PRICES_EGP_PER_M2.DOUBLE;

    // Convert currency if needed (assume EGP base for constants)
    if (targetCurrency && targetCurrency !== 'EGP') {
      const converted = await convertCurrency(pricePerM2, 'EGP', targetCurrency);
      pricePerM2 = converted.amount;
    }

    return {
      pricePerSquareMeter: pricePerM2,
      currency: (targetCurrency || 'EGP') as Currency,
      source: 'constants',
      glazingTypeId,
    };
  }

  /**
   * Calculate gasket price using system_pricing
   * Falls back to constants if not available
   */
  async calculateGasketPrice(
    gasketCode: string,
    length: number, // in meters
    systemName: string,
    profileId: string,
    targetCurrency?: Currency
  ): Promise<number> {
    const pricing = await this.getSystemPricing(profileId, systemName);

    // If system_pricing exists and has gasket price
    if (pricing?.gaskets?.[gasketCode]) {
      let pricePerMeter = pricing.gaskets[gasketCode];

      // Convert currency if needed
      if (targetCurrency && pricing.currency !== targetCurrency) {
        const converted = await convertCurrency(
          pricePerMeter,
          pricing.currency as Currency,
          targetCurrency
        );
        pricePerMeter = converted.amount;
      }

      return pricePerMeter * length;
    }

    // Fallback to constants
    let pricePerMeter: number = HARDWARE_PRICES_EGP.GASKET_PER_METER;

    // Convert currency if needed
    if (targetCurrency && targetCurrency !== 'EGP') {
      const converted = await convertCurrency(pricePerMeter, 'EGP', targetCurrency);
      pricePerMeter = converted.amount;
    }

    return pricePerMeter * length;
  }

  /**
   * Validate pricing configuration
   * Returns validation result with warnings and errors
   */
  validatePricing(pricing: SystemPricingState): {
    isValid: boolean;
    warnings: Array<{ field: string; message: string }>;
    errors: Array<{ field: string; message: string }>;
  } {
    const warnings: Array<{ field: string; message: string }> = [];
    const errors: Array<{ field: string; message: string }> = [];

    // Validate aluminum price
    if (pricing.aluminumPricePerKg <= 0) {
      warnings.push({
        field: 'aluminumPricePerKg',
        message: 'Aluminum price per kg should be greater than 0 for auto-calculation',
      });
    }

    // Validate currency
    if (!pricing.currency || pricing.currency.length !== 3) {
      errors.push({
        field: 'currency',
        message: 'Currency must be a valid 3-letter code (e.g., EGP, USD)',
      });
    }

    // Validate glazing types
    if (!pricing.glazingTypes || pricing.glazingTypes.length === 0) {
      warnings.push({
        field: 'glazingTypes',
        message: 'At least one glazing type should be configured',
      });
    }

    // Validate hardware prices (warn if empty, but not error)
    if (!pricing.hardware || Object.keys(pricing.hardware).length === 0) {
      warnings.push({
        field: 'hardware',
        message: 'No hardware prices configured. Will use default constants.',
      });
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Clear cache for a specific profile/system
   */
  clearCache(profileId?: string, systemName?: string): void {
    if (profileId && systemName) {
      const cacheKey = `${profileId}_${systemName}`;
      this.pricingCache.delete(cacheKey);
    } else {
      // Clear all cache
      this.pricingCache.clear();
    }
  }

  /**
   * Get pricing impact preview for a system pack
   * (Simplified version - can be enhanced later)
   */
  async getPricingImpactPreview(
    systemName: string,
    profileId: string
  ): Promise<PricingImpactPreview | null> {
    const pricing = await this.getSystemPricing(profileId, systemName);

    if (!pricing) {
      return null;
    }

    // Calculate configuration coverage
    const profileCount = Object.keys(pricing.profilePrices || {}).length;
    const hardwareCount = Object.keys(pricing.hardware || {}).length;
    const glazingCount = pricing.glazingTypes?.length || 0;
    const totalExpected = 10; // Approximate expected items (can be refined)

    const configured = profileCount + hardwareCount + glazingCount;
    const coveragePercentage = totalExpected > 0 ? (configured / totalExpected) * 100 : 0;

    // Simplified impact calculation (can be enhanced with actual quote data)
    return {
      averageQuoteImpact: 0, // TODO: Calculate from actual quotes
      bomCostBreakdown: {
        profiles: 0, // TODO: Calculate from BOM
        hardware: 0,
        glazing: 0,
        total: 0,
      },
      profitMargin: 0, // TODO: Calculate from pricing
      configurationCoverage: {
        configured,
        total: totalExpected,
        percentage: coveragePercentage,
      },
    };
  }
}

// Export singleton instance getter
export const systemPricingService = SystemPricingService.getInstance();
