/**
 * Comprehensive Pricing Engine
 * Handles multi-currency pricing, regional variations, material markups,
 * labor costs, and integration with QuotingEngine
 */

import { convertCurrency, formatCurrency, getExchangeRate, type ExchangeRate } from '@/lib/currencyExchange';
import { TURKISH_CONFIG, EGYPTIAN_CONFIG } from '@/config/regionalConfig';
import { QuotingEngine, type PricingConfig, type Quote } from '@/modules/commercial/QuotingEngine';
import { Profile, FabricatorAccessory } from '@/types/fabricator';

export type Currency = 'TRY' | 'EGP' | 'USD' | 'EUR';
export type Region = 'turkey' | 'egypt' | 'global';
export type MaterialType = 'aluminum' | 'upvc' | 'wood';
export type OperationType = 'cutting' | 'machining' | 'assembly' | 'welding' | 'finishing' | 'installation';
export type RoundingMethod = 'standard' | 'up' | 'down' | 'nearest';
export type AlertType = 'low_profit_margin' | 'negative_price' | 'excessive_markup' | 'currency_mismatch' | 'expired_price' | 'missing_configuration';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Simple metal price index model used to adjust aluminium costs over time.
 * This is intentionally minimal and can be backed by LME or local indices.
 */
export interface MetalPriceIndex {
  basePricePerKg: number;
  currentPricePerKg: number;
  currency: Currency;
  lastUpdated: Date;
  source: 'LME' | 'LOCAL' | 'CUSTOM';
}

export interface MaterialPricingRule {
  id?: string;
  profileId?: string;
  materialType: MaterialType;
  region: Region;
  currency: Currency;
  baseCostPerMeter: number;
  markupPercentage: number;
  discountPercentage: number;
  finalPricePerMeter: number;
  quantityBreaks?: QuantityBreak[];
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
}

export interface QuantityBreak {
  min: number;
  max?: number;
  discount: number;
}

export interface LaborCostConfig {
  id?: string;
  region: Region;
  currency: Currency;
  operationType: OperationType;
  operationName: string;
  baseRatePerHour: number;
  markupPercentage: number;
  finalRatePerHour: number;
  complexityMultipliers?: Record<string, number>;
  isActive: boolean;
}

export interface PricingConfiguration {
  id?: string;
  userId?: string;
  region: Region;
  currency: Currency;
  isActive: boolean;
  materialMarkupPercentage: number;
  aluminumMarkupPercentage?: number;
  upvcMarkupPercentage?: number;
  woodMarkupPercentage?: number;
  laborMarkupPercentage: number;
  baseLaborRatePerHour?: number;
  hardwareMarkupPercentage: number;
  glazingMarkupPercentage: number;
  installationMarkupPercentage: number;
  defaultTaxRate: number;
  taxName: string;
  minProfitMargin: number;
  maxDiscountPercentage: number;
  roundingMethod: RoundingMethod;
  roundingPrecision: number;
  settings?: Record<string, any>;
  /**
   * Optional metal price index used to adjust aluminium base costs.
   * When present, base aluminium prices are scaled by the index ratio
   * before applying markups and discounts.
   */
  metalIndex?: MetalPriceIndex;
}

export interface PriceHistoryEntry {
  id?: string;
  entityType: 'profile' | 'accessory' | 'material' | 'labor' | 'configuration';
  entityId?: string;
  entityName?: string;
  region?: Region;
  currency: Currency;
  oldPrice?: number;
  newPrice: number;
  priceChangePercentage?: number;
  changeReason?: string;
  changeSource?: 'manual' | 'bulk_import' | 'api' | 'scheduled';
  versionNumber?: number;
  createdAt?: Date;
}

export interface PriceValidationAlert {
  id?: string;
  alertType: AlertType;
  severity: AlertSeverity;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  message: string;
  details?: Record<string, any>;
  isResolved?: boolean;
  createdAt?: Date;
}

