/**
 * ProductionDashboard - Production Monitoring Dashboard
 * 
 * Displays real-time metrics, Egyptian workshop impact, performance trends,
 * and alert management for production operations.
 * 
 * Week 6 Task 6.1: Production Dashboard
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Progress } from '@/shared/ui/ui/progress';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  MemoryStick,
  Shield,
  Users,
  BarChart3,
} from 'lucide-react';
import {
  ProductionMonitor,
  ProductionMetrics,
  Alert as ProductionAlert,
} from '@/lib/monitoring/ProductionMonitor';

export function ProductionDashboard() {
  const { t: _t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('ar') ? 'ar' : 'en';
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [alerts, setAlerts] = useState<ProductionAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const monitor = ProductionMonitor.getInstance();

  useEffect(() => {
    // Start monitoring
    monitor.startMonitoring(5000); // Update every 5 seconds

    // Set up metrics listener
    const metricsListener = (newMetrics: ProductionMetrics) => {
      setMetrics(newMetrics);
      setIsLoading(false);
    };

    // Set up alert listener
    const alertListener = (alert: ProductionAlert) => {
      setAlerts(prev => {
        const existing = prev.find(a => a.id === alert.id);
        if (existing) {
          return prev.map(a => (a.id === alert.id ? alert : a));
        }
        return [alert, ...prev].slice(0, 50); // Keep last 50 alerts
      });
    };

    monitor.addMetricsListener(metricsListener);
    monitor.addAlertListener(alertListener);

    // Initial load
    setMetrics(monitor.getMetrics());
    setAlerts(monitor.getAlerts());
    setIsLoading(false);

    return () => {
      monitor.removeMetricsListener(metricsListener);
      monitor.removeAlertListener(alertListener);
      monitor.stopMonitoring();
    };
  }, [monitor]);

  const resolveAlert = (alertId: string) => {
    monitor.resolveAlert(alertId);
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, resolved: true } : a)));
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {locale === 'ar' ? 'جارٍ تحميل البيانات...' : 'Loading metrics...'}
          </p>
        </div>
      </div>
    );
  }

  const unresolvedAlerts = alerts.filter(a => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter(a => a.severity === 'critical');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {locale === 'ar' ? 'لوحة تحكم الإنتاج' : 'Production Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === 'ar'
              ? 'مراقبة الأداء والجودة في الوقت الفعلي'
              : 'Real-time performance and quality monitoring'}
          </p>
        </div>
        <Badge variant={criticalAlerts.length > 0 ? 'destructive' : 'default'}>
          {criticalAlerts.length > 0
            ? `${criticalAlerts.length} ${locale === 'ar' ? 'تنبيهات حرجة' : 'Critical Alerts'}`
            : locale === 'ar'
            ? 'جميع الأنظمة تعمل بشكل طبيعي'
            : 'All Systems Operational'}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Workflow Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {locale === 'ar' ? 'معدل نجاح سير العمل' : 'Workflow Success Rate'}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.workflow.successRate.toFixed(1)}%</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
              {metrics.workflow.withinTarget ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>
                    {locale === 'ar'
                      ? 'ضمن الهدف'
                      : `Within target (${(metrics.workflow.averageDuration / 60000).toFixed(1)} min)`}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  <span>
                    {locale === 'ar'
                      ? 'يتجاوز الهدف'
                      : `Exceeds target (${(metrics.workflow.averageDuration / 60000).toFixed(1)} min)`}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Accuracy Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {locale === 'ar' ? 'الدقة الإجمالية' : 'Overall Accuracy'}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accuracy.overallAccuracy.toFixed(2)}%</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
              {metrics.accuracy.withinTarget ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>
                    {locale === 'ar'
                      ? `الهدف: ${metrics.accuracy.targetAccuracy}%`
                      : `Target: ${metrics.accuracy.targetAccuracy}%`}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span>
                    {locale === 'ar'
                      ? `أقل من الهدف (${metrics.accuracy.targetAccuracy}%)`
                      : `Below target (${metrics.accuracy.targetAccuracy}%)`}
                  </span>
                </>
              )}
            </div>
            <Progress
              value={metrics.accuracy.overallAccuracy}
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Memory Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {locale === 'ar' ? 'استخدام الذاكرة' : 'Memory Usage'}
            </CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.memory.currentStats
                ? `${metrics.memory.currentStats.usagePercent.toFixed(1)}%`
                : 'N/A'}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
              {metrics.memory.isCriticalMemory ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span>{locale === 'ar' ? 'حرج' : 'Critical'}</span>
                </>
              ) : metrics.memory.isLowMemory ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  <span>{locale === 'ar' ? 'منخفض' : 'Low'}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>{locale === 'ar' ? 'طبيعي' : 'Normal'}</span>
                </>
              )}
            </div>
            {metrics.memory.currentStats && (
              <Progress
                value={metrics.memory.currentStats.usagePercent}
                className="mt-2"
              />
            )}
          </CardContent>
        </Card>

        {/* Security Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {locale === 'ar' ? 'الأحداث الأمنية' : 'Security Events'}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.security.totalEvents}</div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
              {metrics.security.criticalEvents > 0 ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  <span>
                    {locale === 'ar'
                      ? `${metrics.security.criticalEvents} حرجة`
                      : `${metrics.security.criticalEvents} critical`}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>{locale === 'ar' ? 'لا توجد أحداث حرجة' : 'No critical events'}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Egyptian Workshop Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {locale === 'ar' ? 'تأثير ورش العمل المصرية' : 'Egyptian Workshop Impact'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {locale === 'ar' ? 'ورش العمل النشطة' : 'Active Workshops'}
              </div>
              <div className="text-2xl font-bold">{metrics.egyptianWorkshop.activeWorkshops}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                {locale === 'ar' ? 'إجمالي سير العمل' : 'Total Workflows'}
              </div>
              <div className="text-2xl font-bold">{metrics.egyptianWorkshop.totalWorkflows}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                {locale === 'ar' ? 'تقليل هدر المواد' : 'Material Waste Reduction'}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {metrics.egyptianWorkshop.materialWasteReduction}%
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                {locale === 'ar' ? 'توفير الوقت' : 'Time Savings'}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {metrics.egyptianWorkshop.timeSavings}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Performance Trends */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">
            {locale === 'ar' ? 'التنبيهات' : 'Alerts'} ({unresolvedAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="trends">
            {locale === 'ar' ? 'الاتجاهات' : 'Performance Trends'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {unresolvedAlerts.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>
                {locale === 'ar' ? 'لا توجد تنبيهات' : 'No Alerts'}
              </AlertTitle>
              <AlertDescription>
                {locale === 'ar'
                  ? 'جميع الأنظمة تعمل بشكل طبيعي'
                  : 'All systems are operating normally'}
              </AlertDescription>
            </Alert>
          ) : (
            unresolvedAlerts.map(alert => (
              <Alert
                key={alert.id}
                variant={alert.severity === 'critical' ? 'destructive' : 'default'}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {locale === 'ar' ? alert.titleAr : alert.title}
                </AlertTitle>
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>{locale === 'ar' ? alert.messageAr : alert.message}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      {locale === 'ar' ? 'حل' : 'Resolve'}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(alert.timestamp).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                </AlertDescription>
              </Alert>
            ))
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Performance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {locale === 'ar' ? 'اتجاه الأداء' : 'Performance Trend'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {metrics.performance.trend === 'improving' ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="text-green-600 font-semibold">
                        {locale === 'ar' ? 'تحسن' : 'Improving'}
                      </span>
                    </>
                  ) : metrics.performance.trend === 'degrading' ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <span className="text-red-600 font-semibold">
                        {locale === 'ar' ? 'تدهور' : 'Degrading'}
                      </span>
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-5 w-5 text-gray-500" />
                      <span className="text-gray-600 font-semibold">
                        {locale === 'ar' ? 'مستقر' : 'Stable'}
                      </span>
                    </>
                  )}
                </div>
                {metrics.performance.currentBaseline && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'مدة سير العمل' : 'Workflow Duration'}</span>
                      <span>
                        {(metrics.performance.currentBaseline.workflowDuration / 60000).toFixed(1)}{' '}
                        {locale === 'ar' ? 'دقيقة' : 'min'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'معدل الدقة' : 'Accuracy Rate'}</span>
                      <span>{metrics.performance.currentBaseline.accuracyRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{locale === 'ar' ? 'معدل الخطأ' : 'Error Rate'}</span>
                      <span>{metrics.performance.currentBaseline.errorRate.toFixed(2)}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {locale === 'ar' ? 'صحة النظام' : 'System Health'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{locale === 'ar' ? 'سير العمل' : 'Workflow'}</span>
                      <span className={metrics.workflow.withinTarget ? 'text-green-600' : 'text-red-600'}>
                        {metrics.workflow.withinTarget
                          ? locale === 'ar'
                            ? 'صحي'
                            : 'Healthy'
                          : locale === 'ar'
                          ? 'تحذير'
                          : 'Warning'}
                      </span>
                    </div>
                    <Progress
                      value={(metrics.workflow.averageDuration / metrics.workflow.targetDuration) * 100}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{locale === 'ar' ? 'الدقة' : 'Accuracy'}</span>
                      <span className={metrics.accuracy.withinTarget ? 'text-green-600' : 'text-red-600'}>
                        {metrics.accuracy.withinTarget
                          ? locale === 'ar'
                            ? 'صحي'
                            : 'Healthy'
                          : locale === 'ar'
                          ? 'تحذير'
                          : 'Warning'}
                      </span>
                    </div>
                    <Progress value={metrics.accuracy.overallAccuracy} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{locale === 'ar' ? 'الذاكرة' : 'Memory'}</span>
                      <span
                        className={
                          metrics.memory.isCriticalMemory
                            ? 'text-red-600'
                            : metrics.memory.isLowMemory
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }
                      >
                        {metrics.memory.isCriticalMemory
                          ? locale === 'ar'
                            ? 'حرج'
                            : 'Critical'
                          : metrics.memory.isLowMemory
                          ? locale === 'ar'
                            ? 'منخفض'
                            : 'Low'
                          : locale === 'ar'
                          ? 'صحي'
                          : 'Healthy'}
                      </span>
                    </div>
                    {metrics.memory.currentStats && (
                      <Progress value={metrics.memory.currentStats.usagePercent} className="h-2" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

