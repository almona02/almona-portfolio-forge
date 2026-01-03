/**
 * Production Utilities - Helper Functions for Dual-Output Generation
 * 
 * These utilities handle the nuanced calculations required for 99.8% accurate
 * production data generation. Domain expertise is critical for these functions.
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map)
 */

import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { FabricationData, WindowUnit } from '@/types/fabricator';
import {
    DEFAULT_HOLE_SPECS,
    DEFAULT_PROFILE_DIMENSIONS,
    HARDWARE_QUANTITY_PER_COMPONENT,
    UNIT_CONVERSION,
} from './productionConstants';

/**
 * Profile specification for calculations
 */
export interface ProfileSpec {
  id: string;
  code: string;           // e.g., "FRAME-60-A"
  width: number;          // Profile width (mm)
  depth: number;          // Profile depth (mm)
  material: 'aluminum' | 'upvc' | 'steel';
  weightPerMeter: number; // kg/m
  costPerMeter: number;   // Currency/m
}

/**
 * Cutting rules for kerf compensation
 */
export interface CuttingRules {
  kerf: number;           // Saw blade kerf (mm) - typically 1.5-3mm
  barTrim: number;        // Trim allowance (mm) - typically 0.5-1mm
  weldingLoss?: number;   // For UPVC (mm per side)
  miterAllowance?: number; // Miter joint allowance (mm)
}

/**
 * Production Utilities Class
 * 
 * NOTE: These calculations should be validated by domain experts.
 * Real-world production may require adjustments based on:
 * - Machine-specific kerf values
 * - Material-specific expansion coefficients
 * - Workshop-specific practices
 */
export class ProductionUtils {
  /**
   * Apply kerf compensation to cut lengths
   * 
   * For miter cuts, compensation is more complex: kerf / sin(angle)
   * For straight cuts, it's simply: length + kerf
   * 
   * @param length - Original cut length (mm)
   * @param kerf - Saw blade kerf (mm)
   * @param angle - Cut angle in degrees (90 = straight, 45 = miter)
   * @returns Compensated length (mm)
   */
  static applyKerfCompensation(
    length: number, 
    kerf: number, 
    angle: number = 90
  ): number {
    if (angle === 90) {
      // Straight cut: simple addition
      return length + kerf;
    } else {
      // Miter cut: kerf compensation is angle-dependent
      // Formula: kerf / sin(angle)
      const angleRad = angle * UNIT_CONVERSION.DEGREES_TO_RADIANS;
      const miterCompensation = kerf / Math.sin(angleRad);
      return length + miterCompensation;
    }
  }
  
  /**
   * Calculate waste from standard stock length
   * 
   * NOTE: This is a simplified calculation. Real waste depends on:
   * - How OptimizationEngine nests multiple cuts
   * - Remnant marketplace rules
   * - Minimum usable remnant length
   * 
   * For accurate waste calculation, use OptimizationEngine result.
   * 
   * @param cutLength - Required cut length (mm)
   * @param stockLength - Standard stock length (mm) - typically 5800 or 6000
   * @returns Waste length (mm)
   */
  static calculateWaste(cutLength: number, stockLength: number): number {
    if (cutLength > stockLength) {
      // Cut is longer than stock - no waste (but may need special order)
      return 0;
    }
    
    const pieces = Math.floor(stockLength / cutLength);
    if (pieces === 0) {
      // Entire stock becomes waste
      return stockLength;
    }
    
    // Calculate remaining waste after cutting
    return stockLength - (cutLength * pieces);
  }
  
  /**
   * Calculate profile weight
   * 
   * @param length - Profile length (mm)
   * @param profile - Profile specification
   * @returns Weight in kg
   */
  static calculateProfileWeight(length: number, profile: ProfileSpec): number {
    const lengthInMeters = length / UNIT_CONVERSION.MM_PER_METER;
    return lengthInMeters * profile.weightPerMeter;
  }
  
  /**
   * Calculate material cost
   * 
   * @param length - Profile length (mm)
   * @param profile - Profile specification
   * @returns Cost in currency units
   */
  static calculateMaterialCost(length: number, profile: ProfileSpec): number {
    const lengthInMeters = length / UNIT_CONVERSION.MM_PER_METER;
    return lengthInMeters * profile.costPerMeter;
  }
  
