// src/components/fabricator/drafting/utils/constraintValidator.ts
import type { Geometry2D, Rectangle } from '../types/drafting';

export interface DesignConstraint {
  type: 'dimension' | 'area' | 'aspect-ratio' | 'material' | 'code' | 'cell-size' | 'spacing';
  value: number | string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  message: string;
  property?: string; // For dimension constraints: 'width', 'height', 'min-width', etc.
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedElements: string[];
  constraint?: DesignConstraint;
}

/**
 * Validate geometry against design constraints
 * Returns array of validation issues
 */
export function validateConstraints(
  geometry: Geometry2D,
  constraints: DesignConstraint[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  constraints.forEach((constraint) => {
    let isValid = false;

    switch (constraint.type) {
      case 'dimension':
        isValid = checkDimensionConstraint(geometry, constraint);
        break;
      case 'area':
        isValid = checkAreaConstraint(geometry, constraint);
        break;
      case 'aspect-ratio':
        isValid = checkAspectRatioConstraint(geometry, constraint);
        break;
      case 'cell-size':
        isValid = checkCellSizeConstraint(geometry, constraint);
        break;
      case 'spacing':
        isValid = checkSpacingConstraint(geometry, constraint);
        break;
      default:
        // Unknown constraint type - skip
        return;
    }

    if (!isValid) {
      const affectedIds = geometry.rectangles
        .map((r) => r.id)
        .filter((id): id is string => id !== undefined);

      issues.push({
        severity: constraint.type === 'code' ? 'error' : 'warning',
        message: constraint.message,
        affectedElements: affectedIds,
        constraint,
      });
    }
  });

  return issues;
}

/**
 * Check dimension constraint (width, height, min-width, etc.)
 */
function checkDimensionConstraint(
  geometry: Geometry2D,
  constraint: DesignConstraint
): boolean {
  if (geometry.rectangles.length === 0) {
    return true; // No rectangles to validate
  }

  // Calculate bounding box
  const minX = Math.min(...geometry.rectangles.map((r) => r.x));
  const minY = Math.min(...geometry.rectangles.map((r) => r.y));
  const maxX = Math.max(...geometry.rectangles.map((r) => r.x + r.width));
  const maxY = Math.max(...geometry.rectangles.map((r) => r.y + r.height));

  const overallWidth = maxX - minX;
  const overallHeight = maxY - minY;

  const property = constraint.property || 'width';
  const constraintValue = typeof constraint.value === 'number' ? constraint.value : parseFloat(String(constraint.value));

  let actualValue: number;
  switch (property) {
    case 'width':
      actualValue = overallWidth;
      break;
    case 'height':
      actualValue = overallHeight;
      break;
    case 'min-width':
      actualValue = Math.min(...geometry.rectangles.map((r) => r.width));
      break;
    case 'max-width':
      actualValue = Math.max(...geometry.rectangles.map((r) => r.width));
      break;
    case 'min-height':
      actualValue = Math.min(...geometry.rectangles.map((r) => r.height));
      break;
    case 'max-height':
      actualValue = Math.max(...geometry.rectangles.map((r) => r.height));
      break;
    default:
      return true; // Unknown property
  }

  return checkOperator(actualValue, constraint.operator, constraintValue);
}

/**
 * Check area constraint
 */
function checkAreaConstraint(geometry: Geometry2D, constraint: DesignConstraint): boolean {
  const totalArea = geometry.rectangles.reduce(
    (sum, rect) => sum + rect.width * rect.height,
    0
  );

  const constraintValue = typeof constraint.value === 'number' ? constraint.value : parseFloat(String(constraint.value));

  return checkOperator(totalArea, constraint.operator, constraintValue);
}

/**
 * Check aspect ratio constraint
 */
function checkAspectRatioConstraint(geometry: Geometry2D, constraint: DesignConstraint): boolean {
  if (geometry.rectangles.length === 0) {
    return true;
  }

  // Calculate overall aspect ratio
  const minX = Math.min(...geometry.rectangles.map((r) => r.x));
  const minY = Math.min(...geometry.rectangles.map((r) => r.y));
  const maxX = Math.max(...geometry.rectangles.map((r) => r.x + r.width));
  const maxY = Math.max(...geometry.rectangles.map((r) => r.y + r.height));

  const overallWidth = maxX - minX;
  const overallHeight = maxY - minY;
  const aspectRatio = overallWidth / overallHeight;

  const constraintValue = typeof constraint.value === 'number' ? constraint.value : parseFloat(String(constraint.value));

  return checkOperator(aspectRatio, constraint.operator, constraintValue);
}

/**
 * Check cell size constraint (minimum/maximum cell dimensions)
 */
function checkCellSizeConstraint(geometry: Geometry2D, constraint: DesignConstraint): boolean {
  if (geometry.rectangles.length === 0) {
    return true;
  }

  const constraintValue = typeof constraint.value === 'number' ? constraint.value : parseFloat(String(constraint.value));
  const property = constraint.property || 'min-width';

  for (const rect of geometry.rectangles) {
    let actualValue: number;
    switch (property) {
      case 'min-width':
        actualValue = rect.width;
        break;
      case 'min-height':
        actualValue = rect.height;
        break;
      case 'max-width':
        actualValue = rect.width;
        break;
      case 'max-height':
        actualValue = rect.height;
        break;
      default:
        continue;
    }

    if (!checkOperator(actualValue, constraint.operator, constraintValue)) {
      return false;
    }
  }

  return true;
}

/**
 * Check spacing constraint (minimum spacing between rectangles)
 */
function checkSpacingConstraint(geometry: Geometry2D, constraint: DesignConstraint): boolean {
  if (geometry.rectangles.length < 2) {
    return true; // Need at least 2 rectangles to check spacing
  }

  const minSpacing = typeof constraint.value === 'number' ? constraint.value : parseFloat(String(constraint.value));

  for (let i = 0; i < geometry.rectangles.length; i++) {
    for (let j = i + 1; j < geometry.rectangles.length; j++) {
      const rect1 = geometry.rectangles[i];
      const rect2 = geometry.rectangles[j];

      // Calculate minimum distance between rectangles
      const distance = calculateRectangleDistance(rect1, rect2);

      if (distance < minSpacing && distance > 0) {
        // Rectangles are too close (but not overlapping)
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculate minimum distance between two rectangles
 */
function calculateRectangleDistance(rect1: Rectangle, rect2: Rectangle): number {
  // Check if rectangles overlap
  const overlapX = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const overlapY = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));

  if (overlapX > 0 && overlapY > 0) {
    return 0; // Rectangles overlap
  }

  // Calculate distance
  let dx = 0;
  let dy = 0;

  if (rect1.x + rect1.width < rect2.x) {
    dx = rect2.x - (rect1.x + rect1.width);
  } else if (rect2.x + rect2.width < rect1.x) {
    dx = rect1.x - (rect2.x + rect2.width);
  }

  if (rect1.y + rect1.height < rect2.y) {
    dy = rect2.y - (rect1.y + rect1.height);
  } else if (rect2.y + rect2.height < rect1.y) {
    dy = rect1.y - (rect2.y + rect2.height);
  }

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if value satisfies operator constraint
 */
function checkOperator(actualValue: number, operator: string, constraintValue: number): boolean {
  switch (operator) {
    case '>':
      return actualValue > constraintValue;
    case '<':
      return actualValue < constraintValue;
    case '=':
      return Math.abs(actualValue - constraintValue) < 0.01; // Allow small floating point errors
    case '>=':
      return actualValue >= constraintValue;
    case '<=':
      return actualValue <= constraintValue;
    default:
      return true; // Unknown operator - assume valid
  }
}

