/**
 * ProductionCNCExporter - Production-Grade CNC Exporter
 * 
 * Provides machine-specific adapters, pre-export validation, G-code simulation,
 * checksum validation, and Arabic export confirmations.
 * 
 * Week 5 Task 5.1: Production CNC Exporter
 */

import { BaseCNCAdapter, CNCExportResult } from './adapters/BaseCNCAdapter';
import { YilmazAdapter } from './adapters/YilmazAdapter';
import { ElumatecAdapter } from './adapters/ElumatecAdapter';
import type { Cut, OptimizationResult } from '@/types/fabricator';
import { SecurityGateway } from '@/lib/security/SecurityGateway';

export type MachineType = 'yilmaz' | 'elumatec';

export interface ExportOptions {
  machineType: MachineType;
  machineConfig?: Partial<{
    machineId: string;
    machineName: string;
    machineModel: string;
    maxLength: number;
    maxWidth: number;
    maxHeight: number;
    precision: number;
    supportedMaterials: string[];
  }>;
  locale?: 'en' | 'ar';
  enableSimulation?: boolean;
  enableValidation?: boolean;
  customOptions?: Record<string, any>;
}

export interface ExportConfirmation {
  success: boolean;
  message: string;
  messageAr: string;
  checksum: string;
  metadata: CNCExportResult['metadata'];
  warnings: string[];
  errors: string[];
}

/**
 * ProductionCNCExporter - Main production CNC exporter class
 */
export class ProductionCNCExporter {
  private static instance: ProductionCNCExporter;
  private securityGateway: SecurityGateway;
  private adapters: Map<MachineType, BaseCNCAdapter> = new Map();

  private constructor() {
    this.securityGateway = SecurityGateway.getInstance();
    this.initializeAdapters();
  }

  static getInstance(): ProductionCNCExporter {
    if (!ProductionCNCExporter.instance) {
      ProductionCNCExporter.instance = new ProductionCNCExporter();
    }
    return ProductionCNCExporter.instance;
  }

  /**
   * Initialize machine adapters
   */
  private initializeAdapters(): void {
    // Initialize default adapters
    this.adapters.set('yilmaz', new YilmazAdapter());
    this.adapters.set('elumatec', new ElumatecAdapter());
  }

  /**
   * Get adapter for machine type
   */
  private getAdapter(machineType: MachineType, config?: ExportOptions['machineConfig']): BaseCNCAdapter {
    let adapter = this.adapters.get(machineType);

    if (!adapter) {
      // Create adapter if not exists
      if (machineType === 'yilmaz') {
        adapter = new YilmazAdapter(config);
      } else if (machineType === 'elumatec') {
        adapter = new ElumatecAdapter(config);
      } else {
        throw new Error(`Unsupported machine type: ${machineType}`);
      }
      this.adapters.set(machineType, adapter);
    } else if (config) {
      // Recreate adapter with custom config
      if (machineType === 'yilmaz') {
        adapter = new YilmazAdapter(config);
      } else if (machineType === 'elumatec') {
        adapter = new ElumatecAdapter(config);
      }
      this.adapters.set(machineType, adapter);
    }

    return adapter;
  }

  /**
   * Export G-code with full validation and simulation
   */
  async export(
    cuts: Cut[],
    optimization: OptimizationResult,
    options: ExportOptions
  ): Promise<CNCExportResult> {
    const locale = options.locale || 'en';
    const enableValidation = options.enableValidation !== false; // Default: true
    const enableSimulation = options.enableSimulation !== false; // Default: true

    // Get adapter
    const adapter = this.getAdapter(options.machineType, options.machineConfig);

    // Pre-export validation
    if (enableValidation) {
      const preValidation = await adapter.preExportValidation(cuts, optimization);
      if (!preValidation.valid) {
        const errorMessage = this.securityGateway.getLocalizedError(
          'CNC_EXPORT_VALIDATION_FAILED',
          locale,
          { errors: preValidation.errors.join(', ') }
        );
        throw new Error(locale === 'ar' ? errorMessage.messageAr : errorMessage.message_en);
      }
    }

    // Export with adapter
    const result = await adapter.export(cuts, optimization, options.customOptions);

    // Additional validation if enabled
    if (enableValidation && !result.validation.valid) {
      const errorMessage = this.securityGateway.getLocalizedError(
        'CNC_EXPORT_VALIDATION_FAILED',
        locale,
        { errors: result.validation.errors.join(', ') }
      );
      throw new Error(locale === 'ar' ? errorMessage.messageAr : errorMessage.message_en);
    }

    // Simulation check if enabled
    if (enableSimulation && result.simulation && !result.simulation.success) {
      const warnings: string[] = [];
      if (result.simulation.collisions.length > 0) {
        warnings.push(`Collisions detected: ${result.simulation.collisions.length}`);
      }
      if (result.simulation.outOfBounds.length > 0) {
        warnings.push(`Out of bounds: ${result.simulation.outOfBounds.length}`);
      }
      result.validation.warnings.push(...warnings);
    }

    return result;
  }

  /**
   * Get export confirmation
   */
  getExportConfirmation(
    result: CNCExportResult,
    locale: 'en' | 'ar' = 'en'
  ): ExportConfirmation {
    const adapter = this.adapters.get('yilmaz') || this.adapters.get('elumatec');
    if (!adapter) {
      throw new Error('No adapter available for confirmation');
    }

    const confirmation = adapter.getExportConfirmation(locale);

    return {
      success: result.validation.valid && (!result.simulation || result.simulation.success),
      message: confirmation.message.replace('Checksum: 00000000', `Checksum: ${result.checksum}`),
      messageAr: confirmation.messageAr,
      checksum: result.checksum,
      metadata: result.metadata,
      warnings: result.validation.warnings,
      errors: result.validation.errors,
    };
  }

  /**
   * Validate G-code without exporting
   */
  async validateGCode(
    gcode: string,
    machineType: MachineType,
    config?: ExportOptions['machineConfig']
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[]; checksum: string }> {
    const adapter = this.getAdapter(machineType, config);
    const validation = await adapter.validateGCode(gcode);

    return {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
      checksum: validation.checksum,
    };
  }

  /**
   * Simulate G-code without exporting
   */
  async simulateGCode(
    gcode: string,
    machineType: MachineType,
    config?: ExportOptions['machineConfig']
  ): Promise<{ success: boolean; collisions: number; outOfBounds: number; warnings: string[] }> {
    const adapter = this.getAdapter(machineType, config);
    const simulation = await adapter.simulateGCode(gcode);

    return {
      success: simulation.success,
      collisions: simulation.collisions.length,
      outOfBounds: simulation.outOfBounds.length,
      warnings: simulation.warnings,
    };
  }

  /**
   * Calculate checksum for G-code
   */
  calculateChecksum(gcode: string, machineType: MachineType = 'yilmaz'): string {
    const adapter = this.getAdapter(machineType);
    return adapter.calculateChecksum(gcode);
  }
}

// Export singleton instance
export const productionCNCExporter = ProductionCNCExporter.getInstance();

