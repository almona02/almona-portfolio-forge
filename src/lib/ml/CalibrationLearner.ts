/**
 * Calibration Learner ML Model
 * Machine learning system that predicts optimal K-factors based on collected calibration data
 * Learns from user actions and outcomes to continuously improve predictions
 */

import { supabase } from '@/lib/supabase';
import { calibrationAnalytics } from '@/lib/analytics/CalibrationAnalytics';

export interface PredictionInput {
  profileWidth: number; // mm
  profileHeight?: number; // mm
  materialThickness: number; // mm
  cutAngle: number; // degrees
  jointType: 'miter_45' | 'butt_90' | 't_joint' | 'l_joint' | 'custom';
  profileRole?: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazing_bead' | 'interlock';
  material?: 'aluminum' | 'upvc' | 'wood';
}

export interface PredictionResult {
  predictedKFactor: number;
  confidence: number; // 0-1, where 1 is highest confidence
  sampleCount: number; // Number of similar cases in training data
  reasoning: string; // Human-readable explanation
  alternativePredictions?: Array<{
    kFactor: number;
    confidence: number;
    scenario: string;
  }>;
}

export interface TrainingDataPoint {
  profileWidth: number;
  profileHeight?: number;
  materialThickness: number;
  cutAngle: number;
  jointType: string;
  kFactor: number;
  accuracy: number; // How accurate this K-factor was (lower is better)
  success: boolean;
}

/**
 * Simple Multivariate Regression Model for K-Factor Prediction
 * Uses weighted linear regression with feature normalization
 */
class KFactorRegressionModel {
  private weights: Map<string, number> = new Map();
  private meanValues: Map<string, number> = new Map();
  private stdValues: Map<string, number> = new Map();
  private isTrained: boolean = false;
  private trainingSampleCount: number = 0;

  /**
   * Train the model on calibration data
   */
  train(dataPoints: TrainingDataPoint[]): void {
    if (dataPoints.length < 10) {
      // Not enough data to train reliably
      this.isTrained = false;
      return;
    }

    this.trainingSampleCount = dataPoints.length;

    // Extract features and normalize
    const features = this.extractFeatures(dataPoints);
    const normalizedFeatures = this.normalizeFeatures(features);

    // Calculate mean and std for denormalization
    this.calculateStatistics(features);

    // Simple linear regression: kFactor = w0 + w1*width + w2*thickness + w3*angle + ...
    // Using gradient descent for simplicity
    this.weights = this.trainLinearRegression(normalizedFeatures, dataPoints.map((d) => d.kFactor));

    this.isTrained = true;
  }

  /**
   * Predict K-factor for given input
   */
  predict(input: PredictionInput): PredictionResult {
    if (!this.isTrained) {
      return {
        predictedKFactor: 0,
        confidence: 0,
        sampleCount: 0,
        reasoning: 'Model not yet trained. Need more calibration data.',
      };
    }

    // Extract and normalize features
    const features = this.extractFeaturesFromInput(input);
    const normalizedFeatures = this.normalizeInput(features);

    // Calculate prediction
    let prediction = this.weights.get('bias') || 0;
    for (const [feature, value] of normalizedFeatures.entries()) {
      const weight = this.weights.get(feature) || 0;
      prediction += weight * value;
    }

    // Denormalize
    const meanKFactor = this.meanValues.get('kFactor') || 0;
    const stdKFactor = this.stdValues.get('kFactor') || 1;
    const denormalizedPrediction = prediction * stdKFactor + meanKFactor;

    // Calculate confidence based on:
    // 1. Number of training samples
    // 2. Distance from training data (closer = higher confidence)
    // 3. Feature coverage
    const confidence = this.calculateConfidence(features, normalizedFeatures);

    // Generate reasoning
    const reasoning = this.generateReasoning(input, denormalizedPrediction, confidence);

    return {
      predictedKFactor: Math.round(denormalizedPrediction * 100) / 100,
      confidence: Math.max(0, Math.min(1, confidence)),
      sampleCount: this.trainingSampleCount,
      reasoning,
    };
  }

  /**
   * Extract features from training data
   */
  private extractFeatures(dataPoints: TrainingDataPoint[]): Map<string, number[]> {
    const features = new Map<string, number[]>();
    features.set('width', dataPoints.map((d) => d.profileWidth));
    features.set('thickness', dataPoints.map((d) => d.materialThickness));
    features.set('angle', dataPoints.map((d) => d.cutAngle));
    features.set('kFactor', dataPoints.map((d) => d.kFactor));

    // Add derived features
    features.set('width_thickness_ratio', dataPoints.map((d) => d.profileWidth / d.materialThickness));
    features.set('angle_rad', dataPoints.map((d) => (d.cutAngle * Math.PI) / 180));

    return features;
  }

