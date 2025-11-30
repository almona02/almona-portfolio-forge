/**
 * Phase 1 Metrics Tracker
 * Observability for tracking Phase 1 features in production
 */

import { supabase } from '../supabase';

export interface AlgorithmMetrics {
  algorithm: 'greedy' | 'linear' | 'genetic' | 'adaptive';
  count: number;
  averageDuration: number;
  successRate: number;
  averageWastePercentage: number;
}

export interface RemnantMetrics {
  totalRemnants: number;
  mlPredictionsUsed: number;
  ruleBasedFallbacks: number;
  averageUtilization: number;
  locationPriorityMatches: number;
}

export interface CalibrationMetrics {
  totalCalibrations: number;
  activeCalibrations: number;
  profilesWithCalibration: number;
  systemPacksWithCalibration: string[];
}

export interface ValidationMetrics {
  totalValidations: number;
  egyptianStandardsWarnings: number;
  egyptianStandardsErrors: number;
  validationSuccessRate: number;
}

export interface Phase1Metrics {
  algorithmMetrics: AlgorithmMetrics[];
  remnantMetrics: RemnantMetrics;
  calibrationMetrics: CalibrationMetrics;
  validationMetrics: ValidationMetrics;
  period: {
    start: Date;
    end: Date;
  };
}

