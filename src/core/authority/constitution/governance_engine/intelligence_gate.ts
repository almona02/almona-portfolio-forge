/**
 * @file intelligence_gate.ts
 * @description Intelligence Gate - Constitutional AI Governance
 * 
 * AICS-001 Reference: Section 5.10
 * 
 * Enforces three-tier decision architecture:
 * - Tier 1: Authoritative AI (YDT mandatory)
 * - Tier 2: Collaborative Intelligence (YDT + TensorFlow)
 * - Tier 3: Protected Determinism (No AI)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

export type Tier = 1 | 2 | 3;

export interface TierDecision {
  tier: Tier;
  decisionId: string;
  reasoning: string; // AICS-001: "Mandatory reasoning for Tier 1"
  confidence?: number;
  timestamp: Date;
  
  // Constitutional requirement: All decisions traceable
  auditAnchorId: string;
  
  // Tier-specific data
  ydtContribution?: YDTContribution;
  tensorflowContribution?: TensorFlowContribution;
  fallbackUsed: boolean;
}

export interface YDTContribution {
  strategy: string;
  context: Record<string, unknown>;
  confidence: number;
}

export interface TensorFlowContribution {
  prediction: unknown;
  confidence: number;
  modelVersion: string;
}

export interface DecisionContext {
  decisionType: string;
  inputs: Record<string, unknown>;
  mode: 'sandbox' | 'production' | 'certified';
  workshopId?: string;
}

export interface IntelligenceGate {
  /**
   * Classifies a decision into Tier 1, 2, or 3
   * AICS-001 Section 5.10.2
   */
  classifyDecision(context: DecisionContext): Tier;
  
  /**
   * Enforces tier requirements and creates tier decision
   * AICS-001 Section 5.10.3
   */
  enforceTier(decision: DecisionContext, tier: Tier): TierDecision;
  
  /**
   * Validates that a tier decision complies with constitutional requirements
   * AICS-001 Section 5.10.4
   */
  validateTierCompliance(decision: TierDecision): boolean;
}

// Implementation is internal to authority layer
// Consumption layer only sees interfaces

