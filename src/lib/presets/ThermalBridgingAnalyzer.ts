/**
 * ThermalBridgingAnalyzer - Thermal Analysis
 * 
 * Analyzes thermal bridging impact of custom mullion placement:
 * - U-value impact calculation
 * - Thermal bridge length
 * - Energy efficiency recommendations
 * - Egyptian climate considerations
 * 
 * @since Phase 1: Special Presets (Weeks 3-4)
 */

import type { WindowUnit } from '@/types/fabricator';
import type { MullionType } from './CustomMullionValidator';

export interface ThermalAnalysis {
  uValueImpact: number; // W/m²K increase
  thermalBridgeLength: number; // mm
  recommendations: string[];
}

/**
 * ThermalBridgingAnalyzer - Thermal analysis engine
 */
export class ThermalBridgingAnalyzer {
  /**
   * Calculate thermal break effect
   */
  calculateThermalBreakEffect(
    windowUnit: WindowUnit,
    _mullionPosition: number,
    mullionType: MullionType
  ): ThermalAnalysis {
    const height = windowUnit.overallHeight;
    const material = windowUnit.systemPackId?.includes('upvc') ? 'upvc' : 'aluminum';

    // Thermal bridge length = mullion perimeter
    const mullionWidth = this.getMullionWidth(mullionType);
    const thermalBridgeLength = (mullionWidth * 2) + height; // Perimeter

    // Calculate U-value impact
    let uValueImpact = 0;

    if (mullionType === 'thermal_break') {
      // Thermal break mullion has minimal impact
      uValueImpact = 0.1; // W/m²K
    } else if (material === 'aluminum') {
      // Aluminum mullion without thermal break creates significant thermal bridge
      const thermalBridgeArea = mullionWidth * height; // m²
      const windowArea = windowUnit.overallWidth * height / 1_000_000; // m²
      const bridgeRatio = thermalBridgeArea / windowArea;

      // U-value impact proportional to bridge ratio
      uValueImpact = bridgeRatio * 2.0; // W/m²K (significant impact)
    } else if (material === 'upvc') {
      // UPVC has lower thermal conductivity
      uValueImpact = 0.3; // W/m²K
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (mullionType !== 'thermal_break' && material === 'aluminum') {
      recommendations.push(
        'Warning: Aluminum mullion without thermal break will significantly impact energy efficiency'
      );
      recommendations.push(
        'Recommendation: Use thermal break mullion for better insulation (U-value impact: -1.9 W/m²K)'
      );
    }

    if (uValueImpact > 1.0) {
      recommendations.push(
        `High thermal impact (${uValueImpact.toFixed(2)} W/m²K). Consider thermal break mullion.`
      );
    }

    // Egyptian climate considerations
    const location = windowUnit.positionMeta?.buildingBlock || 'Cairo';
    if (location.toLowerCase().includes('alexandria') || location.toLowerCase().includes('coastal')) {
      recommendations.push(
        'Coastal location: Thermal break recommended for humidity control'
      );
    }

    if (uValueImpact < 0.5) {
      recommendations.push('Thermal impact is acceptable for Egyptian climate');
    }

    return {
      uValueImpact,
      thermalBridgeLength,
      recommendations
    };
  }

  /**
   * Get mullion width based on type
   */
  private getMullionWidth(mullionType: MullionType): number {
    const widths: Record<MullionType, number> = {
      standard: 60, // mm
      structural: 80, // mm
      thermal_break: 70, // mm
      corner: 60 // mm
    };
    return widths[mullionType];
  }
}


