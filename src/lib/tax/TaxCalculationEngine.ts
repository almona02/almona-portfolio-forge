/**
 * Tax Calculation Engine
 * 
 * Gold-tier tax calculation engine with regional tax rules,
 * exemption handling, and compliance support.
 * 
 * Features:
 * - Regional tax rules (Egypt, Turkey, GCC)
 * - VAT/GST calculation
 * - Tax exemption handling
 * - Multi-rate tax support
 * - Tax-inclusive/exclusive calculations
 * - Precision rounding
 * 
 * Usage:
 * ```typescript
 * const tax = TaxCalculationEngine.calculate({
 *   amount: 1000,
 *   region: 'EG',
 *   currency: 'EGP'
 * });
 * ```
 */

/**
 * Tax region codes
 */
export type TaxRegion = 'EG' | 'TR' | 'AE' | 'SA' | 'KW' | 'QA' | 'BH' | 'OM' | 'DEFAULT';

/**
 * Tax calculation result
 */
export interface TaxCalculationResult {
  /** Subtotal (amount before tax) */
  subtotal: number;
  /** Tax amount */
  taxAmount: number;
  /** Total (subtotal + tax) */
  total: number;
  /** Tax rate (as decimal, e.g., 0.14 for 14%) */
  taxRate: number;
  /** Tax rate (as percentage, e.g., 14 for 14%) */
  taxRatePercent: number;
  /** Tax name (VAT, KDV, GST) */
  taxName: string;
  /** Region code */
  region: TaxRegion;
  /** Currency code */
  currency: string;
  /** Whether tax is included in the amount */
  taxInclusive: boolean;
  /** Tax breakdown by rate (for multi-rate scenarios) */
  taxBreakdown?: Array<{
    rate: number;
    amount: number;
    taxAmount: number;
  }>;
}

/**
 * Tax calculation input
 */
export interface TaxCalculationInput {
  /** Amount to calculate tax for */
  amount: number;
  /** Region code */
  region: TaxRegion;
  /** Currency code */
  currency: string;
  /** Whether the amount is tax-inclusive */
  taxInclusive?: boolean;
  /** Override tax rate (optional) */
  taxRateOverride?: number;
  /** Tax exemption certificate number (optional) */
  exemptionCertificate?: string;
  /** Product category for special tax rates (optional) */
  productCategory?: string;
}

/**
 * Regional tax rules
 */
export interface RegionalTaxRule {
  /** Standard VAT/GST rate */
  standardRate: number;
  /** Tax name (VAT, KDV, GST) */
  taxName: string;
  /** Whether prices are typically tax-inclusive */
  taxInclusive: boolean;
  /** Reduced rates by category */
  reducedRates?: Record<string, number>;
  /** Zero-rated categories */
  zeroRated?: string[];
  /** Exempt categories */
  exempt?: string[];
  /** Additional tax (e.g., Egypt's 1% development fee) */
  additionalTax?: {
    rate: number;
    name: string;
    appliesTo: 'subtotal' | 'tax';
  };
}

/**
 * Regional tax rules database
 */
