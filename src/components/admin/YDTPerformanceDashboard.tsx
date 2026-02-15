/**
 * YDT Performance Dashboard
 * 
 * Gold Tier Implementation:
 * - Real-time YDT performance metrics
 * - P95/P99 latency monitoring
 * - Cache hit rate visualization
 * - Circuit breaker status
 * - Performance alerts
 * 
 * Purpose: Provide visibility into YDT performance for admin users
 */

import { YDTEnforcementService } from '@/lib/ydt/YDTEnforcementService';
import { YDTPerformanceMonitor } from '@/lib/ydt/YDTPerformanceMonitor';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import {
    Activity,
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    Database,
    TrendingUp,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface YDTPerformanceDashboardProps {
  refreshInterval?: number; // Refresh interval in milliseconds (default: 5000)
}

/**
 * YDT Performance Dashboard Component
 * 
 * Displays real-time YDT performance metrics including:
 * - Latency percentiles (P50, P95, P99)
 * - Cache hit rate
 * - Success rate
 * - Circuit breaker status
 * - Recent call history
 */
export function YDTPerformanceDashboard({ 
  refreshInterval = 5000 
}: YDTPerformanceDashboardProps) {
  const monitor = YDTPerformanceMonitor.getInstance();
  const enforcer = YDTEnforcementService.getInstance();
  const [metrics, setMetrics] = useState(monitor.getMetrics());
  const [recentCalls, setRecentCalls] = useState(monitor.getRecentCalls(10));
  const [cacheStats, setCacheStats] = useState(enforcer.getCacheStats());

  useEffect(() => {
    // Update metrics periodically
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
      setRecentCalls(monitor.getRecentCalls(10));
      setCacheStats(enforcer.getCacheStats());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [monitor, enforcer, refreshInterval]);

  const meetsLatencyRequirement = monitor.meetsLatencyRequirement();
  const cacheHitRate = monitor.getCacheHitRate();
  const successRate = monitor.getSuccessRate();

  return (
    <div className="space-y-6">
      {/* Performance Alerts */}
      {!meetsLatencyRequirement && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">P95 Latency Exceeded</AlertTitle>
          <AlertDescription className="text-red-400/80">
            Current P95 latency ({metrics.p95Latency.toFixed(0)}ms) exceeds the target of 150ms.
            Consider optimizing YDT queries or increasing cache hit rate.
          </AlertDescription>
        </Alert>
      )}

      {metrics.circuitBreakerTrips > 0 && (
        <Alert variant="destructive" className="bg-orange-500/10 border-orange-500/30">
          <AlertCircle className="h-4 w-4 text-orange-400" />
          <AlertTitle className="text-orange-400">Circuit Breaker Trips</AlertTitle>
          <AlertDescription className="text-orange-400/80">
            Circuit breaker has tripped {metrics.circuitBreakerTrips} time(s).
            YDT is currently using fallback responses.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* P95 Latency */}
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              P95 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {metrics.p95Latency.toFixed(0)}ms
            </div>
            <div className="flex items-center gap-2 mt-2">
              {meetsLatencyRequirement ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  On Target
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Exceeded
                </Badge>
              )}
              <span className="text-xs text-gray-400">Target: ≤150ms</span>
            </div>
          </CardContent>
        </Card>

        {/* P99 Latency */}
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              P99 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {metrics.p99Latency.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-400 mt-2">
              {metrics.totalCalls > 0 ? `${metrics.totalCalls} total calls` : 'No calls yet'}
            </div>
          </CardContent>
        </Card>

        {/* Cache Hit Rate */}
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Database className="h-4 w-4 text-green-400" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {cacheHitRate.toFixed(1)}%
            </div>
            <Progress 
              value={cacheHitRate} 
              className="mt-2 h-2"
            />
            <div className="text-xs text-gray-400 mt-2">
              {metrics.cacheHits} hits / {metrics.cacheMisses} misses
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {successRate.toFixed(1)}%
            </div>
            <Progress 
              value={successRate} 
              className="mt-2 h-2"
            />
            <div className="text-xs text-gray-400 mt-2">
              {metrics.successfulCalls} success / {metrics.failedCalls} failed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latency Breakdown */}
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              Latency Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">P50 (Median)</span>
              <span className="text-sm font-medium text-gray-300">
                {metrics.p50Latency.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">P95</span>
              <span className="text-sm font-medium text-amber-400">
                {metrics.p95Latency.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">P99</span>
              <span className="text-sm font-medium text-blue-400">
                {metrics.p99Latency.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Average</span>
              <span className="text-sm font-medium text-gray-300">
                {metrics.averageLatency.toFixed(0)}ms
              </span>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Total Calls</span>
              <span className="text-sm font-medium text-gray-300">
                {metrics.totalCalls.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Circuit Breaker Trips</span>
              <span className={`text-sm font-medium ${
                metrics.circuitBreakerTrips > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {metrics.circuitBreakerTrips}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Timeouts</span>
              <span className={`text-sm font-medium ${
                metrics.timeoutCount > 0 ? 'text-orange-400' : 'text-gray-300'
              }`}>
                {metrics.timeoutCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Cache Size</span>
              <span className="text-sm font-medium text-gray-300">
                {cacheStats.size} entries
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <Card className="bg-gray-700/50 border-gray-600">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              Recent Calls (Last 10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCalls.map((call, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    {call.success ? (
                      <CheckCircle className="h-3 w-3 text-green-400" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span className="text-gray-300 font-mono text-xs">
                      {call.operation}
                    </span>
                    {call.cached && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                        Cached
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${
                      call.responseTime > 150 ? 'text-red-400' : 
                      call.responseTime > 100 ? 'text-orange-400' : 
                      'text-green-400'
                    }`}>
                      {call.responseTime}ms
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <Card className="bg-gray-700/50 border-gray-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-400">
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono text-gray-300 bg-gray-800/50 p-3 rounded overflow-auto">
            {monitor.getSummary()}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

