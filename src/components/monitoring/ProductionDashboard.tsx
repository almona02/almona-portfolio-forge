import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Globe,
  Server,
  Database,
  Zap,
  BarChart3,
  Eye,
  MousePointer,
  ShoppingCart,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface KPIMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  threshold: number;
  unit: string;
  status: 'good' | 'needs-improvement' | 'poor';
}

interface UserBehavior {
  page: string;
  views: number;
  bounceRate: number;
  avgTime: number;
  conversions: number;
}

export function ProductionDashboard() {
  const { t } = useTranslation();
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [userBehavior, setUserBehavior] = useState<UserBehavior[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Simulate real-time data loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock KPI data - in production, this would come from your analytics API
      setKpiMetrics([
        {
          id: 'active-users',
          title: 'Active Users',
          value: '2,847',
          change: 12.5,
          trend: 'up',
          status: 'healthy',
          icon: <Users className="h-4 w-4" />
        },
        {
          id: 'page-views',
          title: 'Page Views',
          value: '45,231',
          change: 8.3,
          trend: 'up',
          status: 'healthy',
          icon: <Eye className="h-4 w-4" />
        },
        {
          id: 'conversion-rate',
          title: 'Conversion Rate',
          value: '3.2%',
          change: -2.1,
          trend: 'down',
          status: 'warning',
          icon: <MousePointer className="h-4 w-4" />
        },
        {
          id: 'revenue',
          title: 'Revenue',
          value: '$12,450',
          change: 15.7,
          trend: 'up',
          status: 'healthy',
          icon: <TrendingUp className="h-4 w-4" />
        },
        {
          id: 'avg-session',
          title: 'Avg Session',
          value: '4m 32s',
          change: 5.2,
          trend: 'up',
          status: 'healthy',
          icon: <Clock className="h-4 w-4" />
        },
        {
          id: 'bounce-rate',
          title: 'Bounce Rate',
          value: '42.1%',
          change: -3.8,
          trend: 'up',
          status: 'healthy',
          icon: <Activity className="h-4 w-4" />
        }
      ]);

      // Mock performance metrics
      setPerformanceMetrics([
        {
          metric: 'First Contentful Paint',
          value: 1.2,
          threshold: 1.8,
          unit: 's',
          status: 'good'
        },
        {
          metric: 'Largest Contentful Paint',
          value: 2.1,
          threshold: 2.5,
          unit: 's',
          status: 'good'
        },
        {
          metric: 'Cumulative Layout Shift',
          value: 0.08,
          threshold: 0.1,
          unit: '',
          status: 'good'
        },
        {
          metric: 'First Input Delay',
          value: 45,
          threshold: 100,
          unit: 'ms',
          status: 'good'
        },
        {
          metric: 'Time to Interactive',
          value: 3.2,
          threshold: 3.8,
          unit: 's',
          status: 'good'
        }
      ]);

      // Mock user behavior data
      setUserBehavior([
        { page: '/', views: 12450, bounceRate: 35.2, avgTime: 245, conversions: 89 },
        { page: '/products', views: 8930, bounceRate: 28.7, avgTime: 189, conversions: 156 },
        { page: '/services', views: 5670, bounceRate: 42.1, avgTime: 167, conversions: 78 },
        { page: '/contact', views: 2340, bounceRate: 15.3, avgTime: 89, conversions: 45 },
        { page: '/about', views: 1890, bounceRate: 38.9, avgTime: 123, conversions: 12 }
      ]);

      // Mock alerts
      setAlerts([
        {
          id: 1,
          type: 'warning',
          message: 'High bounce rate detected on /services page',
          timestamp: new Date(Date.now() - 300000),
          severity: 'medium'
        },
        {
          id: 2,
          type: 'info',
          message: 'Peak traffic detected - 500+ concurrent users',
          timestamp: new Date(Date.now() - 600000),
          severity: 'low'
        }
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPerformanceColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Production Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for your application
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live</span>
          </Badge>
          <Button onClick={loadDashboardData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Alert key={alert.id} variant={alert.type === 'warning' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {alert.message} - {alert.timestamp.toLocaleTimeString()}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span className={metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {metric.trend === 'up' ? '+' : ''}{metric.change}%
                </span>
                <span>from last hour</span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(metric.status)}`}></div>
                <span className="text-xs capitalize">{metric.status}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="user-behavior">User Behavior</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Core Web Vitals</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {performanceMetrics.map((metric) => (
                <div key={metric.metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metric.metric}</span>
                    <span className={`text-sm font-bold ${getPerformanceColor(metric.status)}`}>
                      {metric.value}{metric.unit}
                    </span>
                  </div>
                  <Progress 
                    value={(metric.value / metric.threshold) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    Threshold: {metric.threshold}{metric.unit}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Page Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userBehavior.map((page) => (
                  <div key={page.page} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{page.page}</div>
                      <div className="text-sm text-muted-foreground">
                        {page.views.toLocaleString()} views
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{page.bounceRate}%</span> bounce rate
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.floor(page.avgTime / 60)}m {page.avgTime % 60}s avg time
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Conversion Funnel</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userBehavior.map((page) => (
                  <div key={page.page} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{page.page}</div>
                      <div className="text-sm text-muted-foreground">
                        {page.views.toLocaleString()} visitors
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{page.conversions}</span> conversions
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {((page.conversions / page.views) * 100).toFixed(1)}% rate
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}