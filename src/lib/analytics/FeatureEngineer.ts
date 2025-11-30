/**
 * Feature Engineer
 * Prepares data features for ML model training and prediction
 */

import type { Remnant } from '@/lib/inventory/RemnantManager';
import type { Profile, WindowComponent } from '@/types/fabricator';
import { supabase } from '../supabase';

export interface MLFeatures {
  // Remnant features
  remnantLength: number;
  remnantAge: number;
  remnantQuality: number;
  remnantLocation: number;
  remnantUsageCount: number;
  remnantValue: number;

  // Profile features
  profilePopularity: number;
  profileCost: number;
  profileMaterial: number;

  // Context features
  seasonalDemand: number;
  projectComplexity: number;
  timeOfYear: number;
}

export class FeatureEngineer {
  /**
   * Extract features from remnant for ML model
   */
  async extractRemnantFeatures(remnant: Remnant): Promise<Partial<MLFeatures>> {
    const now = new Date();
    const ageDays = Math.floor(
      (now.getTime() - remnant.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Quality encoding (excellent=1, good=0.75, fair=0.5, poor=0.25)
    const qualityMap: Record<string, number> = {
      excellent: 1.0,
      good: 0.75,
      fair: 0.5,
      poor: 0.25,
    };

    // Location encoding (main=1, others=0.5)
    const locationValue = remnant.locationName === 'Main' ? 1.0 : 0.5;

    // Get profile popularity
    const profilePopularity = await this.getProfilePopularity(remnant.profileId);

    return {
      remnantLength: this.normalizeLength(remnant.length),
      remnantAge: this.normalizeAge(ageDays),
      remnantQuality: qualityMap[remnant.quality] || 0.5,
      remnantLocation: locationValue,
      remnantUsageCount: this.normalizeUsageCount(remnant.usageCount || 0),
      remnantValue: this.normalizeValue(remnant.estimatedValue || 0),
      profilePopularity,
      seasonalDemand: this.calculateSeasonalDemand(now.getMonth()),
      timeOfYear: this.normalizeTimeOfYear(now.getMonth()),
    };
  }

  /**
   * Extract features from job/components for complexity prediction
   */
  extractJobFeatures(components: WindowComponent[], profiles: Profile[]): Partial<MLFeatures> {
    const totalCuts = components.reduce((sum, comp) => sum + comp.cuttingLengths.length, 0);
    const uniqueProfiles = new Set(components.map(comp => comp.profile.id)).size;
    const allLengths = components.flatMap(comp => comp.cuttingLengths);

    // Calculate variance
    const average = allLengths.reduce((sum, len) => sum + len, 0) / allLengths.length;
    const variance = allLengths.reduce((sum, len) => sum + Math.pow(len - average, 2), 0) / allLengths.length;
    const coefficientOfVariation = average > 0 ? Math.sqrt(variance) / average : 0;

    // Average profile cost
    const avgCost = profiles.reduce((sum, p) => sum + p.costPerMeter, 0) / profiles.length;

    return {
      projectComplexity: this.normalizeComplexity(totalCuts, uniqueProfiles, coefficientOfVariation),
      profileCost: this.normalizeCost(avgCost),
      profileMaterial: this.encodeMaterial(profiles[0]?.material || 'aluminum'),
    };
  }

  /**
   * Normalize length to 0-1 range
   */
  private normalizeLength(length: number): number {
    return Math.min(length / 6000, 1); // Max 6000mm
  }

  /**
   * Normalize age to 0-1 range
   */
  private normalizeAge(ageDays: number): number {
    return Math.min(ageDays / 365, 1); // Max 365 days
  }

  /**
   * Normalize usage count to 0-1 range
   */
  private normalizeUsageCount(count: number): number {
    return Math.min(count / 10, 1); // Max 10 uses
  }

  /**
   * Normalize value to 0-1 range
   */
  private normalizeValue(value: number): number {
    return Math.min(value / 1000, 1); // Max 1000
  }

  /**
   * Normalize complexity to 0-1 range
   */
  private normalizeComplexity(
    cuts: number,
    profiles: number,
    variance: number
  ): number {
    const cutScore = Math.min(cuts / 1000, 1);
    const profileScore = Math.min(profiles / 10, 1);
    const varianceScore = Math.min(variance, 1);

    return (cutScore * 0.5 + profileScore * 0.3 + varianceScore * 0.2);
  }

  /**
   * Normalize cost to 0-1 range
   */
  private normalizeCost(cost: number): number {
    return Math.min(cost / 100, 1); // Max 100 per meter
  }

  /**
   * Encode material type
   */
  private encodeMaterial(material: string): number {
    const materialMap: Record<string, number> = {
      aluminum: 1.0,
      upvc: 0.5,
      wood: 0.25,
    };
    return materialMap[material] || 0.5;
  }

  /**
   * Get profile popularity from database
   */
  private async getProfilePopularity(profileId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('fabricator_cutting_plans')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      if (error) throw error;
      return this.normalizePopularity(count || 0);
    } catch (error) {
      console.warn('Error fetching profile popularity:', error);
      return 0.5; // Default medium popularity
    }
  }

  /**
   * Normalize popularity to 0-1 range
   */
  private normalizePopularity(count: number): number {
    return Math.min(count / 1000, 1); // Max 1000 uses
  }

  /**
   * Calculate seasonal demand factor
   */
  private calculateSeasonalDemand(month: number): number {
    // Spring (Mar-May): 0.8-1.0
    // Summer (Jun-Aug): 0.9-1.0
    // Fall (Sep-Nov): 0.6-0.8
    // Winter (Dec-Feb): 0.4-0.6

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
   * Normalize time of year to 0-1 (0 = Jan 1, 1 = Dec 31)
   */
  private normalizeTimeOfYear(month: number): number {
    return month / 11; // 0-11 months normalized to 0-1
  }
}

// Export singleton instance
export const featureEngineer = new FeatureEngineer();

