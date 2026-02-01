/**
 * BetaDashboard - Real-Time Beta Monitoring
 * 
 * Admin dashboard for monitoring beta testing program:
 * - Real-time metrics
 * - Workshop activity
 * - Feature usage
 * - Accuracy tracking
 * 
 * @since Beta Testing Program (Weeks 18-20)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BetaMetrics } from '@/lib/analytics/BetaMetrics';
import type { BetaMetrics as BetaMetricsType } from '@/lib/analytics/BetaMetrics';

export const BetaDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<BetaMetricsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, this would fetch from API
    const betaMetrics = new BetaMetrics();
    // Simulate loading metrics
    setTimeout(() => {
      setMetrics(betaMetrics.calculateOverallMetrics());
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-gray-900 border-gray-800 card-dark">
            <CardContent className="p-6 text-center">
              <div className="text-gray-400">Loading metrics...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-gray-900 border-gray-800 card-dark">
            <CardContent className="p-6 text-center">
              <div className="text-gray-400">No metrics available yet</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-gray-900 border-gray-800 card-dark">
          <CardHeader>
            <CardTitle className="text-2xl">Beta Testing Dashboard</CardTitle>
            <p className="text-gray-400">Real-time monitoring of beta testing program</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="workshops">Workshops</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Total Workshops</div>
                      <div className="text-2xl font-bold">{metrics.totalWorkshops}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Total Projects</div>
                      <div className="text-2xl font-bold">{metrics.totalProjects}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Overall Accuracy</div>
                      <div className="text-2xl font-bold">{metrics.overallAccuracy.overall.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Recommendation Rate</div>
                      <div className="text-2xl font-bold">{metrics.recommendationRate.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="workshops" className="mt-6">
                <div className="space-y-4">
                  {metrics.workshops.map((workshop) => (
                    <Card key={workshop.workshopId} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold">{workshop.workshopName}</div>
                            <div className="text-sm text-gray-400">{workshop.location}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Projects: {workshop.projectsCompleted}</div>
                            <div className="text-sm text-gray-400">Accuracy: {workshop.averageAccuracy.overall.toFixed(1)}%</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Smart Wizard (Tier 1)</div>
                      <div className="text-2xl font-bold">{metrics.tierAdoption.wizard.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Pattern Library (Tier 2)</div>
                      <div className="text-2xl font-bold">{metrics.tierAdoption.pattern_library.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Expert Canvas (Tier 3)</div>
                      <div className="text-2xl font-bold">{metrics.tierAdoption.expert_canvas.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="accuracy" className="mt-6">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">BOM Accuracy</div>
                      <div className="text-2xl font-bold">{metrics.overallAccuracy.bom.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Hardware Accuracy</div>
                      <div className="text-2xl font-bold">{metrics.overallAccuracy.hardware.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Pricing Accuracy</div>
                      <div className="text-2xl font-bold">{metrics.averagePricingAccuracy.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Visual Accuracy</div>
                      <div className="text-2xl font-bold">{metrics.averageVisualAccuracy.toFixed(1)}%</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

