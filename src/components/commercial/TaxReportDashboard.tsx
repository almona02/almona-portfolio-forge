/**
 * Tax Report Dashboard
 * 
 * Gold-tier tax reporting dashboard with regional tax summaries,
 * detailed reports, and compliance tracking.
 * 
 * Features:
 * - Tax summary by period
 * - Regional tax breakdown
 * - Exemption reports
 * - CSV export
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <TaxReportDashboard region="EG" />
 * ```
 */

import { formatCurrency } from '@/lib/i18n/formatters';
import { TaxReportingService, type TaxRegion, type TaxReportEntry, type TaxSummary } from '@/lib/tax';
import { cn } from '@/lib/utils';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/ui/table';
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth, subMonths } from 'date-fns';
import {
    AlertCircle,
    Calendar,
    DollarSign,
    Download,
    FileText,
    RefreshCw,
    TrendingUp,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

interface TaxReportDashboardProps {
  /** Tax region */
  region: TaxRegion;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Tax Report Dashboard Component
 */
export const TaxReportDashboard: React.FC<TaxReportDashboardProps> = ({
  region,
  className,
}) => {
  const [loading, setLoading] = useState(false);
  const [taxSummary, setTaxSummary] = useState<TaxSummary | null>(null);
  const [taxReport, setTaxReport] = useState<TaxReportEntry[]>([]);
  const [dateRange, setDateRange] = useState({
    start: startOfDay(subMonths(new Date(), 1)),
    end: endOfDay(new Date()),
  });
  const [period, setPeriod] = useState<'month' | 'quarter' | 'custom'>('month');

  const loadTaxData = async () => {
    setLoading(true);
    try {
      const [summary, report] = await Promise.all([
        TaxReportingService.getTaxSummary(dateRange, region),
        TaxReportingService.getTaxReport(dateRange, region),
      ]);
      setTaxSummary(summary);
      setTaxReport(report);
    } catch (error) {
      console.error('Failed to load tax data:', error);
      toast.error('Failed to load tax data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTaxData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, dateRange.start, dateRange.end]);

  const handlePeriodChange = (newPeriod: 'month' | 'quarter' | 'custom') => {
    setPeriod(newPeriod);
    const now = new Date();
    if (newPeriod === 'month') {
      setDateRange({
        start: startOfDay(startOfMonth(now)),
        end: endOfDay(endOfMonth(now)),
      });
    } else if (newPeriod === 'quarter') {
      const quarterStart = startOfMonth(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1));
      const quarterEnd = endOfMonth(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 2, 1));
      setDateRange({
        start: startOfDay(quarterStart),
        end: endOfDay(quarterEnd),
      });
    }
  };

  const handleExport = () => {
    if (taxReport.length === 0) {
      toast.warning('No data to export');
      return;
    }
    TaxReportingService.exportTaxReportToCSV(
      taxReport,
      `tax-report-${region}-${format(dateRange.start, 'yyyy-MM-dd')}-${format(dateRange.end, 'yyyy-MM-dd')}`
    );
    toast.success('Tax report exported');
  };

  const chartData = useMemo(() => {
    if (!taxSummary) return [];
    return taxSummary.taxBreakdown.map(item => ({
      rate: `${(item.rate * 100).toFixed(1)}%`,
      taxableAmount: item.taxableAmount,
      taxAmount: item.taxAmount,
    }));
  }, [taxSummary]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Period Selection */}
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-amber-200 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Tax Report Period
              </CardTitle>
              <CardDescription className="text-sm text-amber-600/70 mt-1">
                Select period for tax reporting
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => void loadTaxData()}
                variant="outline"
                size="sm"
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                disabled={taxReport.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-sm text-amber-300/70 mb-2 block">Period</Label>
              <Select value={period} onValueChange={(v) => handlePeriodChange(v as 'month' | 'quarter' | 'custom')}>
                <SelectTrigger className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0f0f0f] border-amber-600/30">
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === 'custom' && (
              <>
                <div>
                  <Label className="text-sm text-amber-300/70 mb-2 block">Start Date</Label>
                  <Input
                    type="date"
                    value={format(dateRange.start, 'yyyy-MM-dd')}
                    onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
                    className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                  />
                </div>
                <div>
                  <Label className="text-sm text-amber-300/70 mb-2 block">End Date</Label>
                  <Input
                    type="date"
                    value={format(dateRange.end, 'yyyy-MM-dd')}
                    onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
                    className="bg-[#0f0f0f]/60 border-amber-600/30 text-amber-200"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          </CardContent>
        </Card>
      ) : taxSummary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600/70 mb-1">Total Sales</p>
                    <p className="text-2xl font-bold text-amber-200">
                      {formatCurrency(taxSummary.totalSales, 'en', taxSummary.currency, { notation: 'compact' })}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600/70 mb-1">Taxable Amount</p>
                    <p className="text-2xl font-bold text-amber-200">
                      {formatCurrency(taxSummary.totalTaxable, 'en', taxSummary.currency, { notation: 'compact' })}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600/70 mb-1">Total Tax</p>
                    <p className="text-2xl font-bold text-amber-200">
                      {formatCurrency(taxSummary.totalTax, 'en', taxSummary.currency, { notation: 'compact' })}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600/70 mb-1">Exempt Amount</p>
                    <p className="text-2xl font-bold text-amber-200">
                      {formatCurrency(taxSummary.exemptionAmount, 'en', taxSummary.currency, { notation: 'compact' })}
                    </p>
                    <p className="text-xs text-amber-600/50 mt-1">
                      {taxSummary.exemptionCount} certificates
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tax Breakdown Chart */}
          {chartData.length > 0 && (
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardHeader>
                <CardTitle className="text-lg text-amber-200">Tax Breakdown by Rate</CardTitle>
                <CardDescription className="text-sm text-amber-600/70">
                  Taxable amounts and tax collected by tax rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="rate" stroke="#d97706" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#d97706" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #d97706',
                        borderRadius: '8px',
                        color: '#fbbf24',
                      }}
                      formatter={(value: unknown) => formatCurrency(Number(value ?? 0), 'en', taxSummary.currency)}
                    />
                    <Legend wrapperStyle={{ color: '#d97706' }} />
                    <Bar dataKey="taxableAmount" name="Taxable Amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="taxAmount" name="Tax Amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detailed Report Table */}
          <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
            <CardHeader>
              <CardTitle className="text-lg text-amber-200">Detailed Tax Report</CardTitle>
              <CardDescription className="text-sm text-amber-600/70">
                {taxReport.length} transactions in period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taxReport.length === 0 ? (
                <div className="text-center py-8 text-amber-600/70">
                  No tax data for this period
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#0f0f0f]/60 border-amber-600/20">
                        <TableHead className="text-amber-300/70">Date</TableHead>
                        <TableHead className="text-amber-300/70">Invoice</TableHead>
                        <TableHead className="text-amber-300/70">Customer</TableHead>
                        <TableHead className="text-amber-300/70 text-right">Subtotal</TableHead>
                        <TableHead className="text-amber-300/70 text-right">Tax</TableHead>
                        <TableHead className="text-amber-300/70 text-right">Total</TableHead>
                        <TableHead className="text-amber-300/70">Rate</TableHead>
                        <TableHead className="text-amber-300/70">Exemption</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxReport.map((entry, index) => (
                        <TableRow key={index} className="border-amber-600/10">
                          <TableCell className="text-amber-200">
                            {format(entry.date, 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-amber-200 font-mono text-sm">
                            {entry.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-amber-200">{entry.customerName}</TableCell>
                          <TableCell className="text-right text-amber-200">
                            {formatCurrency(entry.subtotal, 'en', entry.currency)}
                          </TableCell>
                          <TableCell className="text-right text-amber-200">
                            {formatCurrency(entry.taxAmount, 'en', entry.currency)}
                          </TableCell>
                          <TableCell className="text-right text-amber-200">
                            {formatCurrency(entry.total, 'en', entry.currency)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                              {(entry.taxRate * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entry.exemptionCertificate ? (
                              <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-500/30">
                                {entry.exemptionCertificate.slice(0, 8)}...
                              </Badge>
                            ) : (
                              <span className="text-amber-600/50">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
};

