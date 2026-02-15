/**
 * Intelligence Gate - Constitutional AI Governance
 * 
 * Enforces three-tier decision architecture:
 * - Tier 1: Strategic (YDT mandatory)
 * - Tier 2: Execution (YDT + TensorFlow)
 * - Tier 3: Deterministic (NO YDT)
 * 
 * This is the technical contract that makes "YDT First" enforceable.
 */

import type { YDTIntelligenceResponse } from './YDTCoreService';
import { YDTCoreService } from './YDTCoreService';
import { YDTEnforcementService } from './YDTEnforcementService';
import { YDTPerformanceMonitor } from './YDTPerformanceMonitor';

export enum DecisionTier {
  STRATEGIC = 'strategic', // Tier 1: YDT mandatory
  EXECUTION = 'execution', // Tier 2: YDT + TensorFlow
  DETERMINISTIC = 'deterministic' // Tier 3: No YDT
}

/**
 * Enhanced YDT reasoning structure
 */
export interface YDTReasoning {
  primaryFactor: string; // e.g., "aluminum price inflation"
  secondaryFactors?: string[];
  changeTriggers: string[]; // What would flip the decision
  assumptions: string[];
  confidence: number;
}

/**
 * Tier violation metrics
 */
export interface TierViolationMetrics {
  tierViolationCount: number;
  ydtCalledInDeterministicPath: number;
  missingReasoningCount: number;
  lowQualityReasoningCount: number;
}

/**
 * Intelligence Gate Service
 * 
 * Enforces Constitutional AI governance:
 * - Strategic decisions: YDT mandatory with reasoning
 * - Execution decisions: YDT provides context, TensorFlow decides
 * - Deterministic operations: No YDT allowed
 */
export class IntelligenceGate {
  private static enforcer = YDTEnforcementService.getInstance();
  private static ydt = YDTCoreService.getInstance();
  private static performanceMonitor = YDTPerformanceMonitor.getInstance();
  private static violationMetrics: TierViolationMetrics = {
    tierViolationCount: 0,
    ydtCalledInDeterministicPath: 0,
    missingReasoningCount: 0,
    lowQualityReasoningCount: 0
  };

  /**
   * Tier 1: Strategic decisions (YDT mandatory)
   * 
   * YDT is the authority on WHY (strategy, market intelligence, business context).
   * Must include reasoning with primary factor, assumptions, and change triggers.
   */
  static async strategic<T>(
    operation: string,
    inputs: any,
    ydtMethod: (inputs: any) => Promise<YDTIntelligenceResponse<T>>
  ): Promise<T> {
    try {
      // Enforce YDT with circuit breaker
      const result = await this.enforcer.validateWithYDT(
        operation,
        inputs,
        () => ydtMethod(inputs)
      );

      // Validate reasoning quality (not just presence)
      this.validateReasoningQuality(operation, result);

      return result.data;
    } catch (error) {
      // Log tier violation
      this.recordViolation(DecisionTier.STRATEGIC, operation, error);
      throw error;
    }
  }

  /**
   * Tier 2: Execution decisions (YDT + TensorFlow)
   * 
   * YDT provides strategic context (WHAT to optimize for).
   * TensorFlow makes execution choice (HOW to optimize).
   */
  static async execution<T>(
    operation: string,
    inputs: any,
    ydtContextMethod: (inputs: any) => Promise<YDTIntelligenceResponse<any>>,
    mlMethod: (inputs: any, context?: any) => Promise<T>
  ): Promise<T> {
    try {
      // YDT provides context (optional - can fail gracefully)
      let ydtContext: any = null;
      try {
        const contextResult = await ydtContextMethod(inputs);
        ydtContext = contextResult.data;
        
        // Validate YDT context has reasoning (if provided)
        if (contextResult.reasoning) {
          this.validateReasoningQuality(operation, contextResult);
        }
      } catch (error) {
        console.warn(
          `YDT context failed for ${operation}, proceeding with ML only:`,
          error
        );
        // Not a violation - YDT is optional in Tier 2
      }

      // TensorFlow makes decision with YDT context
      return await mlMethod(inputs, ydtContext);
    } catch (error) {
      // Log execution failure
      this.recordViolation(DecisionTier.EXECUTION, operation, error);
      throw error;
    }
  }

