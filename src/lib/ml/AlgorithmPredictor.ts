/**
 * ML-Based Algorithm Predictor
 * Predicts optimal algorithm (greedy/linear/genetic) based on job complexity
 * Uses historical performance data to train and improve predictions
 */

import { JobComplexity } from '@/algorithms/adaptiveSolver';

export interface AlgorithmPrediction {
  algorithm: 'greedy' | 'linear' | 'genetic';
  confidence: number;
  expectedWastePercentage: number;
  expectedDuration: number; // milliseconds
  reasoning: string;
}

export interface TrainingDataPoint {
  complexity: JobComplexity;
  algorithm: 'greedy' | 'linear' | 'genetic';
  performance: {
    wastePercentage: number;
    duration: number;
  };
}

export class AlgorithmPredictor {
  private trainingData: TrainingDataPoint[] = [];
  private modelWeights: Map<string, number> = new Map();

  /**
   * Predict optimal algorithm for a given job complexity
   */
  async predict(complexity: JobComplexity): Promise<AlgorithmPrediction> {
    // If we have training data, use ML-based prediction
    if (this.trainingData.length > 10) {
      return this.mlPredict(complexity);
    }

    // Otherwise, use rule-based prediction
    return this.ruleBasedPredict(complexity);
  }

  /**
   * ML-based prediction using weighted features
   */
  private mlPredict(complexity: JobComplexity): AlgorithmPrediction {
    // Extract features
    const features = this.extractFeatures(complexity);

    // Score each algorithm
    const scores = {
      greedy: this.scoreAlgorithm('greedy', features),
      linear: this.scoreAlgorithm('linear', features),
      genetic: this.scoreAlgorithm('genetic', features),
    };

    // Find best algorithm
    const bestAlgorithm = Object.entries(scores).reduce((a, b) =>
      scores[a[0] as keyof typeof scores] > scores[b[0] as keyof typeof scores] ? a : b
    )[0] as 'greedy' | 'linear' | 'genetic';

    // Calculate confidence based on score difference
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const confidence = sortedScores[0] - sortedScores[1] > 0.1 ? 0.9 : 0.6;

    // Estimate performance
    const expectedPerformance = this.estimatePerformance(bestAlgorithm, complexity);

    return {
      algorithm: bestAlgorithm,
      confidence,
      expectedWastePercentage: expectedPerformance.wastePercentage,
      expectedDuration: expectedPerformance.duration,
      reasoning: this.generateReasoning(bestAlgorithm, complexity, features),
    };
  }

  /**
   * Rule-based prediction (fallback)
   */
  private ruleBasedPredict(complexity: JobComplexity): AlgorithmPrediction {
    let algorithm: 'greedy' | 'linear' | 'genetic';
    let expectedWastePercentage: number;
    let expectedDuration: number;

    if (complexity.totalCuts < 50) {
      algorithm = 'greedy';
      expectedWastePercentage = 8;
      expectedDuration = 2000;
    } else if (complexity.totalCuts < 500) {
      algorithm = 'linear';
      expectedWastePercentage = 6;
      expectedDuration = 10000;
    } else {
      algorithm = 'genetic';
      expectedWastePercentage = 4;
      expectedDuration = 45000;
    }

    return {
      algorithm,
      confidence: 0.7,
      expectedWastePercentage,
      expectedDuration,
      reasoning: `Rule-based: ${complexity.totalCuts} cuts, complexity score ${complexity.complexityScore.toFixed(1)}`,
    };
  }

  /**
   * Extract features from complexity for ML model
   */
  private extractFeatures(complexity: JobComplexity): number[] {
    return [
      complexity.totalCuts / 1000, // Normalized cut count
      complexity.uniqueProfiles / 10, // Normalized profile diversity
      complexity.averageCutLength / 1000, // Normalized average length
      complexity.maxCutLength / 1000, // Normalized max length
      complexity.complexityScore / 100, // Normalized complexity score
    ];
  }

  /**
   * Score an algorithm based on features
   */
  private scoreAlgorithm(
    algorithm: 'greedy' | 'linear' | 'genetic',
    features: number[]
  ): number {
    // Get relevant training data for this algorithm
    const algorithmData = this.trainingData.filter((d) => d.algorithm === algorithm);

    if (algorithmData.length === 0) {
      return 0.5; // Default score
    }

    // Calculate weighted average performance based on feature similarity
    let totalWeight = 0;
    let weightedWaste = 0;
    let weightedSpeed = 0;

    for (const dataPoint of algorithmData) {
      const similarity = this.calculateSimilarity(features, dataPoint.complexity);
      const weight = similarity * (1 / (1 + dataPoint.performance.wastePercentage / 10));

      totalWeight += weight;
      weightedWaste += weight * dataPoint.performance.wastePercentage;
      weightedSpeed += weight * (1 / (1 + dataPoint.performance.duration / 10000));
    }

    if (totalWeight === 0) {
      return 0.5;
    }

    const avgWaste = weightedWaste / totalWeight;
    const avgSpeed = weightedSpeed / totalWeight;

    // Score: lower waste is better, higher speed is better
    return (1 - avgWaste / 20) * 0.6 + avgSpeed * 0.4;
  }

