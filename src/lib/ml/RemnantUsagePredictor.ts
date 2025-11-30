/**
 * Remnant Usage Predictor with TensorFlow.js
 * Evolves from rule-based to true machine learning predictions
 */

import * as tf from '@tensorflow/tfjs';
import type { Remnant } from '@/lib/inventory/RemnantManager';
import { remnantPredictor } from '@/lib/inventory/RemnantPredictor';

export interface RemnantFeatures {
  remnantLength: number;
  ageDays: number;
  profileTypeFrequency: number;
  seasonalDemand: number;
  locationPriority: number;
  qualityScore: number;
  usageCount: number;
  estimatedValue: number;
}

export interface PredictionResult {
  reuseLikelihood: number; // 0-100 score
  confidence: number; // 0-100 confidence level
  modelVersion: string;
  fallbackUsed: boolean;
  factors: {
    mlScore: number;
    ruleBasedScore: number;
    finalScore: number;
  };
}

export class RemnantUsagePredictor {
  private model: tf.LayersModel | null = null;
  private modelVersion: string = '1.0.0';
  private minConfidenceThreshold: number = 80; // Use ML if confidence >= 80%
  private isModelLoaded: boolean = false;

  /**
   * Load trained model from storage or URL
   */
  async loadModel(modelUrl?: string): Promise<void> {
    try {
      if (modelUrl) {
        this.model = await tf.loadLayersModel(modelUrl);
      } else {
        // Try to load from IndexedDB (browser storage)
        try {
          this.model = await tf.loadLayersModel('indexeddb://remnant-predictor-model');
        } catch {
          // Model not found in storage, will use fallback
          console.warn('ML model not found, using rule-based fallback');
          this.isModelLoaded = false;
          return;
        }
      }
      this.isModelLoaded = true;
      console.log('ML model loaded successfully');
    } catch (error) {
      console.error('Error loading ML model:', error);
      this.isModelLoaded = false;
    }
  }

