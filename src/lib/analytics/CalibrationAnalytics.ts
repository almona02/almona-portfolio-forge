/**
 * Calibration Analytics Service
 * Collects and stores calibration data for machine learning and pattern recognition
 * This data will be used to train the CalibrationLearner system
 */

import { supabase } from '@/lib/supabase';

export interface CalibrationTestResult {
  profileId: string;
  userId: string;
  jointType: string;
  expectedLength: number;
  actualLength: number;
  difference: number;
  kFactor: number;
  cutAngle: number;
  profileWidth?: number;
  profileHeight?: number;
  materialThickness?: number;
  temperature?: number;
  humidity?: number;
  testDate: Date;
  workshopId?: string;
}

export interface CalibrationAdjustment {
  profileId: string;
  userId: string;
  jointType: string;
  previousKFactor: number;
  newKFactor: number;
  adjustmentReason: 'test_result' | 'manual' | 'suggestion' | 'auto_learn';
  testResultId?: string;
  success: boolean; // Whether the adjustment improved accuracy
  createdAt: Date;
}

export interface CalibrationJobResult {
  jobId: string;
  userId: string;
  profileId: string;
  jointType: string;
  kFactor: number;
  totalCuts: number;
  successfulCuts: number;
  averageAccuracy: number; // mm deviation
  jobDate: Date;
  notes?: string;
}

export interface VerificationEvent {
  userId: string;
  systemPackId: string;
  measurements: {
    width: number;
    height: number;
    windowType: string;
  };
  calculations: {
    deduction: number;
    cutLength: number;
  };
  durationSeconds: number; // Time spent on verification screen
  timestamp: Date;
}

export interface ProductionFeedback {
  windowUnitId: string;
  systemPackId: string;
  status: 'perfect' | 'adjust';
  notes?: string;
  adjustments?: {
    widthDelta?: number; // How much was it off by?
    heightDelta?: number;
  };
  timestamp: Date;
}

export class CalibrationAnalytics {
  /**
   * Record a calibration test result
   * This is called every time a user enters a test result in the CalibrationWizard
   */
  async recordTestResult(result: CalibrationTestResult): Promise<void> {
    // Validate UUID to prevent 400 errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(result.profileId)) {
      console.warn(`Skipping recordTestResult: Invalid UUID "${result.profileId}"`);
      return;
    }

