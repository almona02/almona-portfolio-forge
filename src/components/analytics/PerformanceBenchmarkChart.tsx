/**
 * Performance Benchmark Chart
 * Visualizes algorithm performance over time
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import { performanceBenchmarker } from '@/lib/analytics/PerformanceBenchmarker';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

  const chartData = {
    labels: trends.map(t => new Date(t.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Average Duration (ms)',
        data: trends.map(t => t.averageDuration),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        yAxisID: 'y',
      },
      {
        label: 'Average Waste (%)',
        data: trends.map(t => t.averageWaste),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Performance Trends',
        color: '#fff',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
      x: {
        ticks: {
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
    },
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
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
          <Line data={chartData} options={chartOptions} />
        )}
      </CardContent>
    </Card>
  );
};

