/**
 * Business KPIs and Analytics Module
 * 
 * This module provides comprehensive business intelligence and KPI tracking
 * for the Almona Portfolio Forge application.
 */

export interface BusinessKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  category: 'revenue' | 'users' | 'engagement' | 'conversion' | 'performance';
  priority: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

export interface ConversionFunnel {
  stage: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface UserEngagement {
  metric: string;
  value: number;
  benchmark: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  revenueGrowth: number;
}

export interface MarketMetrics {
  marketShare: number;
  competitorAnalysis: {
    competitor: string;
    marketShare: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  regionalPerformance: {
    region: string;
    revenue: number;
    growth: number;
    marketPenetration: number;
  }[];
}

class BusinessKPIService {
  private kpis: BusinessKPI[] = [];
  private conversionFunnels: ConversionFunnel[] = [];
  private userEngagement: UserEngagement[] = [];
  private revenueMetrics: RevenueMetrics | null = null;
  private marketMetrics: MarketMetrics | null = null;

  constructor() {
    this.initializeKPIs();
    this.startRealTimeUpdates();
  }

  private initializeKPIs(): void {
    // Core Business KPIs
    this.kpis = [
      {
        id: 'monthly-revenue',
        name: 'Monthly Revenue',
        value: 125000,
        target: 150000,
        unit: 'USD',
        trend: 'up',
        changePercent: 12.5,
        category: 'revenue',
        priority: 'high',
        lastUpdated: new Date()
      },
      {
        id: 'active-users',
        name: 'Monthly Active Users',
        value: 2847,
        target: 3500,
        unit: 'users',
        trend: 'up',
        changePercent: 8.3,
        category: 'users',
        priority: 'high',
        lastUpdated: new Date()
      },
      {
        id: 'conversion-rate',
        name: 'Overall Conversion Rate',
        value: 3.2,
        target: 4.0,
        unit: '%',
        trend: 'down',
        changePercent: -2.1,
        category: 'conversion',
        priority: 'high',
        lastUpdated: new Date()
      },
      {
        id: 'avg-session-duration',
        name: 'Average Session Duration',
        value: 4.5,
        target: 5.0,
        unit: 'minutes',
        trend: 'up',
        changePercent: 5.2,
        category: 'engagement',
        priority: 'medium',
        lastUpdated: new Date()
      },
      {
        id: 'bounce-rate',
        name: 'Bounce Rate',
        value: 42.1,
        target: 35.0,
        unit: '%',
        trend: 'down',
        changePercent: -3.8,
        category: 'engagement',
        priority: 'medium',
        lastUpdated: new Date()
      },
      {
        id: 'page-load-time',
        name: 'Average Page Load Time',
        value: 2.1,
        target: 1.5,
        unit: 'seconds',
        trend: 'stable',
        changePercent: 0.5,
        category: 'performance',
        priority: 'medium',
        lastUpdated: new Date()
      },
      {
        id: 'customer-satisfaction',
        name: 'Customer Satisfaction Score',
        value: 4.3,
        target: 4.5,
        unit: '/5',
        trend: 'up',
        changePercent: 2.1,
        category: 'engagement',
        priority: 'high',
        lastUpdated: new Date()
      },
      {
        id: 'support-tickets',
        name: 'Support Tickets (Monthly)',
        value: 45,
        target: 30,
        unit: 'tickets',
        trend: 'down',
        changePercent: -8.2,
        category: 'engagement',
        priority: 'medium',
        lastUpdated: new Date()
      }
    ];

    // Conversion Funnels
    this.conversionFunnels = [
      {
        stage: 'Homepage Visit',
        visitors: 10000,
        conversions: 10000,
        conversionRate: 100,
        dropOffRate: 0
      },
      {
        stage: 'Product Browse',
        visitors: 7500,
        conversions: 7500,
        conversionRate: 75,
        dropOffRate: 25
      },
      {
        stage: 'Product View',
        visitors: 3200,
        conversions: 3200,
        conversionRate: 32,
        dropOffRate: 43
      },
      {
        stage: 'Add to Cart',
        visitors: 890,
        conversions: 890,
        conversionRate: 8.9,
        dropOffRate: 72.2
      },
      {
        stage: 'Checkout Start',
        visitors: 456,
        conversions: 456,
        conversionRate: 4.56,
        dropOffRate: 48.8
      },
      {
        stage: 'Purchase Complete',
        visitors: 320,
        conversions: 320,
        conversionRate: 3.2,
        dropOffRate: 29.8
      }
    ];

    // User Engagement Metrics
    this.userEngagement = [
      {
        metric: 'Pages per Session',
        value: 3.8,
        benchmark: 3.0,
        status: 'excellent'
      },
      {
        metric: 'Return Visitor Rate',
        value: 42.3,
        benchmark: 30.0,
        status: 'excellent'
      },
      {
        metric: 'Mobile Traffic Share',
        value: 68.5,
        benchmark: 60.0,
        status: 'excellent'
      },
      {
        metric: 'Social Media Traffic',
        value: 15.2,
        benchmark: 20.0,
        status: 'needs-improvement'
      },
      {
        metric: 'Email Campaign CTR',
        value: 2.8,
        benchmark: 3.0,
        status: 'good'
      }
    ];

    // Revenue Metrics
    this.revenueMetrics = {
      totalRevenue: 125000,
      monthlyRecurringRevenue: 45000,
      averageOrderValue: 1250,
      customerLifetimeValue: 8750,
      revenueGrowth: 12.5
    };

    // Market Metrics
    this.marketMetrics = {
      marketShare: 8.5,
      competitorAnalysis: [
        {
          competitor: 'Competitor A',
          marketShare: 15.2,
          strengths: ['Strong brand recognition', 'Wide product range'],
          weaknesses: ['Higher prices', 'Limited customization']
        },
        {
          competitor: 'Competitor B',
          marketShare: 12.8,
          strengths: ['Excellent customer service', 'Fast delivery'],
          weaknesses: ['Limited product range', 'Outdated technology']
        }
      ],
      regionalPerformance: [
        {
          region: 'Egypt',
          revenue: 75000,
          growth: 15.2,
          marketPenetration: 12.5
        },
        {
          region: 'Turkey',
          revenue: 35000,
          growth: 8.7,
          marketPenetration: 6.8
        },
        {
          region: 'EU',
          revenue: 15000,
          growth: 25.3,
          marketPenetration: 2.1
        }
      ]
    };
  }

