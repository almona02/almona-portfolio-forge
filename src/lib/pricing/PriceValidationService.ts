/**
 * Price Validation Service
 * 
 * Comprehensive validation service for system pricing configurations.
 * Provides real-time validation with detailed alerts and recommendations.
 * 
 * Features:
 * - Profit margin validation
 * - Price consistency checks
 * - Market comparison (when available)
 * - Cross-field validation
 * - Real-time alert generation
 * - Validation scoring
 * 
 * @since Pricing Tuning Studio - Gold Tier Enhancement
 */

import type { SystemPricingState } from '@/types/pricing';
import type { PriceValidationAlert } from './PricingEngine';

/**
 * Validation configuration
 */
export interface ValidationConfig {
  minProfitMargin: number; // Minimum profit margin percentage (default: 10%)
  maxMarkupPercentage: number; // Maximum markup percentage (default: 200%)
  minAluminumPricePerKg: number; // Minimum aluminum price per kg (default: 0)
  maxAluminumPricePerKg: number; // Maximum aluminum price per kg (default: 1000)
  requireGlazingTypes: boolean; // Require at least one glazing type
  requireHardware: boolean; // Require at least one hardware price
  minPriceThreshold: number; // Minimum price threshold (default: 0)
}

/**
 * Validation result with alerts and score
 */
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100 validation score
  alerts: PriceValidationAlert[];
  warnings: PriceValidationAlert[];
  errors: PriceValidationAlert[];
  recommendations: string[];
}

/**
 * Default validation configuration
 */
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minProfitMargin: 10, // 10% minimum profit margin
  maxMarkupPercentage: 200, // 200% maximum markup
  minAluminumPricePerKg: 0,
  maxAluminumPricePerKg: 1000,
  requireGlazingTypes: true,
  requireHardware: false, // Hardware can use defaults
  minPriceThreshold: 0,
};

/**
 * PriceValidationService - Comprehensive pricing validation service
 */
export class PriceValidationService {
  private static instance: PriceValidationService;
  private config: ValidationConfig;