    try {
      // Store in profile_calibrations test_results JSONB field
      const { data: existing } = await supabase
        .from('profile_calibrations')
        .select('test_results')
        .eq('profile_id', result.profileId)
        .eq('user_id', result.userId)
        .eq('joint_type', result.jointType)
        .single();

      const existingResults = (existing as { test_results?: any[] } | null)?.test_results || [];
      const newResult = {
        expected: result.expectedLength,
        actual: result.actualLength,
        difference: result.difference,
        date: result.testDate.toISOString(),
        kFactor: result.kFactor,
        cutAngle: result.cutAngle,
        temperature: result.temperature,
        humidity: result.humidity,
      };

      const updatedResults = [...existingResults, newResult];

      // Update or create calibration record
      const { error } = await supabase
        .from('profile_calibrations')
        .upsert({
          profile_id: result.profileId,
          user_id: result.userId,
          joint_type: result.jointType,
          k_factor: result.kFactor,
          cut_angle: result.cutAngle,
          profile_width_mm: result.profileWidth,
          profile_height_mm: result.profileHeight,
          material_thickness_mm: result.materialThickness,
          test_results: updatedResults,
          is_active: true,
        } as any, {
          onConflict: 'profile_id,user_id,joint_type',
        });

      if (error) throw error;

      // Also store in a dedicated analytics table for ML training (if it exists)
      // This allows for easier querying and analysis
      await this.storeAnalyticsRecord('test_result', {
        profile_id: result.profileId,
        user_id: result.userId,
        joint_type: result.jointType,
        expected_length: result.expectedLength,
        actual_length: result.actualLength,
        difference: result.difference,
        k_factor: result.kFactor,
        cut_angle: result.cutAngle,
        profile_width: result.profileWidth,
        profile_height: result.profileHeight,
        material_thickness: result.materialThickness,
        temperature: result.temperature,
        humidity: result.humidity,
        test_date: result.testDate.toISOString(),
        workshop_id: result.workshopId,
      });
    } catch (error) {
      console.error('Error recording test result:', error);
      // Don't throw - analytics should not break the main flow
    }
  }

  /**
   * Record a manual calibration adjustment
   * Called when user manually changes K-factor or other calibration parameters
   */
  async recordAdjustment(adjustment: CalibrationAdjustment): Promise<void> {
    try {
      await this.storeAnalyticsRecord('adjustment', {
        profile_id: adjustment.profileId,
        user_id: adjustment.userId,
        joint_type: adjustment.jointType,
        previous_k_factor: adjustment.previousKFactor,
        new_k_factor: adjustment.newKFactor,
        adjustment_reason: adjustment.adjustmentReason,
        test_result_id: adjustment.testResultId,
        success: adjustment.success,
        created_at: adjustment.createdAt.toISOString(),
      });
    } catch (error) {
      console.error('Error recording adjustment:', error);
    }
  }

  /**
   * Record job completion results
   * Called after a job is completed to track calibration effectiveness
   */
  async recordJobResult(jobResult: CalibrationJobResult): Promise<void> {
    try {
      await this.storeAnalyticsRecord('job_result', {
        job_id: jobResult.jobId,
        user_id: jobResult.userId,
        profile_id: jobResult.profileId,
        joint_type: jobResult.jointType,
        k_factor: jobResult.kFactor,
        total_cuts: jobResult.totalCuts,
        successful_cuts: jobResult.successfulCuts,
        average_accuracy: jobResult.averageAccuracy,
        job_date: jobResult.jobDate.toISOString(),
        notes: jobResult.notes,
      });
    } catch (error) {
      console.error('Error recording job result:', error);
    }
  }

  /**
   * Record user verification of calculated dimensions
   * This helps track user trust and identify potential systemic issues
   */
  async recordVerificationEvent(event: VerificationEvent): Promise<void> {
    try {
      await this.storeAnalyticsRecord('verification_gate', {
        user_id: event.userId,
        system_pack_id: event.systemPackId,
        measurements: event.measurements,
        calculations: event.calculations,
        duration_seconds: event.durationSeconds,
        timestamp: event.timestamp.toISOString(),
      });
    } catch (error) {
      console.error('Error recording verification event:', error);
    }
  }

  /**
   * Record production floor feedback from QR codes
   * This closes the loop and provides the ground truth for auto-tuning
   */
  async recordProductionFeedback(feedback: ProductionFeedback): Promise<void> {
    try {
      // 1. Store the raw feedback event
      await this.storeAnalyticsRecord('production_feedback', {
        window_unit_id: feedback.windowUnitId,
        system_pack_id: feedback.systemPackId,
        status: feedback.status,
        notes: feedback.notes,
        width_delta: feedback.adjustments?.widthDelta,
        height_delta: feedback.adjustments?.heightDelta,
        timestamp: feedback.timestamp.toISOString()
      });

      // 2. If feedback indicates adjustment needed, trigger auto-tune logic
      if (feedback.status === 'adjust' && feedback.adjustments) {
        await this.autoTuneKFactor(feedback);
      }
    } catch (error) {
      console.error('Error recording production feedback:', error);
    }
  }

  /**
   * Auto-tune K-factors based on feedback (Simulation for MVP)
   */
  private async autoTuneKFactor(feedback: ProductionFeedback): Promise<void> {
    // In a real system, this would query historical data and run a regression.
    // For MVP, we just log that we "would" update the K-factor.
    console.log(`[CalibrationLearner] Auto-tuning triggered for System Pack: ${feedback.systemPackId}`);
    
    if (feedback.adjustments?.widthDelta && Math.abs(feedback.adjustments.widthDelta) > 0) {
       console.log(`[CalibrationLearner] Suggesting Width Deduction Adjustment: ${feedback.adjustments.widthDelta > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(feedback.adjustments.widthDelta)}mm`);
       
       // Simulate recording an automated adjustment recommendation
       await this.storeAnalyticsRecord('adjustment_suggestion', {
         system_pack_id: feedback.systemPackId,
         suggested_delta: feedback.adjustments.widthDelta,
         reason: 'production_feedback_loop',
         confidence: 0.85,
         timestamp: new Date().toISOString()
       });
    }
  }

  /**
   * Store analytics record in a generic analytics table
   * This table will be used for ML training data collection
   */
  private async storeAnalyticsRecord(
    eventType: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Store in a generic calibration_analytics table
      // If the table doesn't exist yet, we'll create it in a migration
      const { error } = await supabase.from('calibration_analytics').insert({
        event_type: eventType,
        event_data: data,
        created_at: new Date().toISOString(),
      } as any);

      if (error) {
        // Table might not exist yet or access denied - that's okay
        // Only log in dev mode to reduce console noise in production
        if (import.meta.env.DEV) {
          console.warn('Calibration analytics storage failed (non-critical):', error);
        }
      }
    } catch (error) {
      // Silently fail - analytics should not break the app
      // Only log in dev mode
      if (import.meta.env.DEV) {
        console.warn('Analytics storage failed (non-critical):', error);
      }
    }
  }

  /**
   * Get calibration statistics for a profile
   * Used for displaying calibration effectiveness
   */
  async getCalibrationStats(
    profileId: string,
    userId: string,
    jointType: string
  ): Promise<{
    totalTests: number;
    averageAccuracy: number;
    confidenceScore: number;
    lastTestDate: Date | null;
  }> {
    // Validate UUID to prevent 400 errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId)) {
      return {
        totalTests: 0,
        averageAccuracy: 0,
        confidenceScore: 0,
        lastTestDate: null,
      };
    }

    try {
      const { data, error } = await supabase
        .from('profile_calibrations')
        .select('test_results, confidence_score, updated_at')
        .eq('profile_id', profileId)
        .eq('user_id', userId)
        .eq('joint_type', jointType)
        .single();

      if (error || !data) {
        return {
          totalTests: 0,
          averageAccuracy: 0,
          confidenceScore: 0,
          lastTestDate: null,
        };
      }

      const typedData = data as {
        test_results?: Array<{
          expected: number;
          actual: number;
          difference: number;
          date: string;
        }>;
        confidence_score?: number;
        updated_at?: string;
      };

      const testResults = (typedData.test_results || []) as Array<{
        expected: number;
        actual: number;
        difference: number;
        date: string;
      }>;

      const totalTests = testResults.length;
      const averageAccuracy =
        totalTests > 0
          ? testResults.reduce((sum, r) => sum + Math.abs(r.difference), 0) / totalTests
          : 0;

      return {
        totalTests,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        confidenceScore: typedData.confidence_score || 0,
        lastTestDate: typedData.updated_at ? new Date(typedData.updated_at) : null,
      };
    } catch (error) {
      console.error('Error getting calibration stats:', error);
      return {
        totalTests: 0,
        averageAccuracy: 0,
        confidenceScore: 0,
        lastTestDate: null,
      };
    }
  }

  /**
   * Get pattern data for ML training
   * Returns aggregated data for similar profiles/joints
   */
  async getPatternData(_filters: {
    profileType?: string;
    systemPackId?: string;
    jointType?: string;
    minTests?: number;
  }): Promise<any[]> {
    try {
      // This will be used by CalibrationLearner to find patterns
      // For now, return empty array - will be implemented when ML system is built
      return [];
    } catch (error) {
      console.error('Error getting pattern data:', error);
      return [];
    }
  }
}

export const calibrationAnalytics = new CalibrationAnalytics();
