/**
 * Conversion Chart Component
 * 
 * Gold-tier conversion metrics visualization using Recharts.
 * Displays quote-to-invoice conversion funnel and metrics.
 * 
 * Features:
 * - Conversion funnel chart
 * - Conversion rate display
 * - Quote status breakdown
 * - Prestige theme styling
 * - Responsive design
 * 
 * Usage:
 * ```tsx
 * <ConversionChart dateRange={{ start: startDate, end: endDate }} />
 * ```
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ReportingService, type ConversionMetrics, type DateRange } from '@/services/reporting/ReportingService';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import {
  PieChart as PieChartIcon,
  TrendingUp,
  Download,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ConversionChartProps {
  /** Date range */
  dateRange: DateRange;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Conversion Chart Component
 */
export const ConversionChart: React.FC<ConversionChartProps> = ({
  dateRange,
  className,
}) => {
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ReportingService.getConversionMetrics(dateRange);
      setMetrics(data);
    } catch (err: unknown) {
      console.error('Failed to load conversion metrics:', err);
      toast.error('Failed to load conversion metrics');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  // Funnel data
  const funnelData = useMemo(() => {
    if (!metrics) return [];

    return [
      { name: 'Created', value: metrics.quotesCreated, color: '#f59e0b' },
      { name: 'Accepted', value: metrics.quotesAccepted, color: '#10b981' },
      { name: 'Rejected', value: metrics.quotesRejected, color: '#ef4444' },
      { name: 'Expired', value: metrics.quotesExpired, color: '#64748b' },
    ].filter(item => item.value > 0);
  }, [metrics]);

  // Status breakdown for pie chart
  const statusData = useMemo(() => {
    if (!metrics) return [];

    return [
      { name: 'Accepted', value: metrics.quotesAccepted, color: '#10b981' },
      { name: 'Rejected', value: metrics.quotesRejected, color: '#ef4444' },
      { name: 'Expired', value: metrics.quotesExpired, color: '#64748b' },
      { name: 'Pending', value: metrics.quotesCreated - metrics.quotesAccepted - metrics.quotesRejected - metrics.quotesExpired, color: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [metrics]);

  if (loading) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Conversion Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Conversion Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <PieChartIcon className="w-16 h-16 text-amber-600/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-amber-300/70 mb-1">No conversion data</p>
            <p className="text-xs text-amber-600/50">
              Conversion data will appear here once quotes are created and tracked.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Quote-to-Invoice Conversion
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-600/30 text-xs">
                {metrics.conversionRate.toFixed(1)}% Conversion Rate
              </Badge>
              <span className="text-xs text-amber-600/70">
                {metrics.quotesCreated} quote{metrics.quotesCreated !== 1 ? 's' : ''} created
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => ReportingService.exportToCSV([metrics], 'conversion-metrics')}
            className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <div>
            <h3 className="text-sm font-medium text-amber-300/70 mb-4">Conversion Funnel</h3>
            {funnelData.length === 0 ? (
              <div className="text-center py-8 text-amber-600/50 text-sm">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f59e0b" strokeOpacity={0.1} />
                  <XAxis type="number" stroke="#f59e0b" strokeOpacity={0.5} tick={{ fill: '#f59e0b', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" stroke="#f59e0b" strokeOpacity={0.5} tick={{ fill: '#f59e0b', fontSize: 12 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      color: '#f59e0b',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status Pie Chart */}
          <div>
            <h3 className="text-sm font-medium text-amber-300/70 mb-4">Status Breakdown</h3>
            {statusData.length === 0 ? (
              <div className="text-center py-8 text-amber-600/50 text-sm">
                No data to display
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      color: '#f59e0b',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-[#0f0f0f]/60 border border-amber-600/20 rounded-md p-4">
            <p className="text-xs text-amber-600/70 mb-1">Average Quote Value</p>
            <p className="text-xl font-bold text-amber-200">
              ${metrics.averageQuoteValue.toFixed(2)}
            </p>
          </div>
          <div className="bg-[#0f0f0f]/60 border border-amber-600/20 rounded-md p-4">
            <p className="text-xs text-amber-600/70 mb-1">Average Invoice Value</p>
            <p className="text-xl font-bold text-amber-200">
              ${metrics.averageInvoiceValue.toFixed(2)}
            </p>
          </div>
          <div className="bg-[#0f0f0f]/60 border border-amber-600/20 rounded-md p-4">
            <p className="text-xs text-amber-600/70 mb-1">Total Accepted</p>
            <p className="text-xl font-bold text-emerald-300">
              {metrics.quotesAccepted}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

