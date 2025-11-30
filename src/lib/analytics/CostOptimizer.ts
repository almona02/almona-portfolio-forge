/**
 * Cost Optimizer
 * AI-driven cost reduction suggestions
 */

import type { OptimizationResult, Profile } from '@/types/fabricator';
import { consumptionForecaster } from './ConsumptionForecaster';

export interface CostOptimizationSuggestion {
  type: 'material' | 'labor' | 'waste' | 'inventory' | 'remnant';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  potentialSavings: number;
  actionRequired: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CostAnalysis {
  currentCost: number;
  optimizedCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  suggestions: CostOptimizationSuggestion[];
}

export class CostOptimizer {
  /**
   * Analyze optimization result and suggest cost improvements
   */
  async analyzeCostOptimization(
    result: OptimizationResult,
    profiles: Profile[],
    userId?: string
  ): Promise<CostAnalysis> {
    const suggestions: CostOptimizationSuggestion[] = [];

    // Analyze waste percentage
    if (result.wastePercentage > 15) {
      suggestions.push({
        type: 'waste',
        priority: 'high',
        title: 'High Waste Percentage',
        description: `Current waste is ${result.wastePercentage.toFixed(1)}%. Target is < 10%`,
        potentialSavings: result.costBreakdown.materialCost * (result.wastePercentage - 10) / 100,
        actionRequired: 'Consider using genetic algorithm for better optimization',
        impact: 'high',
      });
    }

    // Analyze remnant usage
    if (result.wastePercentage > 5) {
      suggestions.push({
        type: 'remnant',
        priority: 'medium',
        title: 'Remnant Utilization Opportunity',
        description: 'Consider using remnants to reduce new material purchases',
        potentialSavings: result.costBreakdown.materialCost * 0.1, // Estimate 10% savings
        actionRequired: 'Enable remnant-first optimization',
        impact: 'medium',
      });
    }

    // Analyze material costs
    const materialCostRatio = result.costBreakdown.materialCost / result.costBreakdown.totalCost;
    if (materialCostRatio > 0.6) {
      suggestions.push({
        type: 'material',
        priority: 'high',
        title: 'High Material Cost Ratio',
        description: `Material costs represent ${(materialCostRatio * 100).toFixed(1)}% of total cost`,
        potentialSavings: result.costBreakdown.materialCost * 0.05, // 5% reduction estimate
        actionRequired: 'Review supplier pricing and consider bulk purchasing',
        impact: 'high',
      });
    }

    // Analyze labor costs
    const laborCostRatio = result.costBreakdown.laborCost / result.costBreakdown.totalCost;
    if (laborCostRatio > 0.4) {
      suggestions.push({
        type: 'labor',
        priority: 'medium',
        title: 'High Labor Cost Ratio',
        description: `Labor costs represent ${(laborCostRatio * 100).toFixed(1)}% of total cost`,
        potentialSavings: result.costBreakdown.laborCost * 0.1, // 10% reduction estimate
        actionRequired: 'Optimize cutting patterns to reduce production time',
        impact: 'medium',
      });
    }

    // Check inventory levels
    for (const profile of profiles) {
      if (profile.stockQuantity < profile.minStockLevel) {
        const forecast = await consumptionForecaster.forecastConsumption(profile.id, 'monthly', userId);
        
        if (forecast.predictedUsage > profile.stockQuantity) {
          suggestions.push({
            type: 'inventory',
            priority: 'high',
            title: `Low Stock: ${profile.name}`,
            description: `Stock (${profile.stockQuantity}m) may be insufficient for predicted usage (${forecast.predictedUsage.toFixed(1)}m)`,
            potentialSavings: 0, // Prevention, not direct savings
            actionRequired: 'Consider reordering to avoid production delays',
            impact: 'high',
          });
        }
      }
    }

    // Calculate potential savings
    const totalPotentialSavings = suggestions.reduce((sum, s) => sum + s.potentialSavings, 0);
    const optimizedCost = result.costBreakdown.totalCost - totalPotentialSavings;
    const savingsPercentage = (totalPotentialSavings / result.costBreakdown.totalCost) * 100;

    return {
      currentCost: result.costBreakdown.totalCost,
      optimizedCost,
      potentialSavings: totalPotentialSavings,
      savingsPercentage,
      suggestions: suggestions.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
    };
  }

  /**
   * Get cost optimization recommendations
   */
  getRecommendations(analysis: CostAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.savingsPercentage > 10) {
      recommendations.push(
        `Potential cost savings of ${analysis.savingsPercentage.toFixed(1)}% (${analysis.potentialSavings.toFixed(2)} ${'currency'})`
      );
    }

    const highPrioritySuggestions = analysis.suggestions.filter(s => s.priority === 'high');
    if (highPrioritySuggestions.length > 0) {
      recommendations.push(
        `${highPrioritySuggestions.length} high-priority optimization opportunities identified`
      );
    }

    return recommendations;
  }
}

// Export singleton instance
export const costOptimizer = new CostOptimizer();

