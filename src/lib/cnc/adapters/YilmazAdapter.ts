/**
 * YilmazAdapter - Yilmaz CNC Machine Adapter
 * 
 * Provides Yilmaz-specific G-code generation, validation, and simulation.
 * 
 * Week 5 Task 5.1: Production CNC Exporter
 */

import { SecurityGateway } from '@/lib/security/SecurityGateway';
import type { Cut, OptimizationResult } from '@/types/fabricator';
import { BaseCNCAdapter, CNCAdapterConfig, GCodeSimulationResult, GCodeValidationResult } from './BaseCNCAdapter';

/**
 * YilmazAdapter - Yilmaz CNC machine adapter
 */
export class YilmazAdapter extends BaseCNCAdapter {
  private securityGateway: SecurityGateway;

  constructor(config: Partial<CNCAdapterConfig> = {}) {
    const defaultConfig: CNCAdapterConfig = {
      machineId: 'yilmaz-default',
      machineName: 'Yilmaz CNC',
      machineModel: 'Yilmaz Standard',
      maxLength: 6000, // 6 meters
      maxWidth: 2000, // 2 meters
      maxHeight: 300, // 30 cm
      precision: 3, // 3 decimal places
      supportedMaterials: ['aluminium', 'upvc', 'pvc', 'wood'],
      locale: 'en',
      ...config,
    };

    super(defaultConfig);
    this.securityGateway = SecurityGateway.getInstance();
  }

  /**
   * Generate Yilmaz-specific G-code
   */
  async generateGCode(
    cuts: Cut[],
    optimization: OptimizationResult,
    options?: Record<string, any>
  ): Promise<string> {
    const lines: string[] = [];

    // Yilmaz header
    lines.push('(YILMAZ CNC G-CODE)');
    lines.push(`(Generated: ${new Date().toISOString()})`);
    lines.push(`(Machine: ${this.config.machineName})`);
    lines.push(`(Total Cuts: ${cuts.length})`);
    lines.push('');

    // Initialize machine
    lines.push('G21'); // Metric units
    lines.push('G90'); // Absolute positioning
    lines.push('G17'); // XY plane
    lines.push('G94'); // Feed rate per minute
    lines.push('M3'); // Spindle on clockwise
    lines.push('');

    // Generate G-code for each cut
    let currentX = 0;
    let currentY = 0;
    const currentZ = 0;

    for (const cut of cuts) {
      // Move to start position
      lines.push(`G0 X${currentX.toFixed(this.config.precision)} Y${currentY.toFixed(this.config.precision)} Z${currentZ.toFixed(this.config.precision)}`);

      // Cut operation
      const cutLength = cut.length;
        const feedRate = options?.feedRate || 1000; // mm/min
        const spindleSpeed = options?.spindleSpeed || 10000; // RPM

        lines.push(`M3 S${spindleSpeed}`); // Set spindle speed
        // Cut along Y axis (Length)
        lines.push(`G1 X${currentX.toFixed(this.config.precision)} Y${(currentY + cutLength).toFixed(this.config.precision)} F${feedRate}`); // Linear cut
        lines.push('M5'); // Spindle off

      // Update position
      currentY += cutLength + 10; // Add 10mm spacing between cuts

      // Check if we need to move to next column (stack along X)
      if (currentY > this.config.maxLength - 100) {
        currentY = 0;
        currentX += 100; // Move to next column
      }
    }

    // End program
    lines.push('');
    lines.push('M30'); // Program end and rewind
    lines.push('(END OF PROGRAM)');

    return lines.join('\n');
  }

  /**
   * Validate Yilmaz G-code
   */
  async validateGCode(gcode: string): Promise<GCodeValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous commands
    const lines = gcode.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      
      // Check for dangerous commands in wrong context
      if (line.includes('M99') && i < lines.length - 5) {
        warnings.push(`M99 (subroutine call) found at line ${i + 1} - ensure proper context`);
      }

      // Check for out-of-bounds coordinates
      const xMatch = line.match(/X([\d.-]+)/);
      const yMatch = line.match(/Y([\d.-]+)/);
      const zMatch = line.match(/Z([\d.-]+)/);

      if (xMatch) {
        const x = parseFloat(xMatch[1]);
        if (x < 0 || x > this.config.maxWidth) {
          errors.push(`X coordinate ${x}mm out of bounds (0-${this.config.maxWidth}mm) at line ${i + 1}`);
        }
      }

