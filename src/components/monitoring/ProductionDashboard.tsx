import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Smartphone,
  Monitor,
  Bot,
  Settings,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  MapPin
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { performanceMonitor } from '@/lib/performance-monitoring';
import { toast } from 'sonner';

// Production KPI Interfaces
interface BusinessKPI {
  metric: string;
  value: number;
  previousValue: number;
  change: number;
  changePercent: number;
  target?: number;
  unit: string;
  category: 'revenue' | 'users' | 'engagement' | 'performance' | 'growth';
  trend: 'up' | 'down' | 'stable';
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface UserEngagementMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  sessionDuration: number;
  pageViews: number;
  bounceRate: number;
  conversionRate: number;
  featureUsage: Record<string, number>;
}

interface RevenueMetrics {
  totalRevenue: number;
  recurringRevenue: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  churnRate: number;
  monthlyGrowthRate: number;
  revenueByRegion: Record<string, number>;
  revenueByProduct: Record<string, number>;
}

interface TechnicalMetrics {
  uptime: number;
  responseTime: number;
  errorRate: number;
  coreWebVitals: {
    fcp: number;
    lcp: number;
    fid: number;
    cls: number;
  };
  apiPerformance: {
    averageResponseTime: number;
    successRate: number;
    throughput: number;
  };
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

interface MarketExpansionMetrics {
  regionData: Array<{
    region: string;
    users: number;
    revenue: number;
    growth: number;
    marketPenetration: number;
  }>;
  languageUsage: Record<string, number>;
  deviceTypes: Record<string, number>;
  conversionByRegion: Record<string, number>;
}

// Real-time Production Dashboard
export const ProductionDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<BusinessKPI[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserEngagementMetrics | null>(null);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [technicalMetrics, setTechnicalMetrics] = useState<TechnicalMetrics | null>(null);
  const [marketMetrics, setMarketMetrics] = useState<MarketExpansionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch production metrics
  const fetchProductionMetrics = async () => {
    setLoading(true);
    try {
      // Simulate fetching comprehensive metrics (in production, these would come from your analytics service)
      const mockKPIs: BusinessKPI[] = [
        {
          metric: 'Total Revenue',
          value: 485000,
          previousValue: 420000,
          change: 65000,
          changePercent: 15.5,
          target: 500000,
          unit: 'EGP',
          category: 'revenue',
          trend: 'up',
          status: 'excellent'
        },
        {
          metric: 'Active Users',
          value: 12847,
          previousValue: 11200,
          change: 1647,
          changePercent: 14.7,
          target: 15000,
          unit: 'users',
          category: 'users',
          trend: 'up',
          status: 'good'
        },
        {
          metric: 'Feature Adoption',
          value: 78.5,
          previousValue: 65.2,
          change: 13.3,
          changePercent: 20.4,
          target: 85.0,
          unit: '%',
          category: 'engagement',
          trend: 'up',
          status: 'good'
        },
        {
          metric: 'System Uptime',
          value: 99.97,
          previousValue: 99.95,
          change: 0.02,
          changePercent: 0.02,
          target: 99.99,
          unit: '%',
          category: 'performance',
          trend: 'up',
          status: 'excellent'
        },
        {
          metric: 'AI Chatbot Resolution',
          value: 87.3,
          previousValue: 82.1,
          change: 5.2,
          changePercent: 6.3,
          target: 90.0,
          unit: '%',
          category: 'engagement',
          trend: 'up',
          status: 'good'
        },
        {
          metric: 'Mobile Conversion',
          value: 23.8,
          previousValue: 19.4,
          change: 4.4,
          changePercent: 22.7,
          target: 25.0,
          unit: '%',
          category: 'engagement',
          trend: 'up',
          status: 'good'
        }
      ];

      const mockUserMetrics: UserEngagementMetrics = {
        totalUsers: 15420,
        activeUsers: 12847,
        newUsers: 2573,
        returningUsers: 10274,
        sessionDuration: 847,
        pageViews: 89340,
        bounceRate: 23.4,
        conversionRate: 12.8,
        featureUsage: {
          'Customer Portal': 89.3,
          'AI Chatbot': 67.2,
          'Mobile PWA': 45.1,
          'IoT Dashboard': 34.7,
          'Predictive Maintenance': 28.9
        }
      };

      const mockRevenueMetrics: RevenueMetrics = {
        totalRevenue: 485000,
        recurringRevenue: 320000,
        averageOrderValue: 15600,
        customerLifetimeValue: 89400,
        churnRate: 4.2,
        monthlyGrowthRate: 15.5,
        revenueByRegion: {
          'Egypt': 285000,
          'Turkey': 125000,
          'UAE': 45000,
          'Saudi Arabia': 30000
        },
        revenueByProduct: {
          'YILMAZ Machines': 180000,
          'Spare Parts': 95000,
          'Service Packages': 120000,
          'Training Programs': 35000,
          'IoT Monitoring': 55000
        }
      };

      const mockTechnicalMetrics: TechnicalMetrics = {
        uptime: 99.97,
        responseTime: 245,
        errorRate: 0.18,
        coreWebVitals: {
          fcp: 1.2,
          lcp: 2.1,
          fid: 85,
          cls: 0.08
        },
        apiPerformance: {
          averageResponseTime: 180,
          successRate: 99.82,
          throughput: 1247
        },
        systemHealth: {
          cpuUsage: 34.2,
          memoryUsage: 67.8,
          diskUsage: 45.3
        }
      };

      const mockMarketMetrics: MarketExpansionMetrics = {
        regionData: [
          { region: 'Egypt', users: 7890, revenue: 285000, growth: 12.3, marketPenetration: 15.2 },
          { region: 'Turkey', users: 3240, revenue: 125000, growth: 28.7, marketPenetration: 8.1 },
          { region: 'UAE', users: 980, revenue: 45000, growth: 45.2, marketPenetration: 3.4 },
          { region: 'Saudi Arabia', users: 720, revenue: 30000, growth: 67.3, marketPenetration: 2.1 }
        ],
        languageUsage: {
          'Arabic': 62.4,
          'English': 31.8,
          'Turkish': 5.8
        },
        deviceTypes: {
          'Desktop': 48.2,
          'Mobile': 38.7,
          'Tablet': 13.1
        },
        conversionByRegion: {
          'Egypt': 14.2,
          'Turkey': 18.7,
          'UAE': 22.1,
          'Saudi Arabia': 19.8
        }
      };

      // Real metrics would be fetched from your analytics service
      setKpis(mockKPIs);
      setUserMetrics(mockUserMetrics);
      setRevenueMetrics(mockRevenueMetrics);
      setTechnicalMetrics(mockTechnicalMetrics);
      setMarketMetrics(mockMarketMetrics);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Failed to fetch production metrics:', error);
      toast.error('Failed to load production metrics');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh setup
  useEffect(() => {
    fetchProductionMetrics();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchProductionMetrics, 300000); // 5 minutes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedTimeframe]);

  // Track dashboard usage
  useEffect(() => {
    performanceMonitor.recordFeatureUsage('production_dashboard', 'viewed', true, {
      timeframe: selectedTimeframe
    });
  }, [selectedTimeframe]);

  const getKPIIcon = (category: string) => {
    switch (category) {
      case 'revenue': return <DollarSign className="h-5 w-5" />;
      case 'users': return <Users className="h-5 w-5" />;
      case 'engagement': return <Activity className="h-5 w-5" />;
      case 'performance': return <Zap className="h-5 w-5" />;
      case 'growth': return <TrendingUp className="h-5 w-5" />;
      default: return <BarChart3 className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = (trend: string, changePercent: number) => {
    if (trend === 'up') {
      return <TrendingUp className={`h-4 w-4 ${changePercent > 10 ? 'text-green-400' : 'text-blue-400'}`} />;
    } else if (trend === 'down') {
      return <TrendingDown className={`h-4 w-4 ${changePercent > 10 ? 'text-red-400' : 'text-yellow-400'}`} />;
    }
    return <span className="h-4 w-4 text-gray-400">—</span>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(num);
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Production Dashboard</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-almona-orange"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-almona-dark/40 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-almona-dark min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-almona-orange">Production Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Real-time business metrics and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="h-4 w-4" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`border-almona-light/30 ${autoRefresh ? 'bg-almona-orange/20 text-almona-orange' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </Button>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="bg-almona-dark border border-almona-light/30 rounded-md px-3 py-2 text-sm"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.metric}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-almona-dark/60 border-almona-light/20 hover:border-almona-orange/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={getStatusColor(kpi.status)}>
                      {getKPIIcon(kpi.category)}
                    </div>
                    <CardTitle className="text-sm font-medium">{kpi.metric}</CardTitle>
                  </div>
                  {getTrendIcon(kpi.trend, kpi.changePercent)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {kpi.unit === 'EGP' ? formatCurrency(kpi.value) :
                     kpi.unit === '%' ? formatPercent(kpi.value) :
                     formatNumber(kpi.value)}
                  </span>
                  {kpi.unit !== 'EGP' && kpi.unit !== '%' && (
                    <span className="text-sm text-gray-400">{kpi.unit}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-1 ${
                    kpi.changePercent > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {kpi.changePercent > 0 ? '+' : ''}{formatPercent(kpi.changePercent)}
                  </span>
                  <span className="text-gray-500">vs previous period</span>
                </div>

                {kpi.target && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progress to target</span>
                      <span>{formatPercent((kpi.value / kpi.target) * 100)}</span>
                    </div>
                    <Progress 
                      value={(kpi.value / kpi.target) * 100} 
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-almona-dark/80">
          <TabsTrigger value="users">User Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="technical">Technical Health</TabsTrigger>
          <TabsTrigger value="expansion">Market Expansion</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-6">
          {userMetrics && (
            <>
              {/* User Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 mx-auto mb-2 text-blue-400" />
                    <div className="text-2xl font-bold">{formatNumber(userMetrics.totalUsers)}</div>
                    <div className="text-sm text-gray-400">Total Users</div>
                  </CardContent>
                </Card>
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <Activity className="h-6 w-6 mx-auto mb-2 text-green-400" />
                    <div className="text-2xl font-bold">{formatNumber(userMetrics.activeUsers)}</div>
                    <div className="text-sm text-gray-400">Active Users</div>
                  </CardContent>
                </Card>
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
                    <div className="text-2xl font-bold">{Math.round(userMetrics.sessionDuration / 60)}m</div>
                    <div className="text-sm text-gray-400">Avg Session</div>
                  </CardContent>
                </Card>
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <Target className="h-6 w-6 mx-auto mb-2 text-almona-orange" />
                    <div className="text-2xl font-bold">{formatPercent(userMetrics.conversionRate)}</div>
                    <div className="text-sm text-gray-400">Conversion Rate</div>
                  </CardContent>
                </Card>
              </div>

              {/* Feature Usage */}
              <Card className="bg-almona-dark/60 border-almona-light/20">
                <CardHeader>
                  <CardTitle>Feature Usage Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(userMetrics.featureUsage).map(([feature, usage]) => (
                      <div key={feature}>
                        <div className="flex justify-between text-sm mb-2">
                          <span>{feature}</span>
                          <span>{formatPercent(usage)} adoption</span>
                        </div>
                        <Progress value={usage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6 mt-6">
          {revenueMetrics && (
            <>
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle>Revenue by Region</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(revenueMetrics.revenueByRegion).map(([region, revenue]) => {
                        const percentage = (revenue / revenueMetrics.totalRevenue) * 100;
                        return (
                          <div key={region} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {region}
                              </span>
                              <span className="font-medium">{formatCurrency(revenue)}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle>Revenue by Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(revenueMetrics.revenueByProduct).map(([product, revenue]) => {
                        const percentage = (revenue / revenueMetrics.totalRevenue) * 100;
                        return (
                          <div key={product} className="space-y-2">
                            <div className="flex justify-between">
                              <span>{product}</span>
                              <span className="font-medium">{formatCurrency(revenue)}</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-green-400">
                      {formatCurrency(revenueMetrics.averageOrderValue)}
                    </div>
                    <div className="text-sm text-gray-400">Average Order Value</div>
                  </CardContent>
                </Card>
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-blue-400">
                      {formatCurrency(revenueMetrics.customerLifetimeValue)}
                    </div>
                    <div className="text-sm text-gray-400">Customer LTV</div>
                  </CardContent>
                </Card>
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-almona-orange">
                      {formatPercent(revenueMetrics.monthlyGrowthRate)}
                    </div>
                    <div className="text-sm text-gray-400">Monthly Growth</div>
                  </CardContent>
                </Card>
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-xl font-bold text-yellow-400">
                      {formatPercent(revenueMetrics.churnRate)}
                    </div>
                    <div className="text-sm text-gray-400">Churn Rate</div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="technical" className="space-y-6 mt-6">
          {technicalMetrics && (
            <>
              {/* System Health */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      System Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>CPU Usage</span>
                          <span>{formatPercent(technicalMetrics.systemHealth.cpuUsage)}</span>
                        </div>
                        <Progress value={technicalMetrics.systemHealth.cpuUsage} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Memory Usage</span>
                          <span>{formatPercent(technicalMetrics.systemHealth.memoryUsage)}</span>
                        </div>
                        <Progress value={technicalMetrics.systemHealth.memoryUsage} className="h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Disk Usage</span>
                          <span>{formatPercent(technicalMetrics.systemHealth.diskUsage)}</span>
                        </div>
                        <Progress value={technicalMetrics.systemHealth.diskUsage} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Uptime</span>
                        <span className="font-medium text-green-400">{formatPercent(technicalMetrics.uptime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Response Time</span>
                        <span className="font-medium">{technicalMetrics.responseTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Error Rate</span>
                        <span className="font-medium text-red-400">{formatPercent(technicalMetrics.errorRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">API Success Rate</span>
                        <span className="font-medium text-green-400">{formatPercent(technicalMetrics.apiPerformance.successRate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-blue-400" />
                      Core Web Vitals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">FCP</span>
                        <span className={`font-medium ${technicalMetrics.coreWebVitals.fcp <= 1.8 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {technicalMetrics.coreWebVitals.fcp}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">LCP</span>
                        <span className={`font-medium ${technicalMetrics.coreWebVitals.lcp <= 2.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {technicalMetrics.coreWebVitals.lcp}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">FID</span>
                        <span className={`font-medium ${technicalMetrics.coreWebVitals.fid <= 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {technicalMetrics.coreWebVitals.fid}ms
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">CLS</span>
                        <span className={`font-medium ${technicalMetrics.coreWebVitals.cls <= 0.1 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {technicalMetrics.coreWebVitals.cls}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="expansion" className="space-y-6 mt-6">
          {marketMetrics && (
            <>
              {/* Regional Performance */}
              <Card className="bg-almona-dark/60 border-almona-light/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-almona-orange" />
                    Regional Market Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {marketMetrics.regionData.map((region) => (
                      <div key={region.region} className="p-4 border border-almona-light/20 rounded-lg">
                        <h4 className="font-medium mb-3">{region.region}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Users</span>
                            <span>{formatNumber(region.users)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Revenue</span>
                            <span>{formatCurrency(region.revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Growth</span>
                            <span className="text-green-400">+{formatPercent(region.growth)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Penetration</span>
                            <span>{formatPercent(region.marketPenetration)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Usage Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle>Language Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(marketMetrics.languageUsage).map(([language, usage]) => (
                        <div key={language}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{language}</span>
                            <span>{formatPercent(usage)}</span>
                          </div>
                          <Progress value={usage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle>Device Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(marketMetrics.deviceTypes).map(([device, usage]) => (
                        <div key={device}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              {device === 'Mobile' ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                              {device}
                            </span>
                            <span>{formatPercent(usage)}</span>
                          </div>
                          <Progress value={usage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-almona-dark/60 border-almona-light/20">
                  <CardHeader>
                    <CardTitle>Conversion by Region</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(marketMetrics.conversionByRegion).map(([region, conversion]) => (
                        <div key={region}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{region}</span>
                            <span>{formatPercent(conversion)}</span>
                          </div>
                          <Progress value={conversion * 4} className="h-2" /> {/* Scale for visual */}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Export & Actions */}
      <div className="flex justify-end">
        <Button
          onClick={() => {
            // Export dashboard data
            const data = {
              kpis,
              userMetrics,
              revenueMetrics,
              technicalMetrics,
              marketMetrics,
              exportedAt: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `almona-production-metrics-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            toast.success('Production metrics exported successfully');
          }}
          className="bg-almona-orange/20 text-almona-orange hover:bg-almona-orange/30 border-almona-orange/30"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>
    </div>
  );
};

export default ProductionDashboard;
