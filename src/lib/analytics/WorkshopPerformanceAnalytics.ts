/**
 * Workshop Performance Analytics
 * Features:
 * - Real-time OEE (Overall Equipment Effectiveness) tracking
 * - Operator performance metrics
 * - Benchmarking against industry standards
 * - Predictive capacity planning
 */

import { OptimizationResult } from '@/types/fabricator';

export interface OEEMetrics {
  availability: number; // Percentage of scheduled time machine is available
  performance: number; // Actual output vs theoretical maximum
  quality: number; // Good parts vs total parts
  oee: number; // Overall OEE = availability × performance × quality
}

export interface OperatorPerformance {
  operatorId: string;
  operatorName?: string;
  period: 'day' | 'week' | 'month';
  metrics: {
    jobsCompleted: number;
    averageWastePercentage: number;
    averageSetupTime: number; // minutes
    averageCycleTime: number; // minutes per job
    qualityScore: number; // 0-100
    onTimeDeliveryRate: number; // percentage
  };
  trends: {
    wasteTrend: 'improving' | 'stable' | 'declining';
    qualityTrend: 'improving' | 'stable' | 'declining';
    efficiencyTrend: 'improving' | 'stable' | 'declining';
  };
}

export interface CapacityPlanning {
  currentCapacity: number; // jobs per day
  projectedDemand: number; // jobs per day
  capacityUtilization: number; // percentage
  recommendedActions: string[];
  bottlenecks: string[];
  estimatedCapacityIncrease: number; // percentage if recommendations followed
}

export interface IndustryBenchmark {
  metric: string;
  yourValue: number;
  industryAverage: number;
  industryTop10: number;
  percentile: number; // Your percentile (0-100)
  status: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
}

export class WorkshopPerformanceAnalytics {
  /**
   * Calculate OEE for a machine or workshop
   */
  calculateOEE(data: {
    scheduledTime: number; // hours
    availableTime: number; // hours (scheduled - downtime)
    theoreticalOutput: number; // units
    actualOutput: number; // units
    goodOutput: number; // units (without defects)
  }): OEEMetrics {
    // Availability = Available Time / Scheduled Time
    const availability = (data.availableTime / data.scheduledTime) * 100;

    // Performance = Actual Output / Theoretical Output
    const performance = (data.actualOutput / data.theoreticalOutput) * 100;

    // Quality = Good Output / Actual Output
    const quality = (data.goodOutput / data.actualOutput) * 100;

    // OEE = Availability × Performance × Quality
    const oee = (availability * performance * quality) / 10000;

    return {
      availability,
      performance,
      quality,
      oee,
    };
  }

