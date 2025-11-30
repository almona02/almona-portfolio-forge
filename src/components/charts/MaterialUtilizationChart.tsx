/**
 * Material Utilization Chart
 * Visualizes material usage and waste over time
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
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MaterialUtilizationChartProps {
  data: Array<{
    period: string;
    used: number;
    wasted: number;
    utilization: number;
  }>;
}

export const MaterialUtilizationChart: React.FC<MaterialUtilizationChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map(d => d.period),
    datasets: [
      {
        label: 'Used (m)',
        data: data.map(d => d.used),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
        borderColor: 'rgb(34, 197, 94)',
      },
      {
        label: 'Wasted (m)',
        data: data.map(d => d.wasted),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: 'rgb(239, 68, 68)',
      },
    ],
  };

  const options = {
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
        text: 'Material Utilization',
        color: '#fff',
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      y: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