export interface CalculatedPrice {
  baseCost: number;
  markupAmount: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: Currency;
  exchangeRate?: ExchangeRate;
  profitMargin: number;
}

export interface BulkPriceUpdate {
  profileId?: string;
  materialType?: MaterialType;
  baseCost: number;
  markupPercentage?: number;
  discountPercentage?: number;
  region?: Region;
  currency?: Currency;
}

export class PricingEngine {
  private config: PricingConfiguration;
  private materialRules: Map<string, MaterialPricingRule> = new Map();
  private laborConfigs: Map<string, LaborCostConfig> = new Map();
  private quotingEngine: QuotingEngine;
  private supabaseClient: any; // Will be injected

  constructor(
    config: Partial<PricingConfiguration> = {},
    supabaseClient?: any
  ) {
    this.supabaseClient = supabaseClient;
    this.config = this.initializeConfig(config);
    this.quotingEngine = new QuotingEngine(this.toQuotingEngineConfig());
  }

  /**
   * Initialize pricing configuration with defaults
   */
  private initializeConfig(config: Partial<PricingConfiguration>): PricingConfiguration {
    const region = config.region || 'global';
    const currency = config.currency || this.getCurrencyForRegion(region);
    const taxConfig = this.getTaxConfigForRegion(region);

    return {
      region,
      currency,
      isActive: config.isActive ?? true,
      materialMarkupPercentage: config.materialMarkupPercentage ?? 35,
      aluminumMarkupPercentage: config.aluminumMarkupPercentage,
      upvcMarkupPercentage: config.upvcMarkupPercentage,
      woodMarkupPercentage: config.woodMarkupPercentage,
      laborMarkupPercentage: config.laborMarkupPercentage ?? 50,
      baseLaborRatePerHour: config.baseLaborRatePerHour,
      hardwareMarkupPercentage: config.hardwareMarkupPercentage ?? 40,
      glazingMarkupPercentage: config.glazingMarkupPercentage ?? 30,
      installationMarkupPercentage: config.installationMarkupPercentage ?? 45,
      defaultTaxRate: config.defaultTaxRate ?? taxConfig.rate * 100,
      taxName: config.taxName ?? taxConfig.name,
      minProfitMargin: config.minProfitMargin ?? 25,
      maxDiscountPercentage: config.maxDiscountPercentage ?? 15,
      roundingMethod: config.roundingMethod ?? 'standard',
      roundingPrecision: config.roundingPrecision ?? 2,
      settings: config.settings ?? {},
      metalIndex: config.metalIndex,
    };
  }

  /**
   * Convert to QuotingEngine config format
   */
  private toQuotingEngineConfig(): PricingConfig {
    return {
      materialMarkup: this.config.materialMarkupPercentage,
      laborMarkup: this.config.laborMarkupPercentage,
      hardwareMarkup: this.config.hardwareMarkupPercentage,
      glazingMarkup: this.config.glazingMarkupPercentage,
      installationMarkup: this.config.installationMarkupPercentage,
      defaultTaxRate: this.config.defaultTaxRate,
      minProfitMargin: this.config.minProfitMargin,
      maxDiscount: this.config.maxDiscountPercentage,
    };
  }

  /**
   * Get currency for region
   */
  private getCurrencyForRegion(region: Region): Currency {
    switch (region) {
      case 'turkey':
        return 'TRY';
      case 'egypt':
        return 'EGP';
      default:
        return 'USD';
    }
  }

  /**
   * Get tax configuration for region
   */
  private getTaxConfigForRegion(region: Region): { rate: number; name: string } {
    switch (region) {
      case 'turkey':
        return { rate: TURKISH_CONFIG.tax.vatRate, name: TURKISH_CONFIG.tax.vatName };
      case 'egypt':
        return { rate: EGYPTIAN_CONFIG.tax.vatRate, name: EGYPTIAN_CONFIG.tax.vatName };
      default:
        return { rate: 0.20, name: 'VAT' };
    }
  }

