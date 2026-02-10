/**
 * Material Utilization Chart
 * Visualizes material usage and waste over time
 * Migrated from Chart.js to Recharts (Phase 2)
 */

import React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface MaterialUtilizationChartProps {
  data: Array<{
    period: string;
    used: number;
    wasted: number;
    utilization: number;
  }>;
}

export const MaterialUtilizationChart: React.FC<MaterialUtilizationChartProps> = ({ data }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" />
          <XAxis
            dataKey="period"
            tick={{ fill: '#9ca3af' }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fill: '#9ca3af' }}
            stroke="#9ca3af"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: '#fff' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '0.5rem' }}
            formatter={(value) => <span style={{ color: '#9ca3af' }}>{value}</span>}
          />
          <Bar
            dataKey="used"
            name="Used (m)"
            fill="rgb(34, 197, 94)"
            fillOpacity={0.6}
            stroke="rgb(34, 197, 94)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="wasted"
            name="Wasted (m)"
            fill="rgb(239, 68, 68)"
            fillOpacity={0.6}
            stroke="rgb(239, 68, 68)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
