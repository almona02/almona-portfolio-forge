/**
 * Profile Definition Manager
 * Manages profile definitions, calibrations, and data sheet integration
 */

import { kFactorEngine } from '@/lib/calibration/KFactorEngine';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/fabricator';

export interface ProfileDefinitionInput {
  profileCode: string;
  systemName: string;
  width: number;
  height: number;
  materialThickness: number;
  weightPerMeter: number;
  role: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazing_bead' | 'interlock' | 'accessory';
  material: 'aluminum' | 'upvc' | 'wood';
  defaultKFactor45?: number;
  defaultKFactor90?: number;
  crossSectionImageUrl?: string;
  dataSheetUrl?: string;
  annotations?: any;
  userId: string;
}

export class ProfileDefinitionManager {
  /**
   * Create a new profile from definition input
   */
  async createProfileFromDefinition(input: ProfileDefinitionInput): Promise<Profile> {
    // Calculate default K-factors if not provided
    const kFactor45 =
      input.defaultKFactor45 ??
      kFactorEngine.getPresetKFactor(input.width, input.materialThickness, 'miter_45');
    const kFactor90 = input.defaultKFactor90 ?? 0;

    // Create profile record
    const profileData = {
      user_id: input.userId,
      name: input.profileCode,
      material: input.material,
      width: input.width,
      height: input.height,
      thickness: input.materialThickness,
      color: '#C0C0C0',
      cost_per_meter: 0,
      cutting_allowance: 0,
      grain_direction: null,
      supplier: '',
      system_brand: input.systemName || 'Standard',
      stock_quantity: 0,
      min_stock_level: 0,
      specifications: {
        profileCode: input.profileCode,
        systemName: input.systemName,
        weightPerMeter: input.weightPerMeter,
        role: input.role,
        defaultKFactor45: kFactor45,
        defaultKFactor90: kFactor90,
        crossSectionImageUrl: input.crossSectionImageUrl,
        dataSheetUrl: input.dataSheetUrl,
        annotations: input.annotations || [],
      },
    };

    const { data, error } = await supabase
      .from('fabricator_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return this.mapDatabaseProfileToProfile(data);
  }

  /**
   * Update profile with calibration data
   */
  async updateProfileCalibration(
    profileId: string,
    userId: string,
    calibration: {
      jointType: 'miter_45' | 'butt_90' | 't_joint' | 'l_joint' | 'custom';
      kFactor: number;
      cutAngle: number;
      testResults?: Array<{ expected: number; actual: number; difference: number; date: string }>;
    }
  ): Promise<void> {
    // Check if calibration exists
    const { data: existing } = await supabase
      .from('profile_calibrations')
      .select('id')
      .eq('profile_id', profileId)
      .eq('user_id', userId)
      .eq('joint_type', calibration.jointType)
      .single();

    const calibrationData = {
      profile_id: profileId,
      user_id: userId,
      joint_type: calibration.jointType,
      k_factor: calibration.kFactor,
      cut_angle: calibration.cutAngle,
      test_results: calibration.testResults || [],
      confidence_score: this.calculateConfidenceScore(calibration.testResults || []),
      is_active: true,
    };

    if (existing) {
      // Update existing calibration
      const { error } = await supabase
        .from('profile_calibrations')
        .update(calibrationData)
        .eq('id', existing.id);

      if (error) {
        throw new Error(`Failed to update calibration: ${error.message}`);
      }
    } else {
      // Create new calibration
      const { error } = await supabase.from('profile_calibrations').insert(calibrationData);

      if (error) {
        throw new Error(`Failed to create calibration: ${error.message}`);
      }
    }

    // Update profile default K-factors if this is a standard joint type
    if (calibration.jointType === 'miter_45') {
      await supabase
        .from('fabricator_profiles')
        .update({ default_k_factor_45: calibration.kFactor })
        .eq('id', profileId);
    } else if (calibration.jointType === 'butt_90') {
      await supabase
        .from('fabricator_profiles')
        .update({ default_k_factor_90: calibration.kFactor })
        .eq('id', profileId);
    }
  }

  /**
   * Get calibration for a profile
   */
  async getProfileCalibration(
    profileId: string,
    userId: string,
    jointType: string
  ): Promise<{ kFactor: number; confidenceScore: number } | null> {
    const { data, error } = await supabase
      .from('profile_calibrations')
      .select('k_factor, confidence_score')
      .eq('profile_id', profileId)
      .eq('user_id', userId)
      .eq('joint_type', jointType)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      kFactor: data.k_factor,
      confidenceScore: data.confidence_score || 0,
    };
  }

  /**
   * Calculate confidence score from test results
   */
  private calculateConfidenceScore(
    testResults: Array<{ expected: number; actual: number; difference: number; date: string }>
  ): number {
    if (testResults.length === 0) return 0;

    // Calculate variance in differences
    const differences = testResults.map((r) => r.difference);
    const mean = differences.reduce((a, b) => a + b, 0) / differences.length;
    const variance =
      differences.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / differences.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher confidence
    // More tests = higher confidence
    const consistencyScore = Math.max(0, 1 - stdDev / 5); // Normalize to 0-1
    const sampleSizeScore = Math.min(1, testResults.length / 10); // Max confidence at 10+ tests

    return (consistencyScore * 0.7 + sampleSizeScore * 0.3);
  }

  /**
   * Map database profile to Profile type
   */
  private mapDatabaseProfileToProfile(dbProfile: any): Profile {
    return {
      id: dbProfile.id,
      name: dbProfile.name,
      material: dbProfile.material,
      width: dbProfile.width,
      height: dbProfile.height,
      thickness: dbProfile.thickness,
      thumbnailUrl: dbProfile.thumbnail_url || dbProfile.cross_section_image_url,
      color: dbProfile.color || 'default',
      costPerMeter: dbProfile.cost_per_meter || 0,
      cuttingAllowance: dbProfile.cutting_allowance || 0,
      stockQuantity: dbProfile.stock_quantity || 0,
      minStockLevel: dbProfile.min_stock_level || 0,
      supplier: dbProfile.supplier || '',
      type: dbProfile.type,
      profileRole: dbProfile.profile_role,
      weightPerMeter: dbProfile.weight_per_meter,
      default_k_factor_45: dbProfile.default_k_factor_45,
      default_k_factor_90: dbProfile.default_k_factor_90,
      userId: dbProfile.user_id,
      createdAt: dbProfile.created_at ? new Date(dbProfile.created_at) : new Date(),
      updatedAt: dbProfile.updated_at ? new Date(dbProfile.updated_at) : new Date(),
    };
  }
}

export const profileDefinitionManager = new ProfileDefinitionManager();