  /**
   * Calculate price for a material/profile
   */
  async calculateMaterialPrice(
    profile: Profile,
    quantity: number = 1,
    targetCurrency?: Currency
  ): Promise<CalculatedPrice> {
    const currency = targetCurrency || this.config.currency;
    const rawBaseCost = profile.costPerMeter || 0;

    // Optionally adjust base cost using a metal price index when configured.
    const indexedBaseCost = this.config.metalIndex
      ? applyMetalIndex(rawBaseCost, this.config.metalIndex)
      : rawBaseCost;

    const baseCost = indexedBaseCost;

    // Get material-specific markup if available
    const materialMarkup = this.getMaterialMarkup(profile.material);

    // Apply markup
    const markupAmount = (baseCost * materialMarkup) / 100;
    const priceAfterMarkup = baseCost + markupAmount;

    // Apply quantity breaks if available
    const quantityBreak = this.getQuantityBreak(profile.id, quantity);
    const discountAmount = quantityBreak
      ? (priceAfterMarkup * quantityBreak.discount) / 100
      : 0;

    const subtotal = priceAfterMarkup - discountAmount;
    const taxAmount = (subtotal * this.config.defaultTaxRate) / 100;
    const total = subtotal + taxAmount;

    // Convert currency if needed
    let exchangeRate: ExchangeRate | undefined;
    if (currency !== this.config.currency) {
      exchangeRate = await getExchangeRate(this.config.currency, currency);
      const converted = await convertCurrency(total, this.config.currency, currency);
      return {
        baseCost,
        markupAmount,
        discountAmount,
        subtotal: converted.amount - (taxAmount * exchangeRate.rate),
        taxAmount: taxAmount * exchangeRate.rate,
        total: converted.amount,
        currency,
        exchangeRate,
        // Profit margin still referenced against the original (pre-index) cost.
        profitMargin: subtotal > 0 ? ((subtotal - rawBaseCost) / subtotal) * 100 : 0,
      };
    }

    return {
      baseCost,
      markupAmount,
      discountAmount,
      subtotal,
      taxAmount,
      total: this.roundPrice(total),
      currency,
      profitMargin: subtotal > 0 ? ((subtotal - rawBaseCost) / subtotal) * 100 : 0,
    };
  }

  /**
   * Calculate labor cost for an operation
   */
  async calculateLaborCost(
    operationType: OperationType,
    hours: number,
    complexity: 'simple' | 'medium' | 'complex' = 'medium',
    targetCurrency?: Currency
  ): Promise<number> {
    const currency = targetCurrency || this.config.currency;
    const config = this.laborConfigs.get(`${operationType}_${this.config.region}`);

    let baseRate = this.config.baseLaborRatePerHour || 50;
    if (config) {
      baseRate = config.finalRatePerHour;
    }

    // Apply complexity multiplier
    const multipliers = config?.complexityMultipliers || {
      simple: 1.0,
      medium: 1.2,
      complex: 1.5,
    };
    const multiplier = multipliers[complexity] || 1.0;

    const rate = baseRate * multiplier;
    const total = rate * hours;

    // Convert currency if needed
    if (currency !== this.config.currency) {
      const converted = await convertCurrency(total, this.config.currency, currency);
      return this.roundPrice(converted.amount);
    }

    return this.roundPrice(total);
  }

