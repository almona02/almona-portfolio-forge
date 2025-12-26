/**
 * PilotMonitoringDashboard - Real-Time Pilot Monitoring
 * 
 * Real-time metrics dashboard for pilot program monitoring
 * 
 * @since Phase 5: Pre-Pilot Hardening (Week 27)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EscalationEngine, type Issue } from '@/lib/support/EscalationEngine';
import { PilotMetrics } from '@/lib/analytics/PilotMetrics';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export const PilotMonitoringDashboard: React.FC = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production, this would fetch from API
    const escalationEngine = new EscalationEngine();
    const pilotMetrics = new PilotMetrics();

    // Simulate loading data
    setTimeout(() => {
      setIssues(escalationEngine.getIssues());
      setMetrics(pilotMetrics.calculateOverallMetrics());
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6 text-center">
              <div className="text-gray-400">Loading metrics...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const unresolvedIssues = issues.filter(i => !i.resolvedAt);

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl">Pilot Monitoring Dashboard</CardTitle>
            <p className="text-gray-400">Real-time monitoring of pilot program</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Total Workshops</div>
                      <div className="text-2xl font-bold">{metrics?.totalWorkshops || 0}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Total Projects</div>
                      <div className="text-2xl font-bold">{metrics?.totalProjects || 0}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-900/20 border-red-600">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">Critical Issues</div>
                      <div className="text-2xl font-bold text-red-400">{criticalIssues.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-900/20 border-yellow-600">
                    <CardContent className="p-4">
                      <div className="text-sm text-gray-400">High Priority</div>
                      <div className="text-2xl font-bold text-yellow-400">{highIssues.length}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="issues" className="mt-6">
                <div className="space-y-4">
                  {unresolvedIssues.map((issue) => (
                    <Card
                      key={issue.id}
                      className={`bg-gray-800 border-gray-700 ${
                        issue.severity === 'critical' ? 'border-red-600' :
                        issue.severity === 'high' ? 'border-yellow-600' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {issue.severity === 'critical' && <AlertCircle className="h-5 w-5 text-red-400" />}
                              {issue.severity === 'high' && <Clock className="h-5 w-5 text-yellow-400" />}
                              <span className="font-semibold capitalize">{issue.severity}</span>
                              <span className="text-sm text-gray-400">- {issue.workshopId}</span>
                            </div>
                            <div className="text-sm text-gray-300">{issue.description}</div>
                            <div className="text-xs text-gray-500 mt-2">
                              Reported: {issue.reportedAt.toLocaleString()}
                            </div>
                          </div>
                          {issue.resolvedAt && (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="mt-6">
                {metrics && (
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-400">Average Accuracy</div>
                        <div className="text-2xl font-bold">{metrics.averageAccuracy.toFixed(1)}%</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-400">Time Savings</div>
                        <div className="text-2xl font-bold">{metrics.averageTimeSavings.toFixed(1)} hrs/week</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <div className="text-sm text-gray-400">Satisfaction</div>
                        <div className="text-2xl font-bold">{metrics.averageSatisfaction.toFixed(1)}/10</div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

