/**
 * Consumption Forecaster
 * Predicts material usage patterns for better inventory planning
 */

import { supabase } from '../supabase';
import type { Profile } from '@/types/fabricator';

export interface ConsumptionForecast {
  profileId: string;
  profileName: string;
  forecastPeriod: 'weekly' | 'monthly' | 'quarterly';
  predictedUsage: number; // in meters
  confidence: number; // 0-100
  historicalAverage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendations: string[];
}

export interface HistoricalUsage {
  period: string; // ISO date string
  usage: number; // meters used
  projectCount: number;
}

export class ConsumptionForecaster {
  /**
   * Forecast material consumption for a profile
   */
  async forecastConsumption(
    profileId: string,
    period: 'weekly' | 'monthly' | 'quarterly' = 'monthly',
    userId?: string
  ): Promise<ConsumptionForecast> {
    // Get historical usage data
    const historicalData = await this.getHistoricalUsage(profileId, userId);

    // Calculate forecast
    const predictedUsage = this.calculateForecast(historicalData, period);
    const historicalAverage = this.calculateAverage(historicalData);
    const trend = this.detectTrend(historicalData);
    const confidence = this.calculateConfidence(historicalData);

    // Get profile name
    const profile = await this.getProfile(profileId);
    const profileName = profile?.name || 'Unknown Profile';

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      predictedUsage,
      historicalAverage,
      trend,
      profile
    );

    return {
      profileId,
      profileName,
      forecastPeriod: period,
      predictedUsage,
      confidence,
      historicalAverage,
      trend,
      recommendations,
    };
  }

  /**
   * Get historical usage data from database
   */
  private async getHistoricalUsage(
    profileId: string,
    userId?: string,
    months: number = 12
  ): Promise<HistoricalUsage[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);

      let query = supabase
        .from('fabricator_cutting_plans')
        .select(`
          *,
          fabricator_profiles!inner(id, name)
        `)
        .eq('profile_id', profileId)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data) return [];

      // Group by period (monthly)
      const monthlyUsage = new Map<string, { usage: number; count: number }>();

      for (const plan of data) {
        const date = new Date(plan.created_at);
        const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const totalLength = plan.cuts?.reduce(
          (sum: number, cut: any) => sum + (cut.length || 0),
          0
        ) || 0;

        const usageInMeters = totalLength / 1000; // Convert mm to meters

        if (!monthlyUsage.has(periodKey)) {
          monthlyUsage.set(periodKey, { usage: 0, count: 0 });
        }

        const current = monthlyUsage.get(periodKey)!;
        current.usage += usageInMeters;
        current.count += 1;
      }

      // Convert to array
      const historical: HistoricalUsage[] = [];
      for (const [period, data] of monthlyUsage.entries()) {
        historical.push({
          period,
          usage: data.usage,
          projectCount: data.count,
        });
      }

      return historical.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      console.error('Error fetching historical usage:', error);
      return [];
    }
  }

  /**
   * Calculate forecast using simple moving average with trend
   */
  private calculateForecast(
    historical: HistoricalUsage[],
    period: 'weekly' | 'monthly' | 'quarterly'
  ): number {
    if (historical.length === 0) return 0;

    // Use last 3-6 months for forecast
    const recentData = historical.slice(-6);
    const average = this.calculateAverage(recentData);

    // Detect trend
    const trend = this.detectTrend(recentData);

    // Apply trend adjustment
    let forecast = average;
    if (trend === 'increasing' && recentData.length >= 2) {
      const growth = (recentData[recentData.length - 1].usage - recentData[0].usage) / recentData.length;
      forecast = average + growth;
    } else if (trend === 'decreasing' && recentData.length >= 2) {
      const decline = (recentData[0].usage - recentData[recentData.length - 1].usage) / recentData.length;
      forecast = average - decline;
    }

    // Adjust for period
    if (period === 'weekly') {
      forecast = forecast / 4.33; // Approximate weeks per month
    } else if (period === 'quarterly') {
      forecast = forecast * 3; // 3 months per quarter
    }

    return Math.max(forecast, 0); // Ensure non-negative
  }

  /**
   * Calculate average usage
   */
  private calculateAverage(historical: HistoricalUsage[]): number {
    if (historical.length === 0) return 0;
    const total = historical.reduce((sum, h) => sum + h.usage, 0);
    return total / historical.length;
  }

  /**
   * Detect trend in historical data
   */
  private detectTrend(historical: HistoricalUsage[]): 'increasing' | 'decreasing' | 'stable' {
    if (historical.length < 2) return 'stable';

    const firstHalf = historical.slice(0, Math.floor(historical.length / 2));
    const secondHalf = historical.slice(Math.floor(historical.length / 2));

    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate forecast confidence
   */
  private calculateConfidence(historical: HistoricalUsage[]): number {
    if (historical.length === 0) return 0;

    let confidence = 50; // Base confidence

    // More data = higher confidence
    if (historical.length >= 12) confidence += 30;
    else if (historical.length >= 6) confidence += 20;
    else if (historical.length >= 3) confidence += 10;

    // Consistent data = higher confidence
    const variance = this.calculateVariance(historical);
    if (variance < 0.1) confidence += 10; // Low variance = consistent
    else if (variance > 0.5) confidence -= 10; // High variance = less reliable

    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * Calculate variance in historical data
   */
  private calculateVariance(historical: HistoricalUsage[]): number {
    if (historical.length < 2) return 0;

    const average = this.calculateAverage(historical);
    const squaredDiffs = historical.map(h => Math.pow(h.usage - average, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / historical.length;

    return variance / (average * average); // Coefficient of variation
  }

  /**
   * Generate recommendations based on forecast
   */
  private generateRecommendations(
    predictedUsage: number,
    historicalAverage: number,
    trend: 'increasing' | 'decreasing' | 'stable',
    profile: Profile | null
  ): string[] {
    const recommendations: string[] = [];

    // Stock level recommendations
    if (trend === 'increasing') {
      recommendations.push(
        `Consider increasing stock levels by ${Math.round(((predictedUsage - historicalAverage) / historicalAverage) * 100)}% to meet growing demand`
      );
    } else if (trend === 'decreasing') {
      recommendations.push('Demand is decreasing - consider reducing stock levels to avoid overstocking');
    }

    // Safety stock recommendations
    const safetyStock = predictedUsage * 0.2; // 20% safety stock
    if (profile && profile.stockQuantity < predictedUsage + safetyStock) {
      recommendations.push(
        `Current stock (${profile.stockQuantity}m) may be insufficient. Recommended: ${Math.round(predictedUsage + safetyStock)}m`
      );
    }

    // Reorder point recommendations
    if (profile && profile.stockQuantity <= profile.minStockLevel) {
      recommendations.push('Stock is at or below minimum level - consider reordering soon');
    }

    return recommendations;
  }

  /**
   * Get profile by ID
   */
  private async getProfile(profileId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('fabricator_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) throw error;
      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }
}

// Export singleton instance
export const consumptionForecaster = new ConsumptionForecaster();

