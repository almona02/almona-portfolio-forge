/**
 * Performance Benchmark Chart
 * Visualizes algorithm performance over time
 * Migrated from Chart.js to Recharts (Phase 2.2)
 */

import { performanceBenchmarker } from '@/lib/analytics/PerformanceBenchmarker';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import React, { useEffect, useState } from 'react';
import {
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface PerformanceBenchmarkChartProps {
  userId?: string;
}

export const PerformanceBenchmarkChart: React.FC<PerformanceBenchmarkChartProps> = ({ userId }) => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('adaptive');
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrends = async () => {
      setLoading(true);
      const data = await performanceBenchmarker.getPerformanceTrends(selectedAlgorithm, userId, 30);
      setTrends(data);
      setLoading(false);
    };

    loadTrends();
  }, [selectedAlgorithm, userId]);

  const chartData = trends.map((t) => ({
    name: new Date(t.date).toLocaleDateString(),
    date: t.date,
    averageDuration: t.averageDuration,
    averageWaste: t.averageWaste,
  }));

  return (
    <Card className="bg-gray-900 border-gray-700 card-dark">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Performance Benchmark</CardTitle>
          <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="greedy">Greedy</SelectItem>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="genetic">Genetic</SelectItem>
              <SelectItem value="adaptive">Adaptive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading benchmark data...</div>
        ) : trends.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No benchmark data available</div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 60, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} stroke="#9ca3af" />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="rgb(249, 115, 22)"
                  tick={{ fill: '#9ca3af' }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="rgb(239, 68, 68)"
                  tick={{ fill: '#9ca3af' }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Average Duration (ms)') return [value, name];
                    return [`${value}%`, name];
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '0.5rem' }}
                  formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="averageDuration"
                  name="Average Duration (ms)"
                  stroke="rgb(249, 115, 22)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(249, 115, 22)', strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="averageWaste"
                  name="Average Waste (%)"
                  stroke="rgb(239, 68, 68)"
                  strokeWidth={2}
                  dot={{ fill: 'rgb(239, 68, 68)', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
