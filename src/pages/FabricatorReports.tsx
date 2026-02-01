import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { PricingTuningStudio } from '@/components/fabricator/PricingTuningStudio';
import { useAuth } from '@/context/AuthContext';
import { WorkshopPerformanceAnalytics } from '@/lib/analytics/WorkshopPerformanceAnalytics';
import { userQueries } from '@/lib/database/optimizedQueries';
import { pricingAnalyticsService } from '@/lib/pricing/PricingAnalyticsService';
import { supabase } from '@/lib/supabase';
import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import type { Profile } from '@/types/fabricator';
import { WindowUnit } from '@/types/fabricator';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle,
    DollarSign,
    FileText,
    Package,
    Settings,
    Shield,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import React, { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const analytics = new WorkshopPerformanceAnalytics();

const getTuningStatus = (profile: Profile): 'untuned' | 'in_progress' | 'tuned' => {
  const specs = (profile as any).specifications || {};
  const raw = specs.tuningStatus as 'untuned' | 'in_progress' | 'tuned' | undefined;
  if (raw === 'tuned' || raw === 'in_progress' || raw === 'untuned') return raw;
  if ((profile as any).calibrations?.length || (profile as any).machiningMacros?.length) {
    return 'in_progress';
  }
  return 'untuned';
};

export const FabricatorReports: React.FC = () => {
  const { t } = useTranslation('fabricator');
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'material' | 'quotes' | 'production'>('material');
  const [showPricingStudio, setShowPricingStudio] = useState(false);
  const [pricingStudioSystemPackId, setPricingStudioSystemPackId] = useState<string | undefined>();
  const [pricingStudioProfileId, setPricingStudioProfileId] = useState<string | undefined>();

  const {
    data: inventory = [],
    error: inventoryError,
  } = useQuery<Profile[]>({
    queryKey: ['fabricator-reports-inventory', user?.id],
    enabled: !!user,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) return [];
      const db = supabase as any;

      // Ensure latest stock from movements (same as InventoryPage)
      try {
        await db.rpc('sync_stock_from_movements', { p_user_id: user.id });
      } catch (err) {
        console.warn('Failed to sync stock from movements for reports:', err);
      }

      const { data, error } = await db
        .from('fabricator_profiles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        ...p,
        stockQuantity: p.stock_quantity ? parseFloat(p.stock_quantity) : 0,
        minStockLevel: p.min_stock_level ? parseFloat(p.min_stock_level) : 0,
      })) as Profile[];
    },
  });

  const {
    data: profileWithQuotes,
    error: quotesError,
  } = useQuery<any>({
    queryKey: ['fabricator-reports-quotes', user?.id],
    enabled: !!user,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) return null;
      return userQueries.getUserProfile(user.id);
    },
  });

  const materialStats = useMemo(() => {
    const totalItems = inventory.length;
    const lowStock = inventory.filter(
      (p) => (p.stockQuantity || 0) <= (p.minStockLevel || 0),
    ).length;
    const outOfStock = inventory.filter((p) => (p.stockQuantity || 0) === 0).length;
    const tuned = inventory.filter((p) => getTuningStatus(p) === 'tuned').length;

    const totalValue = inventory.reduce((sum, p) => {
      const cost = (p as any).costPerMeter || 0;
      const qty = p.stockQuantity || 0;
      return sum + cost * qty;
    }, 0);

    return {
      totalItems,
      lowStock,
      outOfStock,
      tuned,
      totalValue: totalValue.toFixed(2),
    };
  }, [inventory]);

  const quoteStats = useMemo(() => {
    const quotes = (profileWithQuotes?.quotes || []) as any[];
    if (!quotes.length) {
      return {
        total: 0,
        won: 0,
        lost: 0,
        draft: 0,
        totalAmount: '0.00',
      };
    }

    let won = 0;
    let lost = 0;
    let draft = 0;
    let amount = 0;

    for (const q of quotes) {
      const status = (q.status || '').toLowerCase();
      if (status === 'won' || status === 'accepted') won += 1;
      else if (status === 'lost' || status === 'rejected') lost += 1;
      else draft += 1;

      amount += Number(q.total_amount || 0);
    }

    return {
      total: quotes.length,
      won,
      lost,
      draft,
      totalAmount: amount.toFixed(2),
    };
  }, [profileWithQuotes]);

  // Simple mocked OEE summary for now – ready to be replaced with real data.
  const oeeSummary = useMemo(() => {
    const metrics = analytics.calculateOEE({
      scheduledTime: 8,
      availableTime: 7,
      theoreticalOutput: 40,
      actualOutput: 34,
      goodOutput: 33,
    });

    return metrics;
  }, []);

  // Pricing analytics data
  const {
    data: pricingCoverage,
    error: pricingCoverageError,
  } = useQuery({
    queryKey: ['pricing-coverage', user?.id],
    enabled: !!user,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) return null;
      return pricingAnalyticsService.getPricingCoverage(user.id);
    },
  });

  const {
    data: pricingHealth,
    error: pricingHealthError,
  } = useQuery({
    queryKey: ['pricing-health', user?.id],
    enabled: !!user,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!user) return null;
      return pricingAnalyticsService.getPricingHealth(user.id);
    },
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Alert>
          <AlertDescription>
            Please log in to access Fabricator Pro reports.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-black border-slate-700 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="btn-primary">
                  <BarChart3 className="h-6 w-6 text-amber-400" />
                </div>
                {t('reports.title', 'Fabricator Reports Hub')}
              </CardTitle>
              <CardDescription className="text-slate-300/80 text-sm">
                {t(
                  'reports.subtitle',
                  'Material, quotes, and production performance – tuned for aluminium/UPVC fabrication.',
                )}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Workspace:</span>
                <Badge
                  variant="outline"
                  className="bg-slate-800/60 text-slate-200 border-slate-600"
                >
                  {user.email || `${user.id.slice(0, 4)}…${user.id.slice(-4)}`}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Status:</span>
                <span className="flex items-center gap-2 text-emerald-300">
                  <span className="w-2 h-2 rounded-full animate-pulse status-valid" />
                  Live data
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-700/60">
              <div className="text-xs text-slate-400 mb-1">Inventory Items</div>
              <div className="text-2xl font-semibold text-white">
                {materialStats.totalItems}
              </div>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-700/60">
              <div className="text-xs text-slate-400 mb-1">Tuned Profiles</div>
              <div className="text-2xl font-semibold text-emerald-300">
                {materialStats.tuned}
              </div>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-700/60">
              <div className="text-xs text-slate-400 mb-1">Quotes</div>
              <div className="text-2xl font-semibold text-sky-300">
                {quoteStats.total}
              </div>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-700/60">
              <div className="text-xs text-slate-400 mb-1">Total Inventory Value</div>
              <div className="text-2xl font-semibold text-green-300">
                ${materialStats.totalValue}
              </div>
            </div>
            <div className="bg-slate-900/70 rounded-lg p-4 border border-slate-700/60 hidden lg:block">
              <div className="text-xs text-slate-400 mb-1">OEE (Mock Summary)</div>
              <div className="text-2xl font-semibold text-purple-300">
                {oeeSummary.oee.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="bg-slate-900/70 border-slate-700">
        <CardContent className="p-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="space-y-4"
          >
            <TabsList className="bg-slate-800/70 border border-slate-700 /80 card-dark">
              <TabsTrigger value="material">
                <Package className="h-4 w-4 mr-2" />
                Material & Inventory
              </TabsTrigger>
              <TabsTrigger value="quotes">
                <FileText className="h-4 w-4 mr-2" />
                Quotes & Commercial
              </TabsTrigger>
              <TabsTrigger value="production">
                <Activity className="h-4 w-4 mr-2" />
                Production & Quality
              </TabsTrigger>
            </TabsList>

            {/* Material & Inventory Tab */}
            <TabsContent value="material" className="space-y-4">
              {inventoryError && (
                <Alert className="bg-red-900/30 border-red-700/60 text-xs">
                  <AlertDescription>
                    Failed to load inventory data. Please try refreshing the page.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="bg-slate-900/80 border-slate-700/70 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-amber-400" />
                      Stock Health Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs text-slate-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Low Stock</div>
                        <div className="text-lg font-semibold text-amber-300">
                          {materialStats.lowStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Out of Stock</div>
                        <div className="text-lg font-semibold text-red-300">
                          {materialStats.outOfStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Tuned Coverage</div>
                        <div className="text-lg font-semibold text-emerald-300">
                          {materialStats.totalItems > 0
                            ? `${Math.round(
                                (materialStats.tuned / materialStats.totalItems) * 100,
                              )}%`
                            : '0%'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/80 border-slate-700/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-emerald-300" />
                      Tuning Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-200">
                    <div className="flex justify-between items-center">
                      <span>Profiles Tuned</span>
                      <span className="font-semibold text-emerald-300">
                        {materialStats.tuned} / {materialStats.totalItems}
                      </span>
                    </div>
                    <Progress
                      value={
                        materialStats.totalItems > 0
                          ? (materialStats.tuned / materialStats.totalItems) * 100
                          : 0
                      }
                      className="h-2"
                    />
                    <p className="text-[11px] text-slate-400">
                      Tuning data comes from Profile Tuning Studio. Prioritize tuning for high‑volume,
                      low‑stock profiles to reduce production risk.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Pricing Analytics Section */}
              <Card className="bg-slate-900/80 border-slate-700/70">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-400" />
                      Pricing Configuration & Health
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPricingStudio(true);
                      }}
                      className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/30"
                    >
                      <Settings className="h-3 w-3 mr-1.5" />
                      Configure Pricing
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Monitor pricing configuration coverage and health metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-slate-200">
                  {pricingCoverageError || pricingHealthError ? (
                    <Alert className="bg-red-900/30 border-red-700/60 text-xs">
                      <AlertDescription>
                        Failed to load pricing analytics. Please try refreshing the page.
                      </AlertDescription>
                    </Alert>
                  ) : pricingCoverage && pricingHealth ? (
                    <>
                      {/* Health Score */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/60">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] text-slate-400">Health Score</div>
                            <Shield
                              className={`h-4 w-4 ${
                                pricingHealth.overallHealth === 'excellent'
                                  ? 'text-emerald-400'
                                  : pricingHealth.overallHealth === 'good'
                                  ? 'text-green-400'
                                  : pricingHealth.overallHealth === 'fair'
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            />
                          </div>
                          <div
                            className={`text-2xl font-semibold ${
                              pricingHealth.overallHealth === 'excellent'
                                ? 'text-emerald-300'
                                : pricingHealth.overallHealth === 'good'
                                ? 'text-green-300'
                                : pricingHealth.overallHealth === 'fair'
                                ? 'text-amber-300'
                                : 'text-red-300'
                            }`}
                          >
                            {pricingHealth.healthScore}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 capitalize">
                            {pricingHealth.overallHealth}
                          </div>
                          <Progress
                            value={pricingHealth.healthScore}
                            className="h-1.5 mt-2"
                          />
                        </div>

                        {/* Coverage */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/60">
                          <div className="text-[11px] text-slate-400 mb-2">Configuration Coverage</div>
                          <div className="text-2xl font-semibold text-sky-300">
                            {Math.round(pricingCoverage.coveragePercentage)}%
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {pricingCoverage.configuredSystemPacks} / {pricingCoverage.totalSystemPacks} system packs
                          </div>
                          <Progress
                            value={pricingCoverage.coveragePercentage}
                            className="h-1.5 mt-2"
                          />
                        </div>

                        {/* Issues Count */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/60">
                          <div className="text-[11px] text-slate-400 mb-2">Issues</div>
                          <div
                            className={`text-2xl font-semibold ${
                              pricingHealth.issues.length === 0
                                ? 'text-emerald-300'
                                : pricingHealth.issues.filter((i) => i.severity === 'high').length > 0
                                ? 'text-red-300'
                                : 'text-amber-300'
                            }`}
                          >
                            {pricingHealth.issues.length}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {pricingHealth.issues.filter((i) => i.severity === 'high').length} high priority
                          </div>
                        </div>
                      </div>

                      {/* Issues and Recommendations */}
                      {pricingHealth.issues.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-amber-400" />
                            Issues Found
                          </h4>
                          <div className="space-y-1">
                            {pricingHealth.issues.slice(0, 3).map((issue, idx) => (
                              <Alert
                                key={idx}
                                className={`text-[10px] ${
                                  issue.severity === 'high'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : issue.severity === 'medium'
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-blue-500/10 border-blue-500/30'
                                }`}
                              >
                                <AlertDescription className="flex items-start gap-2">
                                  <AlertTriangle
                                    className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                                      issue.severity === 'high'
                                        ? 'text-red-400'
                                        : issue.severity === 'medium'
                                        ? 'text-amber-400'
                                        : 'text-blue-400'
                                    }`}
                                  />
                                  <span>{issue.message}</span>
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {pricingHealth.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-emerald-400" />
                            Recommendations
                          </h4>
                          <div className="space-y-1">
                            {pricingHealth.recommendations.slice(0, 2).map((rec, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-[10px] text-slate-400 bg-slate-800/50 rounded p-2 border border-slate-700/60"
                              >
                                <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-emerald-400" />
                                <div className="flex-1">
                                  <span>{rec.message}</span>
                                  {rec.action && (
                                    <div className="text-[9px] text-slate-500 mt-0.5">{rec.action}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-[11px]">
                      Loading pricing analytics...
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deep dive inventory dashboard reuse */}
              <Suspense fallback={<div className="text-xs text-slate-400">Loading inventory analytics…</div>}>
                <InventoryDashboard
                  inventory={inventory}
                  project={null as WindowUnit | null}
                  userId={user.id}
                  viewMode="grid"
                />
              </Suspense>
            </TabsContent>

            {/* Quotes & Commercial Tab */}
            <TabsContent value="quotes" className="space-y-4">
              {quotesError && (
                <Alert className="bg-red-900/30 border-red-700/60 text-xs">
                  <AlertDescription>
                    Failed to load quote data. Please try again later.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900/80 border-slate-700/70 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-sky-300" />
                      Quote Funnel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-200">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Total</div>
                        <div className="text-lg font-semibold text-slate-100">
                          {quoteStats.total}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Won</div>
                        <div className="text-lg font-semibold text-emerald-300">
                          {quoteStats.won}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Lost</div>
                        <div className="text-lg font-semibold text-red-300">
                          {quoteStats.lost}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Draft</div>
                        <div className="text-lg font-semibold text-slate-300">
                          {quoteStats.draft}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-700/60 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Total Quoted Amount</span>
                        <span className="text-sm font-semibold text-green-300">
                          ${quoteStats.totalAmount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/80 border-slate-700/70 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-amber-300" />
                      Reports & Exports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-slate-200">
                    <p className="text-[11px] text-slate-400 mb-2">
                      Use the Quick Reports panel inside each project to generate cutting lists,
                      machine exports, accessories, and glass reports with QR codes.
                    </p>
                    <Alert className="bg-slate-800/80 border-slate-700 text-[11px] card-dark">
                      <AlertDescription className="flex items-start gap-2">
                        <Sparkles className="h-3 w-3 text-amber-300 mt-0.5" />
                        <span>
                          Future enhancement: aggregate quote profitability and margin analysis based on
                          actual optimized material usage and remnant reuse.
                        </span>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Production & Quality Tab */}
            <TabsContent value="production" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/80 border-slate-700/70 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-emerald-300" />
                      OEE Summary (Sample)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-200">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Availability</div>
                        <div className="text-lg font-semibold text-slate-100">
                          {oeeSummary.availability.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Performance</div>
                        <div className="text-lg font-semibold text-slate-100">
                          {oeeSummary.performance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1">Quality</div>
                        <div className="text-lg font-semibold text-slate-100">
                          {oeeSummary.quality.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-700/60 mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-slate-400">Overall OEE</span>
                        <span className="text-sm font-semibold text-purple-300">
                          {oeeSummary.oee.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={oeeSummary.oee} className="h-2" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Hook this panel into real job & machine telemetry from Machine Twin Display and
                      Calibration Analytics to monitor actual factory performance.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/80 border-slate-700/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                      Risk & Quality Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-slate-200">
                    <p className="text-[11px] text-slate-400">
                      Use the Quality Control module and Calibration Analytics to log inspection
                      results, defect rates, and feedback from QR‑enabled production labels. These
                      metrics will feed into this section in real time.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300">
                      <CheckCircle className="h-3 w-3 text-emerald-300" />
                      <span>EN 12210 structural and wind load checks available in engineering tools.</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Pricing Tuning Studio Modal */}
      {user && showPricingStudio && (
        <PricingTuningStudio
          systemPackId={pricingStudioSystemPackId}
          profileId={pricingStudioProfileId}
          userId={user.id}
          profiles={inventory}
          onClose={(saved) => {
            setShowPricingStudio(false);
            setPricingStudioSystemPackId(undefined);
            setPricingStudioProfileId(undefined);
            if (saved) {
              // Refetch pricing analytics when pricing is saved
              // React Query will automatically refetch due to query key invalidation
            }
          }}
          onPricingUpdated={(systemPackId) => {
            console.log('Pricing updated for system pack:', systemPackId);
            // Pricing analytics queries will auto-refetch
          }}
        />
      )}
    </div>
  );
};

export default FabricatorReports;


