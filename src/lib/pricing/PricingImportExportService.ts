/**
 * Pricing Import/Export Service
 * 
 * Service for importing and exporting pricing configurations.
 * Supports JSON and CSV formats with validation and error handling.
 * 
 * Features:
 * - Export pricing to JSON/CSV
 * - Import pricing from JSON/CSV
 * - Template generation
 * - Bulk import validation
 * - Error reporting
 * - Merge mode support
 * 
 * @since Pricing Tuning Studio - Gold Tier Enhancement
 */

import type { SystemPricingState } from '@/types/pricing';
import type { ValidationResult } from './PriceValidationService';
import { priceValidationService } from './PriceValidationService';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv';

/**
 * Import mode options
 */
export type ImportMode = 'replace' | 'merge';

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  pricing?: SystemPricingState;
  errors: string[];
  warnings: string[];
  validationResult?: ValidationResult;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  exportedAt: string;
  systemPackId?: string;
  profileId?: string;
  version?: string;
  format: ExportFormat;
}

/**
 * PricingImportExportService - Service for importing/exporting pricing
 */
export class PricingImportExportService {
  private static instance: PricingImportExportService;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PricingImportExportService {
    if (!PricingImportExportService.instance) {
      PricingImportExportService.instance = new PricingImportExportService();
    }
    return PricingImportExportService.instance;
  }

  /**
   * Export pricing configuration to JSON
   */
  exportToJSON(
    pricing: SystemPricingState,
    metadata?: Partial<ExportMetadata>
  ): string {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'json' as ExportFormat,
        version: '1.0',
        ...metadata,
      },
      pricing,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export pricing configuration to CSV
   */
  exportToCSV(
    pricing: SystemPricingState,
    metadata?: Partial<ExportMetadata>
  ): string {
    const lines: string[] = [];

    // Header
    lines.push('# ALMONA Pricing Configuration Export');
    lines.push(`# Exported: ${metadata?.exportedAt || new Date().toISOString()}`);
    if (metadata?.systemPackId) {
      lines.push(`# System Pack: ${metadata.systemPackId}`);
    }
    if (metadata?.profileId) {
      lines.push(`# Profile ID: ${metadata.profileId}`);
    }
    lines.push('');

    // Currency and Aluminum Price
    lines.push('Section,Key,Value');
    lines.push('Base,Currency,' + (pricing.currency || ''));
    lines.push('Base,AluminumPricePerKg,' + (pricing.aluminumPricePerKg || 0));
    lines.push('');

    // Profile Prices
    lines.push('ProfilePrices,Code,Price');
    Object.entries(pricing.profilePrices || {}).forEach(([code, price]) => {
      lines.push(`ProfilePrices,${code},${price}`);
    });
    lines.push('');

    // Hardware Prices
    lines.push('Hardware,Code,Price');
    Object.entries(pricing.hardware || {}).forEach(([code, price]) => {
      lines.push(`Hardware,${code},${price}`);
    });
    lines.push('');

    // Gaskets
    lines.push('Gaskets,Code,Price');
    Object.entries(pricing.gaskets || {}).forEach(([code, price]) => {
      lines.push(`Gaskets,${code},${price}`);
    });
    lines.push('');

    // Glazing Types
    lines.push('GlazingTypes,ID,Name,PricePerSquareMeter');
    (pricing.glazingTypes || []).forEach((glazing) => {
      lines.push(
        `GlazingTypes,${glazing.id},${glazing.name},${glazing.pricePerSquareMeter}`
      );
    });

    return lines.join('\n');
  }

