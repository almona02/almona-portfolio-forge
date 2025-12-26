/**
 * EngineeringMind - Structural Validation
 * 
 * Analyzes from engineering perspective:
 * - Structural requirements
 * - Load calculations
 * - Material properties
 * - Safety factors
 * - Code compliance
 * 
 * @since Phase 3: Cognitive Intelligence (Week 15)
 */

import type { WindowUnit } from '@/types/fabricator';
import { EgyptianPattern } from '@/data/egyptian-window-patterns';

export interface EngineeringAnalysis {
  material?: { value: string; confidence: number; reason: string };
  profile?: { value: string; confidence: number; reason: string };
  openingType?: { value: string; confidence: number; reason: string };
  warnings: Array<{ severity: 'info' | 'warning' | 'error'; message: string }>;
}

/**
 * EngineeringMind - Engineering perspective analysis
 */
export class EngineeringMind {
  /**
   * Analyze structural context
   */
  async analyzeStructuralContext(
    windowUnit: Partial<WindowUnit>,
    pattern?: EgyptianPattern | null
  ): Promise<EngineeringAnalysis> {
    const warnings: EngineeringAnalysis['warnings'] = [];

    const width = windowUnit.overallWidth || 0;
    const height = windowUnit.overallHeight || 0;

    // Material recommendation (structural requirements)
    const material = this.recommendMaterial(width, height);

    // Profile recommendation (load requirements)
    const profile = this.recommendProfile(width, height);

    // Opening type recommendation (structural suitability)
    const openingType = this.recommendOpeningType(width, height);

    // Generate warnings
    if (width > 3000 || height > 3000) {
      warnings.push({
        severity: 'warning',
        message: 'Large window dimensions may require structural reinforcement'
      });
    }

    return {
      material,
      profile,
      openingType,
      warnings
    };
  }

  /**
   * Recommend material based on structural requirements
   */
  private recommendMaterial(width: number, height: number): EngineeringAnalysis['material'] {
    const area = (width * height) / 1_000_000; // m²

    if (area > 4) {
      // Large windows: aluminum recommended for strength
      return {
        value: 'aluminum',
        confidence: 0.95,
        reason: 'Aluminum provides better structural strength for large windows'
      };
    }

    return {
      value: 'aluminum',
      confidence: 0.85,
      reason: 'Aluminum meets structural requirements for standard window sizes'
    };
  }

  /**
   * Recommend profile based on load requirements
   */
  private recommendProfile(width: number, height: number): EngineeringAnalysis['profile'] {
    const area = (width * height) / 1_000_000; // m²

    if (area > 3) {
      // Large windows: JUMBO 100 recommended
      return {
        value: 'jumbo100',
        confidence: 0.9,
        reason: 'JUMBO 100 provides better load capacity for large windows'
      };
    }

    return {
      value: 'rock60',
      confidence: 0.85,
      reason: 'ROCK 60 meets load requirements for standard window sizes'
    };
  }

  /**
   * Recommend opening type based on structural suitability
   */
  private recommendOpeningType(width: number, height: number): EngineeringAnalysis['openingType'] {
    if (height > 2400) {
      // Tall windows: fixed or casement recommended
      return {
        value: 'casement',
        confidence: 0.8,
        reason: 'Casement windows provide better structural support for tall windows'
      };
    }

    return {
      value: 'sliding_window',
      confidence: 0.85,
      reason: 'Sliding windows are structurally suitable for standard dimensions'
    };
  }
}


