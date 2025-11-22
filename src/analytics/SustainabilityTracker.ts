/**
 * Sustainability Impact Tracking
 * Monitors environmental impact and carbon footprint
 */

import { OptimizationResult } from '@/types/fabricator';

export interface CarbonFootprint {
  materialProduction: number; // kg CO2
  manufacturing: number; // kg CO2
  transportation: number; // kg CO2
  total: number; // kg CO2
}

export interface SustainabilityMetrics {
  carbonFootprint: CarbonFootprint;
  materialWaste: number; // kg
  energyConsumption: number; // kWh
  waterUsage: number; // liters
  recyclability: number; // 0-100%
  sustainabilityScore: number; // 0-100
}

export interface SustainabilityReport {
  period: string;
  metrics: SustainabilityMetrics;
  improvements: string[];
  targets: {
    carbonReduction: number; // %
    wasteReduction: number; // %
    energyReduction: number; // %
  };
  achievements: {
    carbonReduced: number; // kg CO2
    wasteReduced: number; // kg
    energySaved: number; // kWh
  };
}

export class SustainabilityTracker {
  private reports: SustainabilityReport[] = [];
  private carbonFactors = {
    aluminum: 8.24, // kg CO2 per kg of aluminum
    upvc: 2.5, // kg CO2 per kg of UPVC
    manufacturing: 0.5, // kg CO2 per kWh
    transportation: 0.2, // kg CO2 per km per kg
  };

  /**
   * Calculate carbon footprint from optimization
   */
  calculateCarbonFootprint(
    optimization: OptimizationResult,
    material: 'aluminum' | 'upvc',
    distance: number = 100 // km
  ): CarbonFootprint {
    // Material production footprint
    const materialWeight = (optimization.costBreakdown.materialCost / 1000) * 2.5; // Estimate weight
    const materialFactor = this.carbonFactors[material];
    const materialProduction = materialWeight * materialFactor;

    // Manufacturing footprint (based on energy)
    const estimatedEnergy = optimization.estimatedProductionTime * 5; // kWh
    const manufacturing = estimatedEnergy * this.carbonFactors.manufacturing;

    // Transportation footprint
    const transportation = materialWeight * distance * this.carbonFactors.transportation;

    const total = materialProduction + manufacturing + transportation;

    return {
      materialProduction,
      manufacturing,
      transportation,
      total,
    };
  }

  /**
   * Calculate sustainability metrics
   */
  calculateMetrics(
    optimization: OptimizationResult,
    material: 'aluminum' | 'upvc',
    energyConsumption: number = 0
  ): SustainabilityMetrics {
    const carbonFootprint = this.calculateCarbonFootprint(optimization, material);
    const materialWaste = (optimization.wastePercentage / 100) * (optimization.costBreakdown.materialCost / 1000) * 2.5;
    const recyclability = material === 'aluminum' ? 95 : 70; // Aluminum is highly recyclable

    // Calculate sustainability score
    const wasteScore = Math.max(0, 100 - optimization.wastePercentage * 10);
    const efficiencyScore = optimization.nestingEfficiency;
    const recyclabilityScore = recyclability;
    const carbonScore = Math.max(0, 100 - (carbonFootprint.total / 100) * 10);

    const sustainabilityScore = (
      wasteScore * 0.3 +
      efficiencyScore * 0.3 +
      recyclabilityScore * 0.2 +
      carbonScore * 0.2
    );

    return {
      carbonFootprint,
      materialWaste,
      energyConsumption: energyConsumption || optimization.estimatedProductionTime * 5,
      waterUsage: optimization.estimatedProductionTime * 10, // Estimate
      recyclability,
      sustainabilityScore,
    };
  }

  /**
   * Generate sustainability report
   */
  generateReport(
    period: string,
    currentMetrics: SustainabilityMetrics,
    previousMetrics?: SustainabilityMetrics
  ): SustainabilityReport {
    const improvements: string[] = [];
    const targets = {
      carbonReduction: 10, // %
      wasteReduction: 15, // %
      energyReduction: 5, // %
    };

    let achievements = {
      carbonReduced: 0,
      wasteReduced: 0,
      energySaved: 0,
    };

    if (previousMetrics) {
      const carbonReduction = previousMetrics.carbonFootprint.total - currentMetrics.carbonFootprint.total;
      const wasteReduction = previousMetrics.materialWaste - currentMetrics.materialWaste;
      const energySaved = previousMetrics.energyConsumption - currentMetrics.energyConsumption;

      achievements = {
        carbonReduced: Math.max(0, carbonReduction),
        wasteReduced: Math.max(0, wasteReduction),
        energySaved: Math.max(0, energySaved),
      };

      if (carbonReduction > 0) {
        improvements.push(`Reduced carbon footprint by ${carbonReduction.toFixed(1)} kg CO2`);
      }

      if (wasteReduction > 0) {
        improvements.push(`Reduced material waste by ${wasteReduction.toFixed(1)} kg`);
      }

      if (energySaved > 0) {
        improvements.push(`Saved ${energySaved.toFixed(1)} kWh of energy`);
      }
    }

    if (currentMetrics.sustainabilityScore > 80) {
      improvements.push('Excellent sustainability performance');
    } else if (currentMetrics.sustainabilityScore < 60) {
      improvements.push('Focus on improving waste reduction and efficiency');
    }

    const report: SustainabilityReport = {
      period,
      metrics: currentMetrics,
      improvements,
      targets,
      achievements,
    };

    this.reports.push(report);
    return report;
  }

  /**
   * Get sustainability trends
   */
  getTrends(periods: number = 6): {
    period: string;
    carbonFootprint: number;
    waste: number;
    sustainabilityScore: number;
  }[] {
    const recentReports = this.reports.slice(-periods);

    return recentReports.map((report) => ({
      period: report.period,
      carbonFootprint: report.metrics.carbonFootprint.total,
      waste: report.metrics.materialWaste,
      sustainabilityScore: report.metrics.sustainabilityScore,
    }));
  }

  /**
   * Get overall sustainability statistics
   */
  getStatistics(): {
    averageScore: number;
    totalCarbonReduced: number;
    totalWasteReduced: number;
    totalEnergySaved: number;
    bestPeriod: string;
    worstPeriod: string;
  } {
    if (this.reports.length === 0) {
      return {
        averageScore: 0,
        totalCarbonReduced: 0,
        totalWasteReduced: 0,
        totalEnergySaved: 0,
        bestPeriod: '',
        worstPeriod: '',
      };
    }

    const averageScore =
      this.reports.reduce((sum, r) => sum + r.metrics.sustainabilityScore, 0) /
      this.reports.length;

    const totalCarbonReduced = this.reports.reduce(
      (sum, r) => sum + r.achievements.carbonReduced,
      0
    );
    const totalWasteReduced = this.reports.reduce(
      (sum, r) => sum + r.achievements.wasteReduced,
      0
    );
    const totalEnergySaved = this.reports.reduce(
      (sum, r) => sum + r.achievements.energySaved,
      0
    );

    const bestReport = this.reports.reduce((best, r) =>
      r.metrics.sustainabilityScore > best.metrics.sustainabilityScore ? r : best
    );
    const worstReport = this.reports.reduce((worst, r) =>
      r.metrics.sustainabilityScore < worst.metrics.sustainabilityScore ? r : worst
    );

    return {
      averageScore,
      totalCarbonReduced,
      totalWasteReduced,
      totalEnergySaved,
      bestPeriod: bestReport.period,
      worstPeriod: worstReport.period,
    };
  }
}

