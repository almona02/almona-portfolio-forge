/**
 * Shared remnant ML feature shape (types only — no TensorFlow / predictors).
 * Keeps ModelTrainer free of @/future imports (AICS-001 §8.5).
 */

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