  /**
   * Calculate similarity between feature vectors
   */
  private calculateSimilarity(features1: number[], complexity2: JobComplexity): number {
    const features2 = this.extractFeatures(complexity2);

    // Euclidean distance
    let distance = 0;
    for (let i = 0; i < features1.length; i++) {
      distance += Math.pow(features1[i] - features2[i], 2);
    }

    // Convert distance to similarity (0-1)
    return 1 / (1 + Math.sqrt(distance));
  }

  /**
   * Estimate performance for an algorithm
   */
  private estimatePerformance(
    algorithm: 'greedy' | 'linear' | 'genetic',
    _complexity: JobComplexity
  ): { wastePercentage: number; duration: number } {
    const algorithmData = this.trainingData.filter((d) => d.algorithm === algorithm);

    if (algorithmData.length === 0) {
      // Default estimates
      if (algorithm === 'greedy') {
        return { wastePercentage: 8, duration: 2000 };
      } else if (algorithm === 'linear') {
        return { wastePercentage: 6, duration: 10000 };
      } else {
        return { wastePercentage: 4, duration: 45000 };
      }
    }

    // Average performance from training data
    const avgWaste =
      algorithmData.reduce((sum, d) => sum + d.performance.wastePercentage, 0) /
      algorithmData.length;
    const avgDuration =
      algorithmData.reduce((sum, d) => sum + d.performance.duration, 0) / algorithmData.length;

    return { wastePercentage: avgWaste, duration: avgDuration };
  }

  /**
   * Generate human-readable reasoning for prediction
   */
  private generateReasoning(
    algorithm: 'greedy' | 'linear' | 'genetic',
    complexity: JobComplexity,
    _features: number[]
  ): string {
    const reasons: string[] = [];

    if (algorithm === 'greedy') {
      reasons.push(`Fast greedy algorithm selected for ${complexity.totalCuts} cuts`);
      if (complexity.totalCuts < 50) {
        reasons.push('Job is simple enough for instant optimization');
      }
    } else if (algorithm === 'linear') {
      reasons.push(`Linear programming selected for ${complexity.totalCuts} cuts`);
      reasons.push('Balanced approach between speed and optimality');
    } else {
      reasons.push(`Genetic algorithm selected for ${complexity.totalCuts} cuts`);
      reasons.push('Complex job requires advanced optimization');
    }

    if (complexity.uniqueProfiles > 5) {
      reasons.push(`High profile diversity (${complexity.uniqueProfiles} profiles)`);
    }

    return reasons.join('. ') + '.';
  }

  /**
   * Train model with new data point
   */
  addTrainingData(dataPoint: TrainingDataPoint): void {
    this.trainingData.push(dataPoint);

    // Keep only recent data (last 1000 points)
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000);
    }

    // Update model weights (simplified - in production would use proper ML training)
    this.updateWeights();
  }

  /**
   * Update model weights based on training data
   */
  private updateWeights(): void {
    // Simplified weight update - in production would use gradient descent or similar
    // For now, just track which features correlate with better performance
    const featureImportance = new Map<string, number>();

    for (const dataPoint of this.trainingData) {
      const features = this.extractFeatures(dataPoint.complexity);
      const performance = dataPoint.performance.wastePercentage;

      for (let i = 0; i < features.length; i++) {
        const key = `feature_${i}`;
        const current = featureImportance.get(key) || 0;
        featureImportance.set(key, current + features[i] * (1 / (1 + performance / 10)));
      }
    }

    // Normalize weights
    const total = Array.from(featureImportance.values()).reduce((a, b) => a + b, 0);
    for (const [key, value] of featureImportance.entries()) {
      this.modelWeights.set(key, value / total);
    }
  }

  /**
   * Get model statistics
   */
  getModelStats(): {
    trainingDataPoints: number;
    averageConfidence: number;
    algorithmDistribution: Record<string, number>;
  } {
    const distribution: Record<string, number> = {};
    for (const dataPoint of this.trainingData) {
      distribution[dataPoint.algorithm] = (distribution[dataPoint.algorithm] || 0) + 1;
    }

    return {
      trainingDataPoints: this.trainingData.length,
      averageConfidence: 0.75, // Placeholder
      algorithmDistribution: distribution,
    };
  }
}

// Export singleton instance
export const algorithmPredictor = new AlgorithmPredictor();

