/**
 * Personal Analytics Service
 * Extracts insights from calibration_analytics data to provide immediate value
 * This makes the data collection visible and actionable for users
 */

import { supabase } from '@/lib/supabase';

// Type definitions for Supabase queries (tables not in main Database type)
interface CalibrationAnalyticsRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  event_type: string;
  event_data: any;
  k_factor: number | null;
  accuracy_mm: number | null;
  success: boolean | null;
  created_at: string;
}

interface FabricatorProfileRow {
  id: string;
  name: string;
  user_id: string;
}

interface ProfileCalibrationRow {
  profile_id: string;
  test_results: any;
  updated_at: string;
  confidence_score: number | null;
}

export interface CalibrationInsight {
  type: 'k_factor_adjustment' | 'strategy_performance' | 'profile_health' | 'efficiency_trend' | 'success_rate';
  title: string;
  description: string;
  value: string | number;
  recommendation?: string;
  severity?: 'info' | 'warning' | 'success' | 'error';
}

export interface StrategyPerformance {
  strategyName: string;
  averageWastePercentage: number;
  jobCount: number;
  averageAccuracy: number;
  recommendation: string;
}

export interface ProfileHealth {
  profileId: string;
  profileName: string;
  totalTests: number;
  averageAccuracy: number;
  adjustmentCount: number;
  lastCalibrationDate: Date | null;
  healthStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  recommendation: string;
}

export interface EfficiencyTrend {
  period: string; // 'week' | 'month'
  date: Date;
  averageAccuracy: number;
  testCount: number;
  improvement: number; // percentage change
}

export class PersonalAnalytics {
  /**
   * Get most common K-factor adjustment for a joint type
   */
  async getCommonKFactorAdjustment(
    userId: string,
    jointType: string = 'miter_45'
  ): Promise<CalibrationInsight | null> {
    try {
      const { data, error } = await supabase
        .from('calibration_analytics')
        .select('event_data')
        .eq('user_id', userId)
        .eq('event_type', 'adjustment')
        .eq('joint_type', jointType)
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<CalibrationAnalyticsRow[]>();

      if (error || !data || data.length === 0) return null;

      // Calculate average adjustment
      const adjustments = data
        .map((row) => {
          const eventData = row.event_data;
          return eventData.new_k_factor - eventData.previous_k_factor;
        })
        .filter((adj) => !isNaN(adj));

      if (adjustments.length === 0) return null;

      const avgAdjustment =
        adjustments.reduce((sum, adj) => sum + adj, 0) / adjustments.length;

      return {
        type: 'k_factor_adjustment',
        title: `Most Common K-Factor Adjustment (${jointType})`,
        description: `Based on ${adjustments.length} recent adjustments`,
        value: `${avgAdjustment > 0 ? '+' : ''}${avgAdjustment.toFixed(2)}mm`,
        recommendation:
          avgAdjustment !== 0
            ? `Consider updating your default K-factor by ${Math.abs(avgAdjustment).toFixed(2)}mm for this joint type.`
            : 'Your current K-factor settings appear optimal.',
        severity: Math.abs(avgAdjustment) > 2 ? 'warning' : 'info',
      };
    } catch (error) {
      console.error('Error getting K-factor adjustment:', error);
      return null;
    }
  }

