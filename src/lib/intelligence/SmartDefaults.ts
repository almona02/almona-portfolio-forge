/**
 * SmartDefaults - Context-Aware Defaults
 * 
 * Generates smart defaults based on:
 * - Location-based material selection
 * - Season-aware recommendations
 * - Workshop history learning
 * - Confidence scoring
 * 
 * @since Phase 3: Cognitive Intelligence (Week 16)
 */

import { UnifiedCognitionEngine } from '../cognition/UnifiedCognitionEngine';
import { EgyptianContextAnalyzer } from './EgyptianContextAnalyzer';
import type { WindowUnit } from '@/types/fabricator';
import { EgyptianPattern } from '@/data/egyptian-window-patterns';

export interface SmartDefaultsResult {
  systemPackId: string;
  color: string;
  glazingType: string;
  openingType: string;
  hardware: string[];
  confidence: number;
  explanations: Record<string, string>; // "Why?" explanations
}

/**
 * SmartDefaults - Context-aware defaults generator
 */
export class SmartDefaults {
  private cognitionEngine: UnifiedCognitionEngine;
  private contextAnalyzer: EgyptianContextAnalyzer;

  constructor() {
    this.cognitionEngine = new UnifiedCognitionEngine();
    this.contextAnalyzer = new EgyptianContextAnalyzer();
  }

  /**
   * Generate smart defaults for window unit
   */
  async generateSmartDefaults(
    windowUnit: Partial<WindowUnit>,
    pattern?: EgyptianPattern | null
  ): Promise<SmartDefaultsResult> {
    // Analyze context
    const analysis = await this.cognitionEngine.analyzeContext(windowUnit, pattern);
    const context = this.contextAnalyzer.analyzeContext(windowUnit);

    // Extract recommendations
    const systemPackRec = analysis.recommendations.find(r => r.category === 'profile');
    const colorRec = analysis.recommendations.find(r => r.category === 'color');
    const glazingRec = analysis.recommendations.find(r => r.category === 'glazing');
    const openingRec = analysis.recommendations.find(r => r.category === 'opening_type');

    // Build explanations
    const explanations: Record<string, string> = {};
    if (systemPackRec) {
      explanations.systemPackId = this.cognitionEngine.getWhyExplanation(systemPackRec);
    }
    if (colorRec) {
      explanations.color = this.cognitionEngine.getWhyExplanation(colorRec);
    }

    return {
      systemPackId: systemPackRec?.value || 'rock60',
      color: colorRec?.value || 'Silver',
      glazingType: glazingRec?.value || 'double',
      openingType: openingRec?.value || 'sliding_window',
      hardware: [],
      confidence: analysis.confidence,
      explanations
    };
  }
}

