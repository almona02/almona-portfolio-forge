/**
 * Sales Pipeline Chart Component
 * 
 * Gold-tier sales pipeline visualization with stage breakdown,
 * win probabilities, and weighted values.
 * 
 * Features:
 * - Pipeline stage visualization
 * - Win probability indicators
 * - Weighted pipeline value
 * - Interactive tooltips
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <SalesPipelineChart data={pipelineData} />
 * ```
 */

import { formatCurrency } from '@/lib/i18n/formatters';
import { cn } from '@/lib/utils';
import type { SalesPipelineData } from '@/services/reporting/ReportingService';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { DollarSign, Target, TrendingUp } from 'lucide-react';
import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SalesPipelineChartProps {
  /** Pipeline data */
  data: SalesPipelineData[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sales Pipeline Chart Component
 */
export const SalesPipelineChart: React.FC<SalesPipelineChartProps> = ({
  data,
  className,
}) => {
  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalValue = data.reduce((sum, item) => sum + item.totalValue, 0);
    const totalWeightedValue = data.reduce((sum, item) => sum + item.weightedValue, 0);
    const totalCount = data.reduce((sum, item) => sum + item.count, 0);
    const wonValue = data.find(item => item.stage === 'Won')?.totalValue || 0;
    const wonCount = data.find(item => item.stage === 'Won')?.count || 0;

    return {
      totalValue,
      totalWeightedValue,
      totalCount,
      wonValue,
      wonCount,
      winRate: totalCount > 0 ? (wonCount / totalCount) * 100 : 0,
    };
  }, [data]);

  // Color mapping for stages
  const stageColors: Record<string, string> = {
    'Lead': '#f59e0b', // Amber
    'Qualified': '#3b82f6', // Blue
    'Quoted': '#06b6d4', // Cyan
    'Negotiation': '#f59e0b', // Amber
    'Won': '#10b981', // Green
    'Lost': '#ef4444', // Red
  };

  // Format data for chart
  const chartData = data.map(item => ({
    stage: item.stage,
    count: item.count,
    totalValue: item.totalValue,
    weightedValue: item.weightedValue,
    winProbability: item.winProbability,
    averageValue: item.averageValue,
  }));

  if (data.length === 0) {
    return (
      <Card className={cn('bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark', className)}>
        <CardContent className="p-8">
          <div className="text-center text-amber-600/70">
            No pipeline data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">Total Pipeline</p>
                <p className="text-xl font-bold text-amber-200">
                  {formatCurrency(summary.totalValue, 'en', 'USD', { notation: 'compact' })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">Weighted Value</p>
                <p className="text-xl font-bold text-amber-200">
                  {formatCurrency(summary.totalWeightedValue, 'en', 'USD', { notation: 'compact' })}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">Total Deals</p>
                <p className="text-xl font-bold text-amber-200">{summary.totalCount}</p>
              </div>
              <Target className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600/70 mb-1">Win Rate</p>
                <p className="text-xl font-bold text-amber-200">
                  {summary.winRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-amber-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Chart */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Sales Pipeline by Stage</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            Pipeline value and deal count by stage with win probabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="stage"
                stroke="#d97706"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                yAxisId="value"
                stroke="#d97706"
                style={{ fontSize: '12px' }}
                label={{ value: 'Value', angle: -90, position: 'insideLeft', style: { fill: '#d97706' } }}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                stroke="#f59e0b"
                style={{ fontSize: '12px' }}
                label={{ value: 'Count', angle: 90, position: 'insideRight', style: { fill: '#f59e0b' } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #d97706',
                  borderRadius: '8px',
                  color: '#fbbf24',
                }}
                formatter={(value: unknown, name: string) => {
                  const num = Number(value ?? 0);
                  if (name === 'totalValue' || name === 'weightedValue' || name === 'averageValue') {
                    return [formatCurrency(num, 'en', 'USD'), name === 'totalValue' ? 'Total Value' : name === 'weightedValue' ? 'Weighted Value' : 'Avg Value'];
                  }
                  if (name === 'winProbability') {
                    return [`${num.toFixed(1)}%`, 'Win Probability'];
                  }
                  return [value, name === 'count' ? 'Deals' : name];
                }}
              />
              <Legend
                wrapperStyle={{ color: '#d97706' }}
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    totalValue: 'Total Value',
                    weightedValue: 'Weighted Value',
                    count: 'Deal Count',
                    winProbability: 'Win Probability',
                  };
                  return labels[value] || value;
                }}
              />
              <Bar
                yAxisId="value"
                dataKey="totalValue"
                name="totalValue"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={stageColors[entry.stage] || '#f59e0b'} />
                ))}
              </Bar>
              <Bar
                yAxisId="value"
                dataKey="weightedValue"
                name="weightedValue"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="count"
                dataKey="count"
                name="count"
                fill="#06b6d4"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stage Details Table */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-lg text-amber-200">Pipeline Stage Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-600/20">
                  <th className="text-left p-2 text-amber-300/70">Stage</th>
                  <th className="text-right p-2 text-amber-300/70">Deals</th>
                  <th className="text-right p-2 text-amber-300/70">Total Value</th>
                  <th className="text-right p-2 text-amber-300/70">Avg Value</th>
                  <th className="text-right p-2 text-amber-300/70">Win Prob.</th>
                  <th className="text-right p-2 text-amber-300/70">Weighted Value</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.stage} className="border-b border-amber-600/10">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stageColors[item.stage] || '#f59e0b' }}
                        />
                        <span className="text-amber-200">{item.stage}</span>
                      </div>
                    </td>
                    <td className="text-right p-2 text-amber-200">{item.count}</td>
                    <td className="text-right p-2 text-amber-200">
                      {formatCurrency(item.totalValue, 'en', 'USD')}
                    </td>
                    <td className="text-right p-2 text-amber-200">
                      {formatCurrency(item.averageValue, 'en', 'USD')}
                    </td>
                    <td className="text-right p-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-amber-600/30',
                          item.winProbability >= 70 ? 'bg-green-500/20 text-green-200' :
                          item.winProbability >= 40 ? 'bg-amber-500/20 text-amber-200' :
                          'bg-red-500/20 text-red-200'
                        )}
                      >
                        {item.winProbability.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right p-2 text-amber-200">
                      {formatCurrency(item.weightedValue, 'en', 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

