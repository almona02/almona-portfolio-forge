/**
 * Constraint Validator - Production-Grade Validation Engine
 * 
 * Validates window designs against pattern constraints with 6 validation categories:
 * 1. Dimension validation (width, height, aspect ratio)
 * 2. Grid & cell validation (cell size, grid density)
 * 3. Sash validation (area, weight, hardware compatibility)
 * 4. Opening mechanism validation (track capacity, hinge spacing)
 * 5. Material compatibility validation
 * 6. Structural validation (wind load, reinforcement)
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map - Day 5-6)
 */

import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';
import {
    DIMENSION_CONSTRAINTS,
    GRID_CONSTRAINTS,
    MECHANISM_CONSTRAINTS,
    SASH_CONSTRAINTS,
    STRUCTURAL_CONSTRAINTS,
    UNIT_CONVERSION,
    VALIDATION_CALCULATION,
    VALIDATION_THRESHOLDS,
} from './constraintValidationConstants';

export interface ValidationWarning {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  affectedComponents: string[];
  suggestedAction: string;
  validationRule: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
  score: number; // 0-1 validation score
}

export class ConstraintValidator {
  private static readonly WARNING_THRESHOLD = VALIDATION_THRESHOLDS.WARNING_THRESHOLD;
  
  /**
   * Main validation entry point - validates pattern against window unit
   */
  static validatePatternConstraints(
    pattern: EgyptianPattern | null,
    windowUnit: WindowUnit
  ): ValidationResult {
    const warnings: ValidationWarning[] = [];
    let errorCount = 0;
    let warningCount = 0;
    
    // If no pattern, return basic validation
    if (!pattern) {
      return {
        valid: true,
        warnings: [],
        score: 1.0
      };
    }
    
    // === 1. DIMENSION VALIDATION ===
    const dimensionWarnings = this.validateDimensions(pattern, windowUnit);
    warnings.push(...dimensionWarnings);
    
    // === 2. GRID & CELL VALIDATION ===
    const gridWarnings = this.validateGrid(pattern, windowUnit);
    warnings.push(...gridWarnings);
    
    // === 3. SASH VALIDATION ===
    const sashWarnings = this.validateSashes(pattern, windowUnit);
    warnings.push(...sashWarnings);
    
    // === 4. OPENING MECHANISM VALIDATION ===
    const mechanismWarnings = this.validateOpeningMechanism(pattern, windowUnit);
    warnings.push(...mechanismWarnings);
    
    // === 5. MATERIAL COMPATIBILITY ===
    const materialWarnings = this.validateMaterials(pattern, windowUnit);
    warnings.push(...materialWarnings);
    
    // === 6. STRUCTURAL VALIDATION ===
    const structuralWarnings = this.validateStructural(pattern, windowUnit);
    warnings.push(...structuralWarnings);
    
    // Count severity levels
    warnings.forEach(warning => {
      switch (warning.severity) {
        case 'error': errorCount++; break;
        case 'warning': warningCount++; break;
        case 'info': break; // infoCount not used
      }
    });
    
    // Calculate validation score
    const _totalTests = VALIDATION_CALCULATION.TOTAL_VALIDATION_CATEGORIES;
    const errorPenalty = errorCount * VALIDATION_THRESHOLDS.ERROR_PENALTY;
    const warningPenalty = warningCount * VALIDATION_THRESHOLDS.WARNING_PENALTY;
    const baseScore = VALIDATION_CALCULATION.BASE_SCORE;
    const score = Math.max(VALIDATION_CALCULATION.MIN_SCORE, baseScore - errorPenalty - warningPenalty);
    
    return {
      valid: errorCount === 0 && score >= this.WARNING_THRESHOLD,
      warnings,
      score
    };
  }
  