  /**
   * Extract features from prediction input
   */
  private extractFeaturesFromInput(input: PredictionInput): Map<string, number> {
    const features = new Map<string, number>();
    features.set('width', input.profileWidth);
    features.set('thickness', input.materialThickness);
    features.set('angle', input.cutAngle);
    features.set('width_thickness_ratio', input.profileWidth / input.materialThickness);
    features.set('angle_rad', (input.cutAngle * Math.PI) / 180);

    return features;
  }

  /**
   * Normalize features (z-score normalization)
   */
  private normalizeFeatures(features: Map<string, number[]>): Map<string, number[]> {
    const normalized = new Map<string, number[]>();

    for (const [name, values] of features.entries()) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance) || 1;

      this.meanValues.set(name, mean);
      this.stdValues.set(name, std);

      normalized.set(
        name,
        values.map((v) => (v - mean) / std)
      );
    }

    return normalized;
  }

  /**
   * Normalize input using stored statistics
   */
  private normalizeInput(features: Map<string, number>): Map<string, number> {
    const normalized = new Map<string, number>();

    for (const [name, value] of features.entries()) {
      const mean = this.meanValues.get(name) || 0;
      const std = this.stdValues.get(name) || 1;
      normalized.set(name, (value - mean) / std);
    }

    return normalized;
  }

  /**
   * Calculate mean and std for all features
   */
  private calculateStatistics(features: Map<string, number[]>): void {
    for (const [name, values] of features.entries()) {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance) || 1;

      this.meanValues.set(name, mean);
      this.stdValues.set(name, std);
    }
  }

  /**
   * Train linear regression using gradient descent
   */
  private trainLinearRegression(
    features: Map<string, number[]>,
    targets: number[]
  ): Map<string, number> {
    const weights = new Map<string, number>();
    const learningRate = 0.01;
    const iterations = 1000;

    // Initialize weights
    weights.set('bias', 0);
    for (const featureName of features.keys()) {
      if (featureName !== 'kFactor') {
        weights.set(featureName, 0);
      }
    }

    // Gradient descent
    for (let iter = 0; iter < iterations; iter++) {
      const predictions = targets.map((_, idx) => {
        let pred = weights.get('bias') || 0;
        for (const [featureName, values] of features.entries()) {
          if (featureName !== 'kFactor') {
            pred += (weights.get(featureName) || 0) * values[idx];
          }
        }
        return pred;
      });

      // Update bias
      const biasGradient =
        predictions.reduce((sum, pred, idx) => sum + (pred - targets[idx]), 0) / targets.length;
      weights.set('bias', (weights.get('bias') || 0) - learningRate * biasGradient);

      // Update feature weights
      for (const [featureName, values] of features.entries()) {
        if (featureName !== 'kFactor') {
          const gradient =
            values.reduce(
              (sum, val, idx) => sum + val * (predictions[idx] - targets[idx]),
              0
            ) / targets.length;
          weights.set(featureName, (weights.get(featureName) || 0) - learningRate * gradient);
        }
      }
    }

    return weights;
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(
    originalFeatures: Map<string, number>,
    normalizedFeatures: Map<string, number>
  ): number {
    // Base confidence on sample count
    let confidence = Math.min(1, this.trainingSampleCount / 100); // Max confidence at 100+ samples

    // Reduce confidence if input is far from training data
    let distancePenalty = 0;
    for (const [, value] of normalizedFeatures.entries()) {
      // If normalized value is > 2 std from mean, reduce confidence
      if (Math.abs(value) > 2) {
        distancePenalty += 0.1;
      }
    }
    confidence = Math.max(0, confidence - distancePenalty);

    return confidence;
  }

  /**
   * Generate human-readable reasoning for prediction
   */
  private generateReasoning(
    input: PredictionInput,
    prediction: number,
    confidence: number
  ): string {
    const confidencePercent = Math.round(confidence * 100);
    let reasoning = `Based on ${this.trainingSampleCount} calibration examples, `;

    if (confidence > 0.7) {
      reasoning += `the model predicts a K-factor of ${prediction.toFixed(2)}mm with ${confidencePercent}% confidence. `;
    } else if (confidence > 0.4) {
      reasoning += `the model suggests a K-factor of ${prediction.toFixed(2)}mm with ${confidencePercent}% confidence. `;
      reasoning += `Consider verifying with a test cut. `;
    } else {
      reasoning += `the model provides a preliminary estimate of ${prediction.toFixed(2)}mm. `;
      reasoning += `Low confidence - recommend manual calibration. `;
    }

    if (input.jointType === 'miter_45') {
      reasoning += `For 45° miter joints, typical K-factors range from -30mm to -50mm depending on profile dimensions.`;
    }

    return reasoning;
  }

  /**
   * Check if model is trained
   */
  isModelTrained(): boolean {
    return this.isTrained;
  }

  /**
   * Get training sample count
   */
  getSampleCount(): number {
    return this.trainingSampleCount;
  }
}

