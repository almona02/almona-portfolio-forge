/**
 * ProjectProfitabilityChart Component
 * 
 * Displays project profitability analysis with revenue, costs, and profit margins.
 * Features:
 * - Profitability breakdown by project
 * - Revenue vs costs comparison
 * - Profit margin visualization
 * - Top profitable projects table
 * 
 * Prestige theme styling with glass morphism effects.
 */

import { formatCurrency } from '@/lib/i18n/formatters';
import { ReportingService, type DateRange, type ProjectProfitability } from '@/services/reporting/ReportingService';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ProjectProfitabilityChartProps {
  dateRange?: DateRange;
  className?: string;
}

export const ProjectProfitabilityChart: React.FC<ProjectProfitabilityChartProps> = ({ dateRange, className = '' }) => {
  const [data, setData] = useState<ProjectProfitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(dateRange);

  const loadData = useCallback(async () => {
    if (!selectedRange) return;
    
    setLoading(true);
    try {
      const profitabilityData = await ReportingService.getProjectProfitability(selectedRange);
      setData(profitabilityData);
    } catch (error) {
      console.error('Failed to load project profitability data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    if (selectedRange) {
      loadData();
    }
  }, [selectedRange, loadData]);

  const handleDateRangeChange = (months: number) => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(end, months - 1));
    setSelectedRange({ start, end });
  };

  // Prepare chart data (top 10 projects) - memoized for performance
  const chartData = useMemo(() => {
    return data.slice(0, 10).map(project => ({
      name: project.projectCode.length > 15 
        ? project.projectCode.substring(0, 15) + '...' 
        : project.projectCode,
      fullCode: project.projectCode,
      customer: project.customerName,
      revenue: project.revenue,
      costs: project.costs,
      profit: project.profit,
      margin: project.profitMargin,
      currency: project.currency,
    }));
  }, [data]);

  // Calculate summary metrics - memoized for performance
  const summaryMetrics = useMemo(() => {
    const totalRevenue = data.reduce((sum, p) => sum + p.revenue, 0);
    const totalCosts = data.reduce((sum, p) => sum + p.costs, 0);
    const totalProfit = data.reduce((sum, p) => sum + p.profit, 0);
    const avgMargin = data.length > 0 
      ? data.reduce((sum, p) => sum + p.profitMargin, 0) / data.length 
      : 0;
    const profitableProjects = data.filter(p => p.profit > 0).length;
    const currency = data[0]?.currency || 'EGP';
    
    return { totalRevenue, totalCosts, totalProfit, avgMargin, profitableProjects, currency };
  }, [data]);
  
  const { totalRevenue, totalCosts, totalProfit, avgMargin, profitableProjects, currency } = summaryMetrics;

  // Color scheme based on profitability
  const getProfitColor = (profit: number, margin: number): string => {
    if (profit < 0) return '#ef4444'; // Red for losses
    if (margin < 10) return '#f97316'; // Orange for low margin
    if (margin < 20) return '#f59e0b'; // Amber for medium margin
    return '#10b981'; // Green for high margin
  };

  if (loading) {
    return (
      <Card className={`p-6 bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark ${className}`}>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={`p-6 bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark ${className}`}>
        <CardContent>
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-amber-600/20 opacity-50" />
            <h3 className="text-lg font-semibold text-amber-300 mb-2">No Profitability Data</h3>
            <p className="text-amber-500">No project profitability data available for the selected period.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`p-6 bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-amber-200 mb-1">Project Profitability</CardTitle>
            <p className="text-sm text-amber-600/70">Revenue, costs, and profit analysis by project</p>
          </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateRangeChange(3)}
            className="bg-slate-800/50 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
          >
            3M
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateRangeChange(6)}
            className="bg-slate-800/50 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
          >
            6M
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDateRangeChange(12)}
            className="bg-slate-800/50 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
          >
            12M
          </Button>
        </div>
        </div>
      </CardHeader>
      <CardContent>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600/70">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-200">
              {formatCurrency(totalRevenue, 'en', currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600/70">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-400">
              {formatCurrency(totalCosts, 'en', currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600/70">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold flex items-center gap-1 ${
              totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {totalProfit >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              {formatCurrency(totalProfit, 'en', currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600/70">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-200">
              {Math.round(avgMargin)}%
            </p>
            <p className="text-xs text-amber-600/50 mt-1">{profitableProjects}/{data.length} profitable</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <div className="mt-6">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => {
                try {
                  return formatCurrency(value, 'en', currency, { notation: 'compact' });
                } catch {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency,
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(value);
                }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              formatter={(value: any, name: string, props: any) => {
                if (name === 'revenue' || name === 'costs' || name === 'profit') {
                  try {
                    return [formatCurrency(value, 'en', props.payload.currency), name.charAt(0).toUpperCase() + name.slice(1)];
                  } catch {
                    return [new Intl.NumberFormat('en-US', { style: 'currency', currency: props.payload.currency }).format(value), name.charAt(0).toUpperCase() + name.slice(1)];
                  }
                }
                if (name === 'margin') {
                  return [`${value.toFixed(1)}%`, 'Margin'];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Project: ${label}`}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8' }}
              iconType="circle"
            />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="url(#revenueGradient)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="costs"
              name="Costs"
              fill="url(#costsGradient)"
              radius={[8, 8, 0, 0]}
            />
            <Bar
              dataKey="profit"
              name="Profit"
              fill="url(#profitGradient)"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getProfitColor(entry.profit, entry.margin)} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="costsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Projects Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-amber-600/30">
              <th className="text-left py-3 px-4 text-amber-300 font-semibold">Project</th>
              <th className="text-left py-3 px-4 text-amber-300 font-semibold">Customer</th>
              <th className="text-right py-3 px-4 text-amber-300 font-semibold">Revenue</th>
              <th className="text-right py-3 px-4 text-amber-300 font-semibold">Costs</th>
              <th className="text-right py-3 px-4 text-amber-300 font-semibold">Profit</th>
              <th className="text-right py-3 px-4 text-amber-300 font-semibold">Margin</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((project) => {
              const profitColor = getProfitColor(project.profit, project.profitMargin);
              return (
                <tr
                  key={project.projectId}
                  className="border-b border-amber-600/10 hover:bg-amber-900/10 transition-colors"
                >
                  <td className="py-3 px-4 text-amber-100 font-mono text-xs">
                    {project.projectCode}
                  </td>
                  <td className="py-3 px-4 text-amber-100">
                    {project.customerName}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-300 font-semibold">
                    {formatCurrency(project.revenue, 'en', project.currency)}
                  </td>
                  <td className="py-3 px-4 text-right text-orange-400">
                    {formatCurrency(project.costs, 'en', project.currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold" style={{ color: profitColor }}>
                    {formatCurrency(project.profit, 'en', project.currency)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: `${profitColor}20`,
                        color: profitColor,
                      }}
                    >
                      {project.profitMargin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </CardContent>
    </Card>
  );
};