  /**
   * Validates window dimensions against pattern constraints
   */
  private static validateDimensions(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const patternAny = pattern as any;
    
    // Maximum dimensions
    if (patternAny.constraints?.maxWidth && width > patternAny.constraints.maxWidth) {
      warnings.push({
        severity: 'error',
        code: 'DIM-001',
        message: `Window width (${width}mm) exceeds pattern maximum (${patternAny.constraints.maxWidth}mm)`,
        affectedComponents: ['frame'],
        suggestedAction: 'Reduce width or select different pattern',
        validationRule: 'maxWidth'
      });
    }
    
    // Minimum dimensions
    if (patternAny.constraints?.minWidth && width < patternAny.constraints.minWidth) {
      warnings.push({
        severity: 'warning',
        code: 'DIM-002',
        message: `Window width (${width}mm) is below recommended minimum (${patternAny.constraints.minWidth}mm)`,
        affectedComponents: ['frame'],
        suggestedAction: 'Increase width or accept reduced performance',
        validationRule: 'minWidth'
      });
    }
    
    // Aspect ratio validation
    const aspectRatio = width / height;
    const idealAspect = patternAny.constraints?.idealAspectRatio;
    const aspectTolerance = patternAny.constraints?.aspectRatioTolerance || DIMENSION_CONSTRAINTS.ASPECT_RATIO_TOLERANCE;
    
    if (idealAspect && Math.abs(aspectRatio - idealAspect) > aspectTolerance) {
      warnings.push({
        severity: 'info',
        code: 'DIM-003',
        message: `Aspect ratio (${aspectRatio.toFixed(VALIDATION_CALCULATION.ASPECT_RATIO_DECIMAL_PLACES)}) differs from ideal (${idealAspect.toFixed(VALIDATION_CALCULATION.ASPECT_RATIO_DECIMAL_PLACES)})`,
        affectedComponents: ['frame', 'glass'],
        suggestedAction: 'Consider adjusting for better proportions',
        validationRule: 'aspectRatio'
      });
    }
    
    return warnings;
  }
  
  /**
   * Validates grid configuration and cell placement
   */
  private static validateGrid(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const grid = pattern.gridSpec;
    const patternAny = pattern as any;
    
    // Check if grid matches window proportions
    const cellWidth = windowUnit.overallWidth / grid.cols;
    const cellHeight = windowUnit.overallHeight / grid.rows;
    
    // Minimum cell size check
    const minCellSize = patternAny.constraints?.minCellSize || GRID_CONSTRAINTS.MIN_CELL_SIZE_MM;
    
    if (cellWidth < minCellSize || cellHeight < minCellSize) {
      warnings.push({
        severity: 'warning',
        code: 'GRID-001',
        message: `Cell size (${cellWidth.toFixed(VALIDATION_CALCULATION.CELL_DIMENSION_DECIMAL_PLACES)}x${cellHeight.toFixed(VALIDATION_CALCULATION.CELL_DIMENSION_DECIMAL_PLACES)}mm) may be too small for operation`,
        affectedComponents: ['all_cells'],
        suggestedAction: `Reduce grid density (${grid.rows}x${grid.cols} → ${Math.max(1, grid.rows-1)}x${Math.max(1, grid.cols-1)})`,
        validationRule: 'minCellSize'
      });
    }
    
    // Check for very narrow cells (problematic for hardware)
    if (cellWidth < GRID_CONSTRAINTS.MIN_SASH_WIDTH_MM && grid.cells.some(c => c.type === 'sash' || c.type === 'sliding')) {
      warnings.push({
        severity: 'warning',
        code: 'GRID-002',
        message: `Narrow sash width (${cellWidth.toFixed(0)}mm) may limit hardware options`,
        affectedComponents: ['sash_cells'],
        suggestedAction: 'Consider wider cell or different hardware',
        validationRule: 'sashWidth'
      });
    }
    
    return warnings;
  }
  