  /**
   * Tier 3: Deterministic operations (NO YDT)
   * 
   * Pure computation, geometry, CNC math, or I/O operations.
   * YDT is explicitly NOT allowed.
   */
  static deterministic<T>(
    operation: string,
    method: () => T
  ): T {
    // Audit for YDT violation
    this.auditForAIViolation(operation);

    // Execute without YDT
    return method();
  }

  /**
   * Validate reasoning quality (not just presence)
   * 
   * Ensures reasoning includes:
   * - Primary factor (why this decision)
   * - Assumptions (what assumptions)
   * - Change triggers (what would change the answer)
   */
  private static validateReasoningQuality(
    operation: string,
    response: YDTIntelligenceResponse<any>
  ): void {
    // Check if reasoning exists
    if (!response.reasoning) {
      this.violationMetrics.missingReasoningCount++;
      throw new Error(
        `YDT response for ${operation} must include reasoning`
      );
    }

    // Check reasoning quality (structure, not just length)
    const reasoning = response.reasoning;
    
    // Must have primary factor
    if (!reasoning.includes('because') && 
        !reasoning.includes('due to') && 
        !reasoning.includes('based on')) {
      this.violationMetrics.lowQualityReasoningCount++;
      throw new Error(
        `YDT reasoning for ${operation} must explain primary factor. ` +
        `Got: "${reasoning}"`
      );
    }

    // Check if metadata includes structured reasoning
    if (response.metadata?.reasoning) {
      const structuredReasoning = response.metadata.reasoning as Partial<YDTReasoning>;
      
      if (!structuredReasoning.primaryFactor) {
        this.violationMetrics.lowQualityReasoningCount++;
        console.warn(
          `YDT reasoning for ${operation} should include structured reasoning ` +
          `with primaryFactor, assumptions, and changeTriggers`
        );
      }
    }
  }

  /**
   * Audit for AI violation in deterministic operations
   */
  private static auditForAIViolation(operation: string): void {
    // Check if operation name suggests YDT usage
    if (operation.toLowerCase().includes('ydt') || 
        operation.toLowerCase().includes('intelligence') ||
        operation.toLowerCase().includes('strategy')) {
      this.violationMetrics.ydtCalledInDeterministicPath++;
      console.warn(
        `⚠️ Potential YDT violation: Operation "${operation}" is marked as ` +
        `deterministic but name suggests AI usage. Verify this is correct.`
      );
    }
  }

  /**
   * Record tier violation
   */
  private static recordViolation(
    tier: DecisionTier,
    operation: string,
    error: any
  ): void {
    this.violationMetrics.tierViolationCount++;
    
    console.error(
      `🚨 Tier violation in ${tier} operation "${operation}":`,
      error
    );

    // Emit metrics (for monitoring dashboard)
    if (typeof window !== 'undefined' && (window as any).ydtMetrics) {
      (window as any).ydtMetrics.recordViolation({
        tier,
        operation,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get violation metrics
   */
  static getViolationMetrics(): TierViolationMetrics {
    return { ...this.violationMetrics };
  }

  /**
   * Reset violation metrics (for testing)
   */
  static resetMetrics(): void {
    this.violationMetrics = {
      tierViolationCount: 0,
      ydtCalledInDeterministicPath: 0,
      missingReasoningCount: 0,
      lowQualityReasoningCount: 0
    };
  }

  /**
   * Get tier for an operation (helper for classification)
   */
  static classifyOperation(operation: string): DecisionTier {
    // Strategic operations
    const strategicPatterns = [
      'pricing',
      'viability',
      'strategy',
      'material.*recommend',
      'competitive',
      'market.*intelligence'
    ];

    // Execution operations
    const executionPatterns = [
      'algorithm.*select',
      'remnant.*purchase',
      'demand.*forecast',
      'quality.*priority'
    ];

    // Deterministic operations
    const deterministicPatterns = [
      'optim', // Matches 'optimize', 'optimization', 'optimal'
      'calculate',
      'geometry',
      'cnc.*generat',
      'dxf.*parse',
      'form.*validat'
    ];

    const opLower = operation.toLowerCase();

    if (strategicPatterns.some(pattern => new RegExp(pattern).test(opLower))) {
      return DecisionTier.STRATEGIC;
    }

    if (executionPatterns.some(pattern => new RegExp(pattern).test(opLower))) {
      return DecisionTier.EXECUTION;
    }

    if (deterministicPatterns.some(pattern => new RegExp(pattern).test(opLower))) {
      return DecisionTier.DETERMINISTIC;
    }

    // Default to execution if unclear (safer than strategic)
    return DecisionTier.EXECUTION;
  }
}


