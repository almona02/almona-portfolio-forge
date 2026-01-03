// src/components/fabricator/drafting/utils/dimensionValidator.ts
import type { Geometry2D } from '../types/drafting';

/**
 * Validate dimensions against manufacturing constraints
 * Constitutional: Rule-based, deterministic
 */
export interface DimensionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDimensions(geometry: Geometry2D): DimensionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Minimum cell dimensions
  const MIN_CELL_WIDTH = 300; // mm
  const MIN_CELL_HEIGHT = 300; // mm
  const MAX_CELL_WIDTH = 3000; // mm
  const MAX_CELL_HEIGHT = 3000; // mm

  geometry.rectangles.forEach((rect, index) => {
    if (rect.width < MIN_CELL_WIDTH) {
      errors.push(`Rectangle ${index + 1}: Width ${rect.width}mm is below minimum ${MIN_CELL_WIDTH}mm`);
    }
    if (rect.height < MIN_CELL_HEIGHT) {
      errors.push(`Rectangle ${index + 1}: Height ${rect.height}mm is below minimum ${MIN_CELL_HEIGHT}mm`);
    }
    if (rect.width > MAX_CELL_WIDTH) {
      warnings.push(`Rectangle ${index + 1}: Width ${rect.width}mm exceeds typical maximum ${MAX_CELL_WIDTH}mm`);
    }
    if (rect.height > MAX_CELL_HEIGHT) {
      warnings.push(`Rectangle ${index + 1}: Height ${rect.height}mm exceeds typical maximum ${MAX_CELL_HEIGHT}mm`);
    }
  });

  // Rule 2: Aspect ratio constraints
  geometry.rectangles.forEach((rect, index) => {
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio > 3 || aspectRatio < 0.33) {
      warnings.push(`Rectangle ${index + 1}: Extreme aspect ratio ${aspectRatio.toFixed(2)} may cause manufacturing issues`);
    }
  });

  // Rule 3: Total area constraint
  const totalArea = geometry.rectangles.reduce(
    (sum, rect) => sum + (rect.width * rect.height),
    0
  );
  const MAX_TOTAL_AREA = 10000000; // 10m² in mm²
  if (totalArea > MAX_TOTAL_AREA) {
    warnings.push(`Total area ${(totalArea / 1000000).toFixed(2)}m² exceeds typical manufacturing limits`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