  /**
   * Calculate glass weight
   * 
   * Glass density: ~2.5 kg/m² per mm thickness
   * 
   * @param width - Glass width (mm)
   * @param height - Glass height (mm)
   * @param thickness - Glass thickness (mm) - e.g., 4, 6, 24 (IGU)
   * @returns Weight in kg
   */
  static calculateGlassWeight(
    width: number, 
    height: number, 
    thickness: number
  ): number {
    const area = (width * height) / UNIT_CONVERSION.MM2_PER_M2; // Convert to m²
    // Import glass density constant (avoiding circular dependency by using inline value)
    const GLASS_DENSITY_KG_PER_M2_PER_MM = 2.5; // kg/m² per mm thickness
    const weightPerSquareMeter = thickness * GLASS_DENSITY_KG_PER_M2_PER_MM;
    return area * weightPerSquareMeter;
  }
  
  /**
   * Generate machining zones for frame
   * 
   * Creates zones for:
   * - Corner miter cuts
   * - Hardware mounting holes
   * - Drainage holes (if needed)
   * 
   * @param pattern - Egyptian pattern
   * @param windowUnit - Window unit data
   * @returns Array of machining zones
   */
  static generateFrameMachiningZones(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): FabricationData['profiles'][0]['machiningZones'] {
    const zones: FabricationData['profiles'][0]['machiningZones'] = [];
    
    // Corner miter cuts (4 corners)
    // Frame perimeter: top, right, bottom, left
    const frameProfileWidth = (pattern as any).frameProfile?.width || DEFAULT_PROFILE_DIMENSIONS.DEFAULT_FRAME_WIDTH_MM;
    
    zones.push(
      {
        type: 'mill',
        position: 0,
        dimensions: { width: frameProfileWidth, depth: frameProfileWidth, length: frameProfileWidth },
        toolReference: 'MITER-45'
      },
      {
        type: 'mill',
        position: windowUnit.overallWidth,
        dimensions: { width: frameProfileWidth, depth: frameProfileWidth, length: frameProfileWidth },
        toolReference: 'MITER-45'
      },
      {
        type: 'mill',
        position: windowUnit.overallWidth + windowUnit.overallHeight,
        dimensions: { width: frameProfileWidth, depth: frameProfileWidth, length: frameProfileWidth },
        toolReference: 'MITER-45'
      },
      {
        type: 'mill',
        position: (windowUnit.overallWidth * 2) + windowUnit.overallHeight,
        dimensions: { width: frameProfileWidth, depth: frameProfileWidth, length: frameProfileWidth },
        toolReference: 'MITER-45'
      }
    );
    
    // Hardware holes from pattern accessories
    if ((pattern as any).accessories) {
      (pattern as any).accessories.forEach((accessory: any) => {
        if (accessory.positionOnFrame) {
          const position = this.parsePosition(
            accessory.positionOnFrame, 
            windowUnit
          );
          
          zones.push({
            type: 'drill',
            position,
            dimensions: { 
              width: accessory.holeDiameter || DEFAULT_HOLE_SPECS.DEFAULT_HOLE_DIAMETER_MM, 
              depth: accessory.holeDepth || DEFAULT_HOLE_SPECS.DEFAULT_HOLE_DEPTH_MM 
            },
            toolReference: accessory.toolReference || 'DRILL-5MM'
          });
        }
      });
    }
    
    return zones;
  }
  
  /**
   * Generate machining zones for mullion
   * 
   * @param mullion - Mullion specification from pattern
   * @param windowUnit - Window unit data
   * @returns Array of machining zones
   */
  static generateMullionMachiningZones(
    mullion: any,
    windowUnit: WindowUnit
  ): FabricationData['profiles'][0]['machiningZones'] {
    const zones: FabricationData['profiles'][0]['machiningZones'] = [];
    
    // Mullion typically has:
    // - Top and bottom miter cuts (45°)
    // - Connection points to frame
    
    zones.push(
      {
        type: 'mill',
        position: 0,
        dimensions: {
          width: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          depth: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          length: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
        },
        toolReference: 'MITER-45'
      },
      {
        type: 'mill',
        position: windowUnit.overallHeight - DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
        dimensions: {
          width: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          depth: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          length: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
        },
        toolReference: 'MITER-45'
      }
    );
    
    return zones;
  }
  
