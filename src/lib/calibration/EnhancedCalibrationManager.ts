/**
 * Enhanced Calibration Manager
 * Comprehensive cutting calibration system with allowances, strokes, and variations
 * Supports profile-specific calibration with learning capabilities
 */

import { Profile, CuttingCalibration } from '@/types/fabricator';
import { supabase } from '../supabase';

export interface CalibrationCorrectionFactor {
  profileType: string;
  systemPackId: string;
  correctionFactor: number;
  confidence: number;
  sampleSize: number;
}

export interface CalibrationTestResult {
  profileId: string;
  systemPackId: string;
  expectedLength: number;
  actualLength: number;
  difference: number;
  testDate: Date;
  operatorId?: string;
  machineId?: string;
}

export class EnhancedCalibrationManager {
  /**
   * Calculate comprehensive calibration adjustment
   */
  calculateCalibrationAdjustment(
    baseLength: number,
    calibration: CuttingCalibration | null,
    options: {
      angle?: number;
      temperature?: number;
      profileType?: string;
    } = {}
  ): number {
    if (!calibration) {
      return baseLength;
    }

    let adjustedLength = baseLength;

    // Apply legacy modifiers for backward compatibility
    adjustedLength += calibration.lengthModifier || 0;
    adjustedLength += calibration.bladeWidthCompensation || 0;

    // Apply enhanced allowances
    if (calibration.allowances) {
      adjustedLength += calibration.allowances.basicCutting || 0;
      
      // Apply miter 45° extra allowance if angle is 45
      if (options.angle === 45 && calibration.allowances.miter45Extra) {
        adjustedLength += calibration.allowances.miter45Extra;
      }
      
      // Apply thermal break compensation
      if (calibration.allowances.thermalBreakCompensation) {
        adjustedLength += calibration.allowances.thermalBreakCompensation;
      }
      
      // Apply grain direction factor
      if (calibration.allowances.grainDirectionFactor) {
        adjustedLength *= calibration.allowances.grainDirectionFactor;
      }
    }

    // Apply stroke adjustments
    if (calibration.strokes) {
      adjustedLength += calibration.strokes.sawBladeThickness || 0;
      adjustedLength += calibration.strokes.machiningTolerance || 0;
      adjustedLength += calibration.strokes.cornerClearance || 0;
    }

    // Apply variations (temperature, material flexibility, assembly clearance)
    if (calibration.variations) {
      // Temperature expansion (if temperature provided)
      if (options.temperature && calibration.variations.temperatureExpansion) {
        const baseTemp = 20; // Standard temperature in Celsius
        const tempDiff = options.temperature - baseTemp;
        adjustedLength += calibration.variations.temperatureExpansion * tempDiff;
      }
      
      // Material flexibility factor
      if (calibration.variations.materialFlexibility) {
        adjustedLength *= calibration.variations.materialFlexibility;
      }
      
      // Assembly clearance
      if (calibration.variations.assemblyClearance) {
        adjustedLength += calibration.variations.assemblyClearance;
      }
    }

    return adjustedLength;
  }

  /**
   * Learn from user adjustments and suggest optimal settings
   */
  async learnFromUserAdjustments(
    originalLength: number,
    adjustedLength: number,
    calibration: CuttingCalibration
  ): Promise<CalibrationCorrectionFactor> {
    const difference = adjustedLength - originalLength;
    const correctionFactor = difference / originalLength;

    // Store test result
    const testResult: CalibrationTestResult = {
      profileId: calibration.profileId,
      systemPackId: calibration.systemPackId,
      expectedLength: originalLength,
      actualLength: adjustedLength,
      difference,
      testDate: new Date(),
    };

    await this.recordTestResult(testResult);

    // Calculate average correction factor from historical data
    const historicalResults = await this.getTestResults(
      calibration.profileId,
      calibration.systemPackId
    );

    const avgCorrection = historicalResults.length > 0
      ? historicalResults.reduce((sum, r) => sum + (r.difference / r.expectedLength), 0) / historicalResults.length
      : correctionFactor;

    return {
      profileType: calibration.profileType || 'frame',
      systemPackId: calibration.systemPackId,
      correctionFactor: avgCorrection,
      confidence: Math.min(historicalResults.length / 10, 1.0), // Confidence increases with sample size
      sampleSize: historicalResults.length,
    };
  }

