import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  MousePointer, 
  Smartphone, 
  Monitor,
  Download,
  Eye,
  ShoppingCart,
  GitCompare
} from 'lucide-react';

interface AnalyticsData {
  quickViewOpens: number;
  hoverPreviews: number;
  conversions: {
    quoteRequests: number;
    comparisons: number;
    threeDViews: number;
    brochureDownloads: number;
  };
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  averageSessionTime: number;
  topProducts: Array<{
    name: string;
    views: number;
    conversions: number;
  }>;
}

export const QuickViewAnalyticsDashboard: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Replace with your actual analytics API endpoint
      const response = await fetch(`/api/analytics/quickview/dashboard?range=${timeRange}`);
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      // Mock data for development
      setAnalyticsData({
        quickViewOpens: 1247,
        hoverPreviews: 3421,
        conversions: {
          quoteRequests: 89,
          comparisons: 156,
          threeDViews: 234,
          brochureDownloads: 67
        },
        deviceBreakdown: {
          mobile: 45,
          tablet: 23,
          desktop: 32
        },
        averageSessionTime: 2.3,
        topProducts: [
          { name: 'Yilmaz CNC Lathe YL-2000', views: 156, conversions: 12 },
          { name: 'Industrial Press Machine IP-500', views: 134, conversions: 8 },
          { name: 'Precision Milling Machine PM-300', views: 98, conversions: 6 }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    void fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const getConversionRate = () => {
    if (!analyticsData) return 0;
    const totalConversions = Object.values(analyticsData.conversions).reduce((a, b) => a + b, 0);
    return ((totalConversions / analyticsData.quickViewOpens) * 100).toFixed(1);
  };

  const getHoverEffectiveness = () => {
    if (!analyticsData) return 0;
    return ((analyticsData.hoverPreviews / analyticsData.quickViewOpens) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Failed to load analytics data</p>
        <Button onClick={() => void fetchAnalyticsData()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="typography-h1 text-2xl text-foreground">Quick View Analytics</h1>
          <p className="text-muted-foreground">Enhanced ProductQuickView Performance Metrics</p>
        </div>
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Eye className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quick View Opens</p>
                <p className="text-2xl font-bold text-foreground">{analyticsData.quickViewOpens.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <MousePointer className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hover Previews</p>
                <p className="text-2xl font-bold text-foreground">{analyticsData.hoverPreviews.toLocaleString()}</p>
                <p className="text-xs text-success">{getHoverEffectiveness()}% of opens</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="btn-primary">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-foreground">{getConversionRate()}%</p>
                <p className="text-xs text-amber-400">All actions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Session</p>
                <p className="text-2xl font-bold text-foreground">{analyticsData.averageSessionTime}m</p>
                <p className="text-xs text-amber-400">Time in quick view</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="conversions" className="space-y-4">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="conversions" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <ShoppingCart className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{analyticsData.conversions.quoteRequests}</p>
                <p className="text-sm text-muted-foreground">Quote Requests</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <GitCompare className="w-8 h-8 text-info mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{analyticsData.conversions.comparisons}</p>
                <p className="text-sm text-muted-foreground">Comparisons</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Eye className="w-8 h-8 text-info mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{analyticsData.conversions.threeDViews}</p>
                <p className="text-sm text-muted-foreground">3D Views</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Download className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{analyticsData.conversions.brochureDownloads}</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Smartphone className="w-8 h-8 text-info mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{analyticsData.deviceBreakdown.mobile}%</p>
                <p className="text-sm text-muted-foreground">Mobile</p>
                <Badge className="mt-2 bg-blue-500/20 text-info">Factory Floor</Badge>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Monitor className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{analyticsData.deviceBreakdown.tablet}%</p>
                <p className="text-sm text-muted-foreground">Tablet</p>
                <Badge className="mt-2 bg-green-500/20 text-success">Portable</Badge>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Monitor className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{analyticsData.deviceBreakdown.desktop}%</p>
                <p className="text-sm text-muted-foreground">Desktop</p>
                <Badge className="mt-2 bg-amber-500/20 text-amber-400">Office</Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Top Performing Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.views} views</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-400">{product.conversions}</p>
                      <p className="text-xs text-muted-foreground">conversions</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-sm text-success">
                    <strong>Hover previews are {getHoverEffectiveness()}% effective</strong> - Users are engaging with micro-previews before opening full quick view
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-info">
                    <strong>Mobile usage is {analyticsData.deviceBreakdown.mobile}%</strong> - Factory floor users are actively using mobile devices
                  </p>
                </div>
                <div className="btn-primary">
                  <p className="text-sm text-amber-400">
                    <strong>Average session time is {analyticsData.averageSessionTime} minutes</strong> - Users are spending quality time reviewing products
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-400">
                    <strong>Optimize for mobile</strong> - Consider larger touch targets and simplified navigation
                  </p>
                </div>
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-sm text-info">
                    <strong>Enhance 3D integration</strong> - High 3D view usage suggests strong interest in technical visualization
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    <strong>Focus on top products</strong> - Prioritize features for your highest-performing machinery
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
