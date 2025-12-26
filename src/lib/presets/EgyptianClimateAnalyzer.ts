/**
 * EgyptianClimateAnalyzer - Climate-Specific Analysis
 * 
 * Analyzes Egyptian climate conditions for window design:
 * - Sand/dust risk assessment
 * - Coastal humidity analysis
 * - Temperature extremes
 * - Regional climate zones
 * 
 * @since Phase 1: Special Presets (Weeks 7-8)
 */

import type { WindowUnit } from '@/types/fabricator';

export interface ClimateAnalysis {
  region: 'Cairo' | 'Alexandria' | 'Upper_Egypt' | 'Sinai' | 'Red_Sea';
  hasSandDustRisk: boolean;
  isCoastal: boolean;
  hasHighTemperature: boolean;
  averageTemperature: number; // °C
  humidityLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * EgyptianClimateAnalyzer - Climate analysis engine
 */
export class EgyptianClimateAnalyzer {
  /**
   * Analyze climate conditions for window unit
   */
  analyzeClimate(windowUnit: WindowUnit): ClimateAnalysis {
    const location = windowUnit.positionMeta?.buildingBlock || 'Cairo';
    const locationLower = location.toLowerCase();

    // Determine region
    let region: ClimateAnalysis['region'] = 'Cairo';
    if (locationLower.includes('alexandria') || locationLower.includes('coastal')) {
      region = 'Alexandria';
    } else if (locationLower.includes('luxor') || locationLower.includes('aswan') || locationLower.includes('upper')) {
      region = 'Upper_Egypt';
    } else if (locationLower.includes('sinai')) {
      region = 'Sinai';
    } else if (locationLower.includes('red_sea') || locationLower.includes('hurghada') || locationLower.includes('sharm')) {
      region = 'Red_Sea';
    }

    // Analyze climate characteristics
    const hasSandDustRisk = this.hasSandDustRisk(region);
    const isCoastal = region === 'Alexandria' || region === 'Red_Sea';
    const hasHighTemperature = region === 'Upper_Egypt' || region === 'Sinai' || region === 'Red_Sea';

    // Temperature and humidity
    const averageTemperature = this.getAverageTemperature(region);
    const humidityLevel = this.getHumidityLevel(region);

    // Generate recommendations
    const recommendations: string[] = [];

    if (hasSandDustRisk) {
      recommendations.push('High sand/dust risk: Use fine mesh screens and enhanced seals');
    }

    if (isCoastal) {
      recommendations.push('Coastal location: Use corrosion-resistant hardware and reinforced seals');
    }

    if (hasHighTemperature) {
      recommendations.push('High temperature: Thermal break recommended for energy efficiency');
    }

    if (humidityLevel === 'high') {
      recommendations.push('High humidity: Use moisture-resistant materials and proper drainage');
    }

    return {
      region,
      hasSandDustRisk,
      isCoastal,
      hasHighTemperature,
      averageTemperature,
      humidityLevel,
      recommendations
    };
  }

  /**
   * Check if region has sand/dust risk
   */
  private hasSandDustRisk(region: ClimateAnalysis['region']): boolean {
    const highRiskRegions: ClimateAnalysis['region'][] = [
      'Upper_Egypt',
      'Sinai',
      'Red_Sea'
    ];
    return highRiskRegions.includes(region);
  }

  /**
   * Get average temperature for region
   */
  private getAverageTemperature(region: ClimateAnalysis['region']): number {
    const temperatures: Record<ClimateAnalysis['region'], number> = {
      Cairo: 25, // °C
      Alexandria: 22, // °C (coastal, cooler)
      Upper_Egypt: 30, // °C (hotter)
      Sinai: 28, // °C
      Red_Sea: 28 // °C
    };
    return temperatures[region];
  }

  /**
   * Get humidity level for region
   */
  private getHumidityLevel(region: ClimateAnalysis['region']): 'low' | 'medium' | 'high' {
    if (region === 'Alexandria' || region === 'Red_Sea') {
      return 'high'; // Coastal humidity
    } else if (region === 'Upper_Egypt' || region === 'Sinai') {
      return 'low'; // Desert, low humidity
    }
    return 'medium'; // Cairo
  }
}