const REGIONAL_TAX_RULES: Record<TaxRegion, RegionalTaxRule> = {
  // Egypt: 14% VAT + 1% Development Fee = 15% total
  EG: {
    standardRate: 0.14, // 14% VAT
    taxName: 'VAT',
    taxInclusive: true,
    additionalTax: {
      rate: 0.01, // 1% Development Fee
      name: 'Development Fee',
      appliesTo: 'subtotal',
    },
    reducedRates: {
      'food': 0.05, // 5% for food items
      'medical': 0.00, // 0% for medical supplies
    },
    zeroRated: ['exports', 'international_transport'],
    exempt: ['education', 'healthcare'],
  },
  // Turkey: 20% KDV (KDV = Katma Değer Vergisi = VAT)
  TR: {
    standardRate: 0.20, // 20% KDV
    taxName: 'KDV',
    taxInclusive: true,
    reducedRates: {
      'food': 0.10, // 10% for food items
      'books': 0.01, // 1% for books
      'medical': 0.01, // 1% for medical supplies
    },
    zeroRated: ['exports'],
    exempt: ['education', 'healthcare'],
  },
  // UAE: 5% VAT
  AE: {
    standardRate: 0.05, // 5% VAT
    taxName: 'VAT',
    taxInclusive: false,
    zeroRated: ['exports', 'international_transport', 'precious_metals'],
    exempt: ['residential_property', 'local_passenger_transport'],
  },
  // Saudi Arabia: 15% VAT
  SA: {
    standardRate: 0.15, // 15% VAT
    taxName: 'VAT',
    taxInclusive: false,
    zeroRated: ['exports', 'international_transport'],
    exempt: ['residential_property', 'financial_services'],
  },
  // Kuwait: No VAT (as of 2026)
  KW: {
    standardRate: 0.00, // 0% (no VAT)
    taxName: 'VAT',
    taxInclusive: false,
  },
  // Qatar: No VAT (as of 2026)
  QA: {
    standardRate: 0.00, // 0% (no VAT)
    taxName: 'VAT',
    taxInclusive: false,
  },
  // Bahrain: 10% VAT
  BH: {
    standardRate: 0.10, // 10% VAT
    taxName: 'VAT',
    taxInclusive: false,
    zeroRated: ['exports', 'international_transport'],
    exempt: ['residential_property'],
  },
  // Oman: 5% VAT
  OM: {
    standardRate: 0.05, // 5% VAT
    taxName: 'VAT',
    taxInclusive: false,
    zeroRated: ['exports', 'international_transport'],
    exempt: ['residential_property'],
  },
  // Default: 20% VAT
  DEFAULT: {
    standardRate: 0.20, // 20% VAT
    taxName: 'VAT',
    taxInclusive: false,
  },
};

/**
 * Tax Calculation Engine
 */
export class TaxCalculationEngine {
  /**
   * Calculate tax for an amount
   */
  static calculate(input: TaxCalculationInput): TaxCalculationResult {
    const {
      amount,
      region,
      currency,
      taxInclusive = false,
      taxRateOverride,
      exemptionCertificate,
      productCategory,
    } = input;

    if (amount <= 0) {
      return this.createZeroResult(region, currency);
    }

    // Get regional tax rule
    const taxRule = REGIONAL_TAX_RULES[region] || REGIONAL_TAX_RULES.DEFAULT;

    // Check for exemption
    if (exemptionCertificate) {
      return this.createExemptResult(amount, region, currency, taxRule);
    }

    // Determine tax rate
    let taxRate = taxRateOverride ?? taxRule.standardRate;

    // Check for reduced rate based on product category
    if (productCategory && taxRule.reducedRates?.[productCategory] !== undefined) {
      taxRate = taxRule.reducedRates[productCategory];
    }

    // Check for zero-rated or exempt categories
    if (productCategory) {
      if (taxRule.zeroRated?.includes(productCategory)) {
        taxRate = 0;
      } else if (taxRule.exempt?.includes(productCategory)) {
        return this.createExemptResult(amount, region, currency, taxRule);
      }
    }

    // Calculate tax
    let subtotal: number;
    let taxAmount: number;
    let total: number;

    if (taxInclusive || taxRule.taxInclusive) {
      // Amount includes tax
      subtotal = Math.round((amount / (1 + taxRate)) * 100) / 100;
      taxAmount = Math.round((amount - subtotal) * 100) / 100;
      total = amount;
    } else {
      // Amount does not include tax
      subtotal = amount;
      taxAmount = Math.round((subtotal * taxRate) * 100) / 100;
      total = Math.round((subtotal + taxAmount) * 100) / 100;
    }

    // Handle additional tax (e.g., Egypt's development fee)
    let additionalTaxAmount = 0;
    if (taxRule.additionalTax) {
      const baseAmount = taxRule.additionalTax.appliesTo === 'subtotal' ? subtotal : taxAmount;
      additionalTaxAmount = Math.round((baseAmount * taxRule.additionalTax.rate) * 100) / 100;
      taxAmount += additionalTaxAmount;
      total += additionalTaxAmount;
    }

    return {
      subtotal,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      taxRate,
      taxRatePercent: Math.round(taxRate * 10000) / 100, // Round to 2 decimal places
      taxName: taxRule.taxName,
      region,
      currency,
      taxInclusive: taxInclusive || taxRule.taxInclusive,
      taxBreakdown: taxRule.additionalTax ? [
        {
          rate: taxRate,
          amount: subtotal,
          taxAmount: taxAmount - additionalTaxAmount,
        },
        {
          rate: taxRule.additionalTax.rate,
          amount: taxRule.additionalTax.appliesTo === 'subtotal' ? subtotal : taxAmount - additionalTaxAmount,
          taxAmount: additionalTaxAmount,
        },
      ] : undefined,
    };
  }

