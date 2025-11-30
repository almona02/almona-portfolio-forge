/**
 * Design AI Suggestor
 * Analyzes drawn shapes in real-time and suggests best-fitting profiles from library
 */

import type { Profile } from '@/types/fabricator';
import { SYSTEM_PACKS } from '@/data/systemPacks';

export interface ShapeAnalysis {
  mullionWidth?: number;
  mullionHeight?: number;
  spanLength?: number;
  openingWidth?: number;
  openingHeight?: number;
  complexity: 'simple' | 'medium' | 'complex';
}

export interface ProfileSuggestion {
  profile: Profile;
  matchScore: number;
  reason: string;
  systemPack?: string;
}

export class DesignAISuggestor {
  /**
   * Analyze drawn shape and suggest profiles
   */
  suggestProfiles(analysis: ShapeAnalysis, availableProfiles: Profile[]): ProfileSuggestion[] {
    const suggestions: ProfileSuggestion[] = [];

    // Analyze mullion dimensions
    if (analysis.mullionWidth) {
      const width = analysis.mullionWidth;
      const matchingProfiles = availableProfiles.filter((p) => {
        const profileWidth = p.width || 0;
        return Math.abs(profileWidth - width) < 20; // 20mm tolerance
      });

      for (const profile of matchingProfiles) {
        const matchScore = this.calculateMatchScore(analysis, profile);
        if (matchScore > 0.5) {
          // Find system pack for this profile
          const systemPack = this.findSystemPackForProfile(profile);
          suggestions.push({
            profile,
            matchScore,
            reason: this.generateReason(analysis, profile),
            systemPack,
          });
        }
      }
    }

    // Sort by match score
    return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
  }

  /**
   * Calculate match score between analysis and profile
   */
  private calculateMatchScore(analysis: ShapeAnalysis, profile: Profile): number {
    let score = 0;

    // Width match
    if (analysis.mullionWidth && profile.width) {
      const widthDiff = Math.abs(profile.width - analysis.mullionWidth);
      const widthScore = Math.max(0, 1 - widthDiff / 50); // 50mm tolerance
      score += widthScore * 0.4;
    }

    // Height match
    if (analysis.mullionHeight && profile.height) {
      const heightDiff = Math.abs(profile.height - analysis.mullionHeight);
      const heightScore = Math.max(0, 1 - heightDiff / 30); // 30mm tolerance
      score += heightScore * 0.3;
    }

    // Span compatibility
    if (analysis.spanLength && profile.specifications) {
      const maxSpan = profile.specifications.maxSpanMm || Infinity;
      if (analysis.spanLength <= maxSpan) {
        score += 0.3;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Find system pack for profile
   */
  private findSystemPackForProfile(profile: Profile): string | undefined {
    if (!profile.system_brand) return undefined;

    const pack = SYSTEM_PACKS.find((p) => {
      return (
        p.meta.name === profile.system_brand ||
        p.meta.brands.some((brand) => brand.toLowerCase() === profile.system_brand?.toLowerCase())
      );
    });

    return pack?.meta.id;
  }

  /**
   * Generate human-readable reason for suggestion
   */
  private generateReason(analysis: ShapeAnalysis, profile: Profile): string {
    const reasons: string[] = [];

    if (analysis.mullionWidth && profile.width) {
      const diff = Math.abs(profile.width - analysis.mullionWidth);
      if (diff < 10) {
        reasons.push(`Perfect width match (${profile.width}mm)`);
      } else {
        reasons.push(`Close width match (${profile.width}mm, ${diff}mm difference)`);
      }
    }

    if (analysis.spanLength && profile.specifications?.maxSpanMm) {
      if (analysis.spanLength <= profile.specifications.maxSpanMm) {
        reasons.push(`Supports span up to ${profile.specifications.maxSpanMm}mm`);
      }
    }

    if (profile.system_brand) {
      reasons.push(`From ${profile.system_brand} system`);
    }

    return reasons.length > 0 ? reasons.join('. ') : 'Compatible profile';
  }

  /**
   * Analyze drawn shape from canvas data
   */
  analyzeShape(canvasData: {
    mullions?: Array<{ x: number; width: number; height?: number }>;
    openings?: Array<{ width: number; height: number }>;
  }): ShapeAnalysis {
    const analysis: ShapeAnalysis = {
      complexity: 'simple',
    };

    if (canvasData.mullions && canvasData.mullions.length > 0) {
      const firstMullion = canvasData.mullions[0];
      analysis.mullionWidth = firstMullion.width;
      analysis.mullionHeight = firstMullion.height;

      // Calculate span
      if (canvasData.mullions.length > 1) {
        const positions = canvasData.mullions.map((m) => m.x).sort((a, b) => a - b);
        analysis.spanLength = positions[positions.length - 1] - positions[0];
      }
    }

    if (canvasData.openings && canvasData.openings.length > 0) {
      const firstOpening = canvasData.openings[0];
      analysis.openingWidth = firstOpening.width;
      analysis.openingHeight = firstOpening.height;
    }

    // Determine complexity
    const mullionCount = canvasData.mullions?.length || 0;
    const openingCount = canvasData.openings?.length || 0;

    if (mullionCount > 5 || openingCount > 10) {
      analysis.complexity = 'complex';
    } else if (mullionCount > 2 || openingCount > 3) {
      analysis.complexity = 'medium';
    }

    return analysis;
  }
}

export const designAISuggestor = new DesignAISuggestor();