  /**
   * Get operator performance metrics
   */
  async getOperatorPerformance(
    operatorId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<OperatorPerformance> {
    // TODO: Fetch actual data from database
    // For now, return mock data structure

    const metrics = {
      jobsCompleted: 45,
      averageWastePercentage: 6.2,
      averageSetupTime: 15,
      averageCycleTime: 120,
      qualityScore: 92,
      onTimeDeliveryRate: 95,
    };

    // Calculate trends (simplified - would use historical data)
    const trends = {
      wasteTrend: 'improving' as const,
      qualityTrend: 'stable' as const,
      efficiencyTrend: 'improving' as const,
    };

    return {
      operatorId,
      period,
      metrics,
      trends,
    };
  }

  /**
   * Benchmark against industry standards
   */
  async benchmarkMetrics(
    yourMetrics: {
      averageWaste: number;
      averageOEE: number;
      averageQuality: number;
      averageSetupTime: number;
    }
  ): Promise<IndustryBenchmark[]> {
    // Industry standard values (would be updated from industry reports)
    const industryStandards = {
      averageWaste: { average: 8.0, top10: 4.5 },
      averageOEE: { average: 75, top10: 90 },
      averageQuality: { average: 95, top10: 98 },
      averageSetupTime: { average: 20, top10: 10 },
    };

    const benchmarks: IndustryBenchmark[] = [];

    // Waste percentage benchmark
    benchmarks.push(this.createBenchmark(
      'Waste Percentage',
      yourMetrics.averageWaste,
      industryStandards.averageWaste.average,
      industryStandards.averageWaste.top10,
      true // Lower is better
    ));

    // OEE benchmark
    benchmarks.push(this.createBenchmark(
      'OEE',
      yourMetrics.averageOEE,
      industryStandards.averageOEE.average,
      industryStandards.averageOEE.top10,
      false // Higher is better
    ));

    // Quality benchmark
    benchmarks.push(this.createBenchmark(
      'Quality Score',
      yourMetrics.averageQuality,
      industryStandards.averageQuality.average,
      industryStandards.averageQuality.top10,
      false // Higher is better
    ));

    // Setup time benchmark
    benchmarks.push(this.createBenchmark(
      'Setup Time (minutes)',
      yourMetrics.averageSetupTime,
      industryStandards.averageSetupTime.average,
      industryStandards.averageSetupTime.top10,
      true // Lower is better
    ));

    return benchmarks;
  }

  /**
   * Create a benchmark entry
   */
  private createBenchmark(
    metric: string,
    yourValue: number,
    industryAverage: number,
    industryTop10: number,
    lowerIsBetter: boolean
  ): IndustryBenchmark {
    // Calculate percentile (simplified)
    let percentile: number;
    if (lowerIsBetter) {
      if (yourValue <= industryTop10) {
        percentile = 90 + ((industryTop10 - yourValue) / industryTop10) * 10;
      } else if (yourValue <= industryAverage) {
        percentile = 50 + ((industryAverage - yourValue) / (industryAverage - industryTop10)) * 40;
      } else {
        percentile = (industryAverage / yourValue) * 50;
      }
    } else {
      if (yourValue >= industryTop10) {
        percentile = 90 + ((yourValue - industryTop10) / (100 - industryTop10)) * 10;
      } else if (yourValue >= industryAverage) {
        percentile = 50 + ((yourValue - industryAverage) / (industryTop10 - industryAverage)) * 40;
      } else {
        percentile = (yourValue / industryAverage) * 50;
      }
    }

    percentile = Math.max(0, Math.min(100, percentile));

    // Determine status
    let status: IndustryBenchmark['status'];
    if (percentile >= 90) {
      status = 'excellent';
    } else if (percentile >= 75) {
      status = 'good';
    } else if (percentile >= 50) {
      status = 'average';
    } else if (percentile >= 25) {
      status = 'below_average';
    } else {
      status = 'poor';
    }

    return {
      metric,
      yourValue,
      industryAverage,
      industryTop10,
      percentile,
      status,
    };
  }

  /**
   * Predict capacity needs
   */
  async predictCapacity(
    historicalData: {
      jobsPerDay: number[];
      averageJobTime: number; // hours
      machineHours: number; // available hours per day
    },
    projectedDemand?: number
  ): Promise<CapacityPlanning> {
    // Calculate current capacity
    const avgJobsPerDay = historicalData.jobsPerDay.reduce((a, b) => a + b, 0) / historicalData.jobsPerDay.length;
    const currentCapacity = avgJobsPerDay;

    // Project demand (if not provided, use trend)
    const demand = projectedDemand || this.projectDemand(historicalData.jobsPerDay);

    // Calculate utilization
    const capacityUtilization = (demand / currentCapacity) * 100;

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    if (capacityUtilization > 90) {
      bottlenecks.push('High machine utilization - consider additional machines');
    }
    if (historicalData.averageJobTime > 2) {
      bottlenecks.push('Long job times - optimize setup and cutting processes');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (capacityUtilization > 100) {
      recommendations.push('Immediate capacity increase needed');
      recommendations.push('Consider overtime or additional shifts');
    } else if (capacityUtilization > 85) {
      recommendations.push('Plan for capacity expansion within 3 months');
    }

    if (historicalData.averageJobTime > 2) {
      recommendations.push('Reduce setup time through better planning');
      recommendations.push('Implement batch processing for similar jobs');
    }

    // Estimate capacity increase
    let estimatedIncrease = 0;
    if (recommendations.length > 0) {
      estimatedIncrease = 20; // Simplified - would calculate based on recommendations
    }

    return {
      currentCapacity,
      projectedDemand: demand,
      capacityUtilization,
      recommendedActions: recommendations,
      bottlenecks,
      estimatedCapacityIncrease: estimatedIncrease,
    };
  }

  /**
   * Project demand based on historical trend
   */
  private projectDemand(historicalData: number[]): number {
    if (historicalData.length < 2) {
      return historicalData[0] || 0;
    }

    // Simple linear trend
    const n = historicalData.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = historicalData.reduce((a, b) => a + b, 0);
    const sumXY = historicalData.reduce((sum, y, i) => sum + (i + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Project next period
    return slope * (n + 1) + intercept;
  }

  /**
   * Analyze optimization results for performance insights
   */
  analyzeOptimizationResults(results: OptimizationResult[]): {
    averageWaste: number;
    averageEfficiency: number;
    improvementTrend: 'improving' | 'stable' | 'declining';
    recommendations: string[];
  } {
    if (results.length === 0) {
      return {
        averageWaste: 0,
        averageEfficiency: 0,
        improvementTrend: 'stable',
        recommendations: [],
      };
    }

    const averageWaste = results.reduce((sum, r) => sum + r.wastePercentage, 0) / results.length;
    const averageEfficiency = results.reduce((sum, r) => sum + r.nestingEfficiency, 0) / results.length;

    // Calculate trend (comparing recent vs older results)
    const recent = results.slice(-10);
    const older = results.slice(0, Math.max(1, results.length - 10));
    const recentAvgWaste = recent.reduce((sum, r) => sum + r.wastePercentage, 0) / recent.length;
    const olderAvgWaste = older.reduce((sum, r) => sum + r.wastePercentage, 0) / older.length;

    let improvementTrend: 'improving' | 'stable' | 'declining';
    if (recentAvgWaste < olderAvgWaste - 1) {
      improvementTrend = 'improving';
    } else if (recentAvgWaste > olderAvgWaste + 1) {
      improvementTrend = 'declining';
    } else {
      improvementTrend = 'stable';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (averageWaste > 10) {
      recommendations.push('Waste percentage is high - consider using remnant-first optimization');
      recommendations.push('Review cutting plans for better material utilization');
    }
    if (averageEfficiency < 85) {
      recommendations.push('Nesting efficiency below target - optimize cutting patterns');
    }

    return {
      averageWaste,
      averageEfficiency,
      improvementTrend,
      recommendations,
    };
  }
}

// Export singleton instance
export const workshopPerformanceAnalytics = new WorkshopPerformanceAnalytics();
