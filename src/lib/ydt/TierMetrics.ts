/**
 * Tier Metrics - Constitutional AI Governance Metrics
 * 
 * Tracks tier coverage, violations, and reasoning quality
 * to measure architectural health.
 */

import type { TierViolationMetrics } from './IntelligenceGate';
import { IntelligenceGate } from './IntelligenceGate';

export interface TierCoverageMetrics {
  tier1Decisions: number; // Strategic (YDT mandatory)
  tier2Decisions: number; // Execution (YDT + TensorFlow)
  tier3Decisions: number; // Deterministic (NO YDT)
  tier1Coverage: number; // % of strategic decisions using YDT
  tier3Purity: number; // % of deterministic operations with no YDT
  totalDecisions: number;
}

export interface ReasoningQualityMetrics {
  totalYDTResponses: number;
  responsesWithReasoning: number;
  responsesWithStructuredReasoning: number;
  missingReasoningCount: number;
  lowQualityReasoningCount: number;
  reasoningCoverage: number; // % with reasoning
  reasoningQuality: number; // % with structured reasoning
}

export interface ConstitutionalHealthMetrics {
  tierCoverage: TierCoverageMetrics;
  reasoningQuality: ReasoningQualityMetrics;
  violations: TierViolationMetrics;
  healthScore: number; // 0-100 overall health
}

/**
 * Tier Metrics Service
 * 
 * Tracks and reports on Constitutional AI governance health.
 */
export class TierMetrics {
  private static coverage: TierCoverageMetrics = {
    tier1Decisions: 0,
    tier2Decisions: 0,
    tier3Decisions: 0,
    tier1Coverage: 0,
    tier3Purity: 100,
    totalDecisions: 0
  };

  private static reasoning: ReasoningQualityMetrics = {
    totalYDTResponses: 0,
    responsesWithReasoning: 0,
    responsesWithStructuredReasoning: 0,
    missingReasoningCount: 0,
    lowQualityReasoningCount: 0,
    reasoningCoverage: 0,
    reasoningQuality: 0
  };

  /**
   * Record Tier 1 decision (Strategic)
   */
  static recordTier1Decision(): void {
    this.coverage.tier1Decisions++;
    this.coverage.totalDecisions++;
    this.updateCoverage();
  }

  /**
   * Record Tier 2 decision (Execution)
   */
  static recordTier2Decision(): void {
    this.coverage.tier2Decisions++;
    this.coverage.totalDecisions++;
  }

  /**
   * Record Tier 3 decision (Deterministic)
   */
  static recordTier3Decision(): void {
    this.coverage.tier3Decisions++;
    this.coverage.totalDecisions++;
    this.updatePurity();
  }

  /**
   * Record YDT response with reasoning
   */
  static recordYDTResponse(hasReasoning: boolean, hasStructuredReasoning: boolean): void {
    this.reasoning.totalYDTResponses++;
    
    if (hasReasoning) {
      this.reasoning.responsesWithReasoning++;
    } else {
      this.reasoning.missingReasoningCount++;
    }

    if (hasStructuredReasoning) {
      this.reasoning.responsesWithStructuredReasoning++;
    } else if (hasReasoning) {
      this.reasoning.lowQualityReasoningCount++;
    }

    this.updateReasoningMetrics();
  }

  /**
   * Get all metrics
   */
  static getMetrics(): ConstitutionalHealthMetrics {
    const violations = this.getViolationMetrics();
    
    return {
      tierCoverage: { ...this.coverage },
      reasoningQuality: { ...this.reasoning },
      violations,
      healthScore: this.calculateHealthScore(violations)
    };
  }

  /**
   * Get tier coverage metrics
   */
  static getTierCoverage(): TierCoverageMetrics {
    return { ...this.coverage };
  }

  /**
   * Get reasoning quality metrics
   */
  static getReasoningQuality(): ReasoningQualityMetrics {
    return { ...this.reasoning };
  }

  /**
   * Get violation metrics (from IntelligenceGate)
   */
  private static getViolationMetrics(): TierViolationMetrics {
    return IntelligenceGate.getViolationMetrics();
  }