  /**
   * Calculate accessory price
   */
  async calculateAccessoryPrice(
    accessory: FabricatorAccessory,
    quantity: number = 1,
    targetCurrency?: Currency
  ): Promise<CalculatedPrice> {
    const currency = targetCurrency || this.config.currency;
    const baseCost = accessory.baseCost || accessory.unitPrice || 0;

    // Apply markup
    const markupAmount = (baseCost * this.config.hardwareMarkupPercentage) / 100;
    const priceAfterMarkup = baseCost + markupAmount;

    const subtotal = priceAfterMarkup * quantity;
    const taxAmount = (subtotal * this.config.defaultTaxRate) / 100;
    const total = subtotal + taxAmount;

    // Convert currency if needed
    if (currency !== this.config.currency) {
      const converted = await convertCurrency(total, this.config.currency, currency);
      return {
        baseCost,
        markupAmount,
        discountAmount: 0,
        subtotal: converted.amount - (taxAmount * (await getExchangeRate(this.config.currency, currency)).rate),
        taxAmount: taxAmount * (await getExchangeRate(this.config.currency, currency)).rate,
        total: converted.amount,
        currency,
        profitMargin: ((subtotal - baseCost * quantity) / subtotal) * 100,
      };
    }

    return {
      baseCost,
      markupAmount,
      discountAmount: 0,
      subtotal,
      taxAmount,
      total: this.roundPrice(total),
      currency,
      profitMargin: ((subtotal - baseCost * quantity) / subtotal) * 100,
    };
  }

  /**
   * Generate quote with multi-currency support
   */
  async generateQuote(
    project: any, // WindowUnit
    optimization: any, // OptimizationResult
    targetCurrency?: Currency,
    customerId?: string,
    customerName?: string
  ): Promise<Quote> {
    // Update quoting engine config
    this.quotingEngine = new QuotingEngine(this.toQuotingEngineConfig());

    // Generate base quote
    let quote = this.quotingEngine.generateQuote(project, optimization, customerId, customerName);

    // Convert to target currency if needed
    if (targetCurrency && targetCurrency !== this.config.currency) {
      const exchangeRate = await getExchangeRate(this.config.currency, targetCurrency);
      quote = this.convertQuote(quote, exchangeRate, targetCurrency);
    }

    return quote;
  }

  /**
   * Convert quote to different currency
   */
  private convertQuote(quote: Quote, exchangeRate: ExchangeRate, _targetCurrency: Currency): Quote {
    const rate = exchangeRate.rate;

    return {
      ...quote,
      lineItems: quote.lineItems.map(item => ({
        ...item,
        unitPrice: item.unitPrice * rate,
        totalPrice: item.totalPrice * rate,
        cost: item.cost * rate,
      })),
      subtotal: quote.subtotal * rate,
      taxAmount: quote.taxAmount * rate,
      discount: quote.discount * rate,
      total: quote.total * rate,
    };
  }

  /**
   * Get material-specific markup
   */
  private getMaterialMarkup(material: MaterialType): number {
    switch (material) {
      case 'aluminum':
        return this.config.aluminumMarkupPercentage ?? this.config.materialMarkupPercentage;
      case 'upvc':
        return this.config.upvcMarkupPercentage ?? this.config.materialMarkupPercentage;
      case 'wood':
        return this.config.woodMarkupPercentage ?? this.config.materialMarkupPercentage;
      default:
        return this.config.materialMarkupPercentage;
    }
  }

  /**
   * Get quantity break discount
   */
  private getQuantityBreak(profileId: string, quantity: number): QuantityBreak | null {
    // This would typically fetch from database
    // For now, return a simple tiered structure
    if (quantity >= 25) return { min: 25, discount: 15 };
    if (quantity >= 10) return { min: 10, discount: 10 };
    if (quantity >= 5) return { min: 5, discount: 5 };
    return null;
  }

  /**
   * Round price according to configuration
   */
  private roundPrice(price: number): number {
    const precision = Math.pow(10, this.config.roundingPrecision);

    switch (this.config.roundingMethod) {
      case 'up':
        return Math.ceil(price * precision) / precision;
      case 'down':
        return Math.floor(price * precision) / precision;
      case 'nearest':
        return Math.round(price * precision) / precision;
      default:
        return Math.round(price * precision) / precision;
    }
  }

