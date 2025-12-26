/**
 * Pricing Module - Centralized Exports
 * 
 * Real-time quote calculation with Egyptian-specific factors:
 * - Material and labor cost calculation
 * - Transport and installation costs
 * - Payment terms (cash, credit)
 * - Location-based pricing adjustments
 * 
 * @since Egyptian Fabrication Intelligence Enhancement
 */

// Real-Time Quote Calculator
export { RealTimeQuoteCalculator } from './RealTimeQuoteCalculator';
export type { 
  RealTimeQuote,
  QuoteInput,
  EgyptianQuoteFactors
} from './RealTimeQuoteCalculator';

// Egyptian Quote Factors
export { EgyptianQuoteFactors as EgyptianQuoteFactorsUtil } from './EgyptianQuoteFactors';
export type { 
  LocationFactors,
  InstallationComplexityFactors
} from './EgyptianQuoteFactors';

// Existing pricing modules
export { PricingEngine } from './PricingEngine';
export { AluminumPricingCalculator } from './AluminumPricingCalculator';
export { LmePricingService } from './LmePricingService';