  /**
   * Calculate tax for multiple items with different rates
   */
  static calculateMultiRate(items: Array<{
    amount: number;
    region: TaxRegion;
    currency: string;
    productCategory?: string;
    taxInclusive?: boolean;
  }>): {
    subtotal: number;
    taxBreakdown: Array<{
      rate: number;
      amount: number;
      taxAmount: number;
      taxName: string;
    }>;
    totalTax: number;
    total: number;
    currency: string;
  } {
    const calculations = items.map(item => this.calculate(item));
    
    const subtotal = calculations.reduce((sum, calc) => sum + calc.subtotal, 0);
    const totalTax = calculations.reduce((sum, calc) => sum + calc.taxAmount, 0);
    const total = calculations.reduce((sum, calc) => sum + calc.total, 0);

    // Group by tax rate
    const rateMap = new Map<number, { amount: number; taxAmount: number; taxName: string }>();
    
    calculations.forEach(calc => {
      const existing = rateMap.get(calc.taxRate) || { amount: 0, taxAmount: 0, taxName: calc.taxName };
      existing.amount += calc.subtotal;
      existing.taxAmount += calc.taxAmount;
      rateMap.set(calc.taxRate, existing);
    });

    const taxBreakdown = Array.from(rateMap.entries()).map(([rate, data]) => ({
      rate,
      amount: Math.round(data.amount * 100) / 100,
      taxAmount: Math.round(data.taxAmount * 100) / 100,
      taxName: data.taxName,
    }));

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxBreakdown,
      totalTax: Math.round(totalTax * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: calculations[0]?.currency || 'USD',
    };
  }

  /**
   * Get tax rate for a region
   */
  static getTaxRate(region: TaxRegion, productCategory?: string): number {
    const taxRule = REGIONAL_TAX_RULES[region] || REGIONAL_TAX_RULES.DEFAULT;
    
    if (productCategory && taxRule.reducedRates?.[productCategory] !== undefined) {
      return taxRule.reducedRates[productCategory];
    }

    return taxRule.standardRate;
  }

  /**
   * Get tax rule for a region
   */
  static getTaxRule(region: TaxRegion): RegionalTaxRule {
    return REGIONAL_TAX_RULES[region] || REGIONAL_TAX_RULES.DEFAULT;
  }

  /**
   * Check if product category is exempt
   */
  static isExempt(region: TaxRegion, productCategory: string): boolean {
    const taxRule = REGIONAL_TAX_RULES[region] || REGIONAL_TAX_RULES.DEFAULT;
    return taxRule.exempt?.includes(productCategory) ?? false;
  }

  /**
   * Check if product category is zero-rated
   */
  static isZeroRated(region: TaxRegion, productCategory: string): boolean {
    const taxRule = REGIONAL_TAX_RULES[region] || REGIONAL_TAX_RULES.DEFAULT;
    return taxRule.zeroRated?.includes(productCategory) ?? false;
  }

  /**
   * Create zero result
   */
  private static createZeroResult(region: TaxRegion, currency: string): TaxCalculationResult {
    const taxRule = REGIONAL_TAX_RULES[region] || REGIONAL_TAX_RULES.DEFAULT;
    return {
      subtotal: 0,
      taxAmount: 0,
      total: 0,
      taxRate: taxRule.standardRate,
      taxRatePercent: Math.round(taxRule.standardRate * 10000) / 100,
      taxName: taxRule.taxName,
      region,
      currency,
      taxInclusive: taxRule.taxInclusive,
    };
  }

  /**
   * Create exempt result
   */
  private static createExemptResult(
    amount: number,
    region: TaxRegion,
    currency: string,
    taxRule: RegionalTaxRule
  ): TaxCalculationResult {
    return {
      subtotal: amount,
      taxAmount: 0,
      total: amount,
      taxRate: 0,
      taxRatePercent: 0,
      taxName: taxRule.taxName,
      region,
      currency,
      taxInclusive: taxRule.taxInclusive,
    };
  }
}