export class CalibrationLearner {
  private model: KFactorRegressionModel;
  private lastTrainingDate: Date | null = null;
  private trainingInterval: number = 24 * 60 * 60 * 1000; // Retrain daily

  constructor() {
    this.model = new KFactorRegressionModel();
  }

  /**
   * Load training data from database
   */
  async loadTrainingData(_userId?: string): Promise<TrainingDataPoint[]> {
    try {
      // Query calibration_analytics for successful test results
      const query = supabase
        .from('calibration_analytics')
        .select('profile_width_mm, profile_height_mm, material_thickness_mm, cut_angle, joint_type, k_factor, accuracy_mm, success')
        .eq('event_type', 'test_result')
        .eq('success', true) // Only use successful calibrations
        .not('profile_width_mm', 'is', null)
        .not('material_thickness_mm', 'is', null)
        .not('k_factor', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000); // Limit for performance

      // Optionally filter by user for personalized model
      // For now, use all users' data for better generalization
      // if (userId) {
      //   query.eq('user_id', userId);
      // }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        return [];
      }

      return data
        .filter((row: any) => row.profile_width_mm && row.material_thickness_mm && row.k_factor !== null)
        .map((row: any) => ({
          profileWidth: row.profile_width_mm as number,
          profileHeight: row.profile_height_mm as number | undefined,
          materialThickness: row.material_thickness_mm as number,
          cutAngle: (row.cut_angle as number) || 45,
          jointType: (row.joint_type as string) || 'miter_45',
          kFactor: row.k_factor as number,
          accuracy: (row.accuracy_mm as number) || 0,
          success: (row.success as boolean) || false,
        }));
    } catch (error) {
      console.error('Error loading training data:', error);
      return [];
    }
  }

  /**
   * Train the model (should be called periodically)
   */
  async train(userId?: string): Promise<boolean> {
    try {
      const trainingData = await this.loadTrainingData(userId);

      if (trainingData.length < 10) {
        console.log('Not enough training data. Need at least 10 samples.');
        return false;
      }

      this.model.train(trainingData);
      this.lastTrainingDate = new Date();

      console.log(`Model trained on ${trainingData.length} samples`);
      return true;
    } catch (error) {
      console.error('Error training model:', error);
      return false;
    }
  }

  /**
   * Predict K-factor for given input
   */
  async predict(input: PredictionInput): Promise<PredictionResult> {
    // Auto-train if needed
    if (!this.model.isModelTrained() || this.shouldRetrain()) {
      await this.train();
    }

    return this.model.predict(input);
  }

  /**
   * Check if model should be retrained
   */
  private shouldRetrain(): boolean {
    if (!this.lastTrainingDate) return true;
    const timeSinceTraining = Date.now() - this.lastTrainingDate.getTime();
    return timeSinceTraining > this.trainingInterval;
  }

  /**
   * Record user feedback for learning
   */
  async recordFeedback(
    input: PredictionInput,
    prediction: PredictionResult,
    userAction: 'applied' | 'ignored' | 'modified',
    finalKFactor?: number,
    outcome?: 'success' | 'failure'
  ): Promise<void> {
    try {
      // Record feedback in calibration_analytics
      await calibrationAnalytics.recordAdjustment({
        profileId: '', // Would need profile ID
        userId: '', // Would need user ID
        jointType: input.jointType,
        previousKFactor: prediction.predictedKFactor,
        newKFactor: finalKFactor || prediction.predictedKFactor,
        adjustmentReason: userAction === 'applied' ? 'suggestion' : 'manual',
        success: outcome === 'success',
        createdAt: new Date(),
      });

      // If user applied suggestion and it was successful, this is strong positive signal
      // If user ignored/modified, this is learning opportunity
      // The model will learn from this in next training cycle
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  }

  /**
   * Get model status
   */
  getStatus(): {
    isTrained: boolean;
    sampleCount: number;
    lastTrainingDate: Date | null;
  } {
    return {
      isTrained: this.model.isModelTrained(),
      sampleCount: this.model.getSampleCount(),
      lastTrainingDate: this.lastTrainingDate,
    };
  }
}

// Singleton instance
export const calibrationLearner = new CalibrationLearner();

// Auto-train on initialization (in background)
calibrationLearner.train().catch((error) => {
  console.warn('Initial model training failed:', error);
});

