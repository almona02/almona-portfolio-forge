/**
 * Performance Benchmarker
 * Cross-job comparisons and performance tracking
 */

import { supabase } from '../supabase';
import type { OptimizationResult } from '@/types/fabricator';

export interface BenchmarkMetrics {
  jobId: string;
  algorithm: string;
  duration: number;
  wastePercentage: number;
  complexityScore: number;
  totalCuts: number;
  timestamp: Date;
}

export interface BenchmarkComparison {
  current: BenchmarkMetrics;
  average: BenchmarkMetrics;
  best: BenchmarkMetrics;
  percentile: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export class PerformanceBenchmarker {
  /**
   * Record benchmark metrics for a job
   */
  async recordBenchmark(
    jobId: string,
    algorithm: string,
    duration: number,
    result: OptimizationResult,
    complexityScore: number,
    totalCuts: number,
    userId?: string
  ): Promise<void> {
    try {
      await supabase.from('algorithm_performance_logs').insert({
        user_id: userId || null,
        job_id: jobId,
        algorithm_type: algorithm,
        complexity_score: complexityScore,
        total_cuts: totalCuts,
        duration_ms: duration,
        waste_percentage: result.wastePercentage,
        success: true,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error recording benchmark:', error);
    }
  }

  /**
   * Compare current job against historical benchmarks
   */
  async compareBenchmark(
    current: BenchmarkMetrics,
    userId?: string,
    days: number = 30
  ): Promise<BenchmarkComparison> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = supabase
        .from('algorithm_performance_logs')
        .select('*')
        .eq('algorithm_type', current.algorithm)
        .gte('created_at', cutoffDate.toISOString())
        .eq('success', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) {
        // No historical data, return current as all metrics
        return {
          current,
          average: current,
          best: current,
          percentile: {
            p50: current.duration,
            p95: current.duration,
            p99: current.duration,
          },
        };
      }

      // Calculate average
      const avgDuration = data.reduce((sum, log) => sum + (log.duration_ms || 0), 0) / data.length;
      const avgWaste = data.reduce((sum, log) => sum + (log.waste_percentage || 0), 0) / data.length;

      // Find best (lowest waste)
      const bestLog = data.reduce((best, log) =>
        (log.waste_percentage || 100) < (best.waste_percentage || 100) ? log : best
      );

      // Calculate percentiles
      const durations = data.map(log => log.duration_ms || 0).sort((a, b) => a - b);
      const p50 = durations[Math.floor(durations.length * 0.5)];
      const p95 = durations[Math.floor(durations.length * 0.95)] || durations[durations.length - 1];
      const p99 = durations[Math.floor(durations.length * 0.99)] || durations[durations.length - 1];

      return {
        current,
        average: {
          jobId: 'average',
          algorithm: current.algorithm,
          duration: avgDuration,
          wastePercentage: avgWaste,
          complexityScore: current.complexityScore,
          totalCuts: current.totalCuts,
          timestamp: new Date(),
        },
        best: {
          jobId: bestLog.job_id || 'best',
          algorithm: bestLog.algorithm_type,
          duration: bestLog.duration_ms || 0,
          wastePercentage: bestLog.waste_percentage || 0,
          complexityScore: bestLog.complexity_score || 0,
          totalCuts: bestLog.total_cuts || 0,
          timestamp: new Date(bestLog.created_at),
        },
        percentile: {
          p50,
          p95,
          p99,
        },
      };
    } catch (error) {
      console.error('Error comparing benchmark:', error);
      return {
        current,
        average: current,
        best: current,
        percentile: {
          p50: current.duration,
          p95: current.duration,
          p99: current.duration,
        },
      };
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    algorithm: string,
    userId?: string,
    days: number = 90
  ): Promise<Array<{ date: string; averageDuration: number; averageWaste: number }>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = supabase
        .from('algorithm_performance_logs')
        .select('*')
        .eq('algorithm_type', algorithm)
        .gte('created_at', cutoffDate.toISOString())
        .eq('success', true)
        .order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      // Group by date
      const dailyStats = new Map<string, { durations: number[]; wastes: number[] }>();

      for (const log of data) {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        if (!dailyStats.has(date)) {
          dailyStats.set(date, { durations: [], wastes: [] });
        }

        const stats = dailyStats.get(date)!;
        if (log.duration_ms) stats.durations.push(log.duration_ms);
        if (log.waste_percentage) stats.wastes.push(log.waste_percentage);
      }

      // Calculate averages
      const trends: Array<{ date: string; averageDuration: number; averageWaste: number }> = [];
      for (const [date, stats] of dailyStats.entries()) {
        trends.push({
          date,
          averageDuration: stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length,
          averageWaste: stats.wastes.reduce((sum, w) => sum + w, 0) / stats.wastes.length,
        });
      }

      return trends.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting performance trends:', error);
      return [];
    }
  }
}

// Export singleton instance
export const performanceBenchmarker = new PerformanceBenchmarker();

