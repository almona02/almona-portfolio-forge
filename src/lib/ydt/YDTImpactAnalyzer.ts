/**
 * YDT Impact Analyzer - Measures YDT ROI
 * 
 * Tracks:
 * - Margin improvement (with YDT vs without YDT)
 * - Project success rate (projects following YDT advice)
 * - Customer satisfaction
 * - Competitive wins
 */

export interface YDTMetrics {
  marginImprovement: number; // Percentage improvement
  successRate: number; // Percentage of successful projects
  customerSatisfaction: number; // Score out of 10
  competitiveWins: number; // Percentage of competitive wins
  projectsAnalyzed: number;
  totalSavings: number; // EGP
  timeSaved: number; // Hours
}

export interface YDTProjectRecord {
  projectId: string;
  workshopId: string;
  usedYDT: boolean;
  ydtRecommendations: string[];
  followedRecommendations: boolean;
  profitMargin: number;
  success: boolean;
  customerSatisfaction?: number;
  competitiveWin: boolean;
  savings: number; // EGP
  timeSaved: number; // Hours
  timestamp: string;
}

/**
 * YDT Impact Analyzer
 */
export class YDTImpactAnalyzer {
  private records: YDTProjectRecord[] = [];

  /**
   * Record project outcome
   */
  recordProject(record: YDTProjectRecord): void {
    this.records.push(record);
  }

  /**
   * Calculate YDT impact metrics
   */
  calculateMetrics(): YDTMetrics {
    const ydtProjects = this.records.filter(r => r.usedYDT);
    const nonYdtProjects = this.records.filter(r => !r.usedYDT);

    // Margin improvement
    const avgYdtMargin = ydtProjects.length > 0
      ? ydtProjects.reduce((sum, p) => sum + p.profitMargin, 0) / ydtProjects.length
      : 0;
    const avgNonYdtMargin = nonYdtProjects.length > 0
      ? nonYdtProjects.reduce((sum, p) => sum + p.profitMargin, 0) / nonYdtProjects.length
      : 0;
    const marginImprovement = avgNonYdtMargin > 0
      ? ((avgYdtMargin - avgNonYdtMargin) / avgNonYdtMargin) * 100
      : 0;

    // Success rate
    const successfulYdtProjects = ydtProjects.filter(p => p.success).length;
    const successRate = ydtProjects.length > 0
      ? (successfulYdtProjects / ydtProjects.length) * 100
      : 0;

    // Customer satisfaction
    const satisfactionScores = ydtProjects
      .filter(p => p.customerSatisfaction !== undefined)
      .map(p => p.customerSatisfaction!);
    const customerSatisfaction = satisfactionScores.length > 0
      ? satisfactionScores.reduce((sum, s) => sum + s, 0) / satisfactionScores.length
      : 0;

    // Competitive wins
    const competitiveWins = ydtProjects.filter(p => p.competitiveWin).length;
    const competitiveWinRate = ydtProjects.length > 0
      ? (competitiveWins / ydtProjects.length) * 100
      : 0;

    // Total savings
    const totalSavings = ydtProjects.reduce((sum, p) => sum + p.savings, 0);
    const timeSaved = ydtProjects.reduce((sum, p) => sum + p.timeSaved, 0);

    return {
      marginImprovement,
      successRate,
      customerSatisfaction,
      competitiveWins: competitiveWinRate,
      projectsAnalyzed: this.records.length,
      totalSavings,
      timeSaved,
    };
  }

  /**
   * Get metrics for specific workshop
   */
  getWorkshopMetrics(workshopId: string): YDTMetrics {
    const workshopRecords = this.records.filter(r => r.workshopId === workshopId);
    const originalRecords = this.records;
    this.records = workshopRecords;
    const metrics = this.calculateMetrics();
    this.records = originalRecords;
    return metrics;
  }

  /**
   * Get trend over time
   */
  getTrends(period: 'week' | 'month' | 'quarter' = 'month'): Array<{
    period: string;
    metrics: YDTMetrics;
  }> {
    // Group records by period
    const grouped: Record<string, YDTProjectRecord[]> = {};
    
    this.records.forEach(record => {
      const date = new Date(record.timestamp);
      let periodKey = '';
      
      if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = weekStart.toISOString().split('T')[0];
      } else if (period === 'month') {
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        periodKey = `${date.getFullYear()}-Q${quarter}`;
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = [];
      }
      grouped[periodKey].push(record);
    });

    // Calculate metrics for each period
    return Object.entries(grouped).map(([periodKey, records]) => {
      const originalRecords = this.records;
      this.records = records;
      const metrics = this.calculateMetrics();
      this.records = originalRecords;
      return {
        period: periodKey,
        metrics,
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
  }
}

