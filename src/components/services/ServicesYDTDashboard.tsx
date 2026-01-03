/**
 * Services YDT Dashboard - Week 1 Metrics Display
 * 
 * Shows YDT usage metrics for services section.
 * Simple dashboard for Week 1 tracking.
 * 
 * Status: Week 1 Implementation (Jan 2, 2026)
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ydtServiceLogger, type YDTServiceMetrics } from '@/lib/services/YDTServiceLogger';
import {
    Activity,
    AlertTriangle,
    Brain,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { useEffect, useState } from 'react';

export function ServicesYDTDashboard() {
  const [metrics, setMetrics] = useState<YDTServiceMetrics>({
    totalCalls: 0,
    successRate: 0,
    avgConfidence: 0,
    avgResponseTime: 0,
    fallbackRate: 0,
    callsByService: {},
    callsBySource: {}
  });

  useEffect(() => {
    // Update metrics immediately
    const updateMetrics = () => {
      const todayMetrics = ydtServiceLogger.getTodayMetrics();
      setMetrics(todayMetrics);
    };

    updateMetrics();

    // Update every 30 seconds
    const interval = setInterval(updateMetrics, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-400';
    if (value >= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'default';
    if (value >= thresholds.warning) return 'secondary';
    return 'outline';
  };

  return (
    <div className="services-ydt-dashboard space-y-6">
      <Card className="bg-gradient-to-br from-gray-900 to-black border-orange-500/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-orange-400" />
            <CardTitle className="text-orange-400">Services YDT Integration</CardTitle>
          </div>
          <CardDescription>
            Week 1 Metrics - YDT usage in service tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Calls */}
            <Card className="bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Total Calls</span>
                  <Activity className="h-4 w-4 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-white">{metrics.totalCalls}</div>
                <p className="text-xs text-gray-500 mt-1">Today</p>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card className="bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Success Rate</span>
                  <CheckCircle2 className={`h-4 w-4 ${getStatusColor(metrics.successRate, { good: 0.9, warning: 0.7 })}`} />
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(metrics.successRate, { good: 0.9, warning: 0.7 })}`}>
                  {Math.round(metrics.successRate * 100)}%
                </div>
                <Progress 
                  value={metrics.successRate * 100} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>

            {/* Avg Confidence */}
            <Card className="bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Avg Confidence</span>
                  <Brain className={`h-4 w-4 ${getStatusColor(metrics.avgConfidence, { good: 0.8, warning: 0.6 })}`} />
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(metrics.avgConfidence, { good: 0.8, warning: 0.6 })}`}>
                  {Math.round(metrics.avgConfidence * 100)}%
                </div>
                <Progress 
                  value={metrics.avgConfidence * 100} 
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>

            {/* Avg Response Time */}
            <Card className="bg-gray-800/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Avg Response</span>
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(metrics.avgResponseTime)}ms
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.avgResponseTime < 150 ? 'Within target' : 'Above target'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Fallback Rate */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Fallback Rate</span>
              <Badge variant={getStatusBadge(1 - metrics.fallbackRate, { good: 0.9, warning: 0.7 })}>
                {Math.round((1 - metrics.fallbackRate) * 100)}% YDT Live
              </Badge>
            </div>
            <Progress 
              value={metrics.fallbackRate * 100} 
              className="h-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(metrics.fallbackRate * 100)}% using cache/baseline
            </p>
          </div>

          {/* Service Breakdown */}
          {Object.keys(metrics.callsByService).length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Calls by Service</h4>
              <div className="space-y-1">
                {Object.entries(metrics.callsByService).map(([service, count]) => (
                  <div key={service} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 capitalize">{service.replace('_', ' ')}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-semibold">Week 1 Recommendations</h4>
            
            {metrics.totalCalls === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  No YDT usage detected. Ensure YDTServiceIntelligence is enabled in ticket flow.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.fallbackRate > 0.3 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  High fallback rate ({Math.round(metrics.fallbackRate * 100)}%). 
                  Consider increasing YDT timeout or improving cache.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.successRate < 0.7 && metrics.totalCalls > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Low success rate ({Math.round(metrics.successRate * 100)}%). 
                  Check YDT service availability.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.avgConfidence < 0.6 && metrics.totalCalls > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Low average confidence ({Math.round(metrics.avgConfidence * 100)}%). 
                  YDT suggestions may need improvement.
                </AlertDescription>
              </Alert>
            )}
            
            {metrics.totalCalls > 0 && 
             metrics.successRate >= 0.9 && 
             metrics.avgConfidence >= 0.8 && 
             metrics.fallbackRate < 0.2 && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">
                  YDT integration performing well! All metrics within target ranges.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ServicesYDTDashboard;

