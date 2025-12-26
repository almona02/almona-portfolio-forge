/**
 * StructuralAnalyzer - Wind Load and Deflection Calculations
 * 
 * Analyzes structural impact of custom mullion placement:
 * - Wind load calculations (Egyptian Code 2020)
 * - Deflection analysis
 * - Safety factor calculations
 * - Load distribution
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

import type { WindowUnit } from '@/types/fabricator';
import type { MullionType } from './CustomMullionValidator';

export interface StructuralAnalysis {
  isValid: boolean;
  maxDeflection: number; // mm
  windLoadCapacity: number; // Pa
  safetyFactor: number;
  load: number; // N (total load on mullion)
  warnings: string[];
}

/**
 * StructuralAnalyzer - Structural analysis engine
 */
export class StructuralAnalyzer {
  // Egyptian Code 2020 wind load zones
  private readonly WIND_LOAD_ZONES: Record<string, number> = {
    'Cairo': 800, // Pa (Zone 2)
    'Alexandria': 1000, // Pa (Zone 3 - coastal)
    'Upper Egypt': 700, // Pa (Zone 1)
    'default': 800 // Pa
  };

  // Material properties
  private readonly ALUMINUM_MODULUS = 70000; // N/mm²
  private readonly ALUMINUM_YIELD = 160; // N/mm²
  private readonly SAFETY_FACTOR_MIN = 1.5;

  /**
   * Analyze structural impact of mullion placement
   */
  async analyzeStructuralImpact(
    windowUnit: WindowUnit,
    mullionPosition: number,
    mullionType: MullionType
  ): Promise<StructuralAnalysis> {
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;

    // Get wind load for location
    const location = windowUnit.positionMeta?.buildingBlock || 'Cairo';
    const windLoad = this.WIND_LOAD_ZONES[location] || this.WIND_LOAD_ZONES['default'];

    // Calculate load distribution
    // Mullion supports panels on both sides
    const leftPanelWidth = mullionPosition;
    const rightPanelWidth = width - mullionPosition;
    const averagePanelWidth = (leftPanelWidth + rightPanelWidth) / 2;

    // Total load on mullion = wind load × panel area
    const panelArea = averagePanelWidth * height; // m²
    const totalLoad = windLoad * panelArea; // N

    // Calculate deflection
    // Simplified beam deflection: δ = (5 × w × L⁴) / (384 × E × I)
    // For rectangular profile: I = (b × h³) / 12
    const profileWidth = this.getProfileWidth(mullionType);
    const profileDepth = this.getProfileDepth(mullionType);
    const momentOfInertia = (profileWidth * Math.pow(profileDepth, 3)) / 12; // mm⁴

    const distributedLoad = totalLoad / height; // N/mm
    const maxDeflection = (5 * distributedLoad * Math.pow(height, 4)) / 
                         (384 * this.ALUMINUM_MODULUS * momentOfInertia); // mm

    // Calculate stress
    const maxMoment = (distributedLoad * Math.pow(height, 2)) / 8; // N·mm
    const maxStress = (maxMoment * profileDepth / 2) / momentOfInertia; // N/mm²

    // Safety factor
    const safetyFactor = this.ALUMINUM_YIELD / maxStress;

    // Validate
    const warnings: string[] = [];
    let isValid = true;

    // Maximum deflection: L/200 (Egyptian Code 2020)
    const maxAllowedDeflection = height / 200;
    if (maxDeflection > maxAllowedDeflection) {
      warnings.push(
        `Deflection (${maxDeflection.toFixed(2)}mm) exceeds limit (${maxAllowedDeflection.toFixed(2)}mm)`
      );
      isValid = false;
    }

    // Safety factor check
    if (safetyFactor < this.SAFETY_FACTOR_MIN) {
      warnings.push(
        `Safety factor (${safetyFactor.toFixed(2)}) below minimum (${this.SAFETY_FACTOR_MIN})`
      );
      isValid = false;
    }

    // Tall window warning
    if (height > 2400) {
      warnings.push('Tall window (>2.4m) may require structural reinforcement');
    }

    // Large panel warning
    if (averagePanelWidth > 1500) {
      warnings.push('Large panel width may require additional support');
    }

    return {
      isValid,
      maxDeflection,
      windLoadCapacity: windLoad,
      safetyFactor,
      load: totalLoad,
      warnings
    };
  }

  /**
   * Get profile width based on mullion type
   */
  private getProfileWidth(mullionType: MullionType): number {
    const widths: Record<MullionType, number> = {
      standard: 60, // mm
      structural: 80, // mm
      thermal_break: 70, // mm
      corner: 60 // mm
    };
    return widths[mullionType];
  }

  /**
   * Get profile depth based on mullion type
   */
  private getProfileDepth(mullionType: MullionType): number {
    const depths: Record<MullionType, number> = {
      standard: 50, // mm
      structural: 60, // mm
      thermal_break: 50, // mm
      corner: 50 // mm
    };
    return depths[mullionType];
  }
}


