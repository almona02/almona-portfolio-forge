/**
 * Training Data Collection System
 * Collects optimization results for ML model training
 */

import { OptimizationResult } from '@/types/fabricator';
import { JobComplexity } from '@/algorithms/adaptiveSolver';
import { supabase } from '../supabase';

export interface TrainingDataPoint {
  timestamp: string;
  userId: string;
  projectId?: string;
  jobComplexity: JobComplexity;
  algorithmUsed: 'greedy' | 'linear' | 'genetic';
  solveTime: number; // milliseconds
  wastePercentage: number;
  nestingEfficiency: number;
  remnantUtilization?: number;
  success: boolean;
}

export class TrainingDataCollector {
  /**
   * Collect training data from optimization result
   */
  async collectTrainingData(
    optimizationResult: OptimizationResult,
    complexity: JobComplexity,
    algorithm: 'greedy' | 'linear' | 'genetic',
    solveTime: number,
    userId: string,
    projectId?: string
  ): Promise<void> {
    try {
      const trainingData: TrainingDataPoint = {
        timestamp: new Date().toISOString(),
        userId,
        projectId,
        jobComplexity: complexity,
        algorithmUsed: algorithm,
        solveTime,
        wastePercentage: optimizationResult.wastePercentage,
        nestingEfficiency: optimizationResult.nestingEfficiency,
        remnantUtilization: 0, // Would be calculated from remnant usage
        success: true,
      };

      // Store in database
      const { error } = await supabase.from('optimization_training_data').insert({
        user_id: userId,
        project_id: projectId || null,
        total_cuts: complexity.totalCuts,
        unique_profiles: complexity.uniqueProfiles,
        average_cut_length: complexity.averageCutLength,
        max_cut_length: complexity.maxCutLength,
        complexity_score: complexity.complexityScore,
        algorithm: algorithm,
        solve_time_ms: solveTime,
        waste_percentage: optimizationResult.wastePercentage,
        nesting_efficiency: optimizationResult.nestingEfficiency,
        remnant_utilization: trainingData.remnantUtilization || 0,
        success: trainingData.success,
      });

      if (error) {
        console.error('Error storing training data:', error);
      }
    } catch (error) {
      console.error('Error collecting training data:', error);
      // Don't throw - training data collection should not break optimization
    }
  }

  /**
   * Batch collect multiple training data points
   */
  async batchCollect(trainingDataPoints: TrainingDataPoint[]): Promise<void> {
    try {
      const records = trainingDataPoints.map((data) => ({
        user_id: data.userId,
        project_id: data.projectId || null,
        total_cuts: data.jobComplexity.totalCuts,
        unique_profiles: data.jobComplexity.uniqueProfiles,
        average_cut_length: data.jobComplexity.averageCutLength,
        max_cut_length: data.jobComplexity.maxCutLength,
        complexity_score: data.jobComplexity.complexityScore,
        algorithm: data.algorithmUsed,
        solve_time_ms: data.solveTime,
        waste_percentage: data.wastePercentage,
        nesting_efficiency: data.nestingEfficiency,
        remnant_utilization: data.remnantUtilization || 0,
        success: data.success,
      }));

      const { error } = await supabase.from('optimization_training_data').insert(records);

      if (error) {
        console.error('Error batch storing training data:', error);
      }
    } catch (error) {
      console.error('Error batch collecting training data:', error);
    }
  }

  /**
   * Get training data for a user (for analysis)
   */
  async getTrainingData(
    userId: string,
    limit: number = 1000
  ): Promise<TrainingDataPoint[]> {
    try {
      const { data, error } = await supabase
        .from('optimization_training_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((record) => ({
        timestamp: record.created_at,
        userId: record.user_id,
        projectId: record.project_id,
        jobComplexity: {
          totalCuts: record.total_cuts,
          uniqueProfiles: record.unique_profiles,
          averageCutLength: record.average_cut_length,
          maxCutLength: record.max_cut_length,
          complexityScore: record.complexity_score,
          stockLengthConstraints: [],
        },
        algorithmUsed: record.algorithm,
        solveTime: record.solve_time_ms,
        wastePercentage: record.waste_percentage,
        nestingEfficiency: record.nesting_efficiency,
        remnantUtilization: record.remnant_utilization,
        success: record.success,
      }));
    } catch (error) {
      console.error('Error getting training data:', error);
      return [];
    }
  }
}

// Export singleton instance
export const trainingDataCollector = new TrainingDataCollector();

