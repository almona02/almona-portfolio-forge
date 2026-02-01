/**
 * Material Efficiency Dashboard
 * Data-driven insights for material optimization
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { consumptionForecaster } from '@/lib/analytics/ConsumptionForecaster';
import type { Profile } from '@/types/fabricator';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface MaterialEfficiencyDashboardProps {
  profiles: Profile[];
  userId?: string;
}

export const MaterialEfficiencyDashboard: React.FC<MaterialEfficiencyDashboardProps> = ({
  profiles,
  userId,
}) => {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadForecasts = async () => {
      setLoading(true);
      const forecastPromises = profiles.slice(0, 10).map(profile =>
        consumptionForecaster.forecastConsumption(profile.id, 'monthly', userId)
      );

      const results = await Promise.all(forecastPromises);
      setForecasts(results);
      setLoading(false);
    };

    if (profiles.length > 0) {
      loadForecasts();
    }
  }, [profiles, userId]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700 card-dark">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          Material Efficiency Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="forecasts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="forecasts">Consumption Forecasts</TabsTrigger>
            <TabsTrigger value="insights">Optimization Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="forecasts" className="space-y-4">
            {loading ? (
              <div className="text-center text-gray-500 py-8">Loading forecasts...</div>
            ) : forecasts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No forecast data available</div>
            ) : (
              forecasts.map((forecast) => (
                <Card key={forecast.profileId} className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="typography-h4 font-medium text-sm">{forecast.profileName}</h4>
                      {getTrendIcon(forecast.trend)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Predicted Usage</p>
                        <p className="text-lg font-semibold">
                          {forecast.predictedUsage.toFixed(1)}m
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Confidence</p>
                        <p className="text-lg font-semibold">{forecast.confidence.toFixed(0)}%</p>
                      </div>
                    </div>
                    {forecast.recommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Recommendations:</p>
                        <ul className="text-xs text-gray-300 space-y-1">
                          {forecast.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="insights">
            <div className="text-center text-gray-500 py-8">
              Optimization insights coming soon
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

