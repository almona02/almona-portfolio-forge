/**
 * Tax Management Module
 * 
 * Gold-tier tax management system with regional compliance.
 * 
 * Exports:
 * - TaxCalculationEngine - Core tax calculation
 * - TaxExemptionHandler - Exemption management
 * - TaxReportingService - Tax reporting and compliance
 */

export { TaxCalculationEngine, type TaxCalculationResult, type TaxCalculationInput, type TaxRegion } from './TaxCalculationEngine';
export { TaxExemptionHandler, type ExemptionCertificate, type ExemptionValidationResult } from './TaxExemptionHandler';
export { TaxReportingService, type TaxSummary, type TaxReportEntry } from './TaxReportingService';

