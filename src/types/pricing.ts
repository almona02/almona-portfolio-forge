/**
 * Pricing Type Definitions
 * 
 * Comprehensive TypeScript types for system pricing structures.
 * Used by SystemPricingService, PricingTuningStudio, and pricing integrations.
 * 
 * @since Pricing Tuning Studio - Gold Tier Enhancement
 */


/**
 * Glazing type definition for system pricing
 */
export interface SystemGlazingType {
  id: string;
  name: string;
  description?: string;
  pricePerSquareMeter: number;
}

/**
 * Material markup configuration
 */
export interface MaterialMarkupConfig {
  aluminum?: number; // Percentage markup for aluminum
  upvc?: number; // Percentage markup for UPVC
  wood?: number; // Percentage markup for wood
  default?: number; // Default markup percentage
}

/**
 * Regional markup configuration
 */
export interface RegionalMarkupConfig {
  cairo?: number; // Percentage markup for Cairo region
  alexandria?: number; // Percentage markup for Alexandria region
  upperEgypt?: number; // Percentage markup for Upper Egypt region
  default?: number; // Default regional markup
}

/**
 * Custom material rule
 */
export interface CustomMaterialRule {
  id: string;
  materialType: 'aluminum' | 'upvc' | 'wood' | 'custom';
  materialName?: string; // For custom materials
  markupPercentage: number;
  region?: string; // Optional region-specific rule
  minQuantity?: number; // Optional quantity threshold
  isActive: boolean;
  notes?: string;
}

/**
 * Material markups configuration
 */
export interface MaterialMarkupsConfig {
  materialMarkups: MaterialMarkupConfig;
  regionalMarkups: RegionalMarkupConfig;
  customRules: CustomMaterialRule[];
}

/**
 * Regional labor rate configuration
 */
export interface RegionalLaborRate {
  cairo?: number; // Labor rate per hour for Cairo (in base currency)
  alexandria?: number; // Labor rate per hour for Alexandria
  upperEgypt?: number; // Labor rate per hour for Upper Egypt
  default?: number; // Default labor rate per hour
}

/**
 * Overhead allocation configuration
 */
export interface OverheadAllocationConfig {
  method: 'percentage' | 'fixed' | 'per_unit' | 'custom';
  percentage?: number; // Percentage of material cost (if method is 'percentage')
  fixedAmount?: number; // Fixed amount (if method is 'fixed')
  perUnitAmount?: number; // Amount per unit (if method is 'per_unit')
  customFormula?: string; // Custom formula (if method is 'custom')
}

/**
 * Installation cost configuration
 */
export interface InstallationCostConfig {
  baseRate?: number; // Base installation rate
  perSquareMeter?: number; // Rate per square meter
  perUnit?: number; // Rate per unit
  complexityMultipliers?: Record<string, number>; // Complexity-based multipliers
}

/**
 * Complexity multiplier configuration
 */
export interface ComplexityMultiplierConfig {
  simple?: number; // Multiplier for simple installations
  standard?: number; // Multiplier for standard installations
  complex?: number; // Multiplier for complex installations
  custom?: Record<string, number>; // Custom complexity multipliers
}

/**
 * Labor and overhead configuration
 */
export interface LaborOverheadConfig {
  laborRates: RegionalLaborRate;
  overheadAllocation: OverheadAllocationConfig;
  installationCosts: InstallationCostConfig;
  complexityMultipliers: ComplexityMultiplierConfig;
}

/**
 * System pricing state structure
 * Matches the structure stored in profile.specifications.system_pricing
 */