  /**
   * Calculate overall health score (0-100)
   */
  private static calculateHealthScore(violations: TierViolationMetrics): number {
    let score = 100;

    // Deduct for violations
    if (violations.tierViolationCount > 0) {
      score -= violations.tierViolationCount * 10;
    }

    if (violations.ydtCalledInDeterministicPath > 0) {
      score -= violations.ydtCalledInDeterministicPath * 15;
    }

    if (violations.missingReasoningCount > 0) {
      score -= violations.missingReasoningCount * 5;
    }

    if (violations.lowQualityReasoningCount > 0) {
      score -= violations.lowQualityReasoningCount * 2;
    }

    // Deduct for coverage gaps
    if (this.coverage.tier1Coverage < 100) {
      score -= (100 - this.coverage.tier1Coverage) * 0.5;
    }

    if (this.coverage.tier3Purity < 100) {
      score -= (100 - this.coverage.tier3Purity) * 1;
    }

    // Deduct for reasoning gaps
    if (this.reasoning.reasoningCoverage < 100) {
      score -= (100 - this.reasoning.reasoningCoverage) * 0.3;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Update tier 1 coverage
   */
  private static updateCoverage(): void {
    // Calculate % of strategic decisions using YDT
    // This would compare against total strategic decisions
    // For now, assume 100% if tier1Decisions > 0
    this.coverage.tier1Coverage = this.coverage.tier1Decisions > 0 ? 100 : 0;
  }

  /**
   * Update tier 3 purity
   */
  private static updatePurity(): void {
    // Calculate % of deterministic operations with no YDT
    // This would check for YDT violations in Tier 3
    const violations = this.getViolationMetrics();
    const totalTier3 = this.coverage.tier3Decisions;
    const violationsInTier3 = violations.ydtCalledInDeterministicPath;
    
    if (totalTier3 === 0) {
      this.coverage.tier3Purity = 100;
    } else {
      this.coverage.tier3Purity = Math.max(0, 
        ((totalTier3 - violationsInTier3) / totalTier3) * 100
      );
    }
  }

  /**
   * Update reasoning quality metrics
   */
  private static updateReasoningMetrics(): void {
    if (this.reasoning.totalYDTResponses === 0) {
      this.reasoning.reasoningCoverage = 0;
      this.reasoning.reasoningQuality = 0;
    } else {
      this.reasoning.reasoningCoverage = 
        (this.reasoning.responsesWithReasoning / this.reasoning.totalYDTResponses) * 100;
      
      this.reasoning.reasoningQuality = 
        (this.reasoning.responsesWithStructuredReasoning / this.reasoning.totalYDTResponses) * 100;
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  static reset(): void {
    this.coverage = {
      tier1Decisions: 0,
      tier2Decisions: 0,
      tier3Decisions: 0,
      tier1Coverage: 0,
      tier3Purity: 100,
      totalDecisions: 0
    };

    this.reasoning = {
      totalYDTResponses: 0,
      responsesWithReasoning: 0,
      responsesWithStructuredReasoning: 0,
      missingReasoningCount: 0,
      lowQualityReasoningCount: 0,
      reasoningCoverage: 0,
      reasoningQuality: 0
    };
  }

  /**
   * Export metrics for dashboard
   */
  static exportForDashboard(): any {
    const metrics = this.getMetrics();
    
    return {
      health: {
        score: metrics.healthScore,
        status: metrics.healthScore >= 90 ? 'healthy' : 
                metrics.healthScore >= 70 ? 'warning' : 'critical'
      },
      tiers: {
        tier1: {
          count: metrics.tierCoverage.tier1Decisions,
          coverage: metrics.tierCoverage.tier1Coverage
        },
        tier2: {
          count: metrics.tierCoverage.tier2Decisions
        },
        tier3: {
          count: metrics.tierCoverage.tier3Decisions,
          purity: metrics.tierCoverage.tier3Purity
        }
      },
      reasoning: {
        coverage: metrics.reasoningQuality.reasoningCoverage,
        quality: metrics.reasoningQuality.reasoningQuality
      },
      violations: {
        total: metrics.violations.tierViolationCount,
        deterministic: metrics.violations.ydtCalledInDeterministicPath,
        missingReasoning: metrics.violations.missingReasoningCount,
        lowQualityReasoning: metrics.violations.lowQualityReasoningCount
      }
    };
  }
}