  /**
   * Validate price and return alerts
   */
  async validatePrice(calculatedPrice: CalculatedPrice): Promise<PriceValidationAlert[]> {
    const alerts: PriceValidationAlert[] = [];

    // Check for negative price
    if (calculatedPrice.total < 0) {
      alerts.push({
        alertType: 'negative_price',
        severity: 'error',
        message: 'Price cannot be negative',
        details: { price: calculatedPrice.total },
      });
    }

    // Check profit margin
    if (calculatedPrice.profitMargin < this.config.minProfitMargin) {
      alerts.push({
        alertType: 'low_profit_margin',
        severity: 'warning',
        message: `Profit margin (${calculatedPrice.profitMargin.toFixed(2)}%) is below minimum (${this.config.minProfitMargin}%)`,
        details: {
          profitMargin: calculatedPrice.profitMargin,
          minProfitMargin: this.config.minProfitMargin,
        },
      });
    }

    // Check for excessive markup
    const markupPercentage = (calculatedPrice.markupAmount / calculatedPrice.baseCost) * 100;
    if (markupPercentage > 100) {
      alerts.push({
        alertType: 'excessive_markup',
        severity: 'warning',
        message: `Markup (${markupPercentage.toFixed(2)}%) is very high`,
        details: { markupPercentage },
      });
    }

    return alerts;
  }

  /**
   * Load pricing configuration from database
   */
  async loadConfiguration(userId: string, region?: Region, currency?: Currency): Promise<void> {
    if (!this.supabaseClient) {
      console.warn('Supabase client not available, using default configuration');
      return;
    }

    try {
      const { data, error } = await this.supabaseClient
        .from('pricing_configurations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('region', region || this.config.region)
        .eq('currency', currency || this.config.currency)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        this.config = {
          ...this.config,
          ...data,
          region: data.region as Region,
          currency: data.currency as Currency,
        };
        this.quotingEngine = new QuotingEngine(this.toQuotingEngineConfig());
      }
    } catch (error) {
      console.error('Failed to load pricing configuration:', error);
    }
  }

  /**
   * Load material pricing rules
   */
  async loadMaterialRules(userId: string, region?: Region): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      const { data, error } = await this.supabaseClient
        .from('material_pricing_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('region', region || this.config.region);

      if (error) throw error;

      if (data) {
        this.materialRules.clear();
        data.forEach((rule: any) => {
          const key = `${rule.material_type}_${rule.region}`;
          this.materialRules.set(key, {
            id: rule.id,
            profileId: rule.profile_id,
            materialType: rule.material_type as MaterialType,
            region: rule.region as Region,
            currency: rule.currency as Currency,
            baseCostPerMeter: parseFloat(rule.base_cost_per_meter),
            markupPercentage: parseFloat(rule.markup_percentage),
            discountPercentage: parseFloat(rule.discount_percentage),
            finalPricePerMeter: parseFloat(rule.final_price_per_meter),
            quantityBreaks: rule.quantity_breaks,
            validFrom: rule.valid_from ? new Date(rule.valid_from) : undefined,
            validUntil: rule.valid_until ? new Date(rule.valid_until) : undefined,
            isActive: rule.is_active,
          });
        });
      }
    } catch (error) {
      console.error('Failed to load material pricing rules:', error);
    }
  }

  /**
   * Load labor cost configurations
   */
  async loadLaborConfigs(userId: string, region?: Region): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      const { data, error } = await this.supabaseClient
        .from('labor_cost_configurations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('region', region || this.config.region);

      if (error) throw error;

      if (data) {
        this.laborConfigs.clear();
        data.forEach((config: any) => {
          const key = `${config.operation_type}_${config.region}`;
          this.laborConfigs.set(key, {
            id: config.id,
            region: config.region as Region,
            currency: config.currency as Currency,
            operationType: config.operation_type as OperationType,
            operationName: config.operation_name,
            baseRatePerHour: parseFloat(config.base_rate_per_hour),
            markupPercentage: parseFloat(config.markup_percentage),
            finalRatePerHour: parseFloat(config.final_rate_per_hour),
            complexityMultipliers: config.complexity_multipliers,
            isActive: config.is_active,
          });
        });
      }
    } catch (error) {
      console.error('Failed to load labor cost configurations:', error);
    }
  }

  /**
   * Save pricing configuration to database
   */
  async saveConfiguration(userId: string): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      const { error } = await this.supabaseClient
        .from('pricing_configurations')
        .upsert({
          user_id: userId,
          ...this.config,
        }, {
          onConflict: 'user_id,region,currency',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save pricing configuration:', error);
      throw error;
    }
  }

  /**
   * Log price change to history
   */
  async logPriceChange(entry: PriceHistoryEntry, userId: string): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      const { error } = await this.supabaseClient
        .from('price_history')
        .insert({
          user_id: userId,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          entity_name: entry.entityName,
          region: entry.region,
          currency: entry.currency,
          old_price: entry.oldPrice,
          new_price: entry.newPrice,
          price_change_percentage: entry.priceChangePercentage,
          change_reason: entry.changeReason,
          change_source: entry.changeSource || 'manual',
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to log price change:', error);
    }
  }

  /**
   * Format price with currency
   */
  formatPrice(amount: number, currency?: Currency): string {
    return formatCurrency(amount, currency || this.config.currency, {
      showSymbol: true,
      precision: this.config.roundingPrecision,
    });
  }

  /**
   * Get current configuration
   */
  getConfiguration(): PricingConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfiguration(updates: Partial<PricingConfiguration>): void {
    this.config = { ...this.config, ...updates };
    this.quotingEngine = new QuotingEngine(this.toQuotingEngineConfig());
  }
}

