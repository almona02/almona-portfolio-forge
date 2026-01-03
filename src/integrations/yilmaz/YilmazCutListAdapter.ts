/**
 * Yilmaz Cut List Adapter
 * Unified CSV/MDB exporter for Yilmaz cutting machines
 * Supports both DC series (mitre saws) and CNC series (AIM/ALM/PIM)
 */

import { CuttingPlan } from '@/types/fabricator';
import { CNCCutListGenerator } from './CNCCutListGenerator';
import { DCCutListGenerator } from './DCCutListGenerator';

export interface YilmazExportOptions {
  format: 'csv' | 'mdb';
  machineSeries: 'dc' | 'cnc' | 'auto';
  includeBarcodes: boolean;
  includeMetadata: boolean;
  encoding?: 'utf8' | 'windows-1254'; // Turkish encoding support
  decimalSeparator?: '.' | ',';
}

export interface YilmazCutListData {
  orderNumber: string;
  projectName?: string;
  date: Date;
  cuttingPlans: CuttingPlan[];
  metadata?: {
    operator?: string;
    machineModel?: string;
    notes?: string;
  };
}

export class YilmazCutListAdapter {
  private dcGenerator: DCCutListGenerator;
  private cncGenerator: CNCCutListGenerator;

  constructor() {
    this.dcGenerator = new DCCutListGenerator();
    this.cncGenerator = new CNCCutListGenerator();
  }

  /**
   * Export cutting list to CSV format
   */
  async exportToCSV(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): Promise<string> {
    const generator = this.selectGenerator(data, options);
    return generator.generateCSV(data, options);
  }

  /**
   * Export cutting list to MDB (Access) format
   */
  async exportToMDB(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): Promise<Buffer> {
    const generator = this.selectGenerator(data, options);
    return generator.generateMDB(data, options);
  }

  /**
   * Auto-detect machine series based on cutting plan characteristics
   */
  private detectMachineSeries(cuttingPlans: CuttingPlan[]): 'dc' | 'cnc' {
    // DC series: Simple mitre cuts, angles typically 45°, 90°
    // CNC series: Complex operations, multiple angles, drilling, milling
    
    const hasComplexOperations = cuttingPlans.some(plan =>
      plan.cuts.some(cut => 
        cut.angle !== 45 && cut.angle !== 90 && cut.angle !== 0
      )
    );

    const hasMultipleAngles = cuttingPlans.some(plan => {
      const angles = new Set(plan.cuts.map(c => c.angle));
      return angles.size > 3;
    });

    return (hasComplexOperations || hasMultipleAngles) ? 'cnc' : 'dc';
  }

  /**
   * Select appropriate generator based on machine series
   */
  private selectGenerator(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): DCCutListGenerator | CNCCutListGenerator {
    let series = options.machineSeries;

    if (series === 'auto') {
      series = this.detectMachineSeries(data.cuttingPlans);
    }

    return series === 'dc' ? this.dcGenerator : this.cncGenerator;
  }

  /**
   * Validate cutting list data before export
   */
  validateData(data: YilmazCutListData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.orderNumber || data.orderNumber.trim() === '') {
      errors.push('Order number is required');
    }

    if (!data.cuttingPlans || data.cuttingPlans.length === 0) {
      errors.push('At least one cutting plan is required');
    }

    data.cuttingPlans.forEach((plan, index) => {
      if (!plan.profile) {
        errors.push(`Cutting plan ${index + 1}: Profile is required`);
      }

      if (!plan.cuts || plan.cuts.length === 0) {
        errors.push(`Cutting plan ${index + 1}: At least one cut is required`);
      }

      plan.cuts.forEach((cut, cutIndex) => {
        if (cut.length <= 0) {
          errors.push(
            `Cutting plan ${index + 1}, Cut ${cutIndex + 1}: Length must be greater than 0`
          );
        }

        if (cut.length > plan.stockLength) {
          errors.push(
            `Cutting plan ${index + 1}, Cut ${cutIndex + 1}: Length exceeds stock length`
          );
        }

        if (cut.angle < 0 || cut.angle > 180) {
          errors.push(
            `Cutting plan ${index + 1}, Cut ${cutIndex + 1}: Angle must be between 0 and 180 degrees`
          );
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate export with automatic format detection
   */
  async export(
    data: YilmazCutListData,
    options: YilmazExportOptions
  ): Promise<string | Buffer> {
    const validation = this.validateData(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    if (options.format === 'csv') {
      return this.exportToCSV(data, options);
    } else {
      return this.exportToMDB(data, options);
    }
  }

  /**
   * Get supported export formats for a given machine series
   */
  getSupportedFormats(series: 'dc' | 'cnc'): ('csv' | 'mdb')[] {
    if (series === 'dc') {
      return ['csv', 'mdb'];
    } else {
      return ['csv', 'mdb'];
    }
  }
}