  /**
   * Save trained model to IndexedDB
   */
  async saveModel(): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    try {
      await this.model.save('indexeddb://remnant-predictor-model');
      console.log('Model saved to IndexedDB');
    } catch (error) {
      console.error('Error saving model:', error);
    }
  }

  /**
   * Predict remnant reuse likelihood using ML model
   */
  async predict(remnant: Remnant, features: RemnantFeatures): Promise<PredictionResult> {
    // Always get rule-based score as fallback
    const ruleBasedScore = await remnantPredictor.predictReuseLikelihood(remnant);

    // Try ML prediction if model is loaded
    if (this.isModelLoaded && this.model) {
      try {
        const mlScore = await this.predictWithML(features);
        const confidence = this.calculateConfidence(features);

        // Use ML if confidence is high enough
        if (confidence >= this.minConfidenceThreshold) {
          // Blend ML and rule-based scores (70% ML, 30% rule-based)
          const finalScore = mlScore * 0.7 + ruleBasedScore * 0.3;

          return {
            reuseLikelihood: Math.min(Math.max(finalScore, 0), 100),
            confidence,
            modelVersion: this.modelVersion,
            fallbackUsed: false,
            factors: {
              mlScore,
              ruleBasedScore,
              finalScore,
            },
          };
        }
      } catch (error) {
        console.warn('ML prediction failed, using fallback:', error);
      }
    }

    // Fallback to rule-based prediction
    return {
      reuseLikelihood: ruleBasedScore,
      confidence: 50, // Lower confidence for rule-based
      modelVersion: 'rule-based',
      fallbackUsed: true,
      factors: {
        mlScore: 0,
        ruleBasedScore,
        finalScore: ruleBasedScore,
      },
    };
  }

  /**
   * Predict using ML model
   */
  private async predictWithML(features: RemnantFeatures): Promise<number> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    // Normalize features to 0-1 range
    const normalizedFeatures = this.normalizeFeatures(features);

    // Create tensor input
    const input = tf.tensor2d([normalizedFeatures], [1, 8]);

    // Predict
    const prediction = this.model.predict(input) as tf.Tensor;
    const predictionValue = await prediction.data();

    // Clean up tensors
    input.dispose();
    prediction.dispose();

    // Convert to 0-100 score
    return Math.min(Math.max(predictionValue[0] * 100, 0), 100);
  }

  /**
   * Calculate prediction confidence based on feature quality
   */
  private calculateConfidence(features: RemnantFeatures): number {
    // Confidence factors:
    // - More historical data = higher confidence
    // - Features within training range = higher confidence
    // - Complete feature set = higher confidence

    let confidence = 50; // Base confidence

    // Boost confidence if we have usage history
    if (features.usageCount > 0) {
      confidence += 10;
    }

    // Boost confidence if features are within expected ranges
    if (features.remnantLength >= 200 && features.remnantLength <= 6000) {
      confidence += 10;
    }

    if (features.ageDays >= 0 && features.ageDays <= 365) {
      confidence += 10;
    }

    // Boost if profile type frequency is known
    if (features.profileTypeFrequency > 0) {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Normalize features to 0-1 range for ML model
   */
  private normalizeFeatures(features: RemnantFeatures): number[] {
    return [
      // remnantLength: normalize to 0-1 (assuming max 6000mm)
      Math.min(features.remnantLength / 6000, 1),
      // ageDays: normalize to 0-1 (assuming max 365 days)
      Math.min(features.ageDays / 365, 1),
      // profileTypeFrequency: normalize to 0-1 (assuming max 1000 uses)
      Math.min(features.profileTypeFrequency / 1000, 1),
      // seasonalDemand: already 0-1
      Math.min(Math.max(features.seasonalDemand, 0), 1),
      // locationPriority: already 0-1
      Math.min(Math.max(features.locationPriority, 0), 1),
      // qualityScore: normalize (excellent=1, good=0.75, fair=0.5, poor=0.25)
      features.qualityScore,
      // usageCount: normalize to 0-1 (assuming max 10 uses)
      Math.min(features.usageCount / 10, 1),
      // estimatedValue: normalize to 0-1 (assuming max 1000)
      Math.min(features.estimatedValue / 1000, 1),
    ];
  }

  /**
   * Extract features from remnant for ML prediction
   */
  async extractFeatures(remnant: Remnant): Promise<RemnantFeatures> {
    const now = new Date();
    const ageDays = Math.floor(
      (now.getTime() - remnant.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get profile type frequency (would come from database in production)
    const profileTypeFrequency = remnant.usageCount || 0;

    // Calculate seasonal demand (simplified - would use historical data)
    const month = now.getMonth();
    const seasonalDemand = this.calculateSeasonalDemand(month);

    // Location priority (1.0 for main, 0.8 for others)
    const locationPriority =
      remnant.locationName === 'Main' || remnant.locationName === 'main' ? 1.0 : 0.8;

    // Quality score (excellent=1, good=0.75, fair=0.5, poor=0.25)
    const qualityMap: Record<string, number> = {
      excellent: 1.0,
      good: 0.75,
      fair: 0.5,
      poor: 0.25,
    };
    const qualityScore = qualityMap[remnant.quality] || 0.5;

    return {
      remnantLength: remnant.length,
      ageDays,
      profileTypeFrequency,
      seasonalDemand,
      locationPriority,
      qualityScore,
      usageCount: remnant.usageCount || 0,
      estimatedValue: remnant.estimatedValue || 0,
    };
  }

  /**
   * Calculate seasonal demand factor (0-1)
   * Higher in spring/summer for construction season
   */
  private calculateSeasonalDemand(month: number): number {
    // Spring (Mar-May): 0.8-1.0
    // Summer (Jun-Aug): 0.9-1.0
    // Fall (Sep-Nov): 0.6-0.8
    // Winter (Dec-Feb): 0.4-0.6

    if (month >= 2 && month <= 4) {
      // Spring
      return 0.8 + (month - 2) * 0.1;
    } else if (month >= 5 && month <= 7) {
      // Summer
      return 0.9 + (month - 5) * 0.05;
    } else if (month >= 8 && month <= 10) {
      // Fall
      return 0.8 - (month - 8) * 0.1;
    } else {
      // Winter
      return 0.6 - (month === 11 || month === 0 || month === 1 ? 0.1 : 0);
    }
  }

  /**
   * Get model status
   */
  getModelStatus(): {
    loaded: boolean;
    version: string;
    confidenceThreshold: number;
  } {
    return {
      loaded: this.isModelLoaded,
      version: this.modelVersion,
      confidenceThreshold: this.minConfidenceThreshold,
    };
  }
}

// Export singleton instance
export const remnantMLPredictor = new RemnantUsagePredictor();

