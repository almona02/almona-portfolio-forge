/**
 * Revenue Chart Component
 * 
 * Gold-tier revenue visualization component using Recharts.
 * Displays revenue trends over time with prestige theme styling.
 * 
 * Features:
 * - Line/Area chart for revenue trends
 * - Period selection (daily/weekly/monthly)
 * - Date range filtering
 * - Prestige theme styling
 * - Responsive design
 * 
 * Usage:
 * ```tsx
 * <RevenueChart
 *   period="monthly"
 *   dateRange={{ start: startDate, end: endDate }}
 * />
 * ```
 */

import { cn } from '@/lib/utils';
import { ReportingService, type DateRange, type RevenueDataPoint } from '@/services/reporting/ReportingService';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { endOfDay, format, startOfDay, subDays, subMonths } from 'date-fns';
import {
    DollarSign,
    Download,
    RefreshCw,
    TrendingUp
} from 'lucide-react';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { toast } from 'sonner';

interface RevenueChartProps {
  /** Period type */
  period?: 'daily' | 'weekly' | 'monthly';
  /** Date range */
  dateRange?: DateRange;
  /** Chart type */
  chartType?: 'line' | 'area';
  /** Show controls */
  showControls?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Revenue Chart Component
 */
export const RevenueChart: React.FC<RevenueChartProps> = ({
  period: initialPeriod = 'monthly',
  dateRange: initialDateRange,
  chartType = 'area',
  showControls = true,
  className,
}) => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(initialPeriod);
  const [dateRange, setDateRange] = useState<DateRange>(
    initialDateRange || {
      start: startOfDay(subMonths(new Date(), 6)),
      end: endOfDay(new Date()),
    }
  );
  const [data, setData] = useState<RevenueDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<string>('USD');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const revenueData = await ReportingService.getRevenueByPeriod(period, dateRange);
      setData(revenueData);
      if (revenueData.length > 0) {
        setCurrency(revenueData[0].currency);
      }
    } catch (error) {
      console.error('Failed to load revenue data:', error);
      toast.error('Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalRevenue = data.reduce((sum, point) => sum + point.revenue, 0);
    const totalCount = data.reduce((sum, point) => sum + point.count, 0);
    const averageRevenue = data.length > 0 ? totalRevenue / data.length : 0;
    
    return { totalRevenue, totalCount, averageRevenue };
  }, [data]);

  // Format period label (wrapped in useCallback to stabilize reference)
  const formatPeriodLabel = useCallback((periodKey: string): string => {
    try {
      if (period === 'daily') {
        return format(new Date(periodKey), 'MMM d');
      } else if (period === 'weekly') {
        return format(new Date(periodKey), 'MMM d');
      } else {
        return format(new Date(periodKey + '-01'), 'MMM yyyy');
      }
    } catch {
      return periodKey;
    }
  }, [period]);

  // Chart data with formatted labels
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      periodLabel: formatPeriodLabel(point.period),
    }));
  }, [data, formatPeriodLabel]);

  // Quick date range presets
  const handlePresetRange = (preset: '7d' | '30d' | '90d' | '6m' | '1y') => {
    const now = new Date();
    let start: Date;

    switch (preset) {
      case '7d':
        start = subDays(now, 7);
        break;
      case '30d':
        start = subDays(now, 30);
        break;
      case '90d':
        start = subDays(now, 90);
        break;
      case '6m':
        start = subMonths(now, 6);
        break;
      case '1y':
        start = subMonths(now, 12);
        break;
    }

    setDateRange({
      start: startOfDay(start),
      end: endOfDay(now),
    });
  };

  if (loading) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Revenue Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
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
              Revenue Trend
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-600/30 text-xs">
                {currency} {totals.totalRevenue.toFixed(2)}
              </Badge>
              <span className="text-xs text-amber-600/70">
                {totals.totalCount} transaction{totals.totalCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          {showControls && (
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as 'daily' | 'weekly' | 'monthly')}>
                <SelectTrigger className="w-[120px] bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => ReportingService.exportToCSV(data, `revenue-${period}`)}
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Presets */}
        {showControls && (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange('7d')}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
            >
              7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange('30d')}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
            >
              30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange('90d')}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
            >
              90 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange('6m')}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
            >
              6 Months
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePresetRange('1y')}
              className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10 text-xs"
            >
              1 Year
            </Button>
          </div>
        )}

        {/* Chart */}
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <DollarSign className="w-16 h-16 text-amber-600/20 mb-4" />
            <p className="text-sm font-medium text-amber-300/70 mb-1">No revenue data</p>
            <p className="text-xs text-amber-600/50">
              Revenue data will appear here once payments are processed.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f59e0b" strokeOpacity={0.1} />
                <XAxis
                  dataKey="periodLabel"
                  stroke="#f59e0b"
                  strokeOpacity={0.5}
                  tick={{ fill: '#f59e0b', fontSize: 12 }}
                />
                <YAxis
                  stroke="#f59e0b"
                  strokeOpacity={0.5}
                  tick={{ fill: '#f59e0b', fontSize: 12 }}
                  tickFormatter={(value: unknown) => `${currency} ${Number(value ?? 0).toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    color: '#f59e0b',
                  }}
                  formatter={(value: unknown) => [`${currency} ${Number(value ?? 0).toFixed(2)}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f59e0b" strokeOpacity={0.1} />
                <XAxis
                  dataKey="periodLabel"
                  stroke="#f59e0b"
                  strokeOpacity={0.5}
                  tick={{ fill: '#f59e0b', fontSize: 12 }}
                />
                <YAxis
                  stroke="#f59e0b"
                  strokeOpacity={0.5}
                  tick={{ fill: '#f59e0b', fontSize: 12 }}
                  tickFormatter={(value: unknown) => `${currency} ${Number(value ?? 0).toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '8px',
                    color: '#f59e0b',
                  }}
                  formatter={(value: unknown) => [`${currency} ${Number(value ?? 0).toFixed(2)}`, 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: '#f59e0b', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

