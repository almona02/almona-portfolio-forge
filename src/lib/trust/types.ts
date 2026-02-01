/**
 * Executive Trust Dashboard Types
 * 
 * Type definitions for governance health, constitutional compliance, and RealityOS health metrics.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * 
 * @since Phase 4: Precision Upgrade Plan (January 2026)
 */

/**
 * Governance Health Metrics
 * 
 * Metrics related to system determinism and validation.
 */
export interface GovernanceHealth {
  /** Determinism score (0-100) - percentage of operations that are deterministic */
  determinismScore: number;
  /** Number of validation failures */
  validationFailureCount: number;
  /** Percentage of outputs with replay audit packages */
  replayAuditAvailability: number;
  /** Percentage of outputs that are certified */
  certifiedOutputsPercentage: number;
  /** Total number of operations */
  totalOperations: number;
  /** Number of operations with deterministic replay */
  deterministicOperations: number;
}

/**
 * Constitutional Compliance Metrics
 * 
 * Metrics related to AICS-001 constitutional compliance.
 */
export interface ConstitutionalCompliance {
  /** Tier 3 purity (0-100) - percentage of operations with no AI */
  tier3Purity: number;
  /** Human validation rate (0-100) - percentage of outputs human-validated */
  humanValidationRate: number;
  /** System stop count (correct behavior per AICS-001 §2.8) */
  systemStopCount: number;
  /** Audit trail completeness (0-100) - percentage of decisions with full audit trail */
  auditTrailCompleteness: number;
  /** Total outputs */
  totalOutputs: number;
  /** Human-validated outputs */
  humanValidatedOutputs: number;
  /** Operations with full audit trail */
  auditedOperations: number;
}

/**
 * RealityOS Health Metrics
 * 
 * Metrics related to RealityOS event ledger health.
 */
export interface RealityOSHealth {
  /** Event emission rate (events per day) */
  eventEmissionRate: number;
  /** Human verification rate (0-100) - percentage of events human-verified */
  humanVerificationRate: number;
  /** Chain integrity (0-100) - percentage of events with valid chain */
  chainIntegrity: number;
  /** Append-only compliance (should always be 100%) */
  appendOnlyCompliance: number;
  /** Total events */
  totalEvents: number;
  /** Human-verified events */
  humanVerifiedEvents: number;
  /** Events with valid chain */
  validChainEvents: number;
  /** FAULT events (missed events) */
  faultEvents: number;
}

/**
 * Executive Trust Dashboard Metrics
 * 
 * Complete set of trust metrics for executive dashboard.
 */
export interface ExecutiveTrustMetrics {
  /** Governance health metrics */
  governanceHealth: GovernanceHealth;
  /** Constitutional compliance metrics */
  constitutionalCompliance: ConstitutionalCompliance;
  /** RealityOS health metrics */
  realityOSHealth: RealityOSHealth;
  /** Last updated timestamp */
  lastUpdated: Date;
  /** Time period for metrics (e.g., '7d', '30d', 'all') */
  timePeriod: string;
}

/**
 * Metric Status
 * 
 * Status indicator for a metric.
 */
export type MetricStatus = 'healthy' | 'warning' | 'critical' | 'info';

/**
 * Metric Card Data
 * 
 * Data structure for displaying a metric card.
 */
export interface MetricCardData {
  /** Title */
  title: string;
  /** Current value */
  value: number;
  /** Target value (optional) */
  target?: number;
  /** Status */
  status: MetricStatus;
  /** Description */
  description?: string;
  /** Unit (e.g., '%', 'count', 'events/day') */
  unit?: string;
  /** Trend (optional) */
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
}

