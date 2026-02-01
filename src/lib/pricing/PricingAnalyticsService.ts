/**
 * Pricing Analytics Service
 * 
 * Service for tracking pricing usage, impact, and accuracy metrics.
 * Provides analytics on:
 * - Pricing configuration coverage (which system packs have pricing)
 * - Pricing usage statistics (most used prices, hardware, glazing)
 * - Price impact on quote profitability
 * - Pricing accuracy metrics (comparison with market rates)
 * - Usage statistics per system pack
 * 
 * @since Pricing Tuning Studio - Gold Tier Enhancement
 */

import { supabase } from '@/lib/supabase';
import type { SystemPricingState } from '@/types/pricing';

/**
 * Pricing configuration coverage statistics
 */
export interface PricingCoverageStats {
  totalSystemPacks: number;
  configuredSystemPacks: number;
  coveragePercentage: number;
  systemPacksWithPricing: string[];
  systemPacksWithoutPricing: string[];
}

/**
 * Pricing usage statistics
 */
export interface PricingUsageStats {
  mostUsedProfiles: Array<{
    profileCode: string;
    usageCount: number;
    averagePrice: number;
    currency: string;
  }>;
  mostUsedHardware: Array<{
    hardwareCode: string;
    usageCount: number;
    averagePrice: number;
    currency: string;
  }>;
  mostUsedGlazing: Array<{
    glazingType: string;
    usageCount: number;
    averagePrice: number;
    currency: string;
  }>;
  totalQuotesUsingPricing: number;
  totalBOMsUsingPricing: number;
}

/**
 * Pricing impact metrics
 */
export interface PricingImpactMetrics {
  averageQuoteValue: number;
  averageProfitMargin: number;
  quotesWithCustomPricing: number;
  quotesWithDefaultPricing: number;
  pricingContributionToProfit: number; // Percentage
}

/**
 * Pricing health metrics
 */
export interface PricingHealthMetrics {
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  healthScore: number; // 0-100
  issues: Array<{
    type: 'missing_pricing' | 'outdated_pricing' | 'inconsistent_pricing' | 'validation_errors';
    severity: 'high' | 'medium' | 'low';
    message: string;
    systemPackId?: string;
    profileId?: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    message: string;
    action?: string;
  }>;
}

/**
 * System pack pricing statistics
 */
export interface SystemPackPricingStats {
  systemPackId: string;
  hasCustomPricing: boolean;
  profileCount: number;
  configuredProfileCount: number;
  hardwareCount: number;
  configuredHardwareCount: number;
  glazingTypesCount: number;
  configuredGlazingTypesCount: number;
  lastUpdated?: Date;
  coveragePercentage: number;
}

/**
 * Pricing Analytics Service
 */
export class PricingAnalyticsService {
  private static instance: PricingAnalyticsService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PricingAnalyticsService {
    if (!PricingAnalyticsService.instance) {
      PricingAnalyticsService.instance = new PricingAnalyticsService();
    }
    return PricingAnalyticsService.instance;
  }

