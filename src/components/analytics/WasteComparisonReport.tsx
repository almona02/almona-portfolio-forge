/**
 * Waste Comparison Report
 * Visual comparison showing manual vs optimized savings
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Progress } from '@/shared/ui/ui/progress';
import { TrendingDown, Package, DollarSign, BarChart3 } from 'lucide-react';
import type { WasteComparison } from '@/lib/analytics/WasteCalculator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface WasteComparisonReportProps {
  comparison: WasteComparison;
  currency?: string;
  onExportPDF?: () => void;
}

export const WasteComparisonReport: React.FC<WasteComparisonReportProps> = ({
  comparison,
  currency = 'EGP',
  onExportPDF,
}) => {
  const chartData = [
    {
      name: 'Manual',
      bars: comparison.manual.barsUsed,
      waste: comparison.manual.wastePercentage,
    },
    {
      name: 'Optimized',
      bars: comparison.optimized.barsUsed,
      waste: comparison.optimized.wastePercentage,
    },
  ];

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-400" />
            Waste Comparison Report
          </CardTitle>
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Export PDF
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 border-gray-700 card-dark">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-gray-400">Bars Used</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {comparison.optimized.barsUsed}
                </span>
                <span className="text-sm text-gray-500">
                  vs {comparison.manual.barsUsed} (manual)
                </span>
              </div>
              {comparison.savings.barsSaved > 0 && (
                <div className="mt-2 text-xs text-green-400">
                  Saved {comparison.savings.barsSaved} bar{comparison.savings.barsSaved !== 1 ? 's' : ''}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 card-dark">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Waste %</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {comparison.optimized.wastePercentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500">
                  vs {comparison.manual.wastePercentage.toFixed(1)}% (manual)
                </span>
              </div>
              {comparison.savings.wasteReduction > 0 && (
                <div className="mt-2 text-xs text-green-400">
                  Reduced by {comparison.savings.wasteReduction.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700 card-dark">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-xs text-gray-400">Savings</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {comparison.savings.costSavings.toFixed(0)} {currency}
              </div>
              <div className="mt-2 text-xs text-gray-400">
                On this job
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Chart */}
        <div>
          <h4 className="typography-h4 text-sm text-gray-300 mb-4">Visual Comparison</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
              />
              <Legend />
              <Bar dataKey="bars" fill="#F97316" name="Bars Used" />
              <Bar dataKey="waste" fill="#EAB308" name="Waste %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-3">
          <h4 className="typography-h4 text-sm text-gray-300">Detailed Breakdown</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
              <span className="text-sm text-gray-400">Manual Plan</span>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400">
                  {comparison.manual.barsUsed} bars
                </Badge>
                <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400">
                  {comparison.manual.wastePercentage.toFixed(1)}% waste
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
              <span className="text-sm text-gray-400">Fabricator Pro Optimized</span>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                  {comparison.optimized.barsUsed} bars
                </Badge>
                <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                  {comparison.optimized.wastePercentage.toFixed(1)}% waste
                </Badge>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded">
              <span className="text-sm font-semibold text-green-400">Total Savings</span>
              <div className="text-right">
                <div className="text-lg font-bold text-green-400">
                  {comparison.savings.costSavings.toFixed(0)} {currency}
                </div>
                <div className="text-xs text-gray-400">
                  {comparison.savings.barsSaved} bars saved •{' '}
                  {comparison.savings.wasteReduction.toFixed(1)}% waste reduction
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Waste Reduction</span>
            <span>{comparison.savings.wasteReduction.toFixed(1)}% improvement</span>
          </div>
          <Progress
            value={Math.min(100, (comparison.savings.wasteReduction / comparison.manual.wastePercentage) * 100)}
            className="h-2"
          />
        </div>
      </CardContent>
    </Card>
  );
};

