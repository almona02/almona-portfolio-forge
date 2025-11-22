/**
 * Predictive Analytics and Demand Forecasting
 * Forecasts future demand and trends
 */

export interface Forecast {
  period: string; // e.g., "2024-01"
  predictedValue: number;
  confidence: number; // 0-100
  upperBound: number;
  lowerBound: number;
  factors: string[];
}

export interface DemandForecast {
  productType: string;
  forecasts: Forecast[];
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: number;
}

export interface TrendAnalysis {
  metric: string;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  confidence: number;
  timeframe: string;
}

export class PredictiveAnalytics {
  /**
   * Forecast demand using historical data
   */
  forecastDemand(
    historicalData: { period: string; value: number }[],
    periods: number = 6
  ): Forecast[] {
    if (historicalData.length < 3) {
      throw new Error('Insufficient historical data for forecasting');
    }

    const forecasts: Forecast[] = [];
    const values = historicalData.map((d) => d.value);

    // Simple moving average with trend
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const trend = this.calculateTrend(values);

    for (let i = 1; i <= periods; i++) {
      const predictedValue = avg + trend * i;
      const variance = this.calculateVariance(values);
      const confidence = Math.max(0, Math.min(100, 100 - variance * 10));
      const margin = variance * 1.96; // 95% confidence interval

      forecasts.push({
        period: this.getNextPeriod(historicalData[historicalData.length - 1].period, i),
        predictedValue,
        confidence,
        upperBound: predictedValue + margin,
        lowerBound: Math.max(0, predictedValue - margin),
        factors: this.identifyFactors(historicalData, trend),
      });
    }

    return forecasts;
  }

  /**
   * Analyze trends
   */
  analyzeTrend(
    metric: string,
    historicalData: { timestamp: Date; value: number }[],
    timeframe: string = '30 days'
  ): TrendAnalysis {
    if (historicalData.length < 2) {
      return {
        metric,
        currentValue: historicalData[0]?.value || 0,
        predictedValue: historicalData[0]?.value || 0,
        changePercent: 0,
        confidence: 0,
        timeframe,
      };
    }

    const values = historicalData.map((d) => d.value);
    const currentValue = values[values.length - 1];
    const trend = this.calculateTrend(values);
    const predictedValue = currentValue + trend;
    const changePercent = (trend / currentValue) * 100;
    const confidence = Math.min(100, historicalData.length * 10);

    return {
      metric,
      currentValue,
      predictedValue,
      changePercent,
      confidence,
      timeframe,
    };
  }

  /**
   * Predict production capacity needs
   */
  predictCapacityNeeds(
    currentCapacity: number,
    demandForecast: Forecast[],
    utilizationRate: number = 0.8
  ): {
    requiredCapacity: number;
    currentCapacity: number;
    capacityGap: number;
    recommendation: string;
  } {
    const avgDemand = demandForecast.reduce((sum, f) => sum + f.predictedValue, 0) / demandForecast.length;
    const requiredCapacity = avgDemand / utilizationRate;
    const capacityGap = requiredCapacity - currentCapacity;

    let recommendation: string;
    if (capacityGap > currentCapacity * 0.2) {
      recommendation = 'Consider expanding capacity significantly';
    } else if (capacityGap > 0) {
      recommendation = 'Minor capacity adjustments may be needed';
    } else if (capacityGap < -currentCapacity * 0.3) {
      recommendation = 'Excess capacity detected, consider optimization';
    } else {
      recommendation = 'Current capacity appears adequate';
    }

    return {
      requiredCapacity,
      currentCapacity,
      capacityGap,
      recommendation,
    };
  }

  /**
   * Calculate trend from values
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + v * (i + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Get next period
   */
  private getNextPeriod(currentPeriod: string, offset: number): string {
    // Assumes format "YYYY-MM"
    const [year, month] = currentPeriod.split('-').map(Number);
    const nextMonth = month + offset;
    const nextYear = year + Math.floor((nextMonth - 1) / 12);
    const finalMonth = ((nextMonth - 1) % 12) + 1;

    return `${nextYear}-${String(finalMonth).padStart(2, '0')}`;
  }

  /**
   * Identify factors affecting trend
   */
  private identifyFactors(
    historicalData: { period: string; value: number }[],
    trend: number
  ): string[] {
    const factors: string[] = [];

    if (trend > 0) {
      factors.push('Growing demand');
    } else if (trend < 0) {
      factors.push('Declining demand');
    }

    // Check for seasonality
    if (historicalData.length >= 12) {
      const seasonalPattern = this.detectSeasonality(historicalData);
      if (seasonalPattern) {
        factors.push('Seasonal patterns detected');
      }
    }

    // Check for volatility
    const values = historicalData.map((d) => d.value);
    const volatility = this.calculateVariance(values) / (values.reduce((sum, v) => sum + v, 0) / values.length);
    if (volatility > 0.2) {
      factors.push('High volatility');
    }

    return factors;
  }

  /**
   * Detect seasonality
   */
  private detectSeasonality(historicalData: { period: string; value: number }[]): boolean {
    // Simple seasonality detection
    if (historicalData.length < 12) return false;

    const monthlyValues: number[] = new Array(12).fill(0);
    const monthlyCounts: number[] = new Array(12).fill(0);

    for (const data of historicalData) {
      const month = parseInt(data.period.split('-')[1]) - 1;
      monthlyValues[month] += data.value;
      monthlyCounts[month]++;
    }

    const monthlyAverages = monthlyValues.map((v, i) => v / (monthlyCounts[i] || 1));
    const overallAverage = monthlyAverages.reduce((sum, v) => sum + v, 0) / 12;

    // Check if there's significant variation
    const variance = monthlyAverages.reduce((sum, v) => sum + Math.pow(v - overallAverage, 2), 0) / 12;
    return variance > overallAverage * 0.1;
  }
}