  /**
   * Get pricing configuration coverage statistics
   * 
   * @param userId - User ID to filter profiles
   * @returns Coverage statistics for all system packs
   */
  async getPricingCoverage(userId: string): Promise<PricingCoverageStats> {
    try {
      const db = supabase as any;
      
      // Get all profiles for the user
      const { data: profiles, error } = await db
        .from('fabricator_profiles')
        .select('id, system_brand, specifications')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching profiles for pricing coverage:', error);
        return {
          totalSystemPacks: 0,
          configuredSystemPacks: 0,
          coveragePercentage: 0,
          systemPacksWithPricing: [],
          systemPacksWithoutPricing: [],
        };
      }

      // Group by system pack
      const systemPackMap = new Map<string, { hasPricing: boolean; profiles: any[] }>();
      
      (profiles || []).forEach((profile: any) => {
        const systemPackId = profile.system_brand || 'unknown';
        const specs = profile.specifications || {};
        const hasPricing = !!(specs.system_pricing || specs.rock60_pricing);

        if (!systemPackMap.has(systemPackId)) {
          systemPackMap.set(systemPackId, { hasPricing: false, profiles: [] });
        }

        const pack = systemPackMap.get(systemPackId)!;
        pack.profiles.push(profile);
        if (hasPricing) {
          pack.hasPricing = true;
        }
      });

      const systemPacks = Array.from(systemPackMap.keys());
      const configuredSystemPacks = systemPacks.filter(
        (packId) => systemPackMap.get(packId)!.hasPricing
      );

      return {
        totalSystemPacks: systemPacks.length,
        configuredSystemPacks: configuredSystemPacks.length,
        coveragePercentage:
          systemPacks.length > 0 ? (configuredSystemPacks.length / systemPacks.length) * 100 : 0,
        systemPacksWithPricing: configuredSystemPacks,
        systemPacksWithoutPricing: systemPacks.filter(
          (packId) => !systemPackMap.get(packId)!.hasPricing
        ),
      };
    } catch (error) {
      console.error('Error calculating pricing coverage:', error);
      return {
        totalSystemPacks: 0,
        configuredSystemPacks: 0,
        coveragePercentage: 0,
        systemPacksWithPricing: [],
        systemPacksWithoutPricing: [],
      };
    }
  }

  /**
   * Get pricing usage statistics
   * 
   * @param userId - User ID to filter data
   * @param systemPackId - Optional: filter by system pack
   * @returns Usage statistics for pricing
   */
  async getPricingUsageStats(
    userId: string,
    systemPackId?: string
  ): Promise<PricingUsageStats> {
    try {
      const db = supabase as any;

      // Get profiles with pricing
      let query = db
        .from('fabricator_profiles')
        .select('id, system_brand, specifications')
        .eq('user_id', userId);

      if (systemPackId) {
        query = query.eq('system_brand', systemPackId);
      }

      const { data: profiles, error } = await query;

      if (error) {
        console.error('Error fetching profiles for usage stats:', error);
        return {
          mostUsedProfiles: [],
          mostUsedHardware: [],
          mostUsedGlazing: [],
          totalQuotesUsingPricing: 0,
          totalBOMsUsingPricing: 0,
        };
      }

      // Aggregate pricing data
      const profileUsage = new Map<string, { count: number; totalPrice: number; currency: string }>();
      const hardwareUsage = new Map<string, { count: number; totalPrice: number; currency: string }>();
      const glazingUsage = new Map<string, { count: number; totalPrice: number; currency: string }>();

      (profiles || []).forEach((profile: any) => {
        const specs = profile.specifications || {};
        const pricing = (specs.system_pricing || specs.rock60_pricing) as SystemPricingState | undefined;

        if (pricing) {
          // Profile prices
          Object.entries(pricing.profilePrices || {}).forEach(([code, price]) => {
            if (!profileUsage.has(code)) {
              profileUsage.set(code, { count: 0, totalPrice: 0, currency: pricing.currency || 'EGP' });
            }
            const usage = profileUsage.get(code)!;
            usage.count += 1;
            usage.totalPrice += price;
          });

          // Hardware prices
          Object.entries(pricing.hardware || {}).forEach(([code, price]) => {
            if (!hardwareUsage.has(code)) {
              hardwareUsage.set(code, { count: 0, totalPrice: 0, currency: pricing.currency || 'EGP' });
            }
            const usage = hardwareUsage.get(code)!;
            usage.count += 1;
            usage.totalPrice += price;
          });

          // Glazing types
          (pricing.glazingTypes || []).forEach((gt) => {
            const code = gt.id || gt.name || 'unknown';
            if (!glazingUsage.has(code)) {
              glazingUsage.set(code, { count: 0, totalPrice: 0, currency: pricing.currency || 'EGP' });
            }
            const usage = glazingUsage.get(code)!;
            usage.count += 1;
            usage.totalPrice += gt.pricePerSquareMeter || 0;
          });
        }
      });

      // Convert to arrays and calculate averages
      const mostUsedProfiles = Array.from(profileUsage.entries())
        .map(([code, usage]) => ({
          profileCode: code,
          usageCount: usage.count,
          averagePrice: usage.totalPrice / usage.count,
          currency: usage.currency,
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

      const mostUsedHardware = Array.from(hardwareUsage.entries())
        .map(([code, usage]) => ({
          hardwareCode: code,
          usageCount: usage.count,
          averagePrice: usage.totalPrice / usage.count,
          currency: usage.currency,
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

      const mostUsedGlazing = Array.from(glazingUsage.entries())
        .map(([code, usage]) => ({
          glazingType: code,
          usageCount: usage.count,
          averagePrice: usage.totalPrice / usage.count,
          currency: usage.currency,
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

      // TODO: Get actual quote/BOM counts from database
      // For now, estimate based on profiles with pricing
      const profilesWithPricing = (profiles || []).filter(
        (p: any) => !!(p.specifications?.system_pricing || p.specifications?.rock60_pricing)
      ).length;

      return {
        mostUsedProfiles,
        mostUsedHardware,
        mostUsedGlazing,
        totalQuotesUsingPricing: profilesWithPricing, // Estimate
        totalBOMsUsingPricing: profilesWithPricing, // Estimate
      };
    } catch (error) {
      console.error('Error calculating pricing usage stats:', error);
      return {
        mostUsedProfiles: [],
        mostUsedHardware: [],
        mostUsedGlazing: [],
        totalQuotesUsingPricing: 0,
        totalBOMsUsingPricing: 0,
      };
    }
  }

  /**
   * Get pricing health metrics
   * 
   * @param userId - User ID to filter data
   * @returns Health metrics and recommendations
   */
  async getPricingHealth(userId: string): Promise<PricingHealthMetrics> {
    try {
      const coverage = await this.getPricingCoverage(userId);
      const issues: PricingHealthMetrics['issues'] = [];
      const recommendations: PricingHealthMetrics['recommendations'] = [];

      // Calculate health score (0-100)
      let healthScore = 0;

      // Coverage contributes 40% to health score
      const coverageScore = coverage.coveragePercentage;
      healthScore += (coverageScore * 0.4);

      // Check for system packs without pricing
      if (coverage.systemPacksWithoutPricing.length > 0) {
        coverage.systemPacksWithoutPricing.forEach((systemPackId) => {
          issues.push({
            type: 'missing_pricing',
            severity: 'high',
            message: `System pack "${systemPackId}" has no custom pricing configured`,
            systemPackId,
          });
        });

        recommendations.push({
          priority: 'high',
          message: `Configure pricing for ${coverage.systemPacksWithoutPricing.length} system pack(s)`,
          action: 'Open Pricing Tuning Studio to configure pricing',
        });
      }

      // Coverage score adjustment
      if (coverage.coveragePercentage < 50) {
        healthScore -= 20; // Penalty for low coverage
      } else if (coverage.coveragePercentage < 80) {
        healthScore -= 10; // Small penalty
      }

      // Health score baseline (remaining 60% comes from other factors)
      // For now, assume good health if coverage is good
      if (coverage.coveragePercentage >= 80) {
        healthScore += 60; // Full points for good coverage
      } else if (coverage.coveragePercentage >= 50) {
        healthScore += 40; // Partial points
      } else {
        healthScore += 20; // Minimal points
      }

      // Clamp health score to 0-100
      healthScore = Math.max(0, Math.min(100, healthScore));

      // Determine overall health
      let overallHealth: PricingHealthMetrics['overallHealth'];
      if (healthScore >= 80) {
        overallHealth = 'excellent';
      } else if (healthScore >= 60) {
        overallHealth = 'good';
      } else if (healthScore >= 40) {
        overallHealth = 'fair';
      } else {
        overallHealth = 'poor';
      }

      return {
        overallHealth,
        healthScore: Math.round(healthScore),
        issues,
        recommendations,
      };
    } catch (error) {
      console.error('Error calculating pricing health:', error);
      return {
        overallHealth: 'poor',
        healthScore: 0,
        issues: [
          {
            type: 'missing_pricing',
            severity: 'high',
            message: 'Error calculating pricing health metrics',
          },
        ],
        recommendations: [],
      };
    }
  }

  /**
   * Get system pack pricing statistics
   * 
   * @param userId - User ID to filter profiles
   * @param systemPackId - System pack ID
   * @returns Statistics for the system pack
   */
  async getSystemPackPricingStats(
    userId: string,
    systemPackId: string
  ): Promise<SystemPackPricingStats | null> {
    try {
      const db = supabase as any;

      const { data: profiles, error } = await db
        .from('fabricator_profiles')
        .select('id, specifications')
        .eq('user_id', userId)
        .eq('system_brand', systemPackId);

      if (error || !profiles || profiles.length === 0) {
        return null;
      }

      let configuredProfileCount = 0;
      let configuredHardwareCount = 0;
      let configuredGlazingTypesCount = 0;
      let hasCustomPricing = false;
      let lastUpdated: Date | undefined;

      profiles.forEach((profile: any) => {
        const specs = profile.specifications || {};
        const pricing = (specs.system_pricing || specs.rock60_pricing) as
          | (SystemPricingState & { lastUpdated?: string })
          | undefined;

        if (pricing) {
          hasCustomPricing = true;
          configuredProfileCount += Object.keys(pricing.profilePrices || {}).length;
          configuredHardwareCount += Object.keys(pricing.hardware || {}).length;
          configuredGlazingTypesCount += (pricing.glazingTypes || []).length;

          if (pricing.lastUpdated && (!lastUpdated || new Date(pricing.lastUpdated) > lastUpdated)) {
            lastUpdated = new Date(pricing.lastUpdated);
          }
        }
      });

      // Estimate total expected counts (rough estimate)
      const totalProfiles = profiles.length;
      const estimatedHardwareCount = 20; // Rough estimate
      const estimatedGlazingTypesCount = 10; // Rough estimate

      const profileCoverage = totalProfiles > 0 ? (configuredProfileCount / totalProfiles) * 100 : 0;
      const hardwareCoverage = estimatedHardwareCount > 0
        ? (configuredHardwareCount / estimatedHardwareCount) * 100
        : 0;
      const glazingCoverage = estimatedGlazingTypesCount > 0
        ? (configuredGlazingTypesCount / estimatedGlazingTypesCount) * 100
        : 0;

      const coveragePercentage = (profileCoverage + hardwareCoverage + glazingCoverage) / 3;

      return {
        systemPackId,
        hasCustomPricing,
        profileCount: totalProfiles,
        configuredProfileCount,
        hardwareCount: estimatedHardwareCount,
        configuredHardwareCount,
        glazingTypesCount: estimatedGlazingTypesCount,
        configuredGlazingTypesCount,
        lastUpdated,
        coveragePercentage: Math.round(coveragePercentage),
      };
    } catch (error) {
      console.error('Error calculating system pack pricing stats:', error);
      return null;
    }
  }
}

// Export singleton instance getter
export const pricingAnalyticsService = PricingAnalyticsService.getInstance();
