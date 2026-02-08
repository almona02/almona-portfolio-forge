/**
 * Constitutional Health Dashboard Component
 * 
 * Gold-tier constitutional compliance monitoring dashboard with metrics,
 * compliance history, and visual indicators.
 * 
 * AICS-001 Reference: Sections 4.4, 7.4, 7.5 (Constitutional Compliance)
 * 
 * Blackbox Visual Polish: Prestige dark theme, compliance metrics, visual indicators
 */

import { getAuditTrailService } from '@/core/authority/certification';
import { MigrationModeService } from '@/lib/fabricator/migration/MigrationModeService';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/shared/ui/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Progress } from '@/shared/ui/ui/progress';
import { format } from 'date-fns';
import { Activity, AlertTriangle, CheckCircle2, Shield, TrendingUp, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

interface ConstitutionalHealthDashboardProps {
  className?: string;
}

/**
 * Metric Card Component
 */
const MetricCard: React.FC<{
  title: string;
  value: number;
  total: number;
  unit?: string;
  icon: React.ReactNode;
  trend?: number;
  className?: string;
}> = ({ title, value, total, unit = '%', icon, trend, className }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const isHealthy = percentage >= 95;

  return (
    <Card className={`bg-slate-800/50 border-amber-500/20 hover:border-amber-500/40 transition-all duration-300 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="text-xs text-slate-400 uppercase tracking-wider">{title}</div>
          <div className={`${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>{icon}</div>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <div className="text-2xl font-bold text-amber-400">{value.toFixed(1)}{unit}</div>
          {trend !== undefined && (
            <div className={`text-xs flex items-center gap-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <Progress value={percentage} className="h-2 bg-slate-700/50" />
        <div className="text-xs text-slate-500 mt-2">
          {value} of {total} compliant
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Constitutional Health Dashboard Component
 */
export const ConstitutionalHealthDashboard: React.FC<ConstitutionalHealthDashboardProps> = ({ className }) => {
  const [anchors, setAnchors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationMode, setMigrationMode] = useState<{
    mode: string;
    readSource: string;
    allowsWritesToV1: boolean;
    allowsWritesToV2: boolean;
    derivedFromEventHash: string;
  } | null>(null);
  const [drift, setDrift] = useState<{
    drift_rate: number;
    mismatch_count: number;
    sample_size: number;
    created_at: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const auditService = getAuditTrailService();
      await auditService.initialize();
      const chain = auditService.getChain();
      setAnchors(Array.from(chain));

      // Migration mode (event-derived)
      try {
        const mode = await MigrationModeService.getInstance().getCurrentMode();
        setMigrationMode({
          mode: mode.mode,
          readSource: mode.readSource,
          allowsWritesToV1: mode.allowsWritesToV1,
          allowsWritesToV2: mode.allowsWritesToV2,
          derivedFromEventHash: mode.derivedFromEventHash,
        });
      } catch (e) {
        console.warn('[FabricatorConstitutionalHealthDashboard] Failed to derive migration mode:', e);
      }

      // Latest drift report (if monitor is running)
      try {
        const { data } = await (supabase as any)
          .from('fabricator_dual_write_consistency_reports')
          .select('drift_rate,mismatch_count,sample_size,created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) setDrift(data);
      } catch (e) {
        console.warn('[FabricatorConstitutionalHealthDashboard] Failed to load drift report:', e);
      }
    } catch (error) {
      console.error('Failed to load constitutional health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const healthMetrics = useMemo(() => {
    const total = anchors.length;
    if (total === 0) {
      return {
        constraintCompliance: { value: 0, total: 0 },
        replayCompliance: { value: 0, total: 0 },
        tier3Compliance: { value: 0, total: 0 },
        overallHealth: 0,
      };
    }

    const withConstraints = anchors.filter(a => 
      a.decisionContext.validationResults && 
      Object.keys(a.decisionContext.validationResults).length > 0 &&
      !a.decisionContext.validationResults.validationEnvelope?.complies === false
    ).length;

    const withReplay = anchors.filter(a => 
      a.decisionContext.validationResults?.replayMetadata
    ).length;

    const tier3 = anchors.filter(a => a.decisionContext.tierClassification === 'T3').length;

    // Overall health: weighted average
    const constraintWeight = 0.4;
    const replayWeight = 0.3;
    const tier3Weight = 0.3;
    const overallHealth = (
      (withConstraints / total) * constraintWeight +
      (withReplay / total) * replayWeight +
      (tier3 / total) * tier3Weight
    ) * 100;

    return {
      constraintCompliance: { value: withConstraints, total },
      replayCompliance: { value: withReplay, total },
      tier3Compliance: { value: tier3, total },
      overallHealth,
    };
  }, [anchors]);

  const complianceHistory = useMemo(() => {
    // Group by day for last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: format(date, 'yyyy-MM-dd'),
        compliant: 0,
        total: 0,
      };
    });

    anchors.forEach(anchor => {
      const dateKey = format(anchor.timestamp, 'yyyy-MM-dd');
      const dayData = last30Days.find(d => d.date === dateKey);
      if (dayData) {
        dayData.total++;
        if (anchor.decisionContext.tierClassification === 'T3') {
          dayData.compliant++;
        }
      }
    });

    return last30Days;
  }, [anchors]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-slate-400">Loading constitutional health data...</div>
        </CardContent>
      </Card>
    );
  }

  const healthStatus = healthMetrics.overallHealth >= 95 ? 'excellent' : 
                       healthMetrics.overallHealth >= 80 ? 'good' : 
                       healthMetrics.overallHealth >= 60 ? 'fair' : 'poor';

  const healthColors = {
    excellent: { bg: 'bg-emerald-950/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
    good: { bg: 'bg-amber-950/20', border: 'border-amber-500/50', text: 'text-amber-400' },
    fair: { bg: 'bg-orange-950/20', border: 'border-orange-500/50', text: 'text-orange-400' },
    poor: { bg: 'bg-red-950/20', border: 'border-red-500/50', text: 'text-red-400' },
  };

  const status = healthColors[healthStatus];

  return (
    <div className={className}>
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-amber-200 flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                Constitutional Health Dashboard
              </CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                AICS-001 compliance monitoring and metrics
              </CardDescription>
            </div>
            <Badge className={`${status.bg} ${status.border} ${status.text} text-sm px-3 py-1`}>
              {healthStatus.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Migration Health (v1 <-> v2) */}
          <Card className="bg-slate-800/30 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Fabricator Migration Health
              </CardTitle>
              <CardDescription className="text-slate-400">
                Event-derived mode and dual-write drift (30-day window)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {migrationMode ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-900/40 border border-slate-700 rounded p-3">
                    <div className="text-slate-400 text-xs uppercase tracking-wider">Mode</div>
                    <div className="text-amber-200 font-semibold">{migrationMode.mode}</div>
                    <div className="text-slate-500 text-xs mt-1">Read source: {migrationMode.readSource}</div>
                  </div>
                  <div className="bg-slate-900/40 border border-slate-700 rounded p-3">
                    <div className="text-slate-400 text-xs uppercase tracking-wider">Writes</div>
                    <div className="text-slate-200">
                      v1:{' '}
                      <span className={migrationMode.allowsWritesToV1 ? 'text-emerald-400' : 'text-red-400'}>
                        {migrationMode.allowsWritesToV1 ? 'allowed' : 'blocked'}
                      </span>
                      {'  '}| v2:{' '}
                      <span className={migrationMode.allowsWritesToV2 ? 'text-emerald-400' : 'text-red-400'}>
                        {migrationMode.allowsWritesToV2 ? 'allowed' : 'blocked'}
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs mt-1 font-mono truncate">
                      event: {migrationMode.derivedFromEventHash}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">Migration mode not available.</div>
              )}

              {drift ? (
                <div className="bg-slate-900/40 border border-slate-700 rounded p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-slate-400 text-xs uppercase tracking-wider">Latest drift</div>
                    <div className="text-slate-500 text-xs">{new Date(drift.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-slate-200 mt-1">
                    Drift:{' '}
                    <span className={drift.drift_rate <= 0.001 ? 'text-emerald-400' : 'text-amber-400'}>
                      {(drift.drift_rate * 100).toFixed(3)}%
                    </span>
                    {'  '}({drift.mismatch_count}/{drift.sample_size})
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">No drift report found (monitor not running yet).</div>
              )}
            </CardContent>
          </Card>

          {/* Overall Health Score */}
          <Card className={`${status.bg} ${status.border} border-2`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">Overall Health Score</div>
                  <div className={`text-4xl font-bold ${status.text}`}>
                    {healthMetrics.overallHealth.toFixed(1)}%
                  </div>
                </div>
                {healthStatus === 'excellent' ? (
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                ) : healthStatus === 'poor' ? (
                  <XCircle className="h-12 w-12 text-red-400" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-amber-400" />
                )}
              </div>
              <Progress value={healthMetrics.overallHealth} className="h-3 bg-slate-700/50" />
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Constraint Compliance"
              value={healthMetrics.constraintCompliance.value}
              total={healthMetrics.constraintCompliance.total}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <MetricCard
              title="Replay Compliance"
              value={healthMetrics.replayCompliance.value}
              total={healthMetrics.replayCompliance.total}
              icon={<Activity className="h-5 w-5" />}
            />
            <MetricCard
              title="Tier 3 Compliance"
              value={healthMetrics.tier3Compliance.value}
              total={healthMetrics.tier3Compliance.total}
              icon={<Shield className="h-5 w-5" />}
            />
          </div>

          {/* Compliance History Chart */}
          <Card className="bg-slate-800/30 border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Compliance History (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-end gap-1">
                {complianceHistory.map((day, idx) => {
                  const percentage = day.total > 0 ? (day.compliant / day.total) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-amber-500/30 hover:bg-amber-500/50 transition-colors duration-200 rounded-t"
                      style={{ height: `${percentage}%` }}
                      title={`${format(new Date(day.date), 'MMM dd')}: ${percentage.toFixed(0)}%`}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