  /**
   * Download pricing as file
   */
  downloadPricing(
    pricing: SystemPricingState,
    format: ExportFormat = 'json',
    filename?: string,
    metadata?: Partial<ExportMetadata>
  ): void {
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'json') {
      content = this.exportToJSON(pricing, metadata);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = this.exportToCSV(pricing, metadata);
      mimeType = 'text/csv';
      extension = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `pricing-export-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import pricing from JSON
   */
  importFromJSON(jsonString: string, _mode: ImportMode = 'replace'): ImportResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const data = JSON.parse(jsonString);

      // Extract pricing data
      let pricing: SystemPricingState;
      if (data.pricing) {
        pricing = data.pricing;
      } else if (data.currency !== undefined || data.profilePrices !== undefined) {
        // Direct pricing object
        pricing = data as SystemPricingState;
      } else {
        return {
          success: false,
          errors: ['Invalid JSON format: pricing data not found'],
          warnings: [],
        };
      }

      // Validate structure
      const validationErrors = this.validatePricingStructure(pricing);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors,
          warnings,
        };
      }

      // Validate pricing data
      const validationResult = priceValidationService.validatePricing(pricing);
      if (!validationResult.isValid) {
        warnings.push('Imported pricing has validation errors. Please review.');
        validationResult.errors.forEach((err) => {
          errors.push(err.message);
        });
        validationResult.warnings.forEach((warn) => {
          warnings.push(warn.message);
        });
      }

      return {
        success: true,
        pricing,
        errors,
        warnings,
        validationResult,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      };
    }
  }

  /**
   * Import pricing from CSV
   */
  importFromCSV(csvString: string, _mode: ImportMode = 'replace'): ImportResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const lines = csvString.split('\n').filter((line) => line.trim() && !line.trim().startsWith('#'));
      const pricing: SystemPricingState = {
        currency: 'EGP',
        aluminumPricePerKg: 0,
        profilePrices: {},
        hardware: {},
        gaskets: {},
        glazingTypes: [],
      };

      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length < 2) continue;

        const section = parts[0];
        const key = parts[1];
        const value = parts[2] || '';

        if (section === 'Section') {
          // Skip section headers
          continue;
        }

        switch (section) {
          case 'Base':
            if (key === 'Currency') {
              pricing.currency = value || 'EGP';
            } else if (key === 'AluminumPricePerKg') {
              pricing.aluminumPricePerKg = parseFloat(value) || 0;
            }
            break;

          case 'ProfilePrices':
            if (key && value) {
              const price = parseFloat(value);
              if (!isNaN(price)) {
                pricing.profilePrices[key] = price;
              }
            }
            break;

          case 'Hardware':
            if (key && value) {
              const price = parseFloat(value);
              if (!isNaN(price)) {
                pricing.hardware[key] = price;
              }
            }
            break;

          case 'Gaskets':
            if (key && value) {
              const price = parseFloat(value);
              if (!isNaN(price)) {
                pricing.gaskets[key] = price;
              }
            }
            break;

          case 'GlazingTypes':
            if (key && value && parts[3]) {
              const price = parseFloat(parts[3]);
              if (!isNaN(price)) {
                pricing.glazingTypes.push({
                  id: key,
                  name: value,
                  pricePerSquareMeter: price,
                });
              }
            }
            break;
        }
      }

      // Validate structure
      const validationErrors = this.validatePricingStructure(pricing);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors,
          warnings,
        };
      }

      // Validate pricing data
      const validationResult = priceValidationService.validatePricing(pricing);
      if (!validationResult.isValid) {
        warnings.push('Imported pricing has validation errors. Please review.');
        validationResult.errors.forEach((err) => {
          errors.push(err.message);
        });
        validationResult.warnings.forEach((warn) => {
          warnings.push(warn.message);
        });
      }

      return {
        success: true,
        pricing,
        errors,
        warnings,
        validationResult,
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
      };
    }
  }

  /**
   * Import pricing from file
   */
  async importFromFile(file: File, mode: ImportMode = 'replace'): Promise<ImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          resolve({
            success: false,
            errors: ['Failed to read file content'],
            warnings: [],
          });
          return;
        }

        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension === 'json') {
          resolve(this.importFromJSON(content, mode));
        } else if (extension === 'csv') {
          resolve(this.importFromCSV(content, mode));
        } else {
          resolve({
            success: false,
            errors: [`Unsupported file format: .${extension}. Supported formats: .json, .csv`],
            warnings: [],
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          errors: ['Failed to read file'],
          warnings: [],
        });
      };

      reader.readAsText(file);
    });
  }

  /**
   * Generate template file
   */
  generateTemplate(format: ExportFormat = 'json'): string {
    const templatePricing: SystemPricingState = {
      currency: 'EGP',
      aluminumPricePerKg: 0,
      profilePrices: {},
      hardware: {},
      gaskets: {},
      glazingTypes: [],
    };

    if (format === 'json') {
      return this.exportToJSON(templatePricing, {
        exportedAt: new Date().toISOString(),
        format: 'json',
      });
    } else {
      return this.exportToCSV(templatePricing, {
        exportedAt: new Date().toISOString(),
        format: 'csv',
      });
    }
  }

  /**
   * Download template file
   */
  downloadTemplate(format: ExportFormat = 'json'): void {
    const content = this.generateTemplate(format);
    const extension = format;
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pricing-template.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Merge two pricing configurations
   */
  mergePricing(
    base: SystemPricingState,
    overlay: SystemPricingState,
    mode: ImportMode = 'merge'
  ): SystemPricingState {
    if (mode === 'replace') {
      return { ...overlay };
    }

    // Merge mode: overlay takes precedence, but preserve base values for missing keys
    return {
      currency: overlay.currency || base.currency,
      aluminumPricePerKg: overlay.aluminumPricePerKg ?? base.aluminumPricePerKg,
      profilePrices: { ...base.profilePrices, ...overlay.profilePrices },
      hardware: { ...base.hardware, ...overlay.hardware },
      gaskets: { ...base.gaskets, ...overlay.gaskets },
      glazingTypes: overlay.glazingTypes?.length
        ? overlay.glazingTypes
        : base.glazingTypes || [],
    };
  }

  /**
   * Validate pricing structure (basic structure validation)
   */
  private validatePricingStructure(pricing: any): string[] {
    const errors: string[] = [];

    if (!pricing || typeof pricing !== 'object') {
      errors.push('Invalid pricing data: must be an object');
      return errors;
    }

    if (pricing.currency && typeof pricing.currency !== 'string') {
      errors.push('Currency must be a string');
    }

    if (
      pricing.aluminumPricePerKg !== undefined &&
      typeof pricing.aluminumPricePerKg !== 'number'
    ) {
      errors.push('AluminumPricePerKg must be a number');
    }

    if (pricing.profilePrices && typeof pricing.profilePrices !== 'object') {
      errors.push('ProfilePrices must be an object');
    }

    if (pricing.hardware && typeof pricing.hardware !== 'object') {
      errors.push('Hardware must be an object');
    }

    if (pricing.gaskets && typeof pricing.gaskets !== 'object') {
      errors.push('Gaskets must be an object');
    }

    if (pricing.glazingTypes && !Array.isArray(pricing.glazingTypes)) {
      errors.push('GlazingTypes must be an array');
    }

    return errors;
  }
}

// Export singleton instance getter
export const pricingImportExportService = PricingImportExportService.getInstance();
