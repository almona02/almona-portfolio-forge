/**
 * Performance Audit Dashboard
 * 
 * Comprehensive dashboard for tracking performance metrics across:
 * - End-to-End Workflow
 * - Memory Stability
 * - Network Performance
 * - Database Performance
 * - UI Responsiveness
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PerformanceAuditMetrics, getPerformanceMetricsAggregator } from '@/lib/performance/PerformanceMetricsAggregator';
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface PerformanceAuditDashboardProps {
  refreshInterval?: number; // ms, default 5000
}

export function PerformanceAuditDashboard({
  refreshInterval = 5000,
}: PerformanceAuditDashboardProps) {
  const aggregator = getPerformanceMetricsAggregator();
  const [metrics, setMetrics] = useState<PerformanceAuditMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await aggregator.getMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setIsLoading(false);
    }
  }, [aggregator]);

  useEffect(() => {
    void loadMetrics();
    const interval = setInterval(() => void loadMetrics(), refreshInterval);
    return () => clearInterval(interval);
  }, [loadMetrics, refreshInterval]);

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading performance metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Audit Dashboard</h1>
        <button
          onClick={() => void loadMetrics()}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* End-to-End Workflow */}
      <Card>
        <CardHeader>
          <CardTitle>1. End-to-End Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Simple Window"
              current={metrics.workflow.simpleWindow.current}
              target={metrics.workflow.simpleWindow.target}
              status={metrics.workflow.simpleWindow.status}
              format="ms"
            />
            <MetricRow
              label="Complex Facade"
              current={metrics.workflow.complexFacade.current}
              target={metrics.workflow.complexFacade.target}
              status={metrics.workflow.complexFacade.status}
              format="ms"
            />
            <MetricRow
              label="Batch (10x)"
              current={metrics.workflow.batch10x.current}
              target={metrics.workflow.batch10x.target}
              status={metrics.workflow.batch10x.status}
              format="ms"
            />
          </div>
        </CardContent>
      </Card>

      {/* Memory Stability */}
      <Card>
        <CardHeader>
          <CardTitle>2. Memory Stability (8-hour session)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Heap Start:</span>
                <span className="ml-2 font-mono">
                  {formatValue(metrics.memory.heapStart, 'MB')}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Heap End:</span>
                <span className="ml-2 font-mono">
                  {formatValue(metrics.memory.heapEnd, 'MB')}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">DOM Nodes Start:</span>
                <span className="ml-2 font-mono">
                  {formatValue(metrics.memory.domNodesStart, '')}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">DOM Nodes End:</span>
                <span className="ml-2 font-mono">
                  {formatValue(metrics.memory.domNodesEnd, '')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Memory Leaks:</span>
              {metrics.memory.memoryLeaks.detected ? (
                <>
                  <Badge variant="destructive">Issues Detected</Badge>
                  <span className="text-sm text-red-600">
                    {metrics.memory.memoryLeaks.issues.join(', ')}
                  </span>
                </>
              ) : (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  None
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Network Performance */}
      <Card>
        <CardHeader>
          <CardTitle>3. Network Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Bundle Size"
              current={metrics.network.bundleSize.current}
              target={metrics.network.bundleSize.target}
              status={metrics.network.bundleSize.status}
              format="MB"
            />
            <MetricRow
              label="TTI (3G)"
              current={metrics.network.tti3G.current}
              target={metrics.network.tti3G.target}
              status={metrics.network.tti3G.status}
              format="ms"
            />
            <MetricRow
              label="DXF Upload (10MB)"
              current={metrics.network.dxfUpload10MB.current}
              target={metrics.network.dxfUpload10MB.target}
              status={metrics.network.dxfUpload10MB.status}
              format="ms"
            />
          </div>
        </CardContent>
      </Card>

      {/* Database Performance */}
      <Card>
        <CardHeader>
          <CardTitle>4. Database Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Avg Query Time"
              current={metrics.database.avgQueryTime.current}
              target={metrics.database.avgQueryTime.target}
              status={metrics.database.avgQueryTime.status}
              format="ms"
            />
            <MetricRow
              label="Slow Queries (>1s)"
              current={metrics.database.slowQueries.current}
              target={metrics.database.slowQueries.target}
              status={metrics.database.slowQueries.status}
              format=""
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Connection Pool:</span>
              {metrics.database.connectionPool.status === 'healthy' ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              ) : (
                <>
                  <Badge variant={metrics.database.connectionPool.status === 'warning' ? 'default' : 'destructive'}>
                    {metrics.database.connectionPool.status === 'warning' ? 'Warning' : 'Unhealthy'}
                  </Badge>
                  {metrics.database.connectionPool.issues.length > 0 && (
                    <span className="text-sm text-red-600">
                      {metrics.database.connectionPool.issues.join(', ')}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UI Responsiveness */}
      <Card>
        <CardHeader>
          <CardTitle>5. UI Responsiveness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricRow
              label="Input Lag"
              current={metrics.ui.inputLag.current}
              target={metrics.ui.inputLag.target}
              status={metrics.ui.inputLag.status}
              format="ms"
            />
            <MetricRow
              label="Animation FPS"
              current={metrics.ui.animationFPS.current}
              target={metrics.ui.animationFPS.target}
              status={metrics.ui.animationFPS.status}
              format=""
            />
            <MetricRow
              label="React Render Time"
              current={metrics.ui.reactRenderTime.current}
              target={metrics.ui.reactRenderTime.target}
              status={metrics.ui.reactRenderTime.status}
              format="ms"
            />
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500 text-right">
        Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
      </div>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  current: number | null;
  target: number;
  status: 'good' | 'warning' | 'bad';
  format: 'ms' | 'MB' | '';
}

function MetricRow({ label, current, target, status, format }: MetricRowProps) {
  const formatValue = (value: number | null): string => {
    if (value === null) return '___';
    if (format === 'ms') return `${value.toFixed(0)} ms`;
    if (format === 'MB') return `${value.toFixed(2)} MB`;
    return value.toString();
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'bad':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b">
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}:</span>
        <span className="text-sm text-gray-600">Target &lt;{target}{format === 'ms' ? 'ms' : format === 'MB' ? 'MB' : ''}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono">
          Current: {formatValue(current)}
        </span>
        {getStatusIcon()}
      </div>
    </div>
  );
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '___';
  if (unit === 'MB') return `${value.toFixed(2)} ${unit}`;
  if (unit === 'ms') return `${value.toFixed(0)} ${unit}`;
  return value.toString();
}
