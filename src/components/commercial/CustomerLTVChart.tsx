/**
 * CustomerLTVChart Component
 * 
 * Displays customer lifetime value metrics with interactive charts.
 * Features:
 * - Top customers by revenue
 * - LTV distribution
 * - Average order value trends
 * 
 * Prestige theme styling with glass morphism effects.
 */

import { ReportingService, type CustomerLTV, type DateRange } from '@/services/reporting/ReportingService';
import { Button } from '@/shared/ui/ui/button';
import { Card } from '@/shared/ui/ui/card';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

interface CustomerLTVChartProps {
  dateRange?: DateRange;
  className?: string;
}

export const CustomerLTVChart: React.FC<CustomerLTVChartProps> = ({ dateRange, className = '' }) => {
  const [data, setData] = useState<CustomerLTV[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(dateRange);

  useEffect(() => {
    void loadData();
  }, [selectedRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      const ltvData = await ReportingService.getCustomerLTV(selectedRange);
      setData(ltvData);
    } catch (error) {
      console.error('Failed to load customer LTV data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (months: number) => {
    const end = endOfMonth(new Date());
    const start = startOfMonth(subMonths(end, months - 1));
    setSelectedRange({ start, end });
  };

  // Prepare chart data (top 10 customers)
  const chartData = data.slice(0, 10).map(customer => ({
    name: customer.customerName.length > 20 
      ? customer.customerName.substring(0, 20) + '...' 
      : customer.customerName,
    fullName: customer.customerName,
    revenue: customer.totalRevenue,
    orders: customer.orderCount,
    avgOrder: customer.averageOrderValue,
    currency: customer.currency,
  }));

  // Calculate summary metrics
  const totalRevenue = data.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalOrders = data.reduce((sum, c) => sum + c.orderCount, 0);
  const avgLTV = data.length > 0 ? totalRevenue / data.length : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Removed unused colors object - using Prestige theme classes directly

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
          <Users className="w-16 h-16 mx-auto mb-4 text-slate-500 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">No Customer Data</h3>
          <p className="text-slate-500">No customer lifetime value data available for the selected period.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-6 bg-slate-900/50 border-amber-500/20 backdrop-blur-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-amber-400 mb-1">Customer Lifetime Value</h3>
          <p className="text-sm text-slate-400">Top customers by total revenue</p>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRange(undefined)}
            className="bg-slate-800/50 border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
          >
            All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
          <p className="text-sm text-slate-400 mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-amber-400">{data.length}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
          <p className="text-sm text-slate-400 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(totalRevenue, data[0]?.currency || 'EGP')}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
          <p className="text-sm text-slate-400 mb-1">Avg LTV</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(avgLTV, data[0]?.currency || 'EGP')}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-amber-500/10">
          <p className="text-sm text-slate-400 mb-1">Avg Order Value</p>
          <p className="text-2xl font-bold text-amber-400">
            {formatCurrency(avgOrderValue, data[0]?.currency || 'EGP')}
          </p>
        </div>
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
              tickFormatter={(value: unknown) => formatCurrency(Number(value ?? 0), chartData[0]?.currency || 'EGP', true)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                color: '#e2e8f0',
              }}
              formatter={(value: unknown, name: string, props: { payload?: { currency?: string } }) => {
                const currency = props.payload?.currency ?? 'EGP';
                if (name === 'revenue') {
                  return [formatCurrency(Number(value ?? 0), currency), 'Revenue'];
                }
                if (name === 'avgOrder') {
                  return [formatCurrency(Number(value ?? 0), currency), 'Avg Order'];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Customer: ${label}`}
            />
            <Legend
              wrapperStyle={{ color: '#94a3b8' }}
              iconType="circle"
            />
            <Bar
              dataKey="revenue"
              name="Total Revenue"
              fill="url(#revenueGradient)"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`rgba(245, 158, 11, ${0.7 + (index % 3) * 0.1})`} />
              ))}
            </Bar>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.3} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Customers Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-semibold">Customer</th>
              <th className="text-right py-3 px-4 text-slate-400 font-semibold">Revenue</th>
              <th className="text-right py-3 px-4 text-slate-400 font-semibold">Orders</th>
              <th className="text-right py-3 px-4 text-slate-400 font-semibold">Avg Order</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((customer, index) => (
              <tr
                key={customer.customerId}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-3 px-4 text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-mono text-xs">#{index + 1}</span>
                    {customer.customerName}
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-amber-400 font-semibold">
                  {formatCurrency(customer.totalRevenue, customer.currency)}
                </td>
                <td className="py-3 px-4 text-right text-slate-300">
                  {customer.orderCount}
                </td>
                <td className="py-3 px-4 text-right text-slate-400">
                  {formatCurrency(customer.averageOrderValue, customer.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

