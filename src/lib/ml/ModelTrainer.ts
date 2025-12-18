/**
 * Model Trainer
 * Automated model training pipeline for remnant usage prediction
 * 
 * Uses lazy loading for TensorFlow.js to reduce initial bundle size (~870KB saved)
 */

// Lazy load TensorFlow.js - only loads when training is needed
let tf: typeof import('@tensorflow/tfjs') | null = null;

const loadTensorFlow = async () => {
  if (!tf) {
    tf = await import('@tensorflow/tfjs');
  }
  return tf;
};

import type { RemnantFeatures } from './RemnantUsagePredictor';
import { supabase } from '../supabase';

export interface TrainingData {
  features: RemnantFeatures;
  label: number; // Actual reuse outcome: 1 if reused, 0 if not
  remnantId: string;
  timestamp: Date;
}

export interface TrainingConfig {
  epochs: number;
  batchSize: number;
  validationSplit: number;
  learningRate: number;
}

export interface TrainingResult {
  model: any; // tf.LayersModel, but using any to avoid type issues with lazy loading
  history: any; // tf.History
  accuracy: number;
  loss: number;
  trainingTime: number;
}

export class ModelTrainer {
  private defaultConfig: TrainingConfig = {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    learningRate: 0.001,
  };

  /**
   * Load training data from Supabase
   */
  async loadTrainingData(userId?: string, limit: number = 1000): Promise<TrainingData[]> {
    try {
      let query = supabase
        .from('material_remnants')
        .select(`
          *,
          fabricator_profiles (*)
        `)
        .eq('status', 'used') // Only use remnants that were actually used
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      // Transform database records to training data
      const trainingData: TrainingData[] = [];

      for (const record of data) {
        const remnant = this.mapRemnantFromDb(record);
        const features = await this.extractFeaturesFromRemnant(remnant);
        const label = 1; // Remnant was used (status = 'used')

        trainingData.push({
          features,
          label,
          remnantId: remnant.id,
          timestamp: remnant.usedAt || remnant.createdAt,
        });
      }

      // Also include unused remnants (label = 0)
      const unusedQuery = supabase
        .from('material_remnants')
        .select(`
          *,
          fabricator_profiles (*)
        `)
        .eq('status', 'available')
        .lte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Older than 90 days
        .limit(Math.floor(limit * 0.3)); // 30% unused for balance

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: unusedData, error: unusedError } = await unusedQuery;

      if (!unusedError && unusedData) {
        for (const record of unusedData) {
          const remnant = this.mapRemnantFromDb(record);
          const features = await this.extractFeaturesFromRemnant(remnant);
          const label = 0; // Remnant was not used

          trainingData.push({
            features,
            label,
            remnantId: remnant.id,
            timestamp: remnant.createdAt,
          });
        }
      }

      return trainingData;
    } catch (error) {
      console.error('Error loading training data:', error);
      return [];
    }
  }

  /**
   * Create and compile model architecture
   */
  async createModel(): Promise<any> {
    // Lazy load TensorFlow.js
    const tfModule = await loadTensorFlow();
    
    const model = tfModule.sequential({
      layers: [
        // Input layer: 8 features
        tfModule.layers.dense({
          inputShape: [8],
          units: 64,
          activation: 'relu',
          name: 'hidden1',
        }),
        tfModule.layers.dropout({ rate: 0.2 }),
        tfModule.layers.dense({
          units: 32,
          activation: 'relu',
          name: 'hidden2',
        }),
        tfModule.layers.dropout({ rate: 0.2 }),
        tfModule.layers.dense({
          units: 16,
          activation: 'relu',
          name: 'hidden3',
        }),
        // Output layer: single value (reuse likelihood 0-1)
        tfModule.layers.dense({
          units: 1,
          activation: 'sigmoid',
          name: 'output',
        }),
      ],
    });

    // Compile model
    model.compile({
      optimizer: tfModule.train.adam(this.defaultConfig.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Train model on training data
   */
  async trainModel(
    trainingData: TrainingData[],
    config?: Partial<TrainingConfig>
  ): Promise<TrainingResult> {
    if (trainingData.length === 0) {
      throw new Error('No training data provided');
    }

    const effectiveConfig = { ...this.defaultConfig, ...config };

    // Prepare data
    const { features, labels } = await this.prepareData(trainingData);

    // Create model
    const model = await this.createModel();

    // Train model
    const startTime = performance.now();
    const history = await model.fit(features, labels, {
      epochs: effectiveConfig.epochs,
      batchSize: effectiveConfig.batchSize,
      validationSplit: effectiveConfig.validationSplit,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(
            `Epoch ${epoch + 1}/${effectiveConfig.epochs} - loss: ${logs?.loss?.toFixed(4)}, acc: ${logs?.acc?.toFixed(4)}`
          );
        },
      },
    });

    const trainingTime = performance.now() - startTime;

    // Evaluate model
    const evaluation = model.evaluate(features, labels) as any[]; // tf.Scalar[]
    const loss = (await evaluation[0].data())[0];
    const accuracy = (await evaluation[1].data())[0];

    // Clean up
    features.dispose();
    labels.dispose();
    evaluation.forEach(t => t.dispose());

    return {
      model,
      history,
      accuracy,
      loss,
      trainingTime,
    };
  }

  /**
   * Prepare data for training (convert to tensors)
   */
  private async prepareData(trainingData: TrainingData[]): Promise<{
    features: any; // tf.Tensor2D
    labels: any; // tf.Tensor2D
  }> {
    // Lazy load TensorFlow.js
    const tfModule = await loadTensorFlow();
    
    const featuresArray: number[][] = [];
    const labelsArray: number[] = [];

    for (const data of trainingData) {
      // Normalize features
      const normalized = this.normalizeFeatures(data.features);
      featuresArray.push(normalized);
      labelsArray.push(data.label);
    }

    const features = tfModule.tensor2d(featuresArray);
    const labels = tfModule.tensor2d(labelsArray, [labelsArray.length, 1]);

    return { features, labels };
  }

  /**
   * Normalize features (same as RemnantUsagePredictor)
   */
  private normalizeFeatures(features: RemnantFeatures): number[] {
    return [
      Math.min(features.remnantLength / 6000, 1),
      Math.min(features.ageDays / 365, 1),
      Math.min(features.profileTypeFrequency / 1000, 1),
      Math.min(Math.max(features.seasonalDemand, 0), 1),
      Math.min(Math.max(features.locationPriority, 0), 1),
      features.qualityScore,
      Math.min(features.usageCount / 10, 1),
      Math.min(features.estimatedValue / 1000, 1),
    ];
  }

  /**
   * Extract features from remnant (same logic as RemnantUsagePredictor)
   */
  private async extractFeaturesFromRemnant(remnant: any): Promise<RemnantFeatures> {
    const now = new Date();
    const createdAt = new Date(remnant.created_at);
    const ageDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    const month = now.getMonth();
    const seasonalDemand = this.calculateSeasonalDemand(month);

    const locationPriority = remnant.location_name === 'Main' ? 1.0 : 0.8;

    const qualityMap: Record<string, number> = {
      excellent: 1.0,
      good: 0.75,
      fair: 0.5,
      poor: 0.25,
    };
    const qualityScore = qualityMap[remnant.quality] || 0.5;

    // Get profile type frequency from database
    const { count } = await supabase
      .from('fabricator_cutting_plans')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', remnant.profile_id);

    return {
      remnantLength: remnant.length,
      ageDays,
      profileTypeFrequency: count || 0,
      seasonalDemand,
      locationPriority,
      qualityScore,
      usageCount: remnant.usage_count || 0,
      estimatedValue: remnant.estimated_value || 0,
    };
  }

  /**
   * Calculate seasonal demand (same as RemnantUsagePredictor)
   */
  private calculateSeasonalDemand(month: number): number {
    if (month >= 2 && month <= 4) {
      return 0.8 + (month - 2) * 0.1;
    } else if (month >= 5 && month <= 7) {
      return 0.9 + (month - 5) * 0.05;
    } else if (month >= 8 && month <= 10) {
      return 0.8 - (month - 8) * 0.1;
    } else {
      return 0.6 - (month === 11 || month === 0 || month === 1 ? 0.1 : 0);
    }
  }

  /**
   * Map database record to Remnant type
   */
  private mapRemnantFromDb(record: any): any {
    return {
      id: record.id,
      userId: record.user_id,
      profileId: record.profile_id,
      locationId: record.location_id,
      locationName: record.inventory_locations?.name || record.location_name,
      length: record.length,
      createdAt: new Date(record.created_at),
      usedAt: record.used_at ? new Date(record.used_at) : undefined,
      status: record.status,
      quality: record.quality,
      estimatedValue: record.estimated_value,
      usageCount: record.usage_count || 0,
    };
  }
}

// Export singleton instance
export const modelTrainer = new ModelTrainer();

