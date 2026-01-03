/**
 * Job Complexity Predictor
 * Pre-emptively selects optimal solver algorithm before optimization
 */

import type { Profile, WindowComponent } from '@/types/fabricator';
import { AdaptiveSolverConfig } from '@/types/fabricator';

export interface ComplexityPrediction {
  estimatedCuts: number;
  estimatedProfiles: number;
  complexityScore: number; // 0-100
  recommendedAlgorithm: 'greedy' | 'linear' | 'genetic';
  estimatedDuration: number; // milliseconds
  confidence: number; // 0-100
}

export class JobComplexityPredictor {
  /**
   * Predict job complexity before running optimization
   */
  predictComplexity(
    components: WindowComponent[],
    _profiles: Profile[]
  ): ComplexityPrediction {
    // Count total cuts
    const totalCuts = components.reduce(
      (sum, comp) => sum + comp.cuttingLengths.length,
      0
    );

    // Count unique profiles
    const uniqueProfiles = new Set(components.map(comp => comp.profile.id)).size;

    // Calculate complexity score
    const complexityScore = this.calculateComplexityScore(totalCuts, uniqueProfiles, components);

    // Recommend algorithm
    const recommendedAlgorithm = this.recommendAlgorithm(complexityScore, totalCuts);

    // Estimate duration
    const estimatedDuration = this.estimateDuration(recommendedAlgorithm, totalCuts);

    // Calculate confidence
    const confidence = this.calculateConfidence(totalCuts, uniqueProfiles);

    return {
      estimatedCuts: totalCuts,
      estimatedProfiles: uniqueProfiles,
      complexityScore,
      recommendedAlgorithm,
      estimatedDuration,
      confidence,
    };
  }

  /**
   * Calculate complexity score (0-100)
   */
  private calculateComplexityScore(
    totalCuts: number,
    uniqueProfiles: number,
    components: WindowComponent[]
  ): number {
    // Factor 1: Number of cuts (0-50 points)
    const cutScore = Math.min((totalCuts / 1000) * 50, 50);

    // Factor 2: Profile diversity (0-25 points)
    const profileScore = Math.min((uniqueProfiles / 10) * 25, 25);

    // Factor 3: Cut length variance (0-25 points)
    const allLengths = components.flatMap(comp => comp.cuttingLengths);
    const variance = this.calculateLengthVariance(allLengths);
    const varianceScore = Math.min(variance * 100, 25);

    return cutScore + profileScore + varianceScore;
  }

  /**
   * Calculate variance in cut lengths
   */
  private calculateLengthVariance(lengths: number[]): number {
    if (lengths.length === 0) return 0;

    const average = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const squaredDiffs = lengths.map(len => Math.pow(len - average, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / lengths.length;

    return Math.sqrt(variance) / average; // Coefficient of variation
  }

  /**
   * Recommend algorithm based on complexity
   */
  private recommendAlgorithm(
    complexityScore: number,
    totalCuts: number
  ): 'greedy' | 'linear' | 'genetic' {
    // Use thresholds similar to AdaptiveSolver
    if (totalCuts < 50) {
      return 'greedy';
    } else if (totalCuts < 500) {
      return 'linear';
    } else {
      return 'genetic';
    }
  }

  /**
   * Estimate optimization duration
   */
  private estimateDuration(
    algorithm: 'greedy' | 'linear' | 'genetic',
    totalCuts: number
  ): number {
    // Base estimates (in milliseconds)
    const baseTimes = {
      greedy: 100, // 100ms base
      linear: 500, // 500ms base
      genetic: 2000, // 2s base
    };

    const baseTime = baseTimes[algorithm];

    // Scale with number of cuts
    let scaleFactor = 1;
    if (algorithm === 'greedy') {
      scaleFactor = 1 + totalCuts * 0.01; // Linear scaling
    } else if (algorithm === 'linear') {
      scaleFactor = 1 + totalCuts * 0.02; // Slightly worse scaling
    } else {
      scaleFactor = 1 + totalCuts * 0.05; // Worse scaling for genetic
    }

    return Math.round(baseTime * scaleFactor);
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(totalCuts: number, uniqueProfiles: number): number {
    let confidence = 70; // Base confidence

    // More cuts = more predictable
    if (totalCuts > 100) confidence += 10;
    if (totalCuts > 500) confidence += 10;

    // Fewer profiles = more predictable
    if (uniqueProfiles <= 3) confidence += 10;

    return Math.min(confidence, 100);
  }

  /**
   * Generate optimal solver config based on prediction
   */
  generateSolverConfig(prediction: ComplexityPrediction): AdaptiveSolverConfig {
    return {
      maxSolvingTime: Math.ceil(prediction.estimatedDuration / 1000) + 5, // Add 5s buffer
      preferredAlgorithm: prediction.recommendedAlgorithm,
      complexityThresholds: {
        simple: 50,
        medium: 500,
      },
      timeConstraint: prediction.estimatedDuration < 2000 ? 'realtime' : 'fast',
      optimalityTarget: prediction.recommendedAlgorithm === 'greedy' ? 'max_speed' : 'balanced',
    };
  }
}

// Export singleton instance
export const jobComplexityPredictor = new JobComplexityPredictor();

