/**
 * Trust Metrics Service
 * 
 * Calculates governance health, constitutional compliance, and RealityOS health metrics.
 * 
 * Constitutional Compliance: AICS-001 §7.4 (Audit Trail Doctrine)
 * 
 * @since Phase 4: Precision Upgrade Plan (January 2026)
 */

import type {
  ExecutiveTrustMetrics,
  GovernanceHealth,
  ConstitutionalCompliance,
  RealityOSHealth,
} from './types';
import { EventLedger } from '@/lib/realityos/EventLedger';

/**
 * Trust Metrics Service
 * 
 * Calculates and aggregates trust metrics from various sources.
 */
export class TrustMetricsService {
  private eventLedger: EventLedger;

  constructor() {
    this.eventLedger = new EventLedger();
  }

  /**
   * Get executive trust metrics
   * 
   * Aggregates metrics from all sources.
   */
  async getTrustMetrics(timePeriod: string = '30d'): Promise<ExecutiveTrustMetrics> {
    const [governanceHealth, constitutionalCompliance, realityOSHealth] = await Promise.all([
      this.calculateGovernanceHealth(timePeriod),
      this.calculateConstitutionalCompliance(timePeriod),
      this.calculateRealityOSHealth(timePeriod),
    ]);

    return {
      governanceHealth,
      constitutionalCompliance,
      realityOSHealth,
      lastUpdated: new Date(),
      timePeriod,
    };
  }

  /**
   * Calculate governance health metrics
   */
  private async calculateGovernanceHealth(timePeriod: string): Promise<GovernanceHealth> {
    // In production, this would query the database for actual metrics
    // For now, we'll use mock data that demonstrates the structure
    
    // Calculate time period boundaries
    const periodDays = this.parseTimePeriod(timePeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    // Mock data - in production, query from database
    const totalOperations = 1000;
    const deterministicOperations = 980; // 98% deterministic
    const validationFailures = 5;
    const outputsWithReplay = 950; // 95% have replay packages
    const certifiedOutputs = 920; // 92% certified

    const determinismScore = (deterministicOperations / totalOperations) * 100;
    const replayAuditAvailability = (outputsWithReplay / totalOperations) * 100;
    const certifiedOutputsPercentage = (certifiedOutputs / totalOperations) * 100;

    return {
      determinismScore: Math.round(determinismScore * 100) / 100,
      validationFailureCount: validationFailures,
      replayAuditAvailability: Math.round(replayAuditAvailability * 100) / 100,
      certifiedOutputsPercentage: Math.round(certifiedOutputsPercentage * 100) / 100,
      totalOperations,
      deterministicOperations,
    };
  }

  /**
   * Calculate constitutional compliance metrics
   */
  private async calculateConstitutionalCompliance(timePeriod: string): Promise<ConstitutionalCompliance> {
    const periodDays = this.parseTimePeriod(timePeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    // Mock data - in production, query from database
    const totalOutputs = 1000;
    const humanValidatedOutputs = 990; // 99% human-validated
    const tier3Operations = 1000; // 100% Tier 3 (no AI in execution)
    const systemStops = 12; // System stops are correct behavior
    const auditedOperations = 995; // 99.5% have full audit trail

    const tier3Purity = (tier3Operations / totalOutputs) * 100;
    const humanValidationRate = (humanValidatedOutputs / totalOutputs) * 100;
    const auditTrailCompleteness = (auditedOperations / totalOutputs) * 100;

    return {
      tier3Purity: Math.round(tier3Purity * 100) / 100,
      humanValidationRate: Math.round(humanValidationRate * 100) / 100,
      systemStopCount: systemStops,
      auditTrailCompleteness: Math.round(auditTrailCompleteness * 100) / 100,
      totalOutputs,
      humanValidatedOutputs,
      auditedOperations,
    };
  }

  /**
   * Calculate RealityOS health metrics
   */
  private async calculateRealityOSHealth(timePeriod: string): Promise<RealityOSHealth> {
    const periodDays = this.parseTimePeriod(timePeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    // Get events from Event Ledger
    const allEvents = await this.eventLedger.getLatestEvents(10000);
    const periodEvents = allEvents.filter(
      (event) => new Date(event.recordedAt) >= cutoffDate
    );

    const totalEvents = periodEvents.length;
    const humanVerifiedEvents = periodEvents.filter(
      (event) => event.proof.verifiedBy !== 'system'
    ).length;
    
    // Verify chain integrity
    const chainVerification = await this.eventLedger.verifyChainIntegrity();
    const validChainEvents = chainVerification.isValid ? totalEvents : totalEvents - chainVerification.errors.length;
    
    const faultEvents = periodEvents.filter((event) => event.eventType === 'FAULT').length;

    // Calculate rates
    const humanVerificationRate = totalEvents > 0 ? (humanVerifiedEvents / totalEvents) * 100 : 100;
    const chainIntegrity = totalEvents > 0 ? (validChainEvents / totalEvents) * 100 : 100;
    const eventEmissionRate = periodDays > 0 ? totalEvents / periodDays : 0;
    const appendOnlyCompliance = 100; // Always 100% - events are immutable

    return {
      eventEmissionRate: Math.round(eventEmissionRate * 100) / 100,
      humanVerificationRate: Math.round(humanVerificationRate * 100) / 100,
      chainIntegrity: Math.round(chainIntegrity * 100) / 100,
      appendOnlyCompliance,
      totalEvents,
      humanVerifiedEvents,
      validChainEvents,
      faultEvents,
    };
  }

  /**
   * Parse time period string to days
   */
  private parseTimePeriod(timePeriod: string): number {
    if (timePeriod === 'all') return 365 * 10; // 10 years
    if (timePeriod.endsWith('d')) {
      return parseInt(timePeriod.slice(0, -1), 10);
    }
    if (timePeriod.endsWith('w')) {
      return parseInt(timePeriod.slice(0, -1), 10) * 7;
    }
    if (timePeriod.endsWith('m')) {
      return parseInt(timePeriod.slice(0, -1), 10) * 30;
    }
    return 30; // Default to 30 days
  }
}

/**
 * Singleton instance
 */
export const trustMetricsService = new TrustMetricsService();

