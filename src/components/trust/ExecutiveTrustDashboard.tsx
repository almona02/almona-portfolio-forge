/**
 * Executive Trust Dashboard Component
 * 
 * Displays governance health, constitutional compliance, and RealityOS health metrics.
 * Market leader-inspired UI with high precision.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * 
 * @since Phase 4: Precision Upgrade Plan (January 2026)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Lock,
  FileCheck,
  Link2,
  Clock,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  trustMetricsService,
  type ExecutiveTrustMetrics,
  type MetricStatus,
  type MetricCardData,
} from '@/lib/trust';

interface ExecutiveTrustDashboardProps {
  className?: string;
}

export const ExecutiveTrustDashboard: React.FC<ExecutiveTrustDashboardProps> = ({
  className = '',
}) => {
  const [metrics, setMetrics] = useState<ExecutiveTrustMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState<string>('30d');

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const trustMetrics = await trustMetricsService.getTrustMetrics(timePeriod);
      setMetrics(trustMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trust metrics';
      setError(errorMessage);
      console.error('Failed to load trust metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    loadMetrics();
    // Refresh metrics every 5 minutes
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMetrics]);

  const getStatusIcon = (status: MetricStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'info':
        return <ShieldCheck className="h-5 w-5 text-blue-400" />;
      default:
        return <Activity className="h-5 w-5 text-amber-400" />;
    }
  };

  const getStatusBadge = (status: MetricStatus) => {
    switch (status) {
      case 'healthy':
        return (
          <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/50">
            HEALTHY
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="border-amber-600/50 text-amber-400">
            WARNING
          </Badge>
        );
      case 'critical':
        return (
          <Badge variant="outline" className="border-red-600/50 text-red-400">
            CRITICAL
          </Badge>
        );
      case 'info':
        return (
          <Badge variant="outline" className="border-blue-600/50 text-blue-400">
            INFO
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatValue = (value: number, unit?: string): string => {
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    if (unit === 'events/day') {
      return `${value.toFixed(1)} events/day`;
    }
    return value.toFixed(0);
  };

  const MetricCard: React.FC<{ data: MetricCardData }> = ({ data }) => {
    const status = data.status;
    const isHealthy = status === 'healthy';
    const isWarning = status === 'warning';
    const isCritical = status === 'critical';

    return (
      <Card
        className={`card-glass-dark shadow-glow-strong ${
          isHealthy
            ? 'border-green-600/30'
            : isWarning
            ? 'border-amber-600/30'
            : isCritical
            ? 'border-red-600/30'
            : 'border-amber-600/20'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-amber-200 flex items-center gap-2">
              {getStatusIcon(status)}
              <span>{data.title}</span>
            </CardTitle>
            {getStatusBadge(status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-200">
                {formatValue(data.value, data.unit)}
              </span>
              {data.target && (
                <span className="text-xs text-amber-600/70">
                  / {formatValue(data.target, data.unit)}
                </span>
              )}
            </div>
            {data.description && (
              <p className="text-xs text-amber-600/70">{data.description}</p>
            )}
            {data.trend && (
              <div className="flex items-center gap-1 text-xs">
                {data.trend.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : data.trend.direction === 'down' ? (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                ) : null}
                <span
                  className={
                    data.trend.direction === 'up'
                      ? 'text-green-400'
                      : data.trend.direction === 'down'
                      ? 'text-red-400'
                      : 'text-amber-400'
                  }
                >
                  {data.trend.direction === 'up' ? '+' : data.trend.direction === 'down' ? '-' : ''}
                  {Math.abs(data.trend.value).toFixed(1)}%
                </span>
                <span className="text-amber-600/70">vs previous period</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className={`card-glass-dark shadow-glow-strong ${className}`}>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <span className="ml-3 text-amber-200">Loading trust metrics...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`card-glass-dark shadow-glow-strong ${className}`}>
        <CardContent className="p-12">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <div className="font-semibold">Failed to load trust metrics</div>
              <div className="text-sm text-red-400/70 mt-1">{error}</div>
            </div>
          </div>
          <Button onClick={loadMetrics} className="mt-4" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const governanceCards: MetricCardData[] = [
    {
      title: 'Determinism Score',
      value: metrics.governanceHealth.determinismScore,
      target: 100,
      unit: '%',
      status: metrics.governanceHealth.determinismScore >= 95 ? 'healthy' : 'warning',
      description: 'Percentage of operations that are deterministic and replayable',
    },
    {
      title: 'Validation Failures',
      value: metrics.governanceHealth.validationFailureCount,
      status: metrics.governanceHealth.validationFailureCount === 0 ? 'healthy' : 'warning',
      description: 'Number of validation failures (system stops are correct behavior)',
    },
    {
      title: 'Replay Audit Availability',
      value: metrics.governanceHealth.replayAuditAvailability,
      target: 100,
      unit: '%',
      status: metrics.governanceHealth.replayAuditAvailability >= 90 ? 'healthy' : 'warning',
      description: 'Percentage of outputs with replay audit packages',
    },
    {
      title: 'Certified Outputs',
      value: metrics.governanceHealth.certifiedOutputsPercentage,
      target: 100,
      unit: '%',
      status: metrics.governanceHealth.certifiedOutputsPercentage >= 90 ? 'healthy' : 'warning',
      description: 'Percentage of outputs that are certified',
    },
  ];

  const constitutionalCards: MetricCardData[] = [
    {
      title: 'Tier 3 Purity',
      value: metrics.constitutionalCompliance.tier3Purity,
      target: 100,
      unit: '%',
      status: metrics.constitutionalCompliance.tier3Purity === 100 ? 'healthy' : 'critical',
      description: 'Percentage of operations with no AI (AICS-001 §3.1)',
    },
    {
      title: 'Human Validation Rate',
      value: metrics.constitutionalCompliance.humanValidationRate,
      target: 100,
      unit: '%',
      status: metrics.constitutionalCompliance.humanValidationRate >= 95 ? 'healthy' : 'warning',
      description: 'Percentage of outputs human-validated (AICS-001 §2.8)',
    },
    {
      title: 'System Stops',
      value: metrics.constitutionalCompliance.systemStopCount,
      status: 'info',
      description: 'System stops are correct behavior (AICS-001 §2.8)',
    },
    {
      title: 'Audit Trail Completeness',
      value: metrics.constitutionalCompliance.auditTrailCompleteness,
      target: 100,
      unit: '%',
      status: metrics.constitutionalCompliance.auditTrailCompleteness >= 95 ? 'healthy' : 'warning',
      description: 'Percentage of decisions with full audit trail (AICS-001 §7.4)',
    },
  ];

  const realityOSCards: MetricCardData[] = [
    {
      title: 'Event Emission Rate',
      value: metrics.realityOSHealth.eventEmissionRate,
      unit: 'events/day',
      status: metrics.realityOSHealth.eventEmissionRate > 0 ? 'healthy' : 'warning',
      description: 'Average events emitted per day',
    },
    {
      title: 'Human Verification Rate',
      value: metrics.realityOSHealth.humanVerificationRate,
      target: 100,
      unit: '%',
      status: metrics.realityOSHealth.humanVerificationRate >= 95 ? 'healthy' : 'warning',
      description: 'Percentage of events human-verified (RealityOS Principle 1)',
    },
    {
      title: 'Chain Integrity',
      value: metrics.realityOSHealth.chainIntegrity,
      target: 100,
      unit: '%',
      status: metrics.realityOSHealth.chainIntegrity === 100 ? 'healthy' : 'critical',
      description: 'Percentage of events with valid cryptographic chain',
    },
    {
      title: 'Append-Only Compliance',
      value: metrics.realityOSHealth.appendOnlyCompliance,
      target: 100,
      unit: '%',
      status: 'healthy',
      description: 'Events are immutable and append-only (RealityOS Principle 2)',
    },
  ];

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <Card className="card-glass-dark shadow-glow-strong">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-3 text-2xl tracking-[0.02em] uppercase font-semibold text-amber-200">
                  <ShieldCheck className="h-7 w-7 text-amber-500" />
                  Executive Trust Dashboard
                </CardTitle>
                <CardDescription className="text-xs text-amber-600/80 font-medium mt-2">
                  Governance health, constitutional compliance, and RealityOS health metrics
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  className="bg-[#0a0a0a] border border-amber-600/30 text-amber-200 rounded px-3 py-1 text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
                <Button onClick={loadMetrics} variant="outline" size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Governance Health Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-amber-200">Governance Health</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {governanceCards.map((card, index) => (
              <MetricCard key={index} data={card} />
            ))}
          </div>
        </div>

        {/* Constitutional Compliance Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-amber-200">Constitutional Compliance</h2>
            <Tooltip>
              <TooltipTrigger>
                <ShieldCheck className="h-4 w-4 text-amber-600/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs text-xs">
                  <p>
                    Constitutional compliance metrics ensure adherence to AICS-001 framework.
                    Tier 3 Purity must be 100% (no AI in execution paths).
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {constitutionalCards.map((card, index) => (
              <MetricCard key={index} data={card} />
            ))}
          </div>
        </div>

        {/* RealityOS Health Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-amber-200">RealityOS Health</h2>
            <Tooltip>
              <TooltipTrigger>
                <ShieldCheck className="h-4 w-4 text-amber-600/70 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="max-w-xs text-xs">
                  <p>
                    RealityOS health metrics track event ledger integrity, human verification,
                    and append-only compliance. Chain integrity must be 100%.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {realityOSCards.map((card, index) => (
              <MetricCard key={index} data={card} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <Card className="card-glass-dark shadow-glow-strong">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-amber-600/70">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>Last updated: {metrics.lastUpdated.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" />
                <span>Constitutional Authority: AICS-001</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

