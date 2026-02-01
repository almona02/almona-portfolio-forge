// src/components/fabricator/drafting/utils/templateRecommender.ts
import type { DesignConstraints, EgyptianTemplate, Geometry2D } from '../types/drafting';

export interface TemplateRecommendation {
  templateId: string;
  templateName: string;
  score: number;
  reason: string;
  template: EgyptianTemplate;
}

export interface DesignConstraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  preferredCellTypes?: string[];
  buildingCodeCompliant?: boolean;
  material?: string;
  systemPack?: string;
}

/**
 * Recommend Egyptian templates based on geometry and constraints
 * Uses deterministic rule-based scoring (NO ML)
 */
export function recommendTemplate(
  geometry: Geometry2D,
  templates: EgyptianTemplate[],
  constraints: DesignConstraints = {}
): TemplateRecommendation[] {
  const recommendations: TemplateRecommendation[] = [];

  // Calculate overall geometry metrics
  if (geometry.rectangles.length === 0) {
    return recommendations;
  }

  // Calculate bounding box
  const minX = Math.min(...geometry.rectangles.map((r) => r.x));
  const minY = Math.min(...geometry.rectangles.map((r) => r.y));
  const maxX = Math.max(...geometry.rectangles.map((r) => r.x + r.width));
  const maxY = Math.max(...geometry.rectangles.map((r) => r.y + r.height));

  const overallWidth = maxX - minX;
  const overallHeight = maxY - minY;
  const aspectRatio = overallWidth / overallHeight;
  const totalArea = overallWidth * overallHeight;

  // Analyze cell structure
  const cellCount = geometry.rectangles.length;
  const _cellTypes = geometry.rectangles
    .map((r) => r.type || 'fixed')
    .filter((t) => t);

  // Calculate grid structure (approximate)
  const cols = Math.round(Math.sqrt(cellCount));
  const rows = Math.ceil(cellCount / cols);

  // Score each template
  templates.forEach((template) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Grid structure match (30 points)
    const rowMatch = Math.abs(template.rows - rows) <= 1;
    const colMatch = Math.abs(template.cols - cols) <= 1;
    const cellCountMatch = template.rows * template.cols === cellCount;

    if (cellCountMatch) {
      score += 30;
      reasons.push('Perfect grid match');
    } else if (rowMatch && colMatch) {
      score += 20;
      reasons.push('Close grid match');
    } else if (rowMatch || colMatch) {
      score += 10;
      reasons.push('Partial grid match');
    }

    // 2. Aspect ratio match (25 points)
    const templateAspectRatio = template.constraints.maxWidth / template.constraints.maxHeight;
    const aspectRatioDiff = Math.abs(templateAspectRatio - aspectRatio);

    if (aspectRatioDiff < 0.1) {
      score += 25;
      reasons.push('Perfect aspect ratio match');
    } else if (aspectRatioDiff < 0.2) {
      score += 15;
      reasons.push('Good aspect ratio match');
    } else if (aspectRatioDiff < 0.3) {
      score += 8;
      reasons.push('Acceptable aspect ratio');
    }

    // 3. Dimension constraints match (25 points)
    const widthMatch =
      overallWidth >= template.constraints.minWidth &&
      overallWidth <= template.constraints.maxWidth;
    const heightMatch =
      overallHeight >= template.constraints.minHeight &&
      overallHeight <= template.constraints.maxHeight;

    if (widthMatch && heightMatch) {
      score += 25;
      reasons.push('Dimensions within template limits');
    } else if (widthMatch || heightMatch) {
      score += 12;
      reasons.push('Partial dimension match');
    }

    // 4. Area match (15 points)
    const typicalArea =
      ((template.constraints.minWidth + template.constraints.maxWidth) / 2) *
      ((template.constraints.minHeight + template.constraints.maxHeight) / 2);
    const areaRatio = totalArea / typicalArea;

    if (areaRatio >= 0.7 && areaRatio <= 1.3) {
      score += 15;
      reasons.push('Area matches typical template size');
    } else if (areaRatio >= 0.5 && areaRatio <= 1.5) {
      score += 8;
      reasons.push('Area close to typical template size');
    }

    // 5. Cell type compatibility (10 points)
    if (constraints.preferredCellTypes && constraints.preferredCellTypes.length > 0) {
      const templateCellTypes = template.cellTypes.flat();
      const hasMatchingTypes = constraints.preferredCellTypes.some((type) =>
        templateCellTypes.includes(type)
      );

      if (hasMatchingTypes) {
        score += 10;
        reasons.push('Cell types compatible');
      }
    }

    // 6. Building code compliance bonus (5 points)
    if (constraints.buildingCodeCompliant !== false) {
      // Assume templates are code-compliant by default
      score += 5;
      reasons.push('Building code compliant');
    }

    // Only add if score > 0
    if (score > 0) {
      recommendations.push({
        templateId: template.id,
        templateName: template.name,
        score,
        reason: reasons.join('; '),
        template,
      });
    }
  });

  // Sort by score (highest first)
  return recommendations.sort((a, b) => b.score - a.score);
}

/**
 * Get the best matching template (highest score)
 */
export function getBestTemplate(
  geometry: Geometry2D,
  templates: EgyptianTemplate[],
  constraints: DesignConstraints = {}
): TemplateRecommendation | null {
  const recommendations = recommendTemplate(geometry, templates, constraints);
  return recommendations.length > 0 ? recommendations[0] : null;
}

