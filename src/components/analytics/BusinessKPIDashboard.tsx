import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { track } from '@/lib/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import {
    Activity,
    ArrowDownLeft,
    ArrowUpRight,
    BarChart3,
    DollarSign,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Lazy load recharts components
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const BarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const Bar = lazy(() => import('recharts').then(module => ({ default: module.Bar })));
const RechartsPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));
const Pie = lazy(() => import('recharts').then(module => ({ default: module.Pie })));
const Cell = lazy(() => import('recharts').then(module => ({ default: module.Cell })));

// Business KPI Types
interface BusinessMetrics {
  revenue: {
    total: number;
    growth: number;
    monthly: Array<{ month: string; value: number; target: number }>;
  };
  customers: {
    total: number;
    new: number;
    retention: number;
    ltv: number;
  };
  conversion: {
    rate: number;
    funnel: Array<{ stage: string; count: number; rate: number }>;
  };
  products: {
    bestSellers: Array<{ name: string; sold: number; revenue: number }>;
    categories: Array<{ name: string; value: number; color: string }>;
  };
  regional: {
    egypt: { revenue: number; customers: number; growth: number };
    turkey: { revenue: number; customers: number; growth: number };
    eu: { revenue: number; customers: number; growth: number };
  };
}

// Mock data generator - replace with real API calls
const generateMockMetrics = (): BusinessMetrics => ({
  revenue: {
    total: 2547000,
    growth: 23.5,
    monthly: [
      { month: 'Jan', value: 180000, target: 175000 },
      { month: 'Feb', value: 195000, target: 185000 },
      { month: 'Mar', value: 210000, target: 200000 },
      { month: 'Apr', value: 235000, target: 220000 },
      { month: 'May', value: 268000, target: 250000 },
      { month: 'Jun', value: 295000, target: 275000 },
    ]
  },
  customers: {
    total: 4872,
    new: 342,
    retention: 87.2,
    ltv: 5240
  },
  conversion: {
    rate: 3.8,
    funnel: [
      { stage: 'Visitors', count: 28500, rate: 100 },
      { stage: 'Leads', count: 4275, rate: 15 },
      { stage: 'Qualified', count: 1710, rate: 6 },
      { stage: 'Customers', count: 1083, rate: 3.8 },
    ]
  },
  products: {
    bestSellers: [
      { name: 'YILMAZ KM-212 CNC', sold: 45, revenue: 675000 },
      { name: 'Aluminum Profile Cutter', sold: 78, revenue: 234000 },
      { name: 'UPVC Window Machine', sold: 62, revenue: 186000 },
      { name: 'Glass Cutting System', sold: 34, revenue: 170000 },
    ],
    categories: [
      { name: 'CNC Machines', value: 35, color: '#FF6B6B' },
      { name: 'Cutting Equipment', value: 28, color: '#4ECDC4' },
      { name: 'Window Systems', value: 22, color: '#45B7D1' },
      { name: 'Spare Parts', value: 15, color: '#96CEB4' },
    ]
  },
  regional: {
    egypt: { revenue: 1528200, customers: 2923, growth: 18.7 },
    turkey: { revenue: 764100, customers: 1456, growth: 31.2 },
    eu: { revenue: 254700, customers: 493, growth: 45.8 },
  }
});

/**
 * Business KPI Dashboard Component
 *
 * Advanced business intelligence dashboard extending existing analytics.
 * Features:
 * - Real-time revenue and growth tracking
 * - Customer acquisition and retention metrics
 * - Conversion funnel analysis
 * - Regional performance comparison
 * - Product performance insights
 * - Integration with existing admin dashboard
 */
