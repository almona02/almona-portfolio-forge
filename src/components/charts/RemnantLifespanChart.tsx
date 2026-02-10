/**
 * Remnant Lifespan Chart
 * Shows remnant age distribution and usage patterns
 * Migrated from Chart.js to Recharts (Phase 2.2)
 */

import React from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const AGE_COLORS = [
  'rgb(34, 197, 94)',
  'rgb(59, 130, 246)',
  'rgb(249, 115, 22)',
  'rgb(239, 68, 68)',
];

const STATUS_COLORS = ['rgb(34, 197, 94)', 'rgb(239, 68, 68)', 'rgb(156, 163, 175)'];

interface RemnantLifespanChartProps {
  data: {
    byAge: Array<{ range: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
}

export const RemnantLifespanChart: React.FC<RemnantLifespanChartProps> = ({ data }) => {
  const ageData = data.byAge.map((d) => ({ name: d.range, count: d.count }));
  const statusData = data.byStatus.map((d) => ({ name: d.status, value: d.count }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 className="typography-h4 text-sm font-medium mb-2 text-gray-300">By Age</h4>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} stroke="#9ca3af" />
              <YAxis tick={{ fill: '#9ca3af' }} stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="count" name="Remnants by Age" fill="rgb(34, 197, 94)" radius={[4, 4, 0, 0]}>
                {ageData.map((_, index) => (
                  <Cell key={index} fill={AGE_COLORS[index % AGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h4 className="typography-h4 text-sm font-medium mb-2 text-gray-300">By Status</h4>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {statusData.map((_, index) => (
                  <Cell key={index} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