export interface SystemPricingState {
  currency: string;
  aluminumPricePerKg: number; // Main input for auto-calculation
  framePricePerMeter?: number; // Legacy
  sashPricePerMeter?: number; // Legacy
  beadPricePerMeter?: number; // Legacy
  glassPricePerSquareMeter?: number; // Legacy field for backward compatibility
  glazingTypes: SystemGlazingType[]; // New: array-based glazing types
  hardware: Record<string, number>; // Hardware code -> price per unit
  gaskets: Record<string, number>; // Gasket code -> price per meter
  profilePrices: Record<string, number>; // Profile code -> price per meter
  materialMarkups?: MaterialMarkupsConfig; // Material markup configuration
  laborOverhead?: LaborOverheadConfig; // Labor and overhead configuration
  pricingRules?: PricingRulesConfig; // Pricing rules configuration
  initialized?: boolean; // Flag indicating pricing has been saved
  systemName?: string; // System pack name (e.g., "ROCK 60", "JUMBO 100")
}

/**
 * System pricing with metadata
 */
export interface SystemPricingWithMetadata extends SystemPricingState {
  profileId?: string;
  systemPackId?: string;
  lastUpdated?: Date;
  lastUpdatedBy?: string;
}

/**
 * Profile price lookup result
 */
export interface ProfilePriceResult {
  price: number;
  currency: string;
  source: 'system_pricing' | 'constants' | 'default';
  profileCode: string;
  systemName?: string;
}

/**
 * Hardware price lookup result
 */
export interface HardwarePriceResult {
  price: number;
  currency: string;
  source: 'system_pricing' | 'constants' | 'default';
  hardwareCode: string;
}

/**
 * Glazing price lookup result
 */
export interface GlazingPriceResult {
  pricePerSquareMeter: number;
  currency: string;
  source: 'system_pricing' | 'constants' | 'default';
  glazingTypeId: string;
}

/**
 * Pricing impact preview for a system pack
 */
export interface PricingImpactPreview {
  averageQuoteImpact: number;
  bomCostBreakdown: {
    profiles: number;
    hardware: number;
    glazing: number;
    total: number;
  };
  profitMargin: number;
  configurationCoverage: {
    configured: number;
    total: number;
    percentage: number;
  };
}

/**
 * Bulk pricing update operation
 */
export interface BulkPricingUpdate {
  systemPackId: string;
  updates: {
    profilePrices?: Record<string, number>;
    hardware?: Record<string, number>;
    gaskets?: Record<string, number>;
    glazingTypes?: SystemGlazingType[];
  };
  reason?: string;
}

/**
 * Pricing validation result
 */
export interface PricingValidationResult {
  isValid: boolean;
  warnings: Array<{
    field: string;
    message: string;
    severity: 'warning' | 'error';
  }>;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Quantity break rule for volume pricing
 */
export interface QuantityBreakRule {
  id: string;
  minQuantity: number; // Minimum quantity for this break
  maxQuantity?: number; // Optional maximum quantity (exclusive)
  discountPercentage?: number; // Discount percentage for this break
  priceMultiplier?: number; // Price multiplier (e.g., 0.95 for 5% discount)
  isActive: boolean;
  notes?: string;
}

/**
 * Customer tier configuration
 */
export interface CustomerTierConfig {
  id: string;
  tierName: string; // e.g., "VIP", "Premium", "Standard", "Wholesale"
  discountPercentage?: number; // Base discount percentage for this tier
  markupPercentage?: number; // Base markup percentage (if applicable)
  minOrderValue?: number; // Minimum order value to qualify
  isActive: boolean;
  notes?: string;
}

/**
 * Seasonal adjustment rule
 */
export interface SeasonalAdjustmentRule {
  id: string;
  name: string; // e.g., "Summer Sale", "Winter Premium"
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  adjustmentPercentage: number; // Positive for markup, negative for discount
  adjustmentType: 'markup' | 'discount' | 'multiplier';
  applicableRegions?: string[]; // Optional region filter
  isActive: boolean;
  notes?: string;
}

/**
 * Pricing rules configuration
 */
export interface PricingRulesConfig {
  quantityBreaks: QuantityBreakRule[];
  customerTiers: CustomerTierConfig[];
  seasonalAdjustments: SeasonalAdjustmentRule[];
  defaultDiscountPercentage?: number; // Default discount for all orders
  maxDiscountPercentage?: number; // Maximum allowed discount
}
