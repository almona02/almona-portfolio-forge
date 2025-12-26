/**
 * UnifiedCognitionEngine - Three-Layer Cognitive System
 * 
 * Powers all three tiers (Wizard, Pattern Library, Expert Canvas) with:
 * - FabricatorBrain: Workshop perspective analysis
 * - EngineeringMind: Structural validation
 * - PlatformIntelligence: Market context
 * 
 * Provides smart defaults and "Why?" explanations
 * 
 * @since Phase 3: Cognitive Intelligence (Weeks 15-18)
 */

import { FabricatorBrain } from './FabricatorBrain';
import { EngineeringMind } from './EngineeringMind';
import { PlatformIntelligence } from './PlatformIntelligence';
import type { WindowUnit } from '@/types/fabricator';
import { EgyptianPattern } from '@/data/egyptian-window-patterns';

export interface SmartRecommendation {
  category: 'material' | 'profile' | 'color' | 'glazing' | 'opening_type' | 'hardware';
  value: string;
  confidence: number; // 0-1
  reasoning: {
    fabricator: string; // Workshop perspective
    engineering: string; // Structural/technical perspective
    platform: string; // Market/business perspective
  };
  alternatives?: Array<{
    value: string;
    confidence: number;
    reason: string;
  }>;
}

export interface CognitionAnalysis {
  recommendations: SmartRecommendation[];
  warnings: Array<{
    severity: 'info' | 'warning' | 'error';
    message: string;
    source: 'fabricator' | 'engineering' | 'platform';
  }>;
  confidence: number; // Overall confidence (0-1)
}

/**
 * UnifiedCognitionEngine - Main cognitive engine
 */
export class UnifiedCognitionEngine {
  private fabricatorBrain: FabricatorBrain;
  private engineeringMind: EngineeringMind;
  private platformIntelligence: PlatformIntelligence;

  constructor() {
    this.fabricatorBrain = new FabricatorBrain();
    this.engineeringMind = new EngineeringMind();
    this.platformIntelligence = new PlatformIntelligence();
  }

  /**
   * Analyze context and generate smart recommendations
   */
  async analyzeContext(
    windowUnit: Partial<WindowUnit>,
    pattern?: EgyptianPattern | null
  ): Promise<CognitionAnalysis> {
    // Get recommendations from all three layers
    const [fabricatorRecs, engineeringRecs, platformRecs] = await Promise.all([
      this.fabricatorBrain.analyzeWorkshopContext(windowUnit, pattern),
      this.engineeringMind.analyzeStructuralContext(windowUnit, pattern),
      this.platformIntelligence.analyzeMarketContext(windowUnit, pattern)
    ]);

    // Synthesize recommendations
    const recommendations = this.synthesizeRecommendations(
      fabricatorRecs,
      engineeringRecs,
      platformRecs
    );

    // Collect warnings
    const warnings = [
      ...fabricatorRecs.warnings,
      ...engineeringRecs.warnings,
      ...platformRecs.warnings
    ];

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(recommendations);

    return {
      recommendations,
      warnings,
      confidence
    };
  }

  /**
   * Synthesize recommendations from all three layers
   */
  private synthesizeRecommendations(
    fabricatorRecs: any,
    engineeringRecs: any,
    platformRecs: any
  ): SmartRecommendation[] {
    const recommendations: SmartRecommendation[] = [];

    // Material recommendation
    if (fabricatorRecs.material || engineeringRecs.material || platformRecs.material) {
      recommendations.push({
        category: 'material',
        value: fabricatorRecs.material?.value || engineeringRecs.material?.value || platformRecs.material?.value || 'aluminum',
        confidence: Math.max(
          fabricatorRecs.material?.confidence || 0,
          engineeringRecs.material?.confidence || 0,
          platformRecs.material?.confidence || 0
        ),
        reasoning: {
          fabricator: fabricatorRecs.material?.reason || 'Workshop standard',
          engineering: engineeringRecs.material?.reason || 'Structural requirements',
          platform: platformRecs.material?.reason || 'Market preference'
        }
      });
    }

    // Profile recommendation
    if (fabricatorRecs.profile || engineeringRecs.profile || platformRecs.profile) {
      recommendations.push({
        category: 'profile',
        value: fabricatorRecs.profile?.value || engineeringRecs.profile?.value || platformRecs.profile?.value || 'rock60',
        confidence: Math.max(
          fabricatorRecs.profile?.confidence || 0,
          engineeringRecs.profile?.confidence || 0,
          platformRecs.profile?.confidence || 0
        ),
        reasoning: {
          fabricator: fabricatorRecs.profile?.reason || 'Workshop capability',
          engineering: engineeringRecs.profile?.reason || 'Load requirements',
          platform: platformRecs.profile?.reason || 'Market standard'
        }
      });
    }

    // Color recommendation
    if (platformRecs.color) {
      recommendations.push({
        category: 'color',
        value: platformRecs.color.value || 'Silver',
        confidence: platformRecs.color.confidence || 0.8,
        reasoning: {
          fabricator: 'Standard workshop finish',
          engineering: 'No structural impact',
          platform: platformRecs.color.reason || 'Market preference'
        }
      });
    }

    // Opening type recommendation
    if (fabricatorRecs.openingType || engineeringRecs.openingType || platformRecs.openingType) {
      recommendations.push({
        category: 'opening_type',
        value: fabricatorRecs.openingType?.value || engineeringRecs.openingType?.value || platformRecs.openingType?.value || 'sliding_window',
        confidence: Math.max(
          fabricatorRecs.openingType?.confidence || 0,
          engineeringRecs.openingType?.confidence || 0,
          platformRecs.openingType?.confidence || 0
        ),
        reasoning: {
          fabricator: fabricatorRecs.openingType?.reason || 'Workshop expertise',
          engineering: engineeringRecs.openingType?.reason || 'Structural suitability',
          platform: platformRecs.openingType?.reason || 'Market demand'
        }
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(recommendations: SmartRecommendation[]): number {
    if (recommendations.length === 0) return 0;

    const totalConfidence = recommendations.reduce((sum, r) => sum + r.confidence, 0);
    return totalConfidence / recommendations.length;
  }

  /**
   * Get "Why?" explanation for a recommendation
   */
  getWhyExplanation(recommendation: SmartRecommendation): string {
    return `Fabricator: ${recommendation.reasoning.fabricator}\n` +
           `Engineering: ${recommendation.reasoning.engineering}\n` +
           `Platform: ${recommendation.reasoning.platform}`;
  }
}


