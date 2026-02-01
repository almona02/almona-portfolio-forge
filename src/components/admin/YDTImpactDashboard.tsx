/**
 * YDT Impact Dashboard - Display YDT ROI Metrics
 * 
 * Shows:
 * - Margin improvement
 * - Project success rate
 * - Customer satisfaction
 * - Competitive wins
 * - Market intelligence insights
 */

import { YDTCoreService } from '@/lib/ydt/YDTCoreService';
import { YDTImpactAnalyzer, type YDTMetrics } from '@/lib/ydt/YDTImpactAnalyzer';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { CheckCircle, Clock, DollarSign, TrendingUp, Users } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

export const YDTImpactDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<YDTMetrics | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const analyzer = useMemo(() => new YDTImpactAnalyzer(), []);
  const ydt = useMemo(() => YDTCoreService.getInstance(), []);

  useEffect(() => {
    // Load metrics
    const loadMetrics = async () => {
      try {
        // Calculate metrics from analyzer
        const calculatedMetrics = analyzer.calculateMetrics();
        setMetrics(calculatedMetrics);

        // Get market intelligence insights
        const trendingStyles = await ydt.getTrendingStyles('Cairo');
        setInsights({
          trendingStyles,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading YDT metrics:', error);
        setLoading(false);
      }
    };

    loadMetrics();
  }, [analyzer, ydt]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Loading YDT Impact Dashboard...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <div className="text-center">No metrics available</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="typography-h1">YDT Intelligence Impact Dashboard</h1>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Margin Improvement"
          value={`+${metrics.marginImprovement.toFixed(1)}%`}
          description="With YDT vs Without YDT"
          trend="up"
          icon={<TrendingUp className="w-6 h-6" />}
        />

        <MetricCard
          title="Project Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          description="Projects following YDT advice"
          trend="up"
          icon={<CheckCircle className="w-6 h-6" />}
        />

        <MetricCard
          title="Customer Satisfaction"
          value={`${metrics.customerSatisfaction.toFixed(1)}/10`}
          description="Based on feedback"
          trend="up"
          icon={<Users className="w-6 h-6" />}
        />

        <MetricCard
          title="Competitive Wins"
          value={`${metrics.competitiveWins.toFixed(1)}%`}
          description="Projects won with YDT intelligence"
          trend="up"
          icon={<DollarSign className="w-6 h-6" />}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.timeSaved.toFixed(1)}</div>
            <div className="text-sm text-gray-500">Hours saved</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Total Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalSavings.toLocaleString()}</div>
            <div className="text-sm text-gray-500">EGP saved</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects Analyzed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.projectsAnalyzed}</div>
            <div className="text-sm text-gray-500">Total projects</div>
          </CardContent>
        </Card>
      </div>

      {/* Market Intelligence Section */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle>YDT Market Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="typography-h3 mb-2">Trending Window Styles (Cairo)</h3>
                {insights.trendingStyles && insights.trendingStyles.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {insights.trendingStyles.map((style: any, index: number) => (
                      <li key={index}>
                        {style.name} - {style.popularityScore * 100}% popularity
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No trending data available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, description, trend, icon }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className={`${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {icon}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-gray-500 mt-1">{description}</div>
      </CardContent>
    </Card>
  );
};

