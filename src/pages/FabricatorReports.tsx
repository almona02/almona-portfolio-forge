import { CostOptimizationInsights } from '@/components/analytics/CostOptimizationInsights';
import { MaterialEfficiencyDashboard } from '@/components/analytics/MaterialEfficiencyDashboard';
import { WasteComparisonReport } from '@/components/analytics/WasteComparisonReport';
import { InventoryDashboard } from '@/components/fabricator/InventoryDashboard';
import { PricingTuningStudio } from '@/components/fabricator/PricingTuningStudio';
import { useAuth } from '@/context/AuthContext';
import { WorkshopPerformanceAnalytics } from '@/lib/analytics/WorkshopPerformanceAnalytics';
import { userQueries } from '@/lib/database/optimizedQueries';
import { loadOwnedWorkshopInventory } from '@/lib/fabricator/inventory/ProfileInventoryAdapter';
import { profileInventoryValue } from '@/lib/fabricator/inventory/profileInventoryMapper';
import { formatCurrency } from '@/lib/i18n/formatters';
import { pricingAnalyticsService } from '@/lib/pricing/PricingAnalyticsService';
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
  const [activeTab, setActiveTab] = useState<'material' | 'quotes' | 'production' | 'analytics'>('material');
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
      // UP-09: shared owned-inventory adapter (finite costs, camelCase stock fields).
      const result = await loadOwnedWorkshopInventory({
        userId: user.id,
        syncFromMovements: false,
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
      return result.profiles;
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

    const totalValue = inventory.reduce(
      (sum, p) => sum + profileInventoryValue(p),
      0,
    );

    return {
      totalItems,
      lowStock,
      outOfStock,
      tuned,
      totalValue: Number.isFinite(totalValue) ? totalValue : 0,
      hasCost: inventory.some((p) => profileInventoryValue(p) > 0),
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
        totalAmount: 0,
        currency: 'EGP',
        currencies: [] as string[],
        byCurrency: new Map<string, number>(),
      };
    }

    let won = 0;
    let lost = 0;
    let draft = 0;
    const byCurrency = new Map<string, number>();

    for (const q of quotes) {
      const status = (q.status || '').toLowerCase();
      if (status === 'won' || status === 'accepted') won += 1;
      else if (status === 'lost' || status === 'rejected') lost += 1;
      else draft += 1;

      const amount = Number(q.total_amount || 0);
      if (!Number.isFinite(amount)) continue;
      const ccy = String(q.currency || 'EGP');
      byCurrency.set(ccy, (byCurrency.get(ccy) || 0) + amount);
    }

    const currencies = Array.from(byCurrency.keys());
    const primaryCurrency = currencies[0] || 'EGP';
    const totalAmount = byCurrency.get(primaryCurrency) || 0;

    return {
      total: quotes.length,
      won,
      lost,
      draft,
      totalAmount,
      currency: primaryCurrency,
      currencies,
      byCurrency,
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
      <Card className="bg-gradient-to-br from-background via-background to-black border-border shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="btn-primary">
                  <BarChart3 className="h-6 w-6 text-amber-400" />
                </div>
                {t('reports.title', 'Fabricator Reports Hub')}
              </CardTitle>
              <CardDescription className="text-foreground/80 text-sm">
                {t(
                  'reports.subtitle',
                  'Material, quotes, and production performance – tuned for aluminium/UPVC fabrication.',
                )}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Workspace:</span>
                <Badge
                  variant="outline"
                  className="bg-card/60 text-foreground border-border"
                >
                  {user.email || `${user.id.slice(0, 4)}…${user.id.slice(-4)}`}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Sources:</span>
                <Badge
                  variant="outline"
                  className="bg-card/60 text-foreground border-border"
                >
                  Inventory · owned
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-card/60 text-amber-200/80 border-amber-700/40"
                >
                  OEE · sample
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-background/70 rounded-lg p-4 border border-border/60">
              <div className="text-xs text-muted-foreground mb-1">Inventory Items</div>
              <div className="text-2xl font-semibold text-foreground">
                {materialStats.totalItems}
              </div>
            </div>
            <div className="bg-background/70 rounded-lg p-4 border border-border/60">
              <div className="text-xs text-muted-foreground mb-1">Tuned Profiles</div>
              <div className="text-2xl font-semibold text-success">
                {materialStats.tuned}
              </div>
            </div>
            <div className="bg-background/70 rounded-lg p-4 border border-border/60">
              <div className="text-xs text-muted-foreground mb-1">Quotes</div>
              <div className="text-2xl font-semibold text-info">
                {quoteStats.total}
              </div>
            </div>
            <div className="bg-background/70 rounded-lg p-4 border border-border/60">
              <div className="text-xs text-muted-foreground mb-1">Total Inventory Value</div>
              <div className="text-2xl font-semibold text-success">
                {materialStats.hasCost
                  ? formatCurrency(materialStats.totalValue, 'en', 'EGP')
                  : 'Not configured'}
              </div>
            </div>
            <div className="bg-background/70 rounded-lg p-4 border border-border/60 hidden lg:block">
              <div className="text-xs text-muted-foreground mb-1">OEE (Sample — not live)</div>
              <div className="text-2xl font-semibold text-amber-300">
                {oeeSummary.oee.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="bg-background/70 border-border">
        <CardContent className="p-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="space-y-4"
          >
            <TabsList className="bg-card/70 border border-border /80 card-dark">
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
              <TabsTrigger value="analytics">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
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
                <Card className="bg-background/80 border-border/70 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="h-4 w-4 text-amber-400" />
                      Stock Health Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs text-foreground">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Low Stock</div>
                        <div className="text-lg font-semibold text-amber-300">
                          {materialStats.lowStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Out of Stock</div>
                        <div className="text-lg font-semibold text-destructive">
                          {materialStats.outOfStock}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Tuned Coverage</div>
                        <div className="text-lg font-semibold text-success">
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

                <Card className="bg-background/80 border-border/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-success" />
                      Tuning Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-foreground">
                    <div className="flex justify-between items-center">
                      <span>Profiles Tuned</span>
                      <span className="font-semibold text-success">
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
                    <p className="text-[11px] text-muted-foreground">
                      Tuning data comes from Profile Tuning Studio. Prioritize tuning for high‑volume,
                      low‑stock profiles to reduce production risk.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Pricing Analytics Section */}
              <Card className="bg-background/80 border-border/70">
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
                  <CardDescription className="text-xs text-muted-foreground">
                    Monitor pricing configuration coverage and health metrics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-foreground">
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
                        <div className="bg-card/50 rounded-lg p-4 border border-border/60">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[11px] text-muted-foreground">Health Score</div>
                            <Shield
                              className={`h-4 w-4 ${
                                pricingHealth.overallHealth === 'excellent'
                                  ? 'text-success'
                                  : pricingHealth.overallHealth === 'good'
                                  ? 'text-success'
                                  : pricingHealth.overallHealth === 'fair'
                                  ? 'text-amber-400'
                                  : 'text-destructive'
                              }`}
                            />
                          </div>
                          <div
                            className={`text-2xl font-semibold ${
                              pricingHealth.overallHealth === 'excellent'
                                ? 'text-success'
                                : pricingHealth.overallHealth === 'good'
                                ? 'text-success'
                                : pricingHealth.overallHealth === 'fair'
                                ? 'text-amber-300'
                                : 'text-destructive'
                            }`}
                          >
                            {pricingHealth.healthScore}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 capitalize">
                            {pricingHealth.overallHealth}
                          </div>
                          <Progress
                            value={pricingHealth.healthScore}
                            className="h-1.5 mt-2"
                          />
                        </div>

                        {/* Coverage */}
                        <div className="bg-card/50 rounded-lg p-4 border border-border/60">
                          <div className="text-[11px] text-muted-foreground mb-2">Configuration Coverage</div>
                          <div className="text-2xl font-semibold text-info">
                            {Math.round(pricingCoverage.coveragePercentage)}%
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {pricingCoverage.configuredSystemPacks} / {pricingCoverage.totalSystemPacks} system packs
                          </div>
                          <Progress
                            value={pricingCoverage.coveragePercentage}
                            className="h-1.5 mt-2"
                          />
                        </div>

                        {/* Issues Count */}
                        <div className="bg-card/50 rounded-lg p-4 border border-border/60">
                          <div className="text-[11px] text-muted-foreground mb-2">Issues</div>
                          <div
                            className={`text-2xl font-semibold ${
                              pricingHealth.issues.length === 0
                                ? 'text-success'
                                : pricingHealth.issues.filter((i) => i.severity === 'high').length > 0
                                ? 'text-destructive'
                                : 'text-amber-300'
                            }`}
                          >
                            {pricingHealth.issues.length}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {pricingHealth.issues.filter((i) => i.severity === 'high').length} high priority
                          </div>
                        </div>
                      </div>

                      {/* Issues and Recommendations */}
                      {pricingHealth.issues.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
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
                                        ? 'text-destructive'
                                        : issue.severity === 'medium'
                                        ? 'text-amber-400'
                                        : 'text-info'
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
                          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-success" />
                            Recommendations
                          </h4>
                          <div className="space-y-1">
                            {pricingHealth.recommendations.slice(0, 2).map((rec, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-[10px] text-muted-foreground bg-card/50 rounded p-2 border border-border/60"
                              >
                                <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0 text-success" />
                                <div className="flex-1">
                                  <span>{rec.message}</span>
                                  {rec.action && (
                                    <div className="text-[9px] text-muted-foreground mt-0.5">{rec.action}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-[11px]">
                      Loading pricing analytics...
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deep dive inventory dashboard reuse */}
              <Suspense fallback={<div className="text-xs text-muted-foreground">Loading inventory analytics…</div>}>
                <InventoryDashboard
                  currency="EGP"
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
                <Card className="bg-background/80 border-border/70 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-info" />
                      Quote Funnel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-foreground">
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Total</div>
                        <div className="text-lg font-semibold text-foreground">
                          {quoteStats.total}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Won</div>
                        <div className="text-lg font-semibold text-success">
                          {quoteStats.won}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Lost</div>
                        <div className="text-lg font-semibold text-destructive">
                          {quoteStats.lost}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Draft</div>
                        <div className="text-lg font-semibold text-foreground">
                          {quoteStats.draft}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/60 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-muted-foreground">Total Quoted Amount</span>
                        <span className="text-sm font-semibold text-success">
                          {quoteStats.total === 0
                            ? 'Not recorded'
                            : quoteStats.currencies.length > 1
                              ? Array.from(quoteStats.byCurrency.entries())
                                  .map(([ccy, sum]) => formatCurrency(sum, 'en', ccy))
                                  .join(' · ')
                              : formatCurrency(quoteStats.totalAmount, 'en', quoteStats.currency)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-background/80 border-border/70 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-amber-300" />
                      Reports & Exports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-foreground">
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Use the Quick Reports panel inside each project to generate cutting lists,
                      machine exports, accessories, and glass reports with QR codes.
                    </p>
                    <Alert className="bg-card/80 border-border text-[11px] card-dark">
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
                <Card className="bg-background/80 border-border/70 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-success" />
                      OEE Summary (Sample)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-foreground">
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Availability</div>
                        <div className="text-lg font-semibold text-foreground">
                          {oeeSummary.availability.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Performance</div>
                        <div className="text-lg font-semibold text-foreground">
                          {oeeSummary.performance.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-1">Quality</div>
                        <div className="text-lg font-semibold text-foreground">
                          {oeeSummary.quality.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/60 mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-muted-foreground">Overall OEE</span>
                        <span className="text-sm font-semibold text-amber-300">
                          {oeeSummary.oee.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={oeeSummary.oee} className="h-2" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Hook this panel into real job & machine telemetry from Machine Twin Display and
                      Calibration Analytics to monitor actual factory performance.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-background/80 border-border/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-300" />
                      Risk & Quality Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-foreground">
                    <p className="text-[11px] text-muted-foreground">
                      Use the Quality Control module and Calibration Analytics to log inspection
                      results, defect rates, and feedback from QR‑enabled production labels. These
                      metrics will feed into this section in real time.
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-foreground">
                      <CheckCircle className="h-3 w-3 text-success" />
                      <span>EN 12210 structural and wind load checks available in engineering tools.</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <Suspense fallback={<div className="text-center py-8 text-muted-foreground">Loading analytics...</div>}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WasteComparisonReport />
                  <CostOptimizationInsights />
                </div>
                <MaterialEfficiencyDashboard />
              </Suspense>
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


