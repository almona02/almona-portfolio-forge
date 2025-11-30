/**
 * Calibration Manager
 * Manages profile cutting calibrations (stored in Profile.specifications)
 */

import { Profile, CuttingCalibration } from '@/types/fabricator';
import { supabase } from '../supabase';
import { enhancedCalibrationManager } from './EnhancedCalibrationManager';

export class CalibrationManager {
  /**
   * Get active calibration for a profile and system pack
   */
  getActiveCalibration(
    profile: Profile,
    systemPackId: string
  ): CuttingCalibration | null {
    if (!profile.calibrations || profile.calibrations.length === 0) {
      return null;
    }

    return (
      profile.calibrations.find(
        (cal) => cal.systemPackId === systemPackId && cal.isActive
      ) || null
    );
  }

  /**
   * Apply calibration modifiers to a cut length
   * Enhanced version uses comprehensive modifier system if available
   */
  applyCalibration(
    baseLength: number,
    calibration: CuttingCalibration | null,
    options?: {
      angle?: number;
      temperature?: number;
      profileType?: string;
    }
  ): number {
    if (!calibration) {
      return baseLength;
    }

    // Use enhanced calibration manager if enhanced modifiers are available
    if (calibration.allowances || calibration.strokes || calibration.variations) {
      return enhancedCalibrationManager.calculateCalibrationAdjustment(
        baseLength,
        calibration,
        options || {}
      );
    }

    // Fallback to legacy modifiers for backward compatibility
    return baseLength + calibration.lengthModifier + calibration.bladeWidthCompensation;
  }

  /**
   * Save calibration to profile specifications
   */
  async saveCalibration(
    profileId: string,
    calibration: Omit<CuttingCalibration, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CuttingCalibration> {
    try {
      // Fetch current profile
      const { data: profileData, error: fetchError } = await supabase
        .from('fabricator_profiles')
        .select('specifications')
        .eq('id', profileId)
        .single();

      if (fetchError) throw fetchError;

      const specifications = profileData?.specifications || {};
      const calibrations: CuttingCalibration[] = specifications.calibrations || [];

      // Create new calibration with ID
      const newCalibration: CuttingCalibration = {
        ...calibration,
        id: `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add or update calibration
      const existingIndex = calibrations.findIndex(
        (cal) => cal.profileId === profileId && cal.systemPackId === calibration.systemPackId
      );

      if (existingIndex >= 0) {
        calibrations[existingIndex] = newCalibration;
      } else {
        calibrations.push(newCalibration);
      }

      // Update profile specifications
      const { error: updateError } = await supabase
        .from('fabricator_profiles')
        .update({
          specifications: {
            ...specifications,
            calibrations,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (updateError) throw updateError;

      return newCalibration;
    } catch (error) {
      console.error('Error saving calibration:', error);
      throw error;
    }
  }

  /**
   * Get all calibrations for a profile
   */
  getCalibrations(profile: Profile): CuttingCalibration[] {
    return profile.calibrations || [];
  }

  /**
   * Delete a calibration
   */
  async deleteCalibration(profileId: string, calibrationId: string): Promise<void> {
    try {
      const { data: profileData, error: fetchError } = await supabase
        .from('fabricator_profiles')
        .select('specifications')
        .eq('id', profileId)
        .single();

      if (fetchError) throw fetchError;

      const specifications = profileData?.specifications || {};
      const calibrations: CuttingCalibration[] = specifications.calibrations || [];

      const filtered = calibrations.filter((cal) => cal.id !== calibrationId);

      const { error: updateError } = await supabase
        .from('fabricator_profiles')
        .update({
          specifications: {
            ...specifications,
            calibrations: filtered,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error deleting calibration:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const calibrationManager = new CalibrationManager();

