/**
 * AgingReceivablesChart Component
 * 
 * Displays aging receivables analysis with breakdown by aging buckets.
 * Features:
 * - Aging buckets (0-30, 31-60, 61-90, 90+ days)
 * - Outstanding amounts by bucket
 * - Detailed receivables table
 * 
 * Prestige theme styling with glass morphism effects.
 */

import { ReportingService, type AgingReceivable } from '@/services/reporting/ReportingService';
import { Button } from '@/shared/ui/ui/button';
import { Card } from '@/shared/ui/ui/card';
import { FileText, RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
// Simple currency formatter
const formatCurrency = (amount: number, currency: string = 'EGP', compact: boolean = false): string => {
  if (compact && amount >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

interface AgingReceivablesChartProps {
  className?: string;
}

export const AgingReceivablesChart: React.FC<AgingReceivablesChartProps> = ({ className = '' }) => {
  const [data, setData] = useState<AgingReceivable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const receivables = await ReportingService.getAgingReceivables();
      setData(receivables);
    } catch (error) {
      console.error('Failed to load aging receivables:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group by aging bucket
  const bucketData = data.reduce((acc, rec) => {
    const bucket = rec.agingBucket;
    if (!acc[bucket]) {
      acc[bucket] = { bucket, count: 0, total: 0, currency: rec.currency };
    }
    acc[bucket].count += 1;
    acc[bucket].total += rec.outstandingAmount;
    return acc;
  }, {} as Record<string, { bucket: string; count: number; total: number; currency: string }>);

  const bucketArray = Object.values(bucketData).sort((a, b) => {
    const order = { '0-30': 1, '31-60': 2, '61-90': 3, '90+': 4 };
    return (order[a.bucket as keyof typeof order] || 0) - (order[b.bucket as keyof typeof order] || 0);
  });

  // Calculate totals
  const totalOutstanding = data.reduce((sum, rec) => sum + rec.outstandingAmount, 0);
  const totalCount = data.length;
  const currency = data[0]?.currency || 'EGP';

  // Prestige theme colors for buckets
  const bucketColors: Record<string, string> = {
    '0-30': '#10b981',   // Green - current
    '31-60': '#f59e0b',  // Amber - warning
    '61-90': '#f97316',  // Orange - caution
    '90+': '#ef4444',    // Red - critical
  };

  // pieColors computed for PieChart Cell components (used inline below)
  const _pieColors = bucketArray.map(b => bucketColors[b.bucket] || '#94a3b8');

  if (loading) {
    return (
      <Card className={`p-6 bg-slate-900/50 border-amber-500/20 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={`p-6 bg-slate-900/50 border-amber-500/20 ${className}`}>
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Outstanding Receivables</h3>
          <p className="text-slate-500">All invoices are paid up to date.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 bg-slate-900/50 border-amber-500/20 backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-amber-400 mb-1">Aging Receivables</h3>
          <p className="text-sm text-slate-400">Outstanding invoices by aging period</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="bg-slate-800/50 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
          <p className="text-sm text-slate-400 mb-1">Total Outstanding</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(totalOutstanding, currency)}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
          <p className="text-sm text-slate-400 mb-1">Total Invoices</p>
          <p className="text-2xl font-bold text-slate-300">{totalCount}</p>
        </div>
        {bucketArray.map(bucket => (
          <div
            key={bucket.bucket}
            className="bg-slate-800/50 rounded-lg p-4 border"
            style={{ borderColor: `${bucketColors[bucket.bucket]}40` }}
          >
            <p className="text-sm text-slate-400 mb-1">{bucket.bucket} Days</p>
            <p className="text-2xl font-bold" style={{ color: bucketColors[bucket.bucket] }}>
              {formatCurrency(bucket.total, bucket.currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{bucket.count} invoices</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-semibold text-slate-400 mb-4">Distribution by Aging Bucket</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={bucketArray}
                dataKey="total"
                nameKey="bucket"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ bucket, total, currency }) => 
                  `${bucket}: ${formatCurrency(total, currency, true)}`
                }
              >
                {bucketArray.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={bucketColors[entry.bucket]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                formatter={(value: any, name: string, props: any) => [
                  formatCurrency(value, props.payload.currency),
                  'Outstanding'
                ]}
              />
              <Legend
                wrapperStyle={{ color: '#94a3b8' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div>
          <h4 className="text-sm font-semibold text-slate-400 mb-4">Amount by Bucket</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bucketArray} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis
                dataKey="bucket"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value, currency, true)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                formatter={(value: any, name: string, props: any) => [
                  formatCurrency(value, props.payload.currency),
                  'Outstanding'
                ]}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {bucketArray.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={bucketColors[entry.bucket]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="mt-6">
        <h4 className="text-sm font-semibold text-slate-400 mb-4">Detailed Receivables</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Invoice</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Customer</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Total</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Paid</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Outstanding</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Days Old</th>
                <th className="text-center py-3 px-4 text-slate-400 font-semibold">Bucket</th>
              </tr>
            </thead>
            <tbody>
              {data.map((rec) => (
                <tr
                  key={rec.invoiceId}
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                    {rec.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {rec.customerName}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {formatCurrency(rec.totalAmount, rec.currency)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {formatCurrency(rec.paidAmount, rec.currency)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold" style={{ color: bucketColors[rec.agingBucket] }}>
                    {formatCurrency(rec.outstandingAmount, rec.currency)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400">
                    {rec.daysOld}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: `${bucketColors[rec.agingBucket]}20`,
                        color: bucketColors[rec.agingBucket],
                      }}
                    >
                      {rec.agingBucket}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

