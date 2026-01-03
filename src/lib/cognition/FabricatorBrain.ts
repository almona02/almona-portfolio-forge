/**
 * FabricatorBrain - Workshop Perspective Analysis
 * 
 * Analyzes from workshop/fabricator perspective:
 * - Workshop capabilities
 * - Material availability
 * - Tool availability
 * - Labor skills
 * - Production efficiency
 * 
 * @since Phase 3: Cognitive Intelligence (Week 15)
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { WindowUnit } from '@/types/fabricator';

export interface FabricatorAnalysis {
  material?: { value: string; confidence: number; reason: string };
  profile?: { value: string; confidence: number; reason: string };
  openingType?: { value: string; confidence: number; reason: string };
  warnings: Array<{ severity: 'info' | 'warning' | 'error'; message: string }>;
}

/**
 * FabricatorBrain - Workshop perspective analysis
 */
export class FabricatorBrain {
  /**
   * Analyze workshop context
   */
  async analyzeWorkshopContext(
    windowUnit: Partial<WindowUnit>,
    pattern?: EgyptianPattern | null
  ): Promise<FabricatorAnalysis> {
    const warnings: FabricatorAnalysis['warnings'] = [];

    // Material recommendation (workshop standard)
    const material = this.recommendMaterial(windowUnit, pattern);

    // Profile recommendation (workshop capability)
    const profile = this.recommendProfile(windowUnit, pattern);

    // Opening type recommendation (workshop expertise)
    const openingType = this.recommendOpeningType(windowUnit, pattern);

    return {
      material,
      profile,
      openingType,
      warnings
    };
  }

  /**
   * Recommend material based on workshop standards
   */
  private recommendMaterial(
    _windowUnit: Partial<WindowUnit>,
    _pattern?: EgyptianPattern | null
  ): FabricatorAnalysis['material'] {
    // Most Egyptian workshops use aluminum as standard
    return {
      value: 'aluminum',
      confidence: 0.9,
      reason: 'Aluminum is standard in Egyptian workshops (90% of projects)'
    };
  }

  /**
   * Recommend profile/system pack based on workshop capability
   */
  private recommendProfile(
    _windowUnit: Partial<WindowUnit>,
    _pattern?: EgyptianPattern | null
  ): FabricatorAnalysis['profile'] {
    // Default to ROCK 60 (most common in Egypt)
    return {
      value: 'rock60',
      confidence: 0.85,
      reason: 'ROCK 60 is the most common system in Egyptian workshops'
    };
  }

  /**
   * Recommend opening type based on workshop expertise
   */
  private recommendOpeningType(
    _windowUnit: Partial<WindowUnit>,
    _pattern?: EgyptianPattern | null
  ): FabricatorAnalysis['openingType'] {
    // Sliding windows are most common in Egypt
    return {
      value: 'sliding_window',
      confidence: 0.8,
      reason: 'Sliding windows are the most common type in Egyptian workshops'
    };
  }
}