export class Phase1MetricsTracker {
  /**
   * Track algorithm selection and performance
   */
  async trackAlgorithmPerformance(
    algorithm: 'greedy' | 'linear' | 'genetic' | 'adaptive',
    duration: number,
    success: boolean,
    wastePercentage: number,
    complexityScore: number,
    totalCuts: number,
    userId?: string
  ): Promise<void> {
    try {
      await supabase.from('algorithm_performance_logs').insert({
        user_id: userId || null,
        job_id: `job_${Date.now()}`,
        algorithm_type: algorithm,
        complexity_score: complexityScore,
        total_cuts: totalCuts,
        duration_ms: duration,
        waste_percentage: wastePercentage,
        success,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking algorithm performance:', error);
    }
  }

  /**
   * Track ML prediction usage
   */
  async trackMLPrediction(
    remnantId: string,
    predictedValue: number,
    actualValue: number | null,
    confidence: number,
    modelVersion: string,
    fallbackUsed: boolean,
    features: Record<string, any>,
    userId?: string
  ): Promise<void> {
    try {
      await supabase.from('ml_prediction_logs').insert({
        user_id: userId || null,
        model_type: 'remnant_predictor',
        model_version: modelVersion,
        prediction_id: remnantId,
        predicted_value: predictedValue,
        actual_value: actualValue,
        confidence,
        features,
        prediction_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking ML prediction:', error);
    }
  }

  /**
   * Get aggregated metrics for a time period
   */
  async getMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Phase1Metrics> {
    const algorithmMetrics = await this.getAlgorithmMetrics(startDate, endDate, userId);
    const remnantMetrics = await this.getRemnantMetrics(startDate, endDate, userId);
    const calibrationMetrics = await this.getCalibrationMetrics(userId);
    const validationMetrics = await this.getValidationMetrics(startDate, endDate, userId);

    return {
      algorithmMetrics,
      remnantMetrics,
      calibrationMetrics,
      validationMetrics,
      period: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Get algorithm performance metrics
   */
  private async getAlgorithmMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<AlgorithmMetrics[]> {
    try {
      let query = supabase
        .from('algorithm_performance_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Aggregate by algorithm
      const algorithmMap = new Map<string, {
        count: number;
        totalDuration: number;
        successCount: number;
        totalWaste: number;
      }>();

      for (const log of data) {
        const algo = log.algorithm_type;
        if (!algorithmMap.has(algo)) {
          algorithmMap.set(algo, {
            count: 0,
            totalDuration: 0,
            successCount: 0,
            totalWaste: 0,
          });
        }

        const stats = algorithmMap.get(algo)!;
        stats.count++;
        stats.totalDuration += log.duration_ms || 0;
        if (log.success) stats.successCount++;
        stats.totalWaste += log.waste_percentage || 0;
      }

      // Convert to metrics
      const metrics: AlgorithmMetrics[] = [];
      for (const [algorithm, stats] of algorithmMap.entries()) {
        metrics.push({
          algorithm: algorithm as any,
          count: stats.count,
          averageDuration: stats.totalDuration / stats.count,
          successRate: (stats.successCount / stats.count) * 100,
          averageWastePercentage: stats.totalWaste / stats.count,
        });
      }

      return metrics;
    } catch (error) {
      console.error('Error getting algorithm metrics:', error);
      return [];
    }
  }

  /**
   * Get remnant utilization metrics
   */
  private async getRemnantMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<RemnantMetrics> {
    try {
      // Get total remnants
      let remnantQuery = supabase
        .from('material_remnants')
        .select('id, ml_features, prediction_score', { count: 'exact' })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (userId) {
        remnantQuery = remnantQuery.eq('user_id', userId);
      }

      const { data: remnants, count: totalRemnants } = await remnantQuery;

      // Get ML prediction logs
      let mlQuery = supabase
        .from('ml_prediction_logs')
        .select('*', { count: 'exact' })
        .eq('model_type', 'remnant_predictor')
        .gte('prediction_timestamp', startDate.toISOString())
        .lte('prediction_timestamp', endDate.toISOString());

      if (userId) {
        mlQuery = mlQuery.eq('user_id', userId);
      }

      const { data: mlLogs, count: mlCount } = await mlQuery;

      const mlPredictionsUsed = mlLogs?.filter(log => {
        // Check if fallback was used (would need to check features or add fallback flag)
        return log.confidence >= 80;
      }).length || 0;

      const ruleBasedFallbacks = (mlCount || 0) - mlPredictionsUsed;

      // Calculate average utilization (would need to query remnant usage)
      const averageUtilization = 0; // TODO: Calculate from actual usage data

      // Count location priority matches
      const locationPriorityMatches = remnants?.filter(r => 
        r.ml_features?.locationPriority === 1.0
      ).length || 0;

      return {
        totalRemnants: totalRemnants || 0,
        mlPredictionsUsed,
        ruleBasedFallbacks,
        averageUtilization,
        locationPriorityMatches,
      };
    } catch (error) {
      console.error('Error getting remnant metrics:', error);
      return {
        totalRemnants: 0,
        mlPredictionsUsed: 0,
        ruleBasedFallbacks: 0,
        averageUtilization: 0,
        locationPriorityMatches: 0,
      };
    }
  }

  /**
   * Get calibration usage metrics
   */
  private async getCalibrationMetrics(userId?: string): Promise<CalibrationMetrics> {
    try {
      let query = supabase
        .from('fabricator_profiles')
        .select('specifications');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) {
        return {
          totalCalibrations: 0,
          activeCalibrations: 0,
          profilesWithCalibration: 0,
          systemPacksWithCalibration: [],
        };
      }

      let totalCalibrations = 0;
      let activeCalibrations = 0;
      let profilesWithCalibration = 0;
      const systemPacks = new Set<string>();

      for (const profile of data) {
        const calibrations = (profile.specifications as any)?.calibrations || [];
        if (calibrations.length > 0) {
          profilesWithCalibration++;
          totalCalibrations += calibrations.length;
          activeCalibrations += calibrations.filter((cal: any) => cal.isActive).length;
          calibrations.forEach((cal: any) => {
            if (cal.systemPackId) {
              systemPacks.add(cal.systemPackId);
            }
          });
        }
      }

      return {
        totalCalibrations,
        activeCalibrations,
        profilesWithCalibration,
        systemPacksWithCalibration: Array.from(systemPacks),
      };
    } catch (error) {
      console.error('Error getting calibration metrics:', error);
      return {
        totalCalibrations: 0,
        activeCalibrations: 0,
        profilesWithCalibration: 0,
        systemPacksWithCalibration: [],
      };
    }
  }

  /**
   * Get validation metrics (Egyptian standards)
   */
  private async getValidationMetrics(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<ValidationMetrics> {
    // Note: Validation metrics would need to be tracked separately
    // For now, return placeholder
    return {
      totalValidations: 0,
      egyptianStandardsWarnings: 0,
      egyptianStandardsErrors: 0,
      validationSuccessRate: 100,
    };
  }
}

// Export singleton instance
export const phase1MetricsTracker = new Phase1MetricsTracker();