/**
 * Apply a metal price index to a base aluminium price.
 * Scales the cost by current/base price ratio.
 */
export function applyMetalIndex(baseAluminumPricePerKg: number, index: MetalPriceIndex): number {
  if (!index.basePricePerKg || index.basePricePerKg <= 0) return baseAluminumPricePerKg;
  const ratio = index.currentPricePerKg / index.basePricePerKg;
  return baseAluminumPricePerKg * ratio;
}

/**
 * Simple stub indices for testing and internal validation.
 * In production these would be hydrated from an external service or admin UI.
 */
export const STUB_METAL_INDICES: Record<string, MetalPriceIndex> = {
  LME_TURKEY: {
    basePricePerKg: 2.5,
    currentPricePerKg: 2.8,
    currency: 'USD',
    lastUpdated: new Date('2024-01-15'),
    source: 'LME',
  },
  LOCAL_EGYPT: {
    basePricePerKg: 45,
    currentPricePerKg: 52,
    currency: 'EGP',
    lastUpdated: new Date('2024-01-15'),
    source: 'LOCAL',
  },
};

export interface MetalAlert {
  severity: 'info' | 'medium' | 'high';
  message: string;
  deviationPercentage: number;
}

export function checkMetalPriceAlert(index?: MetalPriceIndex | null): MetalAlert | null {
  if (!index) return null;
  if (!index.basePricePerKg || index.basePricePerKg <= 0) return null;

  const deviation = ((index.currentPricePerKg - index.basePricePerKg) / index.basePricePerKg) * 100;
  const absolute = Math.abs(deviation);

  if (absolute > 15) {
    return {
      severity: 'high',
      message: `Metal prices ${deviation > 0 ? 'increased' : 'decreased'} by ${absolute.toFixed(
        1,
      )}% from baseline.`,
      deviationPercentage: deviation,
    };
  }

  if (absolute > 8) {
    return {
      severity: 'medium',
      message: `Metal prices ${deviation > 0 ? 'up' : 'down'} ${absolute.toFixed(
        1,
      )}% – review open quotes.`,
      deviationPercentage: deviation,
    };
  }

  if (absolute > 3) {
    return {
      severity: 'info',
      message: `Metal prices ${deviation > 0 ? 'increased' : 'decreased'} by ${absolute.toFixed(
        1,
      )}%.`,
      deviationPercentage: deviation,
    };
  }

  return null;
}