      if (yMatch) {
        const y = parseFloat(yMatch[1]);
        if (y < 0 || y > this.config.maxLength) {
          errors.push(`Y coordinate ${y}mm out of bounds (0-${this.config.maxLength}mm) at line ${i + 1}`);
        }
      }

      if (zMatch) {
        const z = parseFloat(zMatch[1]);
        if (z < 0 || z > this.config.maxHeight) {
          errors.push(`Z coordinate ${z}mm out of bounds (0-${this.config.maxHeight}mm) at line ${i + 1}`);
        }
      }
    }

    // Estimate duration (rough calculation)
    const estimatedDuration = this.estimateDuration(gcode);

    // Estimate material usage
    const estimatedMaterialUsage = this.estimateMaterialUsage(gcode);

    // Calculate checksum
    const checksum = this.calculateChecksum(gcode);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      checksum,
      estimatedDuration,
      estimatedMaterialUsage,
    };
  }

  /**
   * Simulate Yilmaz G-code execution
   */
  async simulateGCode(gcode: string): Promise<GCodeSimulationResult> {
    const simulatedPath: Array<{ x: number; y: number; z: number; command: string }> = [];
    const collisions: Array<{ position: { x: number; y: number; z: number }; description: string }> = [];
    const outOfBounds: Array<{ position: { x: number; y: number; z: number }; limit: string }> = [];
    const warnings: string[] = [];

    let currentX = 0;
    let currentY = 0;
    let currentZ = 0;

    const lines = gcode.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toUpperCase();
      if (!line || line.startsWith('(') || line.startsWith(';')) continue;

      // Parse G-code commands
      if (line.startsWith('G0') || line.startsWith('G1')) {
        const xMatch = line.match(/X([\d.-]+)/);
        const yMatch = line.match(/Y([\d.-]+)/);
        const zMatch = line.match(/Z([\d.-]+)/);

        if (xMatch) currentX = parseFloat(xMatch[1]);
        if (yMatch) currentY = parseFloat(yMatch[1]);
        if (zMatch) currentZ = parseFloat(zMatch[1]);

        // Check bounds
        if (currentX < 0 || currentX > this.config.maxWidth) {
          outOfBounds.push({
            position: { x: currentX, y: currentY, z: currentZ },
            limit: `X: 0-${this.config.maxWidth}mm`,
          });
        }

        if (currentY < 0 || currentY > this.config.maxLength) {
          outOfBounds.push({
            position: { x: currentX, y: currentY, z: currentZ },
            limit: `Y: 0-${this.config.maxLength}mm`,
          });
        }

        if (currentZ < 0 || currentZ > this.config.maxHeight) {
          outOfBounds.push({
            position: { x: currentX, y: currentY, z: currentZ },
            limit: `Z: 0-${this.config.maxHeight}mm`,
          });
        }

        simulatedPath.push({
          x: currentX,
          y: currentY,
          z: currentZ,
          command: line,
        });
      }
    }

    return {
      success: collisions.length === 0 && outOfBounds.length === 0,
      simulatedPath,
      collisions,
      outOfBounds,
      warnings,
    };
  }

  /**
   * Calculate checksum for G-code
   */
  calculateChecksum(gcode: string): string {
    // Simple checksum: sum of all character codes
    let sum = 0;
    for (let i = 0; i < gcode.length; i++) {
      sum += gcode.charCodeAt(i);
    }
    return sum.toString(16).toUpperCase().padStart(8, '0');
  }

  /**
   * Get export confirmation message
   */
  getExportConfirmation(_locale: 'en' | 'ar' = 'en'): { message: string; messageAr: string } {
    return {
      message: `G-code exported successfully for ${this.config.machineName}. Checksum: ${this.calculateChecksum('')}`,
      messageAr: `تم تصدير G-code بنجاح لـ ${this.config.machineName}.`,
    };
  }

  /**
   * Estimate G-code execution duration
   */
  private estimateDuration(gcode: string): number {
    // Rough estimation: count G1 commands and estimate time
    const g1Count = (gcode.match(/G1/g) || []).length;
    const averageCutTime = 5000; // 5 seconds per cut (rough estimate)
    return g1Count * averageCutTime;
  }

  /**
   * Estimate material usage
   */
  private estimateMaterialUsage(gcode: string): number {
    // Extract Y movements to estimate material length (aligned with maxLength)
    const yMatches = gcode.match(/Y([\d.-]+)/g) || [];
    let maxY = 0;
    yMatches.forEach((match) => {
      const y = parseFloat(match.substring(1));
      if (y > maxY) maxY = y;
    });
    return maxY;
  }
}

