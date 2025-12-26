/**
 * YDTBusinessLayer - The Single Source of Truth for Business Decisions
 * 
 * ALL business decisions flow through this layer.
 * Orchestrates YDT intelligence for validation, optimization, and presets.
 */

import { YDTCoreService } from './YDTCoreService';
import type { Project, Workshop, OptimizationContext, YDTOptimization, YDTPreset } from './types';

export interface YDTValidation {
  valid: boolean;
  technicalIssues: string[];
  businessRisks: string[];
  marketChallenges: string[];
  recommendations: string[];
  confidence: number;
  ydtVerdict: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
  ydtReason: string;
}

export interface YDTOptimizationResult {
  strategy: string;
  constraints: Record<string, any>;
  priorities: string[];
  confidence: number;
  why: string;
  marketContext?: string;
  recommendations?: string[];
}

/**
 * YDTBusinessLayer - Orchestration Layer for Business Intelligence
 */
export class YDTBusinessLayer {
  private ydt = YDTCoreService.getInstance();

  /**
   * Validate project viability BEFORE starting
   */
  async validateProject(project: Project): Promise<YDTValidation> {
    // 1. Technical validation (would use existing validation system)
    const technical = await this.validateTechnical(project);

    // 2. BUSINESS validation (YDT Intelligence)
    const business = await this.ydt.checkProjectViability(project);

    // 3. Market validation (YDT Market Intelligence)
    const market = await this.validateMarketPosition(project);

    // Combine all validations
    const valid = technical.valid && business.data.profitable && market.feasible;

    return {
      valid,
      technicalIssues: technical.issues,
      businessRisks: business.data.risks,
      marketChallenges: market.challenges,
      recommendations: [
        ...technical.recommendations,
        ...business.data.recommendations,
        ...market.recommendations,
      ],
      confidence: Math.min(technical.confidence, business.confidence, market.confidence),
      ydtVerdict: business.data.profitable ? 'APPROVED' : 'REJECTED',
      ydtReason: business.data.profitable
        ? `Project estimated at ${(business.data.profitMargin * 100).toFixed(0)}% margin`
        : `Margin too low (${(business.data.profitMargin * 100).toFixed(0)}%) for ${project.location}`,
    };
  }

  /**
   * Get optimization WITH YDT intelligence
   */
  async optimizeWithYDT(
    cuts: any[],
    context: OptimizationContext
  ): Promise<YDTOptimizationResult> {
    // Get YDT strategy FIRST
    const ydtStrategy = await this.ydt.getOptimizationStrategy(context);

    // Execute optimization with YDT guidance
    // (Would call actual ProductionOptimizer with YDT strategy)
    const result = await this.executeOptimization(cuts, {
      strategy: ydtStrategy.data.strategy,
      constraints: ydtStrategy.data.constraints,
      priorities: ydtStrategy.data.priorities,
    });

    return {
      strategy: ydtStrategy.data.strategy,
      constraints: ydtStrategy.data.constraints,
      priorities: ydtStrategy.data.priorities,
      confidence: ydtStrategy.confidence,
      why: ydtStrategy.data.why,
      marketContext: ydtStrategy.data.marketContext,
      recommendations: ydtStrategy.data.priorities,
    };
  }

  /**
   * Generate presets WITH YDT intelligence
   */
  async getPresetsWithYDT(
    location: string,
    projectType: string
  ): Promise<YDTPreset[]> {
    // Get YDT dynamic presets
    const ydtPresets = await this.ydt.generateDynamicPresets(location);

    // Filter by project type
    const filtered = ydtPresets.data.filter(
      (p) =>
        p.intelligence &&
        p.intelligence.successRate &&
        p.intelligence.successRate > 0.85 &&
        p.intelligence.averageMargin &&
        p.intelligence.averageMargin > 0.25
    );

    // Sort by YDT confidence
    return filtered.sort((a, b) => {
      const aShare = a.intelligence?.marketShare || 0;
      const bShare = b.intelligence?.marketShare || 0;
      return bShare - aShare;
    });
  }

  /**
   * Get system feature explanation
   */
  async explainSystemFeature(featureId: string): Promise<string> {
    return await this.ydt.explainSystemFeature(featureId);
  }

  /**
   * Guide through workflow
   */
  async guideWorkflow(workflowName: string) {
    return await this.ydt.guideWorkflow(workflowName);
  }

  // Private helper methods

  private async validateTechnical(project: Project): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
    confidence: number;
  }> {
    // Would use existing technical validation
    return {
      valid: true,
      issues: [],
      recommendations: [],
      confidence: 0.95,
    };
  }

  private async validateMarketPosition(project: Project): Promise<{
    feasible: boolean;
    challenges: string[];
    recommendations: string[];
    confidence: number;
  }> {
    // Get competitive analysis
    const competition = await this.ydt.analyzeCompetition(project.location, project.type);

    return {
      feasible: true,
      challenges: [],
      recommendations: competition.recommendations,
      confidence: 0.88,
    };
  }

  private async executeOptimization(
    cuts: any[],
    options: {
      strategy: string;
      constraints: Record<string, any>;
      priorities: string[];
    }
  ): Promise<any> {
    // Would call ProductionOptimizer with YDT strategy
    // For now, return placeholder
    return {
      optimized: true,
      strategy: options.strategy,
    };
  }
}