  /**
   * Validates sashes for weight, area, and hardware compatibility
   */
  private static validateSashes(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const grid = pattern.gridSpec;
    
    grid.cells.forEach((cell, index) => {
      if (cell.type === 'sash' || cell.type === 'sliding') {
        const sashWidth = windowUnit.overallWidth / grid.cols;
        const sashHeight = windowUnit.overallHeight / grid.rows;
        
        // Sash area validation
        const sashArea = sashWidth * sashHeight;
        if (pattern.constraints?.maxSashArea && sashArea > pattern.constraints.maxSashArea * UNIT_CONVERSION.MM2_TO_M2) {
          warnings.push({
            severity: 'warning',
            code: 'SASH-001',
            message: `Sash ${index + 1} area (${(sashArea / UNIT_CONVERSION.MM2_TO_M2).toFixed(VALIDATION_CALCULATION.ASPECT_RATIO_DECIMAL_PLACES)}m²) exceeds recommended maximum (${pattern.constraints.maxSashArea.toFixed(VALIDATION_CALCULATION.ASPECT_RATIO_DECIMAL_PLACES)}m²)`,
            affectedComponents: [`sash-${index}`],
            suggestedAction: 'Use heavier hardware or add reinforcement',
            validationRule: 'maxSashArea'
          });
        }
        
        // Sash weight calculation
        const glazingType = (windowUnit.glazing as any)?.type || 'double';
        const defaultThickness = glazingType === 'single' 
          ? SASH_CONSTRAINTS.DEFAULT_SINGLE_GLAZING_THICKNESS_MM 
          : SASH_CONSTRAINTS.DEFAULT_MULTI_GLAZING_THICKNESS_MM;
        const glassThickness = (windowUnit.glazing as any)?.thickness || defaultThickness;
        const glassWeight = this.calculateGlassWeight(sashWidth, sashHeight, glassThickness);
        const sashWeight = glassWeight + SASH_CONSTRAINTS.ESTIMATED_FRAME_WEIGHT_KG;
        
        if (sashWeight > SASH_CONSTRAINTS.MAX_SASH_WEIGHT_KG) {
          warnings.push({
            severity: 'warning',
            code: 'SASH-002',
            message: `Sash ${index + 1} estimated weight (${sashWeight.toFixed(1)}kg) may exceed standard hardware limits`,
            affectedComponents: [`sash-${index}`, 'hardware'],
            suggestedAction: 'Use heavy-duty hardware or reduce glass thickness',
            validationRule: 'sashWeight'
          });
        }
        
        // Sliding sash width check
        if (cell.type === 'sliding' && sashWidth > SASH_CONSTRAINTS.SLIDING_SASH_DUAL_ROLLER_THRESHOLD_MM) {
          warnings.push({
            severity: 'info',
            code: 'SASH-003',
            message: `Sliding sash width (${sashWidth.toFixed(VALIDATION_CALCULATION.SASH_DIMENSION_DECIMAL_PLACES)}mm) may require dual rollers`,
            affectedComponents: [`sliding-sash-${index}`],
            suggestedAction: 'Verify roller spacing and track capacity',
            validationRule: 'slidingSashWidth'
          });
        }
      }
    });
    
    return warnings;
  }
  
  /**
   * Validates opening mechanism compatibility
   */
  private static validateOpeningMechanism(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    if (!pattern.openingMechanism) return warnings;
    
    const mechanism = pattern.openingMechanism;
    const mechanismAny = mechanism as any;
    
    switch (mechanism.type) {
      case 'sliding':
        // Calculate total sliding sash weight
        const slidingSashWeight = this.calculateTotalSlidingSashWeight(pattern, windowUnit);
        
        if (mechanismAny.maxLoad && slidingSashWeight > mechanismAny.maxLoad) {
          warnings.push({
            severity: 'error',
            code: 'MECH-001',
            message: `Total sliding sash weight (${slidingSashWeight.toFixed(1)}kg) exceeds track capacity (${mechanismAny.maxLoad}kg)`,
            affectedComponents: ['sliding_track', 'rollers'],
            suggestedAction: 'Use heavier-duty track system or reduce number of sliding sashes',
            validationRule: 'trackLoadCapacity'
          });
        }
        
        // Check for wide sliding panels
        if (windowUnit.overallWidth > MECHANISM_CONSTRAINTS.WIDE_SLIDING_WINDOW_THRESHOLD_MM && mechanism.type === 'sliding') {
          warnings.push({
            severity: 'info',
            code: 'MECH-002',
            message: `Wide sliding window (${windowUnit.overallWidth}mm) may require reinforced track`,
            affectedComponents: ['sliding_track'],
            suggestedAction: 'Consider dual-track system or center support',
            validationRule: 'wideSlidingWindow'
          });
        }
        break;
        
      case 'casement':
        // Check hinge spacing for tall sashes
        const maxSashHeight = this.getMaxSashHeight(pattern, windowUnit);
        
        if (maxSashHeight > MECHANISM_CONSTRAINTS.TALL_SASH_HEIGHT_THRESHOLD_MM) {
          const recommendedHingeSpacing = mechanismAny.recommendedHingeSpacing || MECHANISM_CONSTRAINTS.RECOMMENDED_HINGE_SPACING_MM;
          const requiredHinges = Math.ceil(maxSashHeight / recommendedHingeSpacing);
          const providedHinges = mechanismAny.hingeCount || MECHANISM_CONSTRAINTS.DEFAULT_HINGE_COUNT;
          
          if (requiredHinges > providedHinges) {
            warnings.push({
              severity: 'warning',
              code: 'MECH-003',
              message: `Tall sashes (${maxSashHeight.toFixed(VALIDATION_CALCULATION.SASH_DIMENSION_DECIMAL_PLACES)}mm) require ${requiredHinges} hinges (pattern has ${providedHinges})`,
              affectedComponents: ['hinges'],
              suggestedAction: `Add ${requiredHinges - providedHinges} additional hinges per tall sash`,
              validationRule: 'hingeSpacing'
            });
          }
        }
        
        // Check for very wide casement sashes
        const maxSashWidth = this.getMaxSashWidth(pattern, windowUnit);
        if (maxSashWidth > MECHANISM_CONSTRAINTS.WIDE_CASEMENT_SASH_THRESHOLD_MM) {
          warnings.push({
            severity: 'info',
            code: 'MECH-004',
            message: `Wide casement sash (${maxSashWidth.toFixed(VALIDATION_CALCULATION.SASH_DIMENSION_DECIMAL_PLACES)}mm) may require stay bars`,
            affectedComponents: ['sash', 'stays'],
            suggestedAction: 'Add stay bars to prevent sagging',
            validationRule: 'wideCasementSash'
          });
        }
        break;
        
      case 'tilt-turn':
        // Tilt-turn specific validations
        if (windowUnit.overallHeight > MECHANISM_CONSTRAINTS.TALL_TILT_TURN_THRESHOLD_MM) {
          warnings.push({
            severity: 'info',
            code: 'MECH-005',
            message: `Tall tilt-turn window (${windowUnit.overallHeight}mm) - ensure mechanism supports height`,
            affectedComponents: ['tilt_turn_mechanism'],
            suggestedAction: 'Verify mechanism specifications with supplier',
            validationRule: 'tiltTurnHeight'
          });
        }
        break;
    }
    
    return warnings;
  }
  
