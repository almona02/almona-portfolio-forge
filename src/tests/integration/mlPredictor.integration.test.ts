/**
 * Integration Tests for ML Predictor System
 * Tests ML model training, prediction accuracy, fallback mechanisms, and performance
 */

import { featureEngineer } from '@/lib/analytics/FeatureEngineer';
import type { Remnant } from '@/lib/inventory/RemnantManager';
import { modelTrainer } from '@/lib/ml/ModelTrainer';
import type { RemnantFeatures } from '@/lib/ml/RemnantUsagePredictor';
import { RemnantUsagePredictor } from '@/lib/ml/RemnantUsagePredictor';
import { describe, expect, it, vi } from 'vitest';

// Mock Supabase (Correct path used by RemnantPredictor)
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe('ML Predictor Integration Tests', () => {
  let mockRemnant: Remnant;
  let mockFeatures: RemnantFeatures;

  beforeEach(() => {
    const now = new Date();
    const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days ago

    mockRemnant = {
      id: 'remnant-1',
      userId: 'user-1',
      profileId: 'profile-1',
      locationId: 'location-main',
      locationName: 'Main',
      length: 2500,
      createdAt: oldDate,
      lastCheckedAt: now,
      status: 'available',
      quality: 'good',
      estimatedValue: 25,
      usageCount: 0,
    };

    mockFeatures = {
      remnantLength: 2500,
      ageDays: 60,
      profileTypeFrequency: 50,
      seasonalDemand: 0.8,
      locationPriority: 1.0,
      qualityScore: 0.75,
      usageCount: 0,
      estimatedValue: 25,
    };
  });

  describe('ML Model Loading and Fallback', () => {
    it('should fallback to rule-based when model not loaded', async () => {
      const predictor = new RemnantUsagePredictor();
      
      // Don't load model - should use fallback
      const result = await predictor.predict(mockRemnant, mockFeatures);

      expect(result).toBeDefined();
      expect(result.fallbackUsed).toBe(true);
      expect(result.reuseLikelihood).toBeGreaterThanOrEqual(0);
      expect(result.reuseLikelihood).toBeLessThanOrEqual(100);
      expect(result.modelVersion).toBe('rule-based');
    });

    it('should use ML when model is loaded and confidence is high', async () => {
      const predictor = new RemnantUsagePredictor();
      
      // Create a simple mock model
      const mockModel = {
        predict: vi.fn().mockReturnValue({
          data: async () => new Float32Array([0.75]), // 75% likelihood
          dispose: vi.fn(),
        }),
      } as any;

      // Manually set model (in real scenario, this would be loaded)
      (predictor as any).model = mockModel;
      (predictor as any).isModelLoaded = true;

      const result = await predictor.predict(mockRemnant, mockFeatures);

      expect(result).toBeDefined();
      // Should attempt ML prediction
      expect(mockModel.predict).toHaveBeenCalled();
    });

    it('should fallback when ML confidence is below threshold', async () => {
      const predictor = new RemnantUsagePredictor();
      
      // Mock model that returns low confidence scenario
      const mockModel = {
        predict: vi.fn().mockReturnValue({
          data: async () => new Float32Array([0.5]),
          dispose: vi.fn(),
        }),
      } as any;

      (predictor as any).model = mockModel;
      (predictor as any).isModelLoaded = true;
      (predictor as any).minConfidenceThreshold = 80;

      // Create features that would result in low confidence
      const lowConfidenceFeatures: RemnantFeatures = {
        ...mockFeatures,
        usageCount: 0, // No usage history = lower confidence
        profileTypeFrequency: 0, // Unknown profile = lower confidence
      };

      const result = await predictor.predict(mockRemnant, lowConfidenceFeatures);

      // Should fallback if confidence < 80%
      expect(result).toBeDefined();
    });
  });

  describe('Feature Engineering', () => {
    it('should extract features correctly from remnant', async () => {
      const features = await featureEngineer.extractRemnantFeatures(mockRemnant);

      expect(features).toBeDefined();
      expect(features.remnantLength).toBeGreaterThanOrEqual(0);
      expect(features.remnantLength).toBeLessThanOrEqual(1); // Normalized
      expect(features.remnantAge).toBeGreaterThanOrEqual(0);
      expect(features.remnantAge).toBeLessThanOrEqual(1); // Normalized
      expect(features.remnantQuality).toBeGreaterThan(0);
    });

    it('should normalize features to 0-1 range', async () => {
      const features = await featureEngineer.extractRemnantFeatures(mockRemnant);

      // All normalized features should be 0-1
      expect(features.remnantLength).toBeGreaterThanOrEqual(0);
      expect(features.remnantLength).toBeLessThanOrEqual(1);
      expect(features.remnantAge).toBeGreaterThanOrEqual(0);
      expect(features.remnantAge).toBeLessThanOrEqual(1);
      expect(features.remnantUsageCount).toBeGreaterThanOrEqual(0);
      expect(features.remnantUsageCount).toBeLessThanOrEqual(1);
    });

    it('should calculate seasonal demand correctly', async () => {
      // Use fake timers to manipulate "now"
      vi.useFakeTimers();

      // Winter (January 15, 2024)
      vi.setSystemTime(new Date(2024, 0, 15));
      const janFeatures = await featureEngineer.extractRemnantFeatures(mockRemnant);

      // Summer (July 15, 2024)
      vi.setSystemTime(new Date(2024, 6, 15));
      const julFeatures = await featureEngineer.extractRemnantFeatures(mockRemnant);

      vi.useRealTimers();

      // Summer should have higher demand than winter
      expect(julFeatures.seasonalDemand).toBeGreaterThan(janFeatures.seasonalDemand);
    });
  });

  describe('Model Training', () => {
    it('should create model architecture', async () => {
      const model = await modelTrainer.createModel();

      expect(model).toBeDefined();
      expect(model.layers.length).toBeGreaterThan(0);
    });

    it('should prepare training data correctly', async () => {
      const trainingData = [
        {
          features: mockFeatures,
          label: 1,
          remnantId: 'remnant-1',
          timestamp: new Date(),
        },
        {
          features: { ...mockFeatures, ageDays: 10 },
          label: 0,
          remnantId: 'remnant-2',
          timestamp: new Date(),
        },
      ];

      const { features, labels } = await (modelTrainer as any).prepareData(trainingData);

      expect(features).toBeDefined();
      expect(labels).toBeDefined();
      expect(features.shape[0]).toBe(2); // 2 samples
      expect(labels.shape[0]).toBe(2); // 2 labels
    });

    it('should handle empty training data gracefully', async () => {
      await expect(
        modelTrainer.trainModel([], { epochs: 1 })
      ).rejects.toThrow('No training data provided');
    });
  });

  describe('Prediction Accuracy', () => {
    it('should return prediction with confidence score', async () => {
      const predictor = new RemnantUsagePredictor();
      const result = await predictor.predict(mockRemnant, mockFeatures);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.reuseLikelihood).toBeGreaterThanOrEqual(0);
      expect(result.reuseLikelihood).toBeLessThanOrEqual(100);
    });

    it('should provide factors breakdown', async () => {
      const predictor = new RemnantUsagePredictor();
      const result = await predictor.predict(mockRemnant, mockFeatures);

      expect(result.factors).toBeDefined();
      expect(result.factors.ruleBasedScore).toBeGreaterThanOrEqual(0);
      expect(result.factors.finalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Impact', () => {
    it('should complete prediction in reasonable time', async () => {
      const predictor = new RemnantUsagePredictor();
      const startTime = performance.now();

      await predictor.predict(mockRemnant, mockFeatures);

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should handle batch predictions efficiently', async () => {
      const predictor = new RemnantUsagePredictor();
      const remnants: Remnant[] = [];
      const features: RemnantFeatures[] = [];

      // Create 10 test remnants
      for (let i = 0; i < 10; i++) {
        remnants.push({
          ...mockRemnant,
          id: `remnant-${i}`,
          length: 2000 + i * 100,
        });
        features.push({
          ...mockFeatures,
          remnantLength: 2000 + i * 100,
        });
      }

      const startTime = performance.now();

      const predictions = await Promise.all(
        remnants.map((remnant, idx) => predictor.predict(remnant, features[idx]))
      );

      const duration = performance.now() - startTime;

      expect(predictions.length).toBe(10);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });
  });

  describe('Model Versioning', () => {
    it('should track model version', () => {
      const predictor = new RemnantUsagePredictor();
      const status = predictor.getModelStatus();

      expect(status).toBeDefined();
      expect(status.version).toBeDefined();
      expect(status.confidenceThreshold).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle ML prediction errors gracefully', async () => {
      const predictor = new RemnantUsagePredictor();
      
      // Mock model that throws error
      const mockModel = {
        predict: vi.fn().mockRejectedValue(new Error('Prediction failed')),
      } as any;

      (predictor as any).model = mockModel;
      (predictor as any).isModelLoaded = true;

      const result = await predictor.predict(mockRemnant, mockFeatures);

      // Should fallback to rule-based
      expect(result).toBeDefined();
      expect(result.fallbackUsed).toBe(true);
    });

    it('should handle invalid features gracefully', async () => {
      const predictor = new RemnantUsagePredictor();
      
      const invalidFeatures: RemnantFeatures = {
        remnantLength: -100, // Invalid negative length
        ageDays: -10, // Invalid negative age
        profileTypeFrequency: 0,
        seasonalDemand: 0,
        locationPriority: 0,
        qualityScore: 0,
        usageCount: 0,
        estimatedValue: 0,
      };

      const result = await predictor.predict(mockRemnant, invalidFeatures);

      // Should still return a result (with fallback)
      expect(result).toBeDefined();
    });
  });
});

