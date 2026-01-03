/**
 * Remnant Predictor Service
 * Predicts remnant reuse likelihood using rule-based heuristics
 * (Designed to allow future ML model integration)
 */

import { supabase } from '../supabase';
import { Remnant } from './RemnantManager';

export interface RemnantPrediction {
  remnant: Remnant;
  reuseLikelihood: number; // 0-100 score
  factors: {
    ageScore: number;
    lengthScore: number;
    profilePopularityScore: number;
    historicalUsageScore: number;
  };
}

export class RemnantPredictor {
  private minRemnantLength: number = 200; // Minimum usable remnant length in mm
  private maxRemnantAge: number = 90; // Days before remnant is considered old
  private profileUsageCache: Map<string, number> = new Map(); // Cache for profile usage counts

  /**
   * Predict reuse likelihood for a remnant
   * Returns a score from 0-100, where higher = more likely to be reused
   */
  async predictReuseLikelihood(remnant: Remnant): Promise<number> {
    const factors = await this.calculateFactors(remnant);
    const prediction = this.combineFactors(factors);
    return prediction;
  }

  /**
   * Calculate individual factors that influence reuse likelihood
   */
  private async calculateFactors(remnant: Remnant): Promise<{
    ageScore: number;
    lengthScore: number;
    profilePopularityScore: number;
    historicalUsageScore: number;
  }> {
    // Factor 1: Age (newer remnants are less likely to be used immediately)
    // Older remnants (approaching expiration) get higher priority
    const ageInDays = this.getAgeInDays(remnant.createdAt);
    const ageScore = this.calculateAgeScore(ageInDays);

    // Factor 2: Length (very short remnants are less likely)
    // Longer remnants are more versatile and likely to be reused
    const lengthScore = this.calculateLengthScore(remnant.length);

    // Factor 3: Profile Type Popularity
    // Common profiles are more likely to be reused
    const profilePopularityScore = await this.calculateProfilePopularityScore(remnant.profileId);

    // Factor 4: Historical Usage
    // Remnants from profiles with high historical usage are more likely
    const historicalUsageScore = await this.calculateHistoricalUsageScore(remnant);

    return {
      ageScore,
      lengthScore,
      profilePopularityScore,
      historicalUsageScore,
    };
  }

  /**
   * Combine factors into final prediction score
   */
  private combineFactors(factors: {
    ageScore: number;
    lengthScore: number;
    profilePopularityScore: number;
    historicalUsageScore: number;
  }): number {
    // Weighted combination
    // Age: 30%, Length: 25%, Profile Popularity: 25%, Historical Usage: 20%
    const score =
      factors.ageScore * 0.3 +
      factors.lengthScore * 0.25 +
      factors.profilePopularityScore * 0.25 +
      factors.historicalUsageScore * 0.2;

    return Math.min(Math.max(score, 0), 100); // Clamp to 0-100
  }

  /**
   * Calculate age score (0-100)
   * Older remnants get higher scores (more urgent to use)
   */
  private calculateAgeScore(ageInDays: number): number {
    if (ageInDays < 7) {
      // Very new: low priority (0-20)
      return 20;
    } else if (ageInDays < 30) {
      // Recent: medium priority (20-50)
      return 20 + ((ageInDays - 7) / 23) * 30;
    } else if (ageInDays < 60) {
      // Getting old: high priority (50-80)
      return 50 + ((ageInDays - 30) / 30) * 30;
    } else {
      // Old: very high priority (80-100)
      return Math.min(80 + ((ageInDays - 60) / 30) * 20, 100);
    }
  }

  /**
   * Calculate length score (0-100)
   * Longer remnants are more versatile
   */
  private calculateLengthScore(length: number): number {
    if (length < this.minRemnantLength) {
      return 0; // Too short to be useful
    }

    // Normalize to 0-100 based on typical stock lengths (6000mm)
    // Remnants > 2000mm are very useful (80-100)
    // Remnants 500-2000mm are moderately useful (40-80)
    // Remnants 200-500mm are less useful (10-40)
    if (length >= 2000) {
      return 80 + Math.min((length - 2000) / 4000 * 20, 20);
    } else if (length >= 500) {
      return 40 + ((length - 500) / 1500) * 40;
    } else {
      return 10 + ((length - this.minRemnantLength) / 300) * 30;
    }
  }

  /**
   * Calculate profile popularity score (0-100)
   * More commonly used profiles have higher reuse likelihood
   */
  private async calculateProfilePopularityScore(profileId: string): Promise<number> {
    try {
      // Check cache first
      if (this.profileUsageCache.has(profileId)) {
        const usageCount = this.profileUsageCache.get(profileId)!;
        return this.normalizeUsageCount(usageCount);
      }

      // Query database for profile usage in cutting plans
      const { data, error } = await supabase
        .from('fabricator_cutting_plans')
        .select('id')
        .eq('profile_id', profileId)
        .limit(1000); // Limit to avoid performance issues

      if (error) {
        console.warn('Error fetching profile usage:', error);
        return 50; // Default to medium score
      }

      const usageCount = data?.length || 0;
      this.profileUsageCache.set(profileId, usageCount);

      return this.normalizeUsageCount(usageCount);
    } catch (error) {
      console.warn('Error calculating profile popularity:', error);
      return 50; // Default to medium score
    }
  }

  /**
   * Calculate historical usage score (0-100)
   * Based on remnant's own usage history and similar remnants
   */
  private async calculateHistoricalUsageScore(remnant: Remnant): Promise<number> {
    try {
      // Factor 1: This remnant's usage count
      const usageCount = remnant.usageCount || 0;
      const usageScore = Math.min(usageCount * 10, 40); // Max 40 points

      // Factor 2: Similar remnants' usage patterns
      const { data, error } = await supabase
        .from('material_remnants')
        .select('usage_count, length')
        .eq('profile_id', remnant.profileId)
        .gte('length', remnant.length * 0.8) // Similar length (±20%)
        .lte('length', remnant.length * 1.2)
        .limit(100);

      if (error) {
        console.warn('Error fetching similar remnants:', error);
        return usageScore;
      }

      if (!data || data.length === 0) {
        return usageScore;
      }

      // Calculate average usage of similar remnants
      const avgUsage = data.reduce((sum, r: any) => sum + (r.usage_count || 0), 0) / data.length;
      const similarUsageScore = Math.min(avgUsage * 10, 60); // Max 60 points

      return Math.min(usageScore + similarUsageScore, 100);
    } catch (error) {
      console.warn('Error calculating historical usage:', error);
      return 50; // Default to medium score
    }
  }

  /**
   * Normalize usage count to 0-100 score
   */
  private normalizeUsageCount(count: number): number {
    // Logarithmic scale: 0 uses = 0, 1-10 = 20-50, 10-100 = 50-80, 100+ = 80-100
    if (count === 0) return 0;
    if (count <= 10) return 20 + (count / 10) * 30;
    if (count <= 100) return 50 + ((count - 10) / 90) * 30;
    return Math.min(80 + ((count - 100) / 900) * 20, 100);
  }

  /**
   * Get age in days from creation date
   */
  private getAgeInDays(createdAt: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - createdAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Clear profile usage cache (call periodically or after profile updates)
   */
  clearCache(): void {
    this.profileUsageCache.clear();
  }
}

// Export singleton instance
export const remnantPredictor = new RemnantPredictor();