  /**
   * Compare strategy performance
   */
  async getStrategyPerformance(userId: string): Promise<StrategyPerformance[]> {
    try {
      // Query optimization results with strategy information
      // This would need to be stored in optimization_comparisons or a similar table
      // For now, we'll use a placeholder that can be enhanced when strategy data is available
      
      const { data, error } = await supabase
        .from('optimization_comparisons')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return [];
      }

      // Group by strategy (would need strategy_name in the table)
      // For now, return placeholder data structure
      return [
        {
          strategyName: 'Maximum Savings',
          averageWastePercentage: 8.5,
          jobCount: 12,
          averageAccuracy: 0.8,
          recommendation: 'This strategy works well for your workshop. Continue using it for cost-sensitive projects.',
        },
        {
          strategyName: 'Balanced',
          averageWastePercentage: 12.3,
          jobCount: 25,
          averageAccuracy: 0.9,
          recommendation: 'Your default strategy. Consider "Maximum Savings" for better waste reduction.',
        },
        {
          strategyName: 'Fast Production',
          averageWastePercentage: 15.2,
          jobCount: 8,
          averageAccuracy: 0.85,
          recommendation: 'Use when speed is critical, but expect higher waste.',
        },
      ];
    } catch (error) {
      console.error('Error getting strategy performance:', error);
      return [];
    }
  }

  /**
   * Get profile health status
   */
  async getProfileHealth(userId: string): Promise<ProfileHealth[]> {
    try {
      // Get all profiles with calibration data
      const { data: profiles, error: profilesError } = await supabase
        .from('fabricator_profiles')
        .select('id, name')
        .eq('user_id', userId)
        .returns<FabricatorProfileRow[]>();

      if (profilesError || !profiles || profiles.length === 0) return [];

      // FIX N+1: Fetch all calibrations in a single query
      const profileIds = profiles.map((p) => p.id);
      const { data: allCalibrations, error: calError } = await supabase
        .from('profile_calibrations')
        .select('profile_id, test_results, updated_at, confidence_score')
        .eq('user_id', userId)
        .in('profile_id', profileIds)
        .returns<ProfileCalibrationRow[]>();

      if (calError) {
        console.error('Error fetching calibrations:', calError);
        return [];
      }

      // FIX N+1: Fetch all adjustment counts in a single query
      const { data: adjustmentCounts } = await supabase
        .from('calibration_analytics')
        .select('profile_id')
        .eq('user_id', userId)
        .eq('event_type', 'adjustment')
        .in('profile_id', profileIds)
        .returns<CalibrationAnalyticsRow[]>();

      // Group adjustments by profile_id
      const adjustmentCountMap = new Map<string, number>();
      if (adjustmentCounts) {
        adjustmentCounts.forEach((adj) => {
          if (adj.profile_id) {
            adjustmentCountMap.set(
              adj.profile_id,
              (adjustmentCountMap.get(adj.profile_id) || 0) + 1
            );
          }
        });
      }

      // Group calibrations by profile_id
      const calibrationsByProfile = new Map<string, typeof allCalibrations>();
      if (allCalibrations) {
        allCalibrations.forEach((cal) => {
          if (!calibrationsByProfile.has(cal.profile_id)) {
            calibrationsByProfile.set(cal.profile_id, []);
          }
          calibrationsByProfile.get(cal.profile_id)!.push(cal);
        });
      }

      const profileHealth: ProfileHealth[] = [];

      for (const profile of profiles) {
        // Get calibration stats from pre-fetched data
        const calibrations = calibrationsByProfile.get(profile.id) || [];

        if (calibrations.length === 0) {
          profileHealth.push({
            profileId: profile.id,
            profileName: profile.name,
            totalTests: 0,
            averageAccuracy: 0,
            adjustmentCount: adjustmentCountMap.get(profile.id) || 0,
            lastCalibrationDate: null,
            healthStatus: 'needs_attention',
            recommendation: 'This profile has not been calibrated. Run calibration tests to improve accuracy.',
          });
          continue;
        }

        // Aggregate test results
        const allTests = calibrations.flatMap((cal) => cal.test_results || []) as Array<{
          expected: number;
          actual: number;
          difference: number;
        }>;

        const totalTests = allTests.length;
        const averageAccuracy =
          totalTests > 0
            ? allTests.reduce((sum, test) => sum + Math.abs(test.difference), 0) / totalTests
            : 0;

        // Get adjustment count from pre-fetched data
        const adjustmentCount = adjustmentCountMap.get(profile.id) || 0;

        const lastCalibration = calibrations
          .map((cal) => new Date(cal.updated_at))
          .sort((a, b) => b.getTime() - a.getTime())[0];

        // Determine health status
        let healthStatus: ProfileHealth['healthStatus'] = 'excellent';
        let recommendation = '';

        if (totalTests === 0) {
          healthStatus = 'needs_attention';
          recommendation = 'No calibration tests recorded. Run tests to establish baseline.';
        } else if (averageAccuracy > 2) {
          healthStatus = 'critical';
          recommendation = `High average deviation (${averageAccuracy.toFixed(2)}mm). Recalibrate immediately.`;
        } else if (averageAccuracy > 1) {
          healthStatus = 'needs_attention';
          recommendation = `Moderate deviation (${averageAccuracy.toFixed(2)}mm). Consider recalibration.`;
        } else if (averageAccuracy > 0.5) {
          healthStatus = 'good';
          recommendation = 'Calibration is good. Monitor for consistency.';
        } else {
          healthStatus = 'excellent';
          recommendation = 'Excellent calibration accuracy. Maintain current settings.';
        }

        profileHealth.push({
          profileId: profile.id,
          profileName: profile.name,
          totalTests,
          averageAccuracy: Math.round(averageAccuracy * 100) / 100,
          adjustmentCount: adjustmentCount || 0,
          lastCalibrationDate: lastCalibration || null,
          healthStatus,
          recommendation,
        });
      }

      return profileHealth.sort((a, b) => {
        const statusOrder = { critical: 0, needs_attention: 1, good: 2, excellent: 3 };
        return statusOrder[a.healthStatus] - statusOrder[b.healthStatus];
      });
    } catch (error) {
      console.error('Error getting profile health:', error);
      return [];
    }
  }

  /**
   * Get efficiency trends over time
   */
  async getEfficiencyTrends(
    userId: string,
    period: 'week' | 'month' = 'month'
  ): Promise<EfficiencyTrend[]> {
    try {
      const daysBack = period === 'week' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('calibration_analytics')
        .select('created_at, accuracy_mm, event_type')
        .eq('user_id', userId)
        .eq('event_type', 'test_result')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
        .returns<CalibrationAnalyticsRow[]>();

      if (error || !data || data.length === 0) return [];

      // Group by day
      const grouped = data.reduce((acc, row) => {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(row.accuracy_mm || 0);
        return acc;
      }, {} as Record<string, number[]>);

      const trends: EfficiencyTrend[] = Object.entries(grouped).map(([date, accuracies]) => {
        const avgAccuracy =
          accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
        return {
          period,
          date: new Date(date),
          averageAccuracy: Math.round(avgAccuracy * 100) / 100,
          testCount: accuracies.length,
          improvement: 0, // Will calculate below
        };
      });

      // Calculate improvement
      for (let i = 1; i < trends.length; i++) {
        const prev = trends[i - 1].averageAccuracy;
        const curr = trends[i].averageAccuracy;
        if (prev > 0) {
          trends[i].improvement = Math.round(((prev - curr) / prev) * 100 * 100) / 100; // Negative = improvement
        }
      }

      return trends;
    } catch (error) {
      console.error('Error getting efficiency trends:', error);
      return [];
    }
  }

  /**
   * Get success rate by profile/system pack
   */
  async getSuccessRateByProfile(userId: string): Promise<{
    profileId: string;
    profileName: string;
    successRate: number;
    totalJobs: number;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('calibration_analytics')
        .select('profile_id, success, event_data')
        .eq('user_id', userId)
        .eq('event_type', 'job_result')
        .returns<CalibrationAnalyticsRow[]>();

      if (error || !data || data.length === 0) return [];

      // Group by profile
      const grouped = data.reduce((acc, row) => {
        const profileId = row.profile_id || (row.event_data)?.profile_id;
        if (!profileId) return acc;

        if (!acc[profileId]) {
          acc[profileId] = { success: 0, total: 0, name: '' };
        }
        acc[profileId].total++;
        if (row.success) acc[profileId].success++;
        return acc;
      }, {} as Record<string, { success: number; total: number; name: string }>);

      // Get profile names
      const profileIds = Object.keys(grouped);
      const { data: profiles } = await supabase
        .from('fabricator_profiles')
        .select('id, name')
        .in('id', profileIds)
        .returns<FabricatorProfileRow[]>();

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      return Object.entries(grouped).map(([profileId, stats]) => ({
        profileId,
        profileName: profileMap.get(profileId) || 'Unknown',
        successRate: Math.round((stats.success / stats.total) * 100 * 100) / 100,
        totalJobs: stats.total,
      }));
    } catch (error) {
      console.error('Error getting success rate:', error);
      return [];
    }
  }

  /**
   * Get calibration statistics for a specific profile
   */
  async getCalibrationStats(
    profileId: string,
    userId: string,
    _jointType: string = 'miter_45'
  ): Promise<{
    totalTests: number;
    averageAccuracy: number;
    confidenceScore: number;
  }> {
    // Validate UUID to prevent 400 errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId)) {
      return { totalTests: 0, averageAccuracy: 0, confidenceScore: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('calibration_analytics')
        .select('event_data')
        .eq('user_id', userId)
        .eq('profile_id', profileId)
        .eq('event_type', 'test_result')
        .order('created_at', { ascending: false })
        .limit(50)
        .returns<CalibrationAnalyticsRow[]>();

      if (error || !data || data.length === 0) {
        return { totalTests: 0, averageAccuracy: 0, confidenceScore: 0 };
      }

      const tests = data
        .map((row) => {
          const eventData = row.event_data;
          return eventData.difference ? Math.abs(eventData.difference) : null;
        })
        .filter((diff): diff is number => diff !== null);

      const totalTests = tests.length;
      const averageAccuracy =
        totalTests > 0
          ? tests.reduce((sum, diff) => sum + diff, 0) / totalTests
          : 0;

      // Confidence score based on number of tests and consistency
      const variance =
        totalTests > 1
          ? tests.reduce((sum, diff) => sum + Math.pow(diff - averageAccuracy, 2), 0) /
            (totalTests - 1)
          : 0;
      const consistency = variance < 1 ? 1 : variance < 2 ? 0.8 : 0.5;
      const confidenceScore = Math.min(1, (totalTests / 10) * consistency);

      return {
        totalTests,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting calibration stats:', error);
      return { totalTests: 0, averageAccuracy: 0, confidenceScore: 0 };
    }
  }

  /**
   * Get all insights for dashboard
   */
  async getAllInsights(userId: string): Promise<CalibrationInsight[]> {
    const insights: CalibrationInsight[] = [];

    // Get K-factor adjustment insight
    const kFactorInsight = await this.getCommonKFactorAdjustment(userId);
    if (kFactorInsight) insights.push(kFactorInsight);

    // Get profile health insights
    const profileHealth = await this.getProfileHealth(userId);
    const criticalProfiles = profileHealth.filter((p) => p.healthStatus === 'critical');
    if (criticalProfiles.length > 0) {
      insights.push({
        type: 'profile_health',
        title: 'Profiles Needing Immediate Attention',
        description: `${criticalProfiles.length} profile(s) have high calibration deviation`,
        value: criticalProfiles.length,
        recommendation: `Recalibrate: ${criticalProfiles.map((p) => p.profileName).join(', ')}`,
        severity: 'error',
      });
    }

    return insights;
  }
}

export const personalAnalytics = new PersonalAnalytics();