  /**
   * Validates material compatibility
   */
  private static validateMaterials(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    const patternAny = pattern as any;
    const windowUnitAny = windowUnit as any;
    
    // Check if material type matches pattern recommendations
    if (windowUnitAny.materialType && patternAny.recommendedMaterials) {
      if (!patternAny.recommendedMaterials.includes(windowUnitAny.materialType)) {
        warnings.push({
          severity: 'warning',
          code: 'MAT-001',
          message: `Material "${windowUnitAny.materialType}" not in recommended list: ${patternAny.recommendedMaterials.join(', ')}`,
          affectedComponents: ['all_profiles'],
          suggestedAction: 'Verify profile availability or select different material',
          validationRule: 'materialCompatibility'
        });
      }
    }
    
    // Check glass thickness compatibility
    const glassThickness = (windowUnit.glazing as any)?.thickness;
    if (glassThickness && patternAny.glazingSpec?.maxThickness) {
      if (glassThickness > patternAny.glazingSpec.maxThickness) {
        warnings.push({
          severity: 'warning',
          code: 'MAT-002',
          message: `Glass thickness (${glassThickness}mm) exceeds pattern maximum (${patternAny.glazingSpec.maxThickness}mm)`,
          affectedComponents: ['glass', 'glazing_bead'],
          suggestedAction: 'Reduce glass thickness or modify glazing bead',
          validationRule: 'glassThickness'
        });
      }
    }
    
    return warnings;
  }
  
  /**
   * Validates structural aspects
   */
  private static validateStructural(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check if structural mullions are needed
    const requiresStructuralMullions = this.requiresStructuralMullions(pattern, windowUnit);
    
    if (requiresStructuralMullions && pattern.mullions && !pattern.mullions.some(m => m.type === 'structural')) {
      warnings.push({
        severity: 'warning',
        code: 'STRUCT-001',
        message: 'Large window may require structural mullions for support',
        affectedComponents: ['mullions'],
        suggestedAction: 'Add structural mullions or consult structural engineer',
        validationRule: 'structuralSupport'
      });
    }
    
    // Check wind load for large glass areas
    const totalGlassArea = this.calculateTotalGlassArea(pattern, windowUnit);
    if (totalGlassArea > STRUCTURAL_CONSTRAINTS.WIND_LOAD_THRESHOLD_M2) {
      warnings.push({
        severity: 'info',
        code: 'STRUCT-002',
        message: `Large glass area (${totalGlassArea.toFixed(VALIDATION_CALCULATION.GLASS_AREA_DECIMAL_PLACES)}m²) - consider wind load requirements`,
        affectedComponents: ['frame', 'glass'],
        suggestedAction: 'Verify glass thickness and frame reinforcement',
        validationRule: 'windLoad'
      });
    }
    
    return warnings;
  }
  
