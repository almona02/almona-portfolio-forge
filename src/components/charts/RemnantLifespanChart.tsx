/**
 * Remnant Lifespan Chart
 * Shows remnant age distribution and usage patterns
 */

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface RemnantLifespanChartProps {
  data: {
    byAge: Array<{ range: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
}

export const RemnantLifespanChart: React.FC<RemnantLifespanChartProps> = ({ data }) => {
  const ageChartData = {
    labels: data.byAge.map(d => d.range),
    datasets: [
      {
        label: 'Remnants by Age',
        data: data.byAge.map(d => d.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(249, 115, 22, 0.6)',
          'rgba(239, 68, 68, 0.6)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(249, 115, 22)',
          'rgb(239, 68, 68)',
        ],
      },
    ],
  };

  const statusChartData = {
    labels: data.byStatus.map(d => d.status),
    datasets: [
      {
        label: 'Remnants by Status',
        data: data.byStatus.map(d => d.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(156, 163, 175, 0.6)',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9ca3af',
        },
      },
      title: {
        display: true,
        text: 'Remnant Distribution',
        color: '#fff',
      },
    },
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="text-sm font-medium mb-2 text-gray-300">By Age</h4>
        <Bar data={ageChartData} options={chartOptions} />
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-gray-300">By Status</h4>
        <Doughnut data={statusChartData} options={chartOptions} />
      </div>
    </div>
  );
};

