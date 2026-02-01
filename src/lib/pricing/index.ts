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
    EgyptianQuoteFactors, QuoteInput, RealTimeQuote
} from './RealTimeQuoteCalculator';

// Egyptian Quote Factors
export { EgyptianQuoteFactors as EgyptianQuoteFactorsUtil } from './EgyptianQuoteFactors';
export type {
    InstallationComplexityFactors, LocationFactors
} from './EgyptianQuoteFactors';

// Existing pricing modules
export { AluminumPricingCalculator } from './AluminumPricingCalculator';
export { LmePricingService, lmePricingService } from './LmePricingService';
export { PricingEngine } from './PricingEngine';

// System Pricing Service
export { SystemPricingService, systemPricingService } from './SystemPricingService';

// Price History Service
export { PriceHistoryService, priceHistoryService } from './PriceHistoryService';
export type {
    PriceComparison, PriceHistoryEntry,
    PriceHistoryFilter
} from './PriceHistoryService';

// Price Validation Service
export { PriceValidationService, priceValidationService } from './PriceValidationService';
export type {
    ValidationConfig,
    ValidationResult
} from './PriceValidationService';

// Pricing Import/Export Service
export { PricingImportExportService, pricingImportExportService } from './PricingImportExportService';
export type {
    ExportFormat, ExportMetadata, ImportMode,
    ImportResult
} from './PricingImportExportService';

