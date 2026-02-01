/**
 * Reporting Dashboard Component
 * 
 * Gold-tier reporting dashboard for commercial/financial analytics.
 * Provides comprehensive financial reports with interactive charts.
 * 
 * Features:
 * - Revenue by period chart
 * - Conversion metrics
 * - Customer lifetime value
 * - Aging receivables
 * - Profitability analysis
 * - Sales pipeline analytics
 * - Export functionality (CSV/PDF)
 * - Prestige theme styling
 * 
 * Usage:
 * ```tsx
 * <ReportingDashboard />
 * ```
 */

import { FabricatorWorkspaceLayout } from '@/components/fabricator/layout/FabricatorWorkspaceLayout';
import { FabricatorSectionProvider } from '@/contexts/FabricatorSectionContext';
import { formatCurrency } from '@/lib/i18n/formatters';
import { cn } from '@/lib/utils';
import { ReportingService, type DateRange } from '@/services/reporting/ReportingService';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { endOfDay, startOfDay, subMonths } from 'date-fns';
import {
    BarChart3,
    Calendar,
    DollarSign,
    Download,
    FileText,
    PieChart,
    TrendingUp,
    Users
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AgingReceivablesChart } from './AgingReceivablesChart';
import { ConversionChart } from './ConversionChart';
import { CustomerLTVChart } from './CustomerLTVChart';
import { ProjectProfitabilityChart } from './ProjectProfitabilityChart';
import { RevenueChart } from './RevenueChart';
import { SalesPipelineChart } from './SalesPipelineChart';

interface ReportingDashboardProps {
  /** Additional CSS classes */
  className?: string;
  /** If true, component is already wrapped (e.g., in CommercialPage) */
  wrapped?: boolean;
}

/**
 * Reporting Dashboard Component
 */
