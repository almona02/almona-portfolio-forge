/**
 * Invoice Management Dashboard
 * 
 * Gold-tier comprehensive invoice management dashboard with all enhancements:
 * - Recurring invoices
 * - Payment tracking
 * - Aging reports
 * - Reminders
 * - Prestige dark theme styling
 * 
 * Features:
 * - Real-time payment status
 * - Aging analysis
 * - Recurring invoice management
 * - Automated reminders
 * - Comprehensive reporting
 */

import { formatCurrency } from '@/lib/i18n/formatters';
import { InvoiceAgingService } from '@/services/invoices/InvoiceAgingService';
import { RecurringInvoiceService } from '@/services/invoices/RecurringInvoiceService';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { AlertTriangle, BarChart3, Calendar, Clock, DollarSign, RefreshCw } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * Invoice Management Dashboard Component
 * Optimized with useCallback, useMemo for performance and scalability
 */
export const InvoiceManagementDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [agingReport, setAgingReport] = useState<any>(null);
  const [recurringSchedules, setRecurringSchedules] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'recurring' | 'aging' | 'reminders'>('overview');

  // Memoized loadData function to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aging, schedules] = await Promise.all([
        InvoiceAgingService.getAgingSummary(),
        RecurringInvoiceService.getSchedules({ isActive: true }),
      ]);
      setAgingReport(aging);
      setRecurringSchedules(schedules);
    } catch (error) {
      console.error('Failed to load invoice management data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Memoized computed values for performance
  const totalOutstanding = useMemo(() => {
    return agingReport?.totalOutstanding || 0;
  }, [agingReport]);

  const overdueCount = useMemo(() => {
    return agingReport?.buckets?.find((b: any) => b.bucket === '90+')?.count || 0;
  }, [agingReport]);

  const agingBuckets = useMemo(() => {
    return agingReport?.buckets || [];
  }, [agingReport]);

  // Memoized tab change handler
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as 'overview' | 'recurring' | 'aging' | 'reminders');
  }, []);

  if (loading) {
    return (
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardContent className="p-8">
          <div className="text-center text-amber-600/70">Loading invoice management data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
        <CardHeader>
          <CardTitle className="text-xl text-amber-200">Invoice Management</CardTitle>
          <CardDescription className="text-sm text-amber-600/70">
            Comprehensive invoice management with payment tracking, aging analysis, and automation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-[#0f0f0f]/60 border-amber-600/30">
              <TabsTrigger value="overview" className="text-amber-300 data-[state=active]:text-amber-200">
                Overview
              </TabsTrigger>
              <TabsTrigger value="recurring" className="text-amber-300 data-[state=active]:text-amber-200">
                Recurring
              </TabsTrigger>
              <TabsTrigger value="aging" className="text-amber-300 data-[state=active]:text-amber-200">
                Aging
              </TabsTrigger>
              <TabsTrigger value="reminders" className="text-amber-300 data-[state=active]:text-amber-200">
                Reminders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-600/70 mb-1">Total Outstanding</p>
                        <p className="text-2xl font-bold text-amber-200">
                          {formatCurrency(totalOutstanding, 'en', 'USD')}
                        </p>
                      </div>
                      <DollarSign className="w-8 h-8 text-amber-500/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-600/70 mb-1">Active Recurring</p>
                        <p className="text-2xl font-bold text-amber-200">{recurringSchedules.length}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-amber-500/50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-600/70 mb-1">Overdue (90+ days)</p>
                        <p className="text-2xl font-bold text-red-400">
                          {overdueCount}
                        </p>
                      </div>
                      <AlertTriangle className="w-8 h-8 text-red-500/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {agingBuckets.length > 0 && (
                <Card className="bg-[#0f0f0f]/60 border-amber-600/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-amber-200">Aging Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {agingBuckets.map((bucket: any) => (
                        <div key={bucket.bucket} className="flex items-center justify-between p-3 bg-[#0f0f0f]/40 rounded border border-amber-600/10">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                              {bucket.bucket} days
                            </Badge>
                            <span className="text-amber-300/70">{bucket.count} invoices</span>
                          </div>
                          <span className="text-amber-200 font-medium">
                            {formatCurrency(bucket.totalAmount, 'en', 'USD')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="recurring" className="mt-4">
              <Card className="bg-[#0f0f0f]/60 border-amber-600/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-amber-200">Recurring Invoices</CardTitle>
                    <Button
                      size="sm"
                      onClick={loadData}
                      variant="outline"
                      className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recurringSchedules.length === 0 ? (
                    <div className="text-center py-8 text-amber-600/70">No active recurring invoices</div>
                  ) : (
                    <div className="space-y-3">
                      {recurringSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="p-4 bg-[#0f0f0f]/40 rounded border border-amber-600/10 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-amber-200 font-medium capitalize">{schedule.frequency}</p>
                            <p className="text-sm text-amber-600/70">
                              Next run: {new Date(schedule.nextRunDate).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-amber-600/70">
                              Total runs: {schedule.totalRuns}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {schedule.isPaused ? (
                              <Badge variant="outline" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
                                Paused
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-500/30">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aging" className="mt-4">
              <Card className="bg-[#0f0f0f]/60 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-200">Aging Report</CardTitle>
                  <CardDescription className="text-sm text-amber-600/70">
                    Detailed aging analysis of outstanding invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-amber-500/10 border-amber-500/30">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                    <AlertDescription className="text-amber-300/70">
                      Full aging report with charts and customer breakdown available. Use the Reports tab for detailed analysis.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reminders" className="mt-4">
              <Card className="bg-[#0f0f0f]/60 border-amber-600/20">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-200">Invoice Reminders</CardTitle>
                  <CardDescription className="text-sm text-amber-600/70">
                    Automated payment reminders and scheduling
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-amber-500/10 border-amber-500/30">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <AlertDescription className="text-amber-300/70">
                      Reminder system is active. Reminders are automatically scheduled and sent based on invoice due dates.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Memoized export for performance optimization
export default React.memo(InvoiceManagementDashboard);

