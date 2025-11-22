/**
 * Cost Optimization Insights and Analysis
 * Identifies cost savings opportunities
 */

import { OptimizationResult } from '@/types/fabricator';

export interface CostSavingsOpportunity {
  id: string;
  category: 'material' | 'labor' | 'energy' | 'waste' | 'process';
  title: string;
  description: string;
  currentCost: number;
  potentialSavings: number;
  savingsPercent: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface CostAnalysis {
  totalCost: number;
  costBreakdown: {
    material: number;
    labor: number;
    energy: number;
    overhead: number;
  };
  opportunities: CostSavingsOpportunity[];
  totalPotentialSavings: number;
  savingsPercent: number;
}

export class CostOptimizer {
  /**
   * Analyze costs and identify savings opportunities
   */
  analyzeCosts(optimization: OptimizationResult): CostAnalysis {
    const totalCost = optimization.costBreakdown.totalCost;
    const opportunities: CostSavingsOpportunity[] = [];

    // Material waste opportunity
    if (optimization.wastePercentage > 8) {
      const wasteCost = (optimization.wastePercentage / 100) * optimization.costBreakdown.materialCost;
      const potentialSavings = wasteCost * 0.5; // 50% reduction possible

      opportunities.push({
        id: 'material_waste',
        category: 'material',
        title: 'Reduce Material Waste',
        description: `Current waste is ${optimization.wastePercentage.toFixed(1)}%. Optimize cutting patterns to reduce waste.`,
        currentCost: wasteCost,
        potentialSavings,
        savingsPercent: (potentialSavings / totalCost) * 100,
        implementationEffort: 'medium',
        priority: optimization.wastePercentage > 15 ? 'high' : 'medium',
        recommendations: [
          'Use remnant management system',
          'Optimize nesting algorithms',
          'Review cutting patterns',
        ],
      });
    }

    // Nesting efficiency opportunity
    if (optimization.nestingEfficiency < 92) {
      const efficiencyGap = 95 - optimization.nestingEfficiency;
      const potentialSavings = (efficiencyGap / 100) * optimization.costBreakdown.materialCost * 0.3;

      opportunities.push({
        id: 'nesting_efficiency',
        category: 'process',
        title: 'Improve Nesting Efficiency',
        description: `Current nesting efficiency is ${optimization.nestingEfficiency.toFixed(1)}%. Target: 95%+.`,
        currentCost: optimization.costBreakdown.materialCost,
        potentialSavings,
        savingsPercent: (potentialSavings / totalCost) * 100,
        implementationEffort: 'high',
        priority: 'medium',
        recommendations: [
          'Implement advanced genetic algorithms',
          'Use multi-material optimization',
          'Review stock length utilization',
        ],
      });
    }

    // Production time opportunity
    if (optimization.estimatedProductionTime > 10) {
      const laborSavings = (optimization.estimatedProductionTime - 8) * 25; // EUR per hour

      opportunities.push({
        id: 'production_time',
        category: 'labor',
        title: 'Reduce Production Time',
        description: `Production time is ${optimization.estimatedProductionTime.toFixed(1)} hours. Target: <8 hours.`,
        currentCost: optimization.costBreakdown.laborCost,
        potentialSavings: laborSavings,
        savingsPercent: (laborSavings / totalCost) * 100,
        implementationEffort: 'high',
        priority: 'medium',
        recommendations: [
          'Optimize machine scheduling',
          'Reduce setup times',
          'Implement parallel processing',
        ],
      });
    }

    const totalPotentialSavings = opportunities.reduce(
      (sum, opp) => sum + opp.potentialSavings,
      0
    );
    const savingsPercent = (totalPotentialSavings / totalCost) * 100;

    return {
      totalCost,
      costBreakdown: {
        material: optimization.costBreakdown.materialCost,
        labor: optimization.costBreakdown.laborCost,
        energy: 0, // Would need energy data
        overhead: optimization.costBreakdown.totalCost * 0.15,
      },
      opportunities,
      totalPotentialSavings,
      savingsPercent,
    };
  }

  /**
   * Compare costs across multiple optimizations
   */
  compareCosts(optimizations: OptimizationResult[]): {
    averageCost: number;
    bestCost: number;
    worstCost: number;
    costVariance: number;
    recommendations: string[];
  } {
    if (optimizations.length === 0) {
      return {
        averageCost: 0,
        bestCost: 0,
        worstCost: 0,
        costVariance: 0,
        recommendations: [],
      };
    }

    const costs = optimizations.map((opt) => opt.costBreakdown.totalCost);
    const averageCost = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    const bestCost = Math.min(...costs);
    const worstCost = Math.max(...costs);
    const variance = costs.reduce((sum, c) => sum + Math.pow(c - averageCost, 2), 0) / costs.length;
    const costVariance = Math.sqrt(variance);

    const recommendations: string[] = [];
    const costSpread = worstCost - bestCost;
    if (costSpread > averageCost * 0.2) {
      recommendations.push('Significant cost variation detected. Standardize processes.');
    }

    const bestOptimization = optimizations.find(
      (opt) => opt.costBreakdown.totalCost === bestCost
    );
    if (bestOptimization) {
      if (bestOptimization.wastePercentage < 8) {
        recommendations.push('Best performer has low waste. Replicate waste reduction strategies.');
      }
      if (bestOptimization.nestingEfficiency > 95) {
        recommendations.push('Best performer has high nesting efficiency. Review optimization algorithms.');
      }
    }

    return {
      averageCost,
      bestCost,
      worstCost,
      costVariance,
      recommendations,
    };
  }

  /**
   * Calculate ROI for optimization improvements
   */
  calculateROI(
    currentCost: number,
    optimizedCost: number,
    implementationCost: number
  ): {
    savings: number;
    roi: number;
    paybackPeriod: number; // months
    recommendation: string;
  } {
    const savings = currentCost - optimizedCost;
    const roi = implementationCost > 0 ? (savings / implementationCost) * 100 : 0;
    const monthlySavings = savings / 12;
    const paybackPeriod = monthlySavings > 0 ? implementationCost / monthlySavings : Infinity;

    let recommendation: string;
    if (roi > 200 && paybackPeriod < 6) {
      recommendation = 'Highly recommended. Excellent ROI and quick payback.';
    } else if (roi > 100 && paybackPeriod < 12) {
      recommendation = 'Recommended. Good ROI with reasonable payback period.';
    } else if (roi > 50) {
      recommendation = 'Consider implementation. Moderate ROI.';
    } else {
      recommendation = 'Review carefully. ROI may not justify implementation cost.';
    }

    return {
      savings,
      roi,
      paybackPeriod,
      recommendation,
    };
  }
}