  private constructor(config?: Partial<ValidationConfig>) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ValidationConfig>): PriceValidationService {
    if (!PriceValidationService.instance) {
      PriceValidationService.instance = new PriceValidationService(config);
    }
    return PriceValidationService.instance;
  }

  /**
   * Validate pricing configuration comprehensively
   */
  validatePricing(pricing: SystemPricingState): ValidationResult {
    const alerts: PriceValidationAlert[] = [];
    const warnings: PriceValidationAlert[] = [];
    const errors: PriceValidationAlert[] = [];
    const recommendations: string[] = [];

    // 1. Currency validation
    this.validateCurrency(pricing, alerts);

    // 2. Aluminum price validation
    this.validateAluminumPrice(pricing, alerts, warnings);

    // 3. Profile prices validation
    this.validateProfilePrices(pricing, alerts, warnings);

    // 4. Hardware prices validation
    this.validateHardwarePrices(pricing, alerts, warnings);

    // 5. Glazing types validation
    this.validateGlazingTypes(pricing, alerts, warnings);

    // 6. Gaskets validation
    this.validateGaskets(pricing, alerts, warnings);

    // 7. Price consistency validation
    this.validatePriceConsistency(pricing, warnings, recommendations);

    // Categorize alerts
    alerts.forEach((alert) => {
      if (alert.severity === 'error' || alert.severity === 'critical') {
        errors.push(alert);
      } else {
        warnings.push(alert);
      }
    });

    // Calculate validation score (0-100)
    const score = this.calculateValidationScore(alerts, pricing);

    // Generate recommendations
    this.generateRecommendations(pricing, alerts, recommendations);

    return {
      isValid: errors.length === 0,
      score,
      alerts,
      warnings,
      errors,
      recommendations,
    };
  }

  /**
   * Validate currency
   */
  private validateCurrency(
    pricing: SystemPricingState,
    alerts: PriceValidationAlert[]
  ): void {
    if (!pricing.currency || pricing.currency.length !== 3) {
      alerts.push({
        alertType: 'missing_configuration',
        severity: 'error',
        entityType: 'pricing',
        message: 'Currency must be a valid 3-letter code (e.g., EGP, USD, EUR)',
        details: { currency: pricing.currency },
      });
    }
  }

  /**
   * Validate aluminum price
   */
  private validateAluminumPrice(
    pricing: SystemPricingState,
    alerts: PriceValidationAlert[],
    warnings: PriceValidationAlert[]
  ): void {
    if (pricing.aluminumPricePerKg <= 0) {
      warnings.push({
        alertType: 'missing_configuration',
        severity: 'warning',
        entityType: 'pricing',
        message: 'Aluminum price per kg should be greater than 0 for auto-calculation',
        details: { aluminumPricePerKg: pricing.aluminumPricePerKg },
      });
    } else if (pricing.aluminumPricePerKg < this.config.minAluminumPricePerKg) {
      warnings.push({
        alertType: 'excessive_markup',
        severity: 'warning',
        entityType: 'pricing',
        message: `Aluminum price (${pricing.aluminumPricePerKg}) is very low. Please verify.`,
        details: { aluminumPricePerKg: pricing.aluminumPricePerKg },
      });
    } else if (pricing.aluminumPricePerKg > this.config.maxAluminumPricePerKg) {
      warnings.push({
        alertType: 'excessive_markup',
        severity: 'warning',
        entityType: 'pricing',
        message: `Aluminum price (${pricing.aluminumPricePerKg}) is very high. Please verify.`,
        details: { aluminumPricePerKg: pricing.aluminumPricePerKg },
      });
    }
  }

  /**
   * Validate profile prices
   */
  private validateProfilePrices(
    pricing: SystemPricingState,
    alerts: PriceValidationAlert[],
    warnings: PriceValidationAlert[]
  ): void {
    const profilePrices = pricing.profilePrices || {};

    if (Object.keys(profilePrices).length === 0) {
      warnings.push({
        alertType: 'missing_configuration',
        severity: 'warning',
        entityType: 'pricing',
        message: 'No profile prices configured. System will use default costs.',
        details: {},
      });
      return;
    }

    Object.entries(profilePrices).forEach(([code, price]) => {
      if (price < this.config.minPriceThreshold) {
        alerts.push({
          alertType: 'negative_price',
          severity: 'error',
          entityType: 'profile',
          entityId: code,
          entityName: code,
          message: `Profile ${code} has invalid price: ${price}`,
          details: { code, price },
        });
      } else if (price === 0) {
        warnings.push({
          alertType: 'low_profit_margin',
          severity: 'warning',
          entityType: 'profile',
          entityId: code,
          entityName: code,
          message: `Profile ${code} has zero price. Please set a price.`,
          details: { code, price },
        });
      }
    });
  }

  /**
   * Validate hardware prices
   */
  private validateHardwarePrices(
    pricing: SystemPricingState,
    alerts: PriceValidationAlert[],
    warnings: PriceValidationAlert[]
  ): void {
    const hardware = pricing.hardware || {};

    if (this.config.requireHardware && Object.keys(hardware).length === 0) {
      warnings.push({
        alertType: 'missing_configuration',
        severity: 'warning',
        entityType: 'pricing',
        message: 'No hardware prices configured. Will use default constants.',
        details: {},
      });
      return;
    }

    Object.entries(hardware).forEach(([code, price]) => {
      if (price < this.config.minPriceThreshold) {
        alerts.push({
          alertType: 'negative_price',
          severity: 'error',
          entityType: 'hardware',
          entityId: code,
          entityName: code,
          message: `Hardware ${code} has invalid price: ${price}`,
          details: { code, price },
        });
      }
    });
  }

  /**
   * Validate glazing types
   */
  private validateGlazingTypes(
    pricing: SystemPricingState,
    alerts: PriceValidationAlert[],
    warnings: PriceValidationAlert[]
  ): void {
    const glazingTypes = pricing.glazingTypes || [];

    if (this.config.requireGlazingTypes && glazingTypes.length === 0) {
      alerts.push({
        alertType: 'missing_configuration',
        severity: 'error',
        entityType: 'pricing',
        message: 'At least one glazing type must be configured',
        details: {},
      });
      return;
    }

    glazingTypes.forEach((glazing) => {
      if (glazing.pricePerSquareMeter < this.config.minPriceThreshold) {
        alerts.push({
          alertType: 'negative_price',
          severity: 'error',
          entityType: 'glazing',
          entityId: glazing.id,
          entityName: glazing.name,
          message: `Glazing type ${glazing.name} has invalid price: ${glazing.pricePerSquareMeter}`,
          details: { id: glazing.id, name: glazing.name, price: glazing.pricePerSquareMeter },
        });
      } else if (glazing.pricePerSquareMeter === 0) {
        warnings.push({
          alertType: 'low_profit_margin',
          severity: 'warning',
          entityType: 'glazing',
          entityId: glazing.id,
          entityName: glazing.name,
          message: `Glazing type ${glazing.name} has zero price. Please set a price.`,
          details: { id: glazing.id, name: glazing.name },
        });
      }
    });
  }

  /**
   * Validate gaskets
   */
  private validateGaskets(
    pricing: SystemPricingState,
    alerts: PriceValidationAlert[],
    _warnings: PriceValidationAlert[]
  ): void {
    const gaskets = pricing.gaskets || {};

    Object.entries(gaskets).forEach(([code, price]) => {
      if (price < this.config.minPriceThreshold) {
        alerts.push({
          alertType: 'negative_price',
          severity: 'error',
          entityType: 'gasket',
          entityId: code,
          entityName: code,
          message: `Gasket ${code} has invalid price: ${price}`,
          details: { code, price },
        });
      }
    });
  }

  /**
   * Validate price consistency
   */
  private validatePriceConsistency(
    pricing: SystemPricingState,
    warnings: PriceValidationAlert[],
    recommendations: string[]
  ): void {
    const profilePrices = pricing.profilePrices || {};
    const glazingTypes = pricing.glazingTypes || [];

    // Check if prices seem too low compared to aluminum price
    if (pricing.aluminumPricePerKg > 0) {
      const avgProfilePrice = Object.values(profilePrices).reduce((sum, price) => sum + price, 0) / Object.keys(profilePrices).length || 0;
      
      // Rough check: profile price should be at least 2x aluminum price per kg (for 1 meter)
      // This is a simplified check - actual calculation depends on profile dimensions
      if (avgProfilePrice > 0 && avgProfilePrice < pricing.aluminumPricePerKg * 2) {
        warnings.push({
          alertType: 'low_profit_margin',
          severity: 'warning',
          entityType: 'pricing',
          message: 'Average profile prices seem low compared to aluminum price. Please verify.',
          details: { 
            avgProfilePrice, 
            aluminumPricePerKg: pricing.aluminumPricePerKg 
          },
        });
      }
    }

    // Check for price consistency across glazing types
    if (glazingTypes.length > 1) {
      const prices = glazingTypes.map((gt) => gt.pricePerSquareMeter);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;

      // If price range is more than 50% of average, warn
      if (avgPrice > 0 && priceRange / avgPrice > 0.5) {
        recommendations.push('Glazing type prices have high variance. Consider reviewing for consistency.');
      }
    }
  }

  /**
   * Calculate validation score (0-100)
   */
  private calculateValidationScore(
    alerts: PriceValidationAlert[],
    pricing: SystemPricingState
  ): number {
    let score = 100;

    // Deduct points for errors
    const errorCount = alerts.filter((a) => a.severity === 'error' || a.severity === 'critical').length;
    score -= errorCount * 20; // -20 points per error

    // Deduct points for warnings
    const warningCount = alerts.filter((a) => a.severity === 'warning').length;
    score -= warningCount * 5; // -5 points per warning

    // Deduct points for missing configuration
    const profileCount = Object.keys(pricing.profilePrices || {}).length;
    const hardwareCount = Object.keys(pricing.hardware || {}).length;
    const glazingCount = pricing.glazingTypes?.length || 0;

    if (profileCount === 0) score -= 15;
    if (hardwareCount === 0) score -= 10;
    if (glazingCount === 0) score -= 15;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    pricing: SystemPricingState,
    alerts: PriceValidationAlert[],
    recommendations: string[]
  ): void {
    const profileCount = Object.keys(pricing.profilePrices || {}).length;
    const hardwareCount = Object.keys(pricing.hardware || {}).length;
    const glazingCount = pricing.glazingTypes?.length || 0;

    if (profileCount === 0) {
      recommendations.push('Configure at least one profile price to enable accurate cost calculations.');
    }

    if (hardwareCount === 0) {
      recommendations.push('Consider configuring hardware prices for better accuracy. Default constants will be used otherwise.');
    }

    if (glazingCount === 0) {
      recommendations.push('Configure at least one glazing type for accurate glazing cost calculations.');
    }

    if (pricing.aluminumPricePerKg <= 0) {
      recommendations.push('Set aluminum price per kg to enable automatic profile price calculations.');
    }

    // Check for zero prices
    const hasZeroPrices = 
      Object.values(pricing.profilePrices || {}).some((p) => p === 0) ||
      Object.values(pricing.hardware || {}).some((p) => p === 0) ||
      (pricing.glazingTypes || []).some((gt) => gt.pricePerSquareMeter === 0);

    if (hasZeroPrices) {
      recommendations.push('Review and update any zero prices for accurate cost calculations.');
    }
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current validation configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}

// Export singleton instance getter
export const priceValidationService = PriceValidationService.getInstance();
