/**
 * ThermalBreakOptimizer - Thermal Break Optimization
 * 
 * Optimizes thermal break solutions for Egyptian climate:
 * - Thermal break material selection
 * - U-value optimization
 * - Cost-performance analysis
 * - Local material recommendations
 * 
 * @since Phase 1: Special Presets (Weeks 7-8)
 */

import type { WindowUnit } from '@/types/fabricator';
import { EgyptianClimateAnalyzer } from './EgyptianClimateAnalyzer';

export interface ThermalBreakSpec {
  type: 'polyamide' | 'polyurethane' | 'reinforced_polyamide';
  width: number; // mm
  thermalResistance: number; // m²K/W
  uValueImprovement: number; // W/m²K reduction
  materialCost: number; // EGP
  installationCost: number; // EGP
  totalCost: number; // EGP
  paybackPeriod?: number; // years (energy savings)
  recommendations: string[];
}

/**
 * ThermalBreakOptimizer - Thermal break optimization engine
 */
export class ThermalBreakOptimizer {
  private climateAnalyzer: EgyptianClimateAnalyzer;

  constructor() {
    this.climateAnalyzer = new EgyptianClimateAnalyzer();
  }

  /**
   * Optimize thermal break for window
   */
  async optimizeThermalBreak(
    windowUnit: WindowUnit
  ): Promise<ThermalBreakSpec> {
    const climate = this.climateAnalyzer.analyzeClimate(windowUnit);
    const width = windowUnit.overallWidth;
    const height = windowUnit.overallHeight;
    const perimeter = (width + height) * 2;

    // Determine optimal thermal break type
    let type: ThermalBreakSpec['type'] = 'polyamide';
    let thermalResistance = 0.15; // m²K/W (standard polyamide)
    let uValueImprovement = 1.5; // W/m²K

    // Coastal areas: Use reinforced polyamide for humidity resistance
    if (climate.isCoastal) {
      type = 'reinforced_polyamide';
      thermalResistance = 0.18; // Better resistance
      uValueImprovement = 1.8;
    }

    // High-temperature areas: Use polyurethane for better performance
    if (climate.hasHighTemperature) {
      type = 'polyurethane';
      thermalResistance = 0.20;
      uValueImprovement = 2.0;
    }

    // Calculate material cost
    const materialCostPerMeter: Record<ThermalBreakSpec['type'], number> = {
      polyamide: 25, // EGP/m
      polyurethane: 35, // EGP/m
      reinforced_polyamide: 30 // EGP/m
    };

    const materialCost = (perimeter / 1000) * materialCostPerMeter[type];

    // Installation cost (labor)
    const installationCost = (perimeter / 1000) * 20; // 20 EGP/m labor

    const totalCost = materialCost + installationCost;

    // Generate recommendations
    const recommendations: string[] = [];

    if (climate.isCoastal) {
      recommendations.push('Reinforced polyamide recommended for coastal humidity resistance');
    }

    if (climate.hasHighTemperature) {
      recommendations.push('Polyurethane recommended for high-temperature performance');
    }

    recommendations.push(
      `Thermal break will improve U-value by ${uValueImprovement.toFixed(1)} W/m²K`
    );

    // Calculate payback period (simplified)
    const energySavingsPerYear = this.calculateEnergySavings(uValueImprovement, width, height);
    const paybackPeriod = energySavingsPerYear > 0 
      ? totalCost / energySavingsPerYear 
      : undefined;

    if (paybackPeriod && paybackPeriod < 5) {
      recommendations.push(
        `Payback period: ${paybackPeriod.toFixed(1)} years (good investment)`
      );
    }

    return {
      type,
      width: 20, // mm (standard thermal break width)
      thermalResistance,
      uValueImprovement,
      materialCost,
      installationCost,
      totalCost,
      paybackPeriod,
      recommendations
    };
  }

  /**
   * Calculate annual energy savings (simplified)
   */
  private calculateEnergySavings(
    uValueImprovement: number,
    width: number,
    height: number
  ): number {
    // Simplified calculation:
    // Energy savings = U-value improvement × area × cooling degree days × electricity cost
    const area = (width * height) / 1_000_000; // m²
    const coolingDegreeDays = 2000; // Approximate for Egypt
    const electricityCost = 1.5; // EGP/kWh
    const coolingEfficiency = 3.0; // COP of air conditioning

    // Energy savings in kWh/year
    const energySavingsKWh = (uValueImprovement * area * coolingDegreeDays) / coolingEfficiency;
    
    // Cost savings in EGP/year
    return energySavingsKWh * electricityCost;
  }
}