export const BusinessKPIDashboard: React.FC = React.memo(() => {
  const { t: _t } = useTranslation();
  const [metrics, setMetrics] = useState<BusinessMetrics>(generateMockMetrics());
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Track dashboard view
    track('business_kpi_dashboard_viewed', {
      timeRange,
      activeTab,
      timestamp: Date.now()
    });

    // Simulate real-time updates (replace with actual WebSocket/API)
    const interval = setInterval(() => {
      setMetrics(generateMockMetrics());
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange, activeTab]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change: number;
    icon: React.ReactNode;
    color?: string;
    subtitle?: string;
  }> = ({ title, value, change, icon, color = 'text-blue-600', subtitle }) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-4 w-4 ${color}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>
        )}
        <div className="flex items-center text-xs">
          {change >= 0 ? (
            <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
          ) : (
            <ArrowDownLeft className="h-3 w-3 text-red-600 mr-1" />
          )}
          <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(change)}%
          </span>
          <span className="text-muted-foreground ml-1">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );

  const ConversionFunnelChart = () => (
    <Suspense fallback={<div className="h-[300px] flex items-center justify-center">Loading chart...</div>}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={metrics.conversion.funnel} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="stage" type="category" width={80} />
          <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />
          <Bar dataKey="count" fill="#4ECDC4" />
        </BarChart>
      </ResponsiveContainer>
    </Suspense>
  );

  const RegionalPerformanceChart = () => {
    const regionalData = [
      { region: 'Egypt', revenue: metrics.regional.egypt.revenue, customers: metrics.regional.egypt.customers, growth: metrics.regional.egypt.growth },
      { region: 'Turkey', revenue: metrics.regional.turkey.revenue, customers: metrics.regional.turkey.customers, growth: metrics.regional.turkey.growth },
      { region: 'EU', revenue: metrics.regional.eu.revenue, customers: metrics.regional.eu.customers, growth: metrics.regional.eu.growth },
    ];

    return (
      <Suspense fallback={<div className="h-[300px] flex items-center justify-center">Loading chart...</div>}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={regionalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" />
            <YAxis />
            <Tooltip formatter={(value, name) => [`${value}`, `${name}`]} />
            <Bar dataKey="revenue" fill="#FF6B6B" name="Revenue ($)" />
            <Bar dataKey="customers" fill="#4ECDC4" name="Customers" />
          </BarChart>
        </ResponsiveContainer>
      </Suspense>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="typography-h2 tracking-tight">Business Intelligence</h2>
          <p className="text-muted-foreground">
            Real-time business metrics and performance analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Live Data
          </Badge>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={`$${(metrics.revenue.total / 1000).toFixed(0)}K`}
          change={metrics.revenue.growth}
          icon={<DollarSign className="h-4 w-4" />}
          color="text-green-600"
          subtitle="Monthly recurring"
        />
        <MetricCard
          title="Total Customers"
          value={metrics.customers.total.toLocaleString()}
          change={12.3}
          icon={<Users className="h-4 w-4" />}
          color="text-blue-600"
          subtitle={`${metrics.customers.new} new this month`}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversion.rate}%`}
          change={0.8}
          icon={<Target className="h-4 w-4" />}
          color="text-purple-600"
          subtitle="Visitor to customer"
        />
        <MetricCard
          title="Customer LTV"
          value={`$${metrics.customers.ltv.toLocaleString()}`}
          change={15.2}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-amber-600"
          subtitle={`${metrics.customers.retention}% retention`}
        />
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="regional">Regional</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ConversionFunnelChart />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.products.bestSellers.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.sold} units sold
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">
                          ${(product.revenue / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend vs Target</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading chart...</div>}>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metrics.revenue.monthly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                    <Line type="monotone" dataKey="value" stroke="#4ECDC4" strokeWidth={3} name="Actual" />
                    <Line type="monotone" dataKey="target" stroke="#FF6B6B" strokeDasharray="5 5" name="Target" />
                  </LineChart>
                </ResponsiveContainer>
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">New Customers</span>
                    <span className="font-bold">{metrics.customers.new}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Retention Rate</span>
                    <span className="font-bold">{metrics.customers.retention}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average LTV</span>
                    <span className="font-bold">${metrics.customers.ltv}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={metrics.products.categories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {metrics.products.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="regional" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Regional Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <RegionalPerformanceChart />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🇪🇬 Egypt Market
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue</span>
                    <span className="font-bold">${(metrics.regional.egypt.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Customers</span>
                    <span className="font-bold">{metrics.regional.egypt.customers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Growth</span>
                    <Badge variant="outline" className="text-green-600">
                      +{metrics.regional.egypt.growth}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🇹🇷 Turkey Market
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue</span>
                    <span className="font-bold">${(metrics.regional.turkey.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Customers</span>
                    <span className="font-bold">{metrics.regional.turkey.customers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Growth</span>
                    <Badge variant="outline" className="text-green-600">
                      +{metrics.regional.turkey.growth}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🇪🇺 EU Market
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Revenue</span>
                    <span className="font-bold">${(metrics.regional.eu.revenue / 1000).toFixed(0)}K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Customers</span>
                    <span className="font-bold">{metrics.regional.eu.customers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Growth</span>
                    <Badge variant="outline" className="text-green-600">
                      +{metrics.regional.eu.growth}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Key Action Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" size="sm" className="justify-start">
              <Target className="h-4 w-4 mr-2" />
              Optimize EU Conversion
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Users className="h-4 w-4 mr-2" />
              Turkey Customer Growth
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <DollarSign className="h-4 w-4 mr-2" />
              Increase Average LTV
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <BarChart3 className="h-4 w-4 mr-2" />
              Product Mix Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default BusinessKPIDashboard;