  /**
   * Suggest optimal calibration settings based on profile and machine
   */
  async suggestOptimalSettings(
    profile: Profile,
    systemPackId: string,
    machineConfig?: {
      sawBladeThickness?: number;
      machineTolerance?: number;
    }
  ): Promise<Partial<CuttingCalibration>> {
    // Get historical calibrations for this profile type and system
    const _historicalCalibrations = await this.getHistoricalCalibrations(
      profile.id,
      systemPackId
    );

    // Get test results
    const testResults = await this.getTestResults(profile.id, systemPackId);

    // Calculate suggested values based on historical data
    const suggestions: Partial<CuttingCalibration> = {
      profileId: profile.id,
      systemPackId,
      profileType: profile.type as any,
      isActive: true,
    };

    // If we have test results, calculate average adjustments
    if (testResults.length > 0) {
      const avgDifference = testResults.reduce((sum, r) => sum + r.difference, 0) / testResults.length;
      
      suggestions.lengthModifier = avgDifference;
      
      // Calculate allowances based on profile type
      if (profile.type === 'frame') {
        suggestions.allowances = {
          basicCutting: profile.cuttingAllowance || 3,
          miter45Extra: 2,
          thermalBreakCompensation: 1,
          grainDirectionFactor: 1.0,
        };
      } else if (profile.type === 'sash') {
        suggestions.allowances = {
          basicCutting: profile.cuttingAllowance || 2.5,
          miter45Extra: 1.5,
          thermalBreakCompensation: 0.5,
          grainDirectionFactor: 1.0,
        };
      }
    }

    // Apply machine-specific adjustments
    if (machineConfig) {
      suggestions.strokes = {
        sawBladeThickness: machineConfig.sawBladeThickness || 2.5,
        machiningTolerance: machineConfig.machineTolerance || 0.1,
        cornerClearance: 0.5,
      };
    }

    // Apply material-specific variations
    if (profile.material === 'aluminum') {
      suggestions.variations = {
        temperatureExpansion: 0.023, // mm per °C for aluminum
        materialFlexibility: 1.0,
        assemblyClearance: 0.5,
      };
    } else if (profile.material === 'upvc') {
      suggestions.variations = {
        temperatureExpansion: 0.08, // mm per °C for UPVC
        materialFlexibility: 1.02,
        assemblyClearance: 0.3,
      };
    }

    return suggestions;
  }

  /**
   * Record a test result for calibration learning
   */
  async recordTestResult(testResult: CalibrationTestResult): Promise<void> {
    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testResult.profileId)) {
      console.warn(`Skipping recordTestResult: Invalid UUID "${testResult.profileId}"`);
      return;
    }

    try {
      // Get current calibration
      const { data: profileData } = await supabase
        .from('fabricator_profiles')
        .select('specifications')
        .eq('id', testResult.profileId)
        .single();

      if (!profileData) return;

      const specifications = profileData.specifications || {};
      const calibrations: CuttingCalibration[] = specifications.calibrations || [];

      // Find or create calibration
      let calibration = calibrations.find(
        (cal) => cal.profileId === testResult.profileId && 
                 cal.systemPackId === testResult.systemPackId
      );

      if (!calibration) {
        calibration = {
          id: `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          profileId: testResult.profileId,
          systemPackId: testResult.systemPackId,
          lengthModifier: 0,
          bladeWidthCompensation: 0,
          isActive: true,
          testResults: [],
        };
        calibrations.push(calibration);
      }

      // Add test result
      if (!calibration.testResults) {
        calibration.testResults = [];
      }
      calibration.testResults.push(testResult);

      // Update profile
      await supabase
        .from('fabricator_profiles')
        .update({
          specifications: {
            ...specifications,
            calibrations,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', testResult.profileId);
    } catch (error) {
      console.error('Error recording test result:', error);
    }
  }

  /**
   * Get test results for a profile and system pack
   */
  async getTestResults(
    profileId: string,
    systemPackId: string
  ): Promise<CalibrationTestResult[]> {
    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId)) {
      return [];
    }

    try {
      const { data: profileData } = await supabase
        .from('fabricator_profiles')
        .select('specifications')
        .eq('id', profileId)
        .single();

      if (!profileData) return [];

      const specifications = profileData.specifications || {};
      const calibrations: CuttingCalibration[] = specifications.calibrations || [];

      const calibration = calibrations.find(
        (cal) => cal.profileId === profileId && cal.systemPackId === systemPackId
      );

      return calibration?.testResults || [];
    } catch (error) {
      console.error('Error getting test results:', error);
      return [];
    }
  }

  /**
   * Get historical calibrations for learning
   */
  async getHistoricalCalibrations(
    profileId: string,
    systemPackId: string
  ): Promise<CuttingCalibration[]> {
    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId)) {
      return [];
    }

    try {
      const { data: profileData } = await supabase
        .from('fabricator_profiles')
        .select('specifications')
        .eq('id', profileId)
        .single();

      if (!profileData) return [];

      const specifications = profileData.specifications || {};
      const calibrations: CuttingCalibration[] = specifications.calibrations || [];

      return calibrations.filter(
        (cal) => cal.profileId === profileId && cal.systemPackId === systemPackId
      );
    } catch (error) {
      console.error('Error getting historical calibrations:', error);
      return [];
    }
  }

  /**
   * Detect patterns across workshops for global optimizations
   */
  async detectPatternsAcrossWorkshops(
    _profileType: string,
    _systemPackId: string
  ): Promise<CalibrationCorrectionFactor[]> {
    // This would aggregate data across all workshops (requires proper permissions)
    // For now, return empty array - can be enhanced with federated learning later
    return [];
  }
}

// Export singleton instance
export const enhancedCalibrationManager = new EnhancedCalibrationManager();