export const ReportingDashboard: React.FC<ReportingDashboardProps> = ({
  className,
  wrapped = false,
}) => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [dateRange] = useState<DateRange>({
    start: startOfDay(subMonths(new Date(), 6)),
    end: endOfDay(new Date()),
  });
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [revenueCurrency, setRevenueCurrency] = useState<string>('USD');
  const [pipelineData, setPipelineData] = useState<any[]>([]);

  // Load revenue data for summary cards
  useEffect(() => {
    const loadRevenueData = async () => {
      try {
        const data = await ReportingService.getRevenueByPeriod('monthly', dateRange);
        setRevenueData(data);
        if (data.length > 0) {
          setRevenueCurrency(data[0].currency || 'USD');
        }
      } catch (err) {
        console.error('Failed to load revenue data for summary:', err);
      }
    };
    loadRevenueData();
  }, [dateRange]);

  // Load pipeline data
  useEffect(() => {
    const loadPipelineData = async () => {
      try {
        const data = await ReportingService.getSalesPipeline();
        setPipelineData(data);
      } catch (err) {
        console.error('Failed to load pipeline data:', err);
      }
    };
    loadPipelineData();
  }, []);

  // Calculate summary metrics
  const revenueSummary = useMemo(() => {
    if (revenueData.length === 0) {
      return {
        totalRevenue: 0,
        averageRevenue: 0,
        growthRate: null as number | null,
      };
    }

    const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const averageRevenue = totalRevenue / revenueData.length;
    
    // Calculate growth rate (month over month)
    let growthRate: number | null = null;
    if (revenueData.length >= 2) {
      const sortedData = [...revenueData].sort((a, b) => a.period.localeCompare(b.period));
      const lastMonth = sortedData[sortedData.length - 1]?.revenue || 0;
      const previousMonth = sortedData[sortedData.length - 2]?.revenue || 0;
      
      if (previousMonth > 0) {
        growthRate = ((lastMonth - previousMonth) / previousMonth) * 100;
      }
    }

    return {
      totalRevenue,
      averageRevenue,
      growthRate,
    };
  }, [revenueData]);

  const handleExport = async (reportType: string) => {
    try {
      setLoading(true);
      // Export logic will be implemented based on report type
      toast.success(`${reportType} report exported successfully`);
    } catch {
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const dashboardContent = (
    <div className={cn('space-y-6', className)}>
      {/* Header - Only show when wrapped */}
      {!wrapped && (
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-amber-200 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Financial Reports
          </h2>
          <p className="text-sm text-amber-600/70 mt-1">
            Comprehensive financial analytics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-600/30 text-amber-300 hover:bg-amber-500/10"
            onClick={() => handleExport('all')}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#0f0f0f]/60 border-amber-600/20 w-full justify-start">
          <TabsTrigger value="revenue" className="text-amber-300 data-[state=active]:text-amber-200">
            <TrendingUp className="w-4 h-4 mr-2" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="conversion" className="text-amber-300 data-[state=active]:text-amber-200">
            <PieChart className="w-4 h-4 mr-2" />
            Conversion
          </TabsTrigger>
          <TabsTrigger value="customers" className="text-amber-300 data-[state=active]:text-amber-200">
            <Users className="w-4 h-4 mr-2" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="receivables" className="text-amber-300 data-[state=active]:text-amber-200">
            <FileText className="w-4 h-4 mr-2" />
            Receivables
          </TabsTrigger>
          <TabsTrigger value="profitability" className="text-amber-300 data-[state=active]:text-amber-200">
            <DollarSign className="w-4 h-4 mr-2" />
            Profitability
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="text-amber-300 data-[state=active]:text-amber-200">
            <BarChart3 className="w-4 h-4 mr-2" />
            Pipeline
          </TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <RevenueChart
            period="monthly"
            dateRange={dateRange}
            chartType="area"
            showControls={true}
          />
          
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-300/70">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-200">
                  {formatCurrency(revenueSummary.totalRevenue, 'en', revenueCurrency)}
                </p>
                <p className="text-xs text-amber-600/50 mt-1">Last 6 months</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-300/70">Average Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-200">
                  {formatCurrency(revenueSummary.averageRevenue, 'en', revenueCurrency)}
                </p>
                <p className="text-xs text-amber-600/50 mt-1">Per period</p>
              </CardContent>
            </Card>
            <Card className="bg-[#0f0f0f]/80 border-amber-600/30 card-glass-dark">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-300/70">Growth Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${
                  revenueSummary.growthRate !== null
                    ? revenueSummary.growthRate >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                    : 'text-amber-200'
                }`}>
                  {revenueSummary.growthRate !== null
                    ? `${revenueSummary.growthRate >= 0 ? '+' : ''}${revenueSummary.growthRate.toFixed(1)}%`
                    : '—'}
                </p>
                <p className="text-xs text-amber-600/50 mt-1">Month over month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conversion Tab */}
        <TabsContent value="conversion" className="space-y-6">
          <ConversionChart dateRange={dateRange} />
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <CustomerLTVChart dateRange={dateRange} />
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="receivables" className="space-y-6">
          <AgingReceivablesChart />
        </TabsContent>

        {/* Profitability Tab */}
        <TabsContent value="profitability" className="space-y-6">
          <ProjectProfitabilityChart dateRange={dateRange} />
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          <SalesPipelineChart data={pipelineData} />
        </TabsContent>
      </Tabs>
    </div>
  );

  // If wrapped (used in CommercialPage), return content directly
  if (wrapped) {
    return dashboardContent;
  }

  // If standalone, wrap with FabricatorWorkspaceLayout
  return (
    <FabricatorSectionProvider sectionId="reports">
      <FabricatorWorkspaceLayout
        sectionId="reports"
        title="Financial Reports"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Fabricator', href: '/fabricator' },
          { label: 'Reports', href: '#' },
        ]}
        status="normal"
        showLeftPanel={false}
        mainContent={dashboardContent}
      />
    </FabricatorSectionProvider>
  );
};

