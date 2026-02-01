/**
 * Workshop Performance Widget
 * Real-time analytics widget for dashboard
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface WorkshopPerformanceWidgetProps {
  workshopId: string;
  timeframe?: 'day' | 'week' | 'month';
}

export const WorkshopPerformanceWidget: React.FC<WorkshopPerformanceWidgetProps> = ({
  workshopId,
  timeframe = 'week',
}) => {
  const [metrics, setMetrics] = useState<{
    oee: number;
    wasteReduction: number;
    costSavings: number;
    trends: {
      oee: 'improving' | 'stable' | 'declining';
      waste: 'improving' | 'stable' | 'declining';
      cost: 'improving' | 'stable' | 'declining';
    };
  } | null>(null);

  useEffect(() => {
    // Fetch workshop metrics
    const loadMetrics = async () => {
      try {
        // TODO: Fetch actual metrics from database
        // For now, use mock data
        setMetrics({
          oee: 87.5,
          wasteReduction: 12.3,
          costSavings: 8.7,
          trends: {
            oee: 'improving',
            waste: 'improving',
            cost: 'stable',
          },
        });
      } catch (error) {
        console.error('Error loading workshop metrics:', error);
      }
    };

    loadMetrics();
  }, [workshopId, timeframe]);

  if (!metrics) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <CardContent className="p-4">
          <div className="text-sm text-gray-400">Loading metrics...</div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = ({ trend }: { trend: 'improving' | 'stable' | 'declining' }) => {
    if (trend === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    } else if (trend === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/50">
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="text-2xl font-bold text-green-400">{metrics.oee.toFixed(1)}%</div>
              <TrendIcon trend={metrics.trends.oee} />
            </div>
            <div className="text-xs text-gray-400">OEE</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="text-2xl font-bold text-amber-400">{metrics.wasteReduction.toFixed(1)}%</div>
              <TrendIcon trend={metrics.trends.waste} />
            </div>
            <div className="text-xs text-gray-400">Waste Reduction</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <div className="text-2xl font-bold text-blue-400">{metrics.costSavings.toFixed(1)}%</div>
              <TrendIcon trend={metrics.trends.cost} />
            </div>
            <div className="text-xs text-gray-400">Cost Savings</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

