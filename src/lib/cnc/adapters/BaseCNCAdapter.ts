/**
 * BaseCNCAdapter - Base class for CNC machine adapters
 * 
 * Provides common interface and validation for machine-specific adapters.
 * 
 * Week 5 Task 5.1: Production CNC Exporter
 */

import type { Cut, OptimizationResult } from '@/types/fabricator';

export interface GCodeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checksum: string;
  estimatedDuration?: number; // milliseconds
  estimatedMaterialUsage?: number; // mm
}

export interface GCodeSimulationResult {
  success: boolean;
  simulatedPath: Array<{ x: number; y: number; z: number; command: string }>;
  collisions: Array<{ position: { x: number; y: number; z: number }; description: string }>;
  outOfBounds: Array<{ position: { x: number; y: number; z: number }; limit: string }>;
  warnings: string[];
}

export interface CNCExportResult {
  gcode: string;
  checksum: string;
  validation: GCodeValidationResult;
  simulation?: GCodeSimulationResult;
  metadata: {
    machine: string;
    model: string;
    timestamp: string;
    totalCuts: number;
    estimatedDuration?: number;
    estimatedMaterialUsage?: number;
  };
}

export interface CNCAdapterConfig {
  machineId: string;
  machineName: string;
  machineModel: string;
  maxLength: number; // mm
  maxWidth: number; // mm
  maxHeight: number; // mm
  precision: number; // decimal places
  supportedMaterials: string[];
  locale?: 'en' | 'ar';
}

/**
 * BaseCNCAdapter - Abstract base class for CNC machine adapters
 */
export abstract class BaseCNCAdapter {
  protected config: CNCAdapterConfig;

  constructor(config: CNCAdapterConfig) {
    this.config = config;
  }

  /**
   * Generate G-code from cuts
   */
  abstract generateGCode(
    cuts: Cut[],
    optimization: OptimizationResult,
    options?: Record<string, any>
  ): Promise<string>;

  /**
   * Validate G-code before export
   */
  abstract validateGCode(gcode: string): Promise<GCodeValidationResult>;

  /**
   * Simulate G-code execution
   */
  abstract simulateGCode(gcode: string): Promise<GCodeSimulationResult>;

  /**
   * Calculate checksum for G-code
   */
  abstract calculateChecksum(gcode: string): string;

  /**
   * Get export confirmation message
   */
  abstract getExportConfirmation(locale?: 'en' | 'ar'): { message: string; messageAr: string };

  /**
   * Pre-export validation
   */
  async preExportValidation(
    cuts: Cut[],
    optimization: OptimizationResult
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate cuts are within machine limits
    for (const cut of cuts) {
      if (cut.length > this.config.maxLength) {
        errors.push(
          `Cut length ${cut.length}mm exceeds machine maximum ${this.config.maxLength}mm`
        );
      }

      if (cut.length < 10) {
        warnings.push(`Very short cut detected: ${cut.length}mm`);
      }
    }

    // Validate material support (check cutting plan profiles)
    const allMaterials = optimization.cuttingPlan
      .flatMap(plan => [plan.profile.material])
      .filter((m, i, arr) => arr.indexOf(m) === i); // unique
    
    for (const material of allMaterials) {
      if (!this.config.supportedMaterials.includes(material.toLowerCase())) {
        warnings.push(
          `Material "${material}" may not be fully supported by ${this.config.machineName}`
        );
      }
    }

    // Validate optimization result
    if (optimization.nestingEfficiency < 80) {
      warnings.push(`Low nesting efficiency: ${optimization.nestingEfficiency.toFixed(1)}%`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export with full validation and simulation
   */
  async export(
    cuts: Cut[],
    optimization: OptimizationResult,
    options?: Record<string, any>
  ): Promise<CNCExportResult> {
    // Pre-export validation
    const preValidation = await this.preExportValidation(cuts, optimization);
    if (!preValidation.valid) {
      throw new Error(`Pre-export validation failed: ${preValidation.errors.join(', ')}`);
    }

    // Generate G-code
    const gcode = await this.generateGCode(cuts, optimization, options);

    // Validate G-code
    const validation = await this.validateGCode(gcode);

    // Simulate G-code
    const simulation = await this.simulateGCode(gcode);

    // Calculate checksum
    const checksum = this.calculateChecksum(gcode);

    // Calculate metadata
    const totalCuts = cuts.length;
    const estimatedDuration = validation.estimatedDuration;
    const estimatedMaterialUsage = validation.estimatedMaterialUsage;

    return {
      gcode,
      checksum,
      validation,
      simulation,
      metadata: {
        machine: this.config.machineName,
        model: this.config.machineModel,
        timestamp: new Date().toISOString(),
        totalCuts,
        estimatedDuration,
        estimatedMaterialUsage,
      },
    };
  }
}