  // ========== HELPER METHODS ==========
  
  private static calculateGlassWeight(width: number, height: number, thickness: number): number {
    const area = (width * height) / UNIT_CONVERSION.MM2_TO_M2; // Convert to m²
    const weightPerSquareMeter = thickness * 2.5; // kg/m² per mm thickness
    return area * weightPerSquareMeter;
  }
  
  private static calculateTotalSlidingSashWeight(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): number {
    let totalWeight = 0;
    const grid = pattern.gridSpec;
    const glassThickness = (windowUnit.glazing as any)?.thickness || 4;
    
    grid.cells.forEach((cell) => {
      if (cell.type === 'sliding') {
        const sashWidth = windowUnit.overallWidth / grid.cols;
        const sashHeight = windowUnit.overallHeight / grid.rows;
        const glassWeight = this.calculateGlassWeight(sashWidth, sashHeight, glassThickness);
        totalWeight += glassWeight + 2; // Add frame weight
      }
    });
    
    return totalWeight;
  }
  
  private static getMaxSashHeight(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): number {
    const grid = pattern.gridSpec;
    let maxHeight = 0;
    
    grid.cells.forEach(cell => {
      if (cell.type === 'sash' || cell.type === 'sliding') {
        const sashHeight = windowUnit.overallHeight / grid.rows;
        maxHeight = Math.max(maxHeight, sashHeight);
      }
    });
    
    return maxHeight;
  }
  
  private static getMaxSashWidth(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): number {
    const grid = pattern.gridSpec;
    let maxWidth = 0;
    
    grid.cells.forEach(cell => {
      if (cell.type === 'sash' || cell.type === 'sliding') {
        const sashWidth = windowUnit.overallWidth / grid.cols;
        maxWidth = Math.max(maxWidth, sashWidth);
      }
    });
    
    return maxWidth;
  }
  
  private static requiresStructuralMullions(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): boolean {
    // Simple heuristic: window area > threshold or width/height > thresholds
    const windowArea = (windowUnit.overallWidth * windowUnit.overallHeight) / UNIT_CONVERSION.MM2_TO_M2; // m²
    
    return windowArea > STRUCTURAL_CONSTRAINTS.STRUCTURAL_MULLION_AREA_THRESHOLD_M2 || 
           windowUnit.overallWidth > STRUCTURAL_CONSTRAINTS.STRUCTURAL_MULLION_WIDTH_THRESHOLD_MM || 
           windowUnit.overallHeight > STRUCTURAL_CONSTRAINTS.STRUCTURAL_MULLION_HEIGHT_THRESHOLD_MM;
  }
  
  private static calculateTotalGlassArea(
    pattern: EgyptianPattern,
    windowUnit: WindowUnit
  ): number {
    const grid = pattern.gridSpec;
    let totalArea = 0;
    
    grid.cells.forEach(cell => {
      if (cell.type === 'fixed' || cell.type === 'sash' || cell.type === 'sliding') {
        const cellWidth = windowUnit.overallWidth / grid.cols;
        const cellHeight = windowUnit.overallHeight / grid.rows;
        const cellArea = (cellWidth * cellHeight) / UNIT_CONVERSION.MM2_TO_M2; // m²
        totalArea += cellArea;
      }
    });
    
    return totalArea;
  }
  
  /**
   * Quick validation for real-time feedback
   */
  static quickValidate(
    pattern: EgyptianPattern | null,
    dimensions: { width: number; height: number }
  ): { isValid: boolean; mainWarning?: string } {
    if (!pattern) {
      return { isValid: true };
    }
    
    const tempWindowUnit = {
      overallWidth: dimensions.width,
      overallHeight: dimensions.height,
      glazing: { thickness: 4 },
      systemPackId: undefined
    } as WindowUnit;
    
    const result = this.validatePatternConstraints(pattern, tempWindowUnit);
    const criticalWarnings = result.warnings.filter(w => w.severity === 'error');
    
    return {
      isValid: result.valid,
      mainWarning: criticalWarnings.length > 0 ? criticalWarnings[0].message : undefined
    };
  }
}

