/**
 * YDTOptimizationWrapper - Wraps ProductionOptimizer with YDT Intelligence
 * 
 * Calls YDTCoreService before optimization to get market-aware strategy.
 * 
 * TIER 1 (STRATEGIC): YDT is mandatory for optimization strategy selection.
 * Enforced via IntelligenceGate.strategic() with reasoning validation.
 */

import { YDTCoreService } from './YDTCoreService';
import { IntelligenceGate } from './IntelligenceGate';
import { TierMetrics } from './TierMetrics';
import { ProductionOptimizer, type ProductionOptimizationOptions, type ProductionOptimizationResult } from '@/algorithms/ProductionOptimizer';
import type { Cut } from '@/types/fabricator';
import type { OptimizationContext, YDTOptimization } from './types';

export interface YDTOptimizationWrapperOptions extends ProductionOptimizationOptions {
  ydtContext?: OptimizationContext;
  useYDT?: boolean; // Use YDT strategy (default: true)
}

/**
 * YDTOptimizationWrapper - YDT-Powered Optimization
 */
export class YDTOptimizationWrapper {
  private optimizer: ProductionOptimizer;
  private ydt: YDTCoreService;

  constructor() {
    this.optimizer = new ProductionOptimizer();
    this.ydt = YDTCoreService.getInstance();
  }

  /**
   * Optimize with YDT intelligence
   */
  async optimizeWithYDT(
    cuts: Cut[],
    stockLength: number = 6000,
    options: YDTOptimizationWrapperOptions = {}
  ): Promise<ProductionOptimizationResult & { ydtIntelligence?: YDTOptimization }> {
    const { ydtContext, useYDT = true, ...optimizerOptions } = options;

    // Get YDT strategy if context provided and YDT enabled
    let ydtStrategy: YDTOptimization | null = null;
    if (useYDT && ydtContext) {
      try {
        const ydtResponse = await this.ydt.getOptimizationStrategy(ydtContext);
        ydtStrategy = ydtResponse.data;
        
        // Override optimizer options with YDT strategy
        if (ydtStrategy.strategy === 'remnant-first') {
          optimizerOptions.strategy = 'optimal'; // Use optimal for remnant-first
        } else if (ydtStrategy.strategy === 'speed-first') {
          optimizerOptions.strategy = 'fast'; // Use fast for speed-first
        }
        
        // Apply YDT constraints if provided
        if (ydtStrategy.constraints) {
          if (ydtStrategy.constraints.minUtilization !== undefined) {
            optimizerOptions.targetUtilization = ydtStrategy.constraints.minUtilization * 100;
          }
          if (ydtStrategy.constraints.maxTime !== undefined) {
            // Would need to adjust maxIterations based on time constraint
            // For now, just log it
            console.log('YDT time constraint:', ydtStrategy.constraints.maxTime);
          }
        }
      } catch (error) {
        console.warn('YDT strategy fetch failed, using default optimization:', error);
      }
    }

    // Execute optimization with YDT-guided options
    const result = this.optimizer.optimize(cuts, stockLength, optimizerOptions);

    // Add YDT intelligence to result
    if (ydtStrategy) {
      return {
        ...result,
        ydtIntelligence: {
          strategy: ydtStrategy.strategy,
          constraints: ydtStrategy.constraints,
          priorities: ydtStrategy.priorities,
          confidence: ydtStrategy.confidence,
          why: ydtStrategy.why,
          marketContext: ydtStrategy.marketContext,
        },
      };
    }

    return result;
  }

  /**
   * Get YDT optimization strategy without executing
   * 
   * TIER 1 (STRATEGIC): YDT is mandatory for optimization strategy selection.
   * This determines remnant-first vs speed-first - a critical business decision.
   */
  async getYDTStrategy(context: OptimizationContext): Promise<YDTOptimization> {
    // Record Tier 1 decision
    TierMetrics.recordTier1Decision();

    // Get strategy via IntelligenceGate (Tier 1: Strategic - mandatory)
    const strategy = await IntelligenceGate.strategic(
      'optimization_strategy_selection',
      { context },
      async (inputs) => {
        const response = await this.ydt.getOptimizationStrategy(inputs.context);
        
        // Record YDT response with reasoning quality
        TierMetrics.recordYDTResponse(
          !!response.reasoning,
          !!(response.metadata?.reasoning as any)?.primaryFactor
        );
        
        return response;
      }
    );

    return strategy;
  }
}