  private startRealTimeUpdates(): void {
    // Simulate real-time updates every 30 seconds
    setInterval(() => {
      this.updateKPIs();
    }, 30000);
  }

  private updateKPIs(): void {
    // Simulate real-time data updates
    this.kpis.forEach(kpi => {
      // Add small random variations to simulate real-time changes
      const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
      kpi.value = kpi.value * (1 + variation);
      kpi.lastUpdated = new Date();
    });
  }

  // Public API Methods
  public getKPIs(): BusinessKPI[] {
    return this.kpis;
  }

  public getKPIById(id: string): BusinessKPI | undefined {
    return this.kpis.find(kpi => kpi.id === id);
  }

  public getKPIsByCategory(category: BusinessKPI['category']): BusinessKPI[] {
    return this.kpis.filter(kpi => kpi.category === category);
  }

  public getHighPriorityKPIs(): BusinessKPI[] {
    return this.kpis.filter(kpi => kpi.priority === 'high');
  }

  public getConversionFunnels(): ConversionFunnel[] {
    return this.conversionFunnels;
  }

  public getUserEngagement(): UserEngagement[] {
    return this.userEngagement;
  }

  public getRevenueMetrics(): RevenueMetrics | null {
    return this.revenueMetrics;
  }

  public getMarketMetrics(): MarketMetrics | null {
    return this.marketMetrics;
  }

  public getPerformanceAlerts(): BusinessKPI[] {
    return this.kpis.filter(kpi => {
      // Alert if KPI is significantly below target or trending down
      const belowTarget = kpi.value < (kpi.target * 0.8);
      const trendingDown = kpi.trend === 'down' && kpi.changePercent < -5;
      return belowTarget || trendingDown;
    });
  }

  public getSuccessMetrics(): BusinessKPI[] {
    return this.kpis.filter(kpi => {
      // Success if KPI is above target or trending up significantly
      const aboveTarget = kpi.value > kpi.target;
      const trendingUp = kpi.trend === 'up' && kpi.changePercent > 5;
      return aboveTarget || trendingUp;
    });
  }

  public calculateOverallHealth(): number {
    const totalKPIs = this.kpis.length;
    const healthyKPIs = this.kpis.filter(kpi => {
      const performance = (kpi.value / kpi.target) * 100;
      return performance >= 80; // 80% of target is considered healthy
    }).length;

    return Math.round((healthyKPIs / totalKPIs) * 100);
  }

  public getTrendingMetrics(): BusinessKPI[] {
    return this.kpis
      .filter(kpi => Math.abs(kpi.changePercent) > 5)
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }

  public exportKPIData(): string {
    const data = {
      kpis: this.kpis,
      conversionFunnels: this.conversionFunnels,
      userEngagement: this.userEngagement,
      revenueMetrics: this.revenueMetrics,
      marketMetrics: this.marketMetrics,
      overallHealth: this.calculateOverallHealth(),
      lastUpdated: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }
}

// Export singleton instance
export const businessKPIService = new BusinessKPIService();

// Export utility functions
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

export const getKPIStatusColor = (kpi: BusinessKPI): string => {
  const performance = (kpi.value / kpi.target) * 100;
  
  if (performance >= 100) return 'text-green-600';
  if (performance >= 80) return 'text-yellow-600';
  return 'text-red-600';
};

export const getTrendIcon = (trend: 'up' | 'down' | 'stable'): string => {
  switch (trend) {
    case 'up': return '↗';
    case 'down': return '↘';
    case 'stable': return '→';
    default: return '→';
  }
};
