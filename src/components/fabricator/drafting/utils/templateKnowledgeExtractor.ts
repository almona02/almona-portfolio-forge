/**
 * Template Knowledge Extractor - Gold Tier Accuracy
 * 
 * Extracts knowledge and patterns from ALMONA workshop history.
 * Uses EgyptianJobPatternRecognizer to learn from real projects.
 * 
 * @since Template Editor - Gold Tier Implementation
 */

import { EgyptianJobPatternRecognizer } from '@/lib/intelligence/EgyptianJobPatternRecognizer';
import type { WindowUnit } from '@/types/fabricator';
import type { ExtractedTemplate } from './templateExtractor';

export interface TemplateKnowledge {
  /** Common patterns identified from history */
  commonPatterns: ExtractedTemplate[];
  /** Size patterns by room type */
  sizePatterns: Record<string, {
    widthRange: [number, number];
    heightRange: [number, number];
    averageArea: number;
    count: number;
  }>;
  /** Material preferences by pattern type */
  materialPreferences: Record<string, {
    aluminum: number;
    upvc: number;
    preferred: 'aluminum' | 'upvc';
  }>;
  /** Success patterns (high accuracy, low issues) */
  successPatterns: Array<{
    templateId: string;
    systemPackId: string;
    successRate: number;
    averageAccuracy: number;
    issueCount: number;
  }>;
  /** Regional adaptations */
  regionalPatterns: Record<string, ExtractedTemplate[]>;
  /** Workshop-specific insights */
  workshopInsights: {
    totalProjects: number;
    mostCommonPattern: ExtractedTemplate | null;
    averageProjectSize: { width: number; height: number };
    peakUsageTimes: string[];
  };
}

/**
 * Template Knowledge Extractor
 * 
 * Analyzes workshop history to extract knowledge for template recommendations.
 */
export class TemplateKnowledgeExtractor {
  private patternRecognizer: EgyptianJobPatternRecognizer;

  constructor() {
    this.patternRecognizer = new EgyptianJobPatternRecognizer();
  }

  /**
   * Extract knowledge from workshop history
   */
  async extractKnowledge(
    workshopId: string,
    windowUnits: WindowUnit[] = []
  ): Promise<TemplateKnowledge> {
    // Get job patterns from recognizer
    const jobPatterns = await this.patternRecognizer.recognizeDailyPatterns(workshopId);

    // Extract templates from history
    const { extractTemplatesFromHistory } = await import('./templateExtractor');
    const commonPatterns = await extractTemplatesFromHistory(windowUnits, {
      workshopId,
      minFrequency: 2,
      minConfidence: 60
    });

    // Build material preferences by pattern
    const materialPreferences: Record<string, {
      aluminum: number;
      upvc: number;
      preferred: 'aluminum' | 'upvc';
    }> = {};

    commonPatterns.forEach(template => {
      materialPreferences[template.id] = template.materialPreferences;
    });

    // Build success patterns
    const successPatterns = commonPatterns
      .filter(t => t.successMetrics)
      .map(template => ({
        templateId: template.id,
        systemPackId: template.compatibleSystemPacks[0] || '',
        successRate: template.successMetrics!.successRate,
        averageAccuracy: template.successMetrics!.averageAccuracy,
        issueCount: template.successMetrics!.issueCount
      }))
      .sort((a, b) => b.successRate - a.successRate);

    // Group by region (if positionMeta available)
    const regionalPatterns: Record<string, ExtractedTemplate[]> = {};
    windowUnits.forEach(unit => {
      const region = unit.positionMeta?.elevation || 'unknown';
      if (!regionalPatterns[region]) {
        regionalPatterns[region] = [];
      }
    });

    // Workshop insights
    const totalProjects = windowUnits.length;
    const mostCommonPattern = commonPatterns.length > 0 ? commonPatterns[0] : null;
    
    const avgWidth = windowUnits.length > 0
      ? windowUnits.reduce((sum, u) => sum + u.overallWidth, 0) / windowUnits.length
      : 0;
    const avgHeight = windowUnits.length > 0
      ? windowUnits.reduce((sum, u) => sum + u.overallHeight, 0) / windowUnits.length
      : 0;

    const peakUsageTimes = jobPatterns.timePatterns.peakHours || [];

    return {
      commonPatterns,
      sizePatterns: jobPatterns.sizePatterns,
      materialPreferences,
      successPatterns,
      regionalPatterns,
      workshopInsights: {
        totalProjects,
        mostCommonPattern,
        averageProjectSize: { width: avgWidth, height: avgHeight },
        peakUsageTimes
      }
    };
  }

  /**
   * Get template recommendations based on dimensions and context
   */
  async recommendTemplates(
    workshopId: string,
    dimensions: { width: number; height: number },
    context?: {
      roomType?: string;
      material?: 'aluminum' | 'upvc';
      region?: string;
    }
  ): Promise<Array<{
    template: ExtractedTemplate;
    confidence: number;
    reason: string;
  }>> {
    const knowledge = await this.extractKnowledge(workshopId);

    const recommendations: Array<{
      template: ExtractedTemplate;
      confidence: number;
      reason: string;
    }> = [];

    // Match by dimensions
    knowledge.commonPatterns.forEach(template => {
      const { widthRange, heightRange } = template.typicalDimensions;
      const widthMatch = dimensions.width >= widthRange[0] && dimensions.width <= widthRange[1];
      const heightMatch = dimensions.height >= heightRange[0] && dimensions.height <= heightRange[1];

      if (widthMatch && heightMatch) {
        let confidence = 70;
        let reason = 'Matches typical dimensions';

        // Boost confidence if material matches
        if (context?.material) {
          const pref = template.materialPreferences.preferred;
          if (pref === context.material) {
            confidence += 15;
            reason += `, preferred material (${context.material})`;
          }
        }

        // Boost confidence if room type matches
        if (context?.roomType && knowledge.sizePatterns[context.roomType]) {
          const roomPattern = knowledge.sizePatterns[context.roomType];
          if (dimensions.width >= roomPattern.widthRange[0] && 
              dimensions.width <= roomPattern.widthRange[1] &&
              dimensions.height >= roomPattern.heightRange[0] && 
              dimensions.height <= roomPattern.heightRange[1]) {
            confidence += 10;
            reason += `, typical for ${context.roomType}`;
          }
        }

        // Boost confidence if high success rate
        const successPattern = knowledge.successPatterns.find(sp => sp.templateId === template.id);
        if (successPattern && successPattern.successRate > 0.9) {
          confidence += 5;
          reason += ', high success rate';
        }

        recommendations.push({
          template,
          confidence: Math.min(100, confidence),
          reason
        });
      }
    });

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }
}

/**
 * Helper: Extract knowledge from workshop
 */
export async function extractWorkshopKnowledge(
  workshopId: string,
  windowUnits?: WindowUnit[]
): Promise<TemplateKnowledge> {
  const extractor = new TemplateKnowledgeExtractor();
  return extractor.extractKnowledge(workshopId, windowUnits || []);
}

/**
 * Helper: Get template recommendations
 */
export async function getTemplateRecommendations(
  workshopId: string,
  dimensions: { width: number; height: number },
  context?: {
    roomType?: string;
    material?: 'aluminum' | 'upvc';
    region?: string;
  }
): Promise<Array<{
  template: ExtractedTemplate;
  confidence: number;
  reason: string;
}>> {
  const extractor = new TemplateKnowledgeExtractor();
  return extractor.recommendTemplates(workshopId, dimensions, context);
}

