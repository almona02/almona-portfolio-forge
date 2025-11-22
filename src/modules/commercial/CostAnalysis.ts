/**
 * Cost Analysis and Profitability Tracking
 * Analyzes costs, margins, and profitability
 */

import { OptimizationResult, Quote } from './QuotingEngine';

export interface CostBreakdown {
  materialCost: number;
  laborCost: number;
  hardwareCost: number;
  glazingCost: number;
  overheadCost: number;
  totalCost: number;
}

export interface ProfitabilityAnalysis {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  roi: number; // Return on Investment
  breakEvenPoint: number;
}

export interface CostTrend {
  period: string; // e.g., "2024-01"
  materialCost: number;
  laborCost: number;
  totalCost: number;
  averageMargin: number;
}

export class CostAnalysis {
  /**
   * Analyze profitability from quote and optimization
   */
  analyzeProfitability(
    quote: Quote,
    optimization: OptimizationResult
  ): ProfitabilityAnalysis {
    const revenue = quote.total - quote.discount;
    const totalCost =
      optimization.costBreakdown.materialCost +
      optimization.costBreakdown.laborCost +
      optimization.costBreakdown.hardwareCost +
      optimization.costBreakdown.glazingCost +
      this.calculateOverhead(optimization);

    const grossProfit = revenue - totalCost;
    const grossMargin = (grossProfit / revenue) * 100;
    const netProfit = grossProfit - this.calculateTaxes(grossProfit);
    const netMargin = (netProfit / revenue) * 100;
    const roi = (netProfit / totalCost) * 100;
    const breakEvenPoint = totalCost / (1 - quote.taxRate / 100);

    return {
      revenue,
      totalCost,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      roi,
      breakEvenPoint,
    };
  }

  /**
   * Calculate overhead costs
   */
  private calculateOverhead(optimization: OptimizationResult): number {
    const directCosts =
      optimization.costBreakdown.materialCost +
      optimization.costBreakdown.laborCost;
    return directCosts * 0.15; // 15% overhead
  }

  /**
   * Calculate taxes
   */
  private calculateTaxes(profit: number, taxRate: number = 20): number {
    return profit > 0 ? (profit * taxRate) / 100 : 0;
  }

  /**
   * Compare costs across multiple projects
   */
  compareCosts(analyses: ProfitabilityAnalysis[]): {
    averageMargin: number;
    bestMargin: number;
    worstMargin: number;
    totalRevenue: number;
    totalProfit: number;
  } {
    if (analyses.length === 0) {
      return {
        averageMargin: 0,
        bestMargin: 0,
        worstMargin: 0,
        totalRevenue: 0,
        totalProfit: 0,
      };
    }

    const margins = analyses.map((a) => a.netMargin);
    const totalRevenue = analyses.reduce((sum, a) => sum + a.revenue, 0);
    const totalProfit = analyses.reduce((sum, a) => sum + a.netProfit, 0);

    return {
      averageMargin: margins.reduce((sum, m) => sum + m, 0) / margins.length,
      bestMargin: Math.max(...margins),
      worstMargin: Math.min(...margins),
      totalRevenue,
      totalProfit,
    };
  }

  /**
   * Identify cost optimization opportunities
   */
  identifyOptimizationOpportunities(
    optimization: OptimizationResult
  ): string[] {
    const opportunities: string[] = [];

    // Check material waste
    if (optimization.wastePercentage > 10) {
      opportunities.push(
        `High material waste (${optimization.wastePercentage.toFixed(1)}%). Consider remnant utilization.`
      );
    }

    // Check nesting efficiency
    if (optimization.nestingEfficiency < 90) {
      opportunities.push(
        `Low nesting efficiency (${optimization.nestingEfficiency.toFixed(1)}%). Review cutting patterns.`
      );
    }

    // Check production time
    if (optimization.estimatedProductionTime > 10) {
      opportunities.push(
        `Long production time (${optimization.estimatedProductionTime.toFixed(1)}h). Consider process optimization.`
      );
    }

    // Check material cost ratio
    const materialRatio =
      optimization.costBreakdown.materialCost /
      optimization.costBreakdown.totalCost;
    if (materialRatio > 0.6) {
      opportunities.push(
        `High material cost ratio (${(materialRatio * 100).toFixed(1)}%). Consider bulk purchasing or alternative suppliers.`
      );
    }

    return opportunities;
  }

  /**
   * Calculate cost per unit
   */
  calculateCostPerUnit(
    optimization: OptimizationResult,
    unitCount: number
  ): number {
    return optimization.costBreakdown.totalCost / unitCount;
  }

  /**
   * Project future costs based on trends
   */
  projectCosts(
    trends: CostTrend[],
    months: number = 3
  ): CostTrend[] {
    if (trends.length < 2) return [];

    const projected: CostTrend[] = [];
    const recentTrends = trends.slice(-6); // Last 6 months

    const avgMaterialGrowth =
      recentTrends.reduce(
        (sum, t, i) =>
          i > 0 ? sum + (t.materialCost - trends[i - 1].materialCost) : sum,
        0
      ) / (recentTrends.length - 1);

    const avgLaborGrowth =
      recentTrends.reduce(
        (sum, t, i) =>
          i > 0 ? sum + (t.laborCost - trends[i - 1].laborCost) : sum,
        0
      ) / (recentTrends.length - 1);

    const lastTrend = trends[trends.length - 1];
    const lastDate = new Date(lastTrend.period);

    for (let i = 1; i <= months; i++) {
      const date = new Date(lastDate);
      date.setMonth(date.getMonth() + i);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      projected.push({
        period,
        materialCost: lastTrend.materialCost + avgMaterialGrowth * i,
        laborCost: lastTrend.laborCost + avgLaborGrowth * i,
        totalCost:
          lastTrend.materialCost +
          avgMaterialGrowth * i +
          lastTrend.laborCost +
          avgLaborGrowth * i,
        averageMargin: lastTrend.averageMargin,
      });
    }

    return projected;
  }
}

