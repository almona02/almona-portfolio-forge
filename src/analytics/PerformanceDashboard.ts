/**
 * Real-time KPI Dashboard
 * Tracks key performance indicators
 */

import { OptimizationResult } from '@/types/fabricator';

export interface KPI {
  id: string;
  name: string;
  value: number;
  unit: string;
  target?: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  category: 'production' | 'quality' | 'cost' | 'efficiency';
}

export interface Dashboard {
  id: string;
  name: string;
  kpis: KPI[];
  lastUpdated: Date;
}

export class PerformanceDashboard {
  private dashboards: Map<string, Dashboard> = new Map();
  private kpiHistory: Map<string, { timestamp: Date; value: number }[]> = new Map();

  /**
   * Create dashboard
   */
  createDashboard(name: string, dashboardId?: string): Dashboard {
    const dashboard: Dashboard = {
      id: dashboardId || `dashboard_${Date.now()}`,
      name,
      kpis: [],
      lastUpdated: new Date(),
    };

    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  /**
   * Add KPI to dashboard
   */
  addKPI(dashboardId: string, kpi: KPI): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) throw new Error(`Dashboard ${dashboardId} not found`);

    dashboard.kpis.push(kpi);
    dashboard.lastUpdated = new Date();

    // Store KPI history
    const history = this.kpiHistory.get(kpi.id) || [];
    history.push({ timestamp: new Date(), value: kpi.value });
    this.kpiHistory.set(kpi.id, history);
  }

  /**
   * Update KPI value
   */
  updateKPI(kpiId: string, value: number): void {
    // Find KPI in all dashboards
    for (const dashboard of this.dashboards.values()) {
      const kpi = dashboard.kpis.find((k) => k.id === kpiId);
      if (kpi) {
        const history = this.kpiHistory.get(kpiId) || [];
        const previousValue = history.length > 0 ? history[history.length - 1].value : kpi.value;

        kpi.value = value;
        kpi.changePercent = previousValue !== 0
          ? ((value - previousValue) / previousValue) * 100
          : 0;
        kpi.trend = value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable';

        // Update history
        history.push({ timestamp: new Date(), value });
        this.kpiHistory.set(kpiId, history);

        dashboard.lastUpdated = new Date();
        break;
      }
    }
  }

  /**
   * Get dashboard
   */
  getDashboard(dashboardId: string): Dashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Calculate KPIs from optimization results
   */
  calculateKPIsFromOptimization(optimization: OptimizationResult): KPI[] {
    return [
      {
        id: 'material_efficiency',
        name: 'Material Efficiency',
        value: 100 - optimization.wastePercentage,
        unit: '%',
        target: 90,
        trend: optimization.wastePercentage < 10 ? 'up' : 'down',
        changePercent: 0,
        category: 'efficiency',
      },
      {
        id: 'nesting_efficiency',
        name: 'Nesting Efficiency',
        value: optimization.nestingEfficiency,
        unit: '%',
        target: 95,
        trend: optimization.nestingEfficiency >= 95 ? 'up' : 'stable',
        changePercent: 0,
        category: 'efficiency',
      },
      {
        id: 'production_time',
        name: 'Production Time',
        value: optimization.estimatedProductionTime,
        unit: 'hours',
        target: 8,
        trend: optimization.estimatedProductionTime <= 8 ? 'down' : 'up',
        changePercent: 0,
        category: 'production',
      },
      {
        id: 'material_cost',
        name: 'Material Cost',
        value: optimization.costBreakdown.materialCost,
        unit: 'EUR',
        target: optimization.costBreakdown.materialCost * 0.9,
        trend: 'stable',
        changePercent: 0,
        category: 'cost',
      },
      {
        id: 'total_cost',
        name: 'Total Cost',
        value: optimization.costBreakdown.totalCost,
        unit: 'EUR',
        trend: 'stable',
        changePercent: 0,
        category: 'cost',
      },
    ];
  }

  /**
   * Get KPI history
   */
  getKPIHistory(kpiId: string, days: number = 7): { timestamp: Date; value: number }[] {
    const history = this.kpiHistory.get(kpiId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return history.filter((h) => h.timestamp >= cutoffDate);
  }

  /**
   * Get KPI trends
   */
  getKPITrends(kpiId: string): {
    current: number;
    average: number;
    min: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const history = this.kpiHistory.get(kpiId) || [];

    if (history.length === 0) {
      return {
        current: 0,
        average: 0,
        min: 0,
        max: 0,
        trend: 'stable',
      };
    }

    const values = history.map((h) => h.value);
    const current = values[values.length - 1];
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const recentValues = values.slice(-5);
    const olderValues = values.slice(0, -5);
    const recentAvg = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length;
    const olderAvg = olderValues.length > 0
      ? olderValues.reduce((sum, v) => sum + v, 0) / olderValues.length
      : recentAvg;

    const trend: 'up' | 'down' | 'stable' =
      recentAvg > olderAvg * 1.05 ? 'up' : recentAvg < olderAvg * 0.95 ? 'down' : 'stable';

    return {
      current,
      average,
      min,
      max,
      trend,
    };
  }
}