  /**
   * Generate machining zones for transom
   * 
   * @param transom - Transom specification from pattern
   * @param windowUnit - Window unit data
   * @returns Array of machining zones
   */
  static generateTransomMachiningZones(
    transom: any,
    windowUnit: WindowUnit
  ): FabricationData['profiles'][0]['machiningZones'] {
    const zones: FabricationData['profiles'][0]['machiningZones'] = [];
    
    // Transom typically has:
    // - Left and right miter cuts (45°)
    
    zones.push(
      {
        type: 'mill',
        position: 0,
        dimensions: {
          width: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          depth: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          length: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
        },
        toolReference: 'MITER-45'
      },
      {
        type: 'mill',
        position: windowUnit.overallWidth - DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
        dimensions: {
          width: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          depth: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
          length: DEFAULT_PROFILE_DIMENSIONS.DEFAULT_MACHINING_ZONE_DIMENSION_MM,
        },
        toolReference: 'MITER-45'
      }
    );
    
    return zones;
  }
  
  /**
   * Parse position string to numeric position
   * 
   * Handles various formats:
   * - "center" -> middle of dimension
   * - "200mm from top" -> 200mm from top
   * - "200mm from bottom" -> dimension - 200mm
   * - "200mm from left" -> 200mm from left
   * - "200mm from right" -> dimension - 200mm
   * 
   * @param positionSpec - Position specification string
   * @param windowUnit - Window unit for context
   * @returns Position in mm
   */
  static parsePosition(
    positionSpec: string,
    windowUnit: WindowUnit
  ): number {
    const spec = positionSpec.toLowerCase().trim();
    
    // Handle "center"
    if (spec === 'center' || spec === 'middle') {
      return windowUnit.overallWidth / 2;
    }
    
    // Handle "Xmm from top/bottom/left/right"
    const fromTopMatch = spec.match(/(\d+(?:\.\d+)?)\s*mm\s*from\s*top/);
    if (fromTopMatch) {
      return parseFloat(fromTopMatch[1]);
    }
    
    const fromBottomMatch = spec.match(/(\d+(?:\.\d+)?)\s*mm\s*from\s*bottom/);
    if (fromBottomMatch) {
      return windowUnit.overallHeight - parseFloat(fromBottomMatch[1]);
    }
    
    const fromLeftMatch = spec.match(/(\d+(?:\.\d+)?)\s*mm\s*from\s*left/);
    if (fromLeftMatch) {
      return parseFloat(fromLeftMatch[1]);
    }
    
    const fromRightMatch = spec.match(/(\d+(?:\.\d+)?)\s*mm\s*from\s*right/);
    if (fromRightMatch) {
      return windowUnit.overallWidth - parseFloat(fromRightMatch[1]);
    }
    
    // Handle direct numeric value
    const numericMatch = spec.match(/(\d+(?:\.\d+)?)/);
    if (numericMatch) {
      return parseFloat(numericMatch[1]);
    }
    
    // Default: center
    console.warn(`Could not parse position spec: ${positionSpec}, defaulting to center`);
    return windowUnit.overallWidth / 2;
  }
  
  /**
   * Calculate hardware quantity based on pattern and window dimensions
   * 
   * @param accessory - Accessory specification
   * @param windowUnit - Window unit data
   * @param pattern - Egyptian pattern
   * @returns Quantity needed
   */
  static calculateHardwareQuantity(
    accessory: any,
    windowUnit: WindowUnit,
    pattern: EgyptianPattern
  ): number {
    // Default: quantity from pattern
    if (accessory.quantity) {
      return accessory.quantity;
    }
    
    // Calculate based on pattern grid
    const grid = pattern.gridSpec;
    
    // For hinges: typically 2 per sash
    if (accessory.category === 'hinge') {
      const sashCount = grid.cells.filter(c => c.type === 'sash' || c.type === 'sliding').length;
      return sashCount * HARDWARE_QUANTITY_PER_COMPONENT.HINGES_PER_SASH;
    }

    // For handles: 1 per sash
    if (accessory.category === 'handle') {
      const sashCount = grid.cells.filter(c => c.type === 'sash' || c.type === 'sliding').length;
      return sashCount * HARDWARE_QUANTITY_PER_COMPONENT.HANDLES_PER_SASH;
    }

    // For locks: 1 per sash
    if (accessory.category === 'lock') {
      const sashCount = grid.cells.filter(c => c.type === 'sash' || c.type === 'sliding').length;
      return sashCount * HARDWARE_QUANTITY_PER_COMPONENT.LOCKS_PER_SASH;
    }

    // For rollers: 2 per sliding sash
    if (accessory.category === 'roller') {
      const slidingCount = grid.cells.filter(c => c.type === 'sliding').length;
      return slidingCount * HARDWARE_QUANTITY_PER_COMPONENT.ROLLERS_PER_SLIDING_SASH;
    }

    // Default: 1
    return HARDWARE_QUANTITY_PER_COMPONENT.DEFAULT_QUANTITY;
  }
}

