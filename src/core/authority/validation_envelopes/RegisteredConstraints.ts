/**
 * @file RegisteredConstraints.ts
 * @description Registered Constraints - Pre-registered geometric constraints
 * 
 * AICS-001 Reference: Section 4.3.1 (Geometric Constraints)
 * 
 * Registers geometric constraints extracted from ConstraintEngine.validateDesign()
 * with the ValidationEnvelope system.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type { WindowGrid } from '@/types/fabricator';
import { ConstraintCategory, getConstraintRegistry } from './ConstraintRegistry';
import type { DeterministicConstraint, ValidationContext } from './index';

/**
 * Design Validation Context
 * 
 * Extended validation context for design validation.
 * Templates are matched dynamically in validateDesign, so template constraints
 * are applied when template information is available in context.
 */
export interface DesignValidationContext extends ValidationContext {
  width: number;
  height: number;
  grid: WindowGrid;
  systemId?: string;
  template?: {
    min_width: number;
    max_width: number;
    min_height: number;
    max_height: number;
    max_sash_ratio?: number;
    allowed_profile_systems?: string[];
    cell_constraints?: Array<{
      col_index?: number;
      row_index?: number;
      min_width?: number;
      max_width?: number;
    }>;
  };
}

/**
 * Geometric Constraints from ConstraintEngine.validateDesign()
 * 
 * These constraints are extracted from the validateDesign() function
 * and registered with the ValidationEnvelope system.
 * 
 * Note: Template-specific constraints require template information in context.
 * The validateDesign() function matches templates and provides template data.
 */

/**
 * GEOM-001: Positive Dimensions Constraint
 * 
 * AICS-001 Section 4.3.1: Geometric constraints ensure design can physically exist.
 * Width and height must be positive values.
 */
const GEOM_001_PositiveDimensions: DeterministicConstraint = {
  constraintId: 'GEOM-001',
  ruleId: 'AICS-001-4.3.1-1',
  description: 'Overall dimensions must be positive (width > 0 and height > 0)',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (context.width === undefined || context.height === undefined) {
      return true; // Missing dimensions pass (handled by other contexts or generic checks)
    }
    if (typeof context.width !== 'number' || typeof context.height !== 'number') {
      return false;
    }
    return context.width > 0 && context.height > 0;
  },
};

/**
 * GEOM-002: Minimum Width Constraint (Template-Based)
 * 
 * AICS-001 Section 4.3.1: Minimum and maximum lengths are geometric constraints.
 * Width must meet template minimum width requirement (when template is available).
 */
const GEOM_002_MinimumWidth: DeterministicConstraint = {
  constraintId: 'GEOM-002',
  ruleId: 'AICS-001-4.3.1-2',
  description: 'Width must meet template minimum width requirement',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (!context.template) {
      return true; // No template constraint, pass (will be validated by generic constraints)
    }
    return context.width >= context.template.min_width;
  },
};

/**
 * GEOM-003: Maximum Width Constraint (Template-Based)
 * 
 * AICS-001 Section 4.3.1: Maximum lengths are geometric constraints.
 * Width must not exceed template maximum width requirement (when template is available).
 */
const GEOM_003_MaximumWidth: DeterministicConstraint = {
  constraintId: 'GEOM-003',
  ruleId: 'AICS-001-4.3.1-3',
  description: 'Width must not exceed template maximum width requirement',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (!context.template) {
      return true; // No template constraint, pass (will be validated by generic constraints)
    }
    return context.width <= context.template.max_width;
  },
};

/**
 * GEOM-004: Minimum Height Constraint (Template-Based)
 * 
 * AICS-001 Section 4.3.1: Minimum and maximum lengths are geometric constraints.
 * Height must meet template minimum height requirement (when template is available).
 */
const GEOM_004_MinimumHeight: DeterministicConstraint = {
  constraintId: 'GEOM-004',
  ruleId: 'AICS-001-4.3.1-4',
  description: 'Height must meet template minimum height requirement',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (!context.template) {
      return true; // No template constraint, pass (will be validated by generic constraints)
    }
    return context.height >= context.template.min_height;
  },
};

/**
 * GEOM-005: Maximum Height Constraint (Template-Based)
 * 
 * AICS-001 Section 4.3.1: Maximum lengths are geometric constraints.
 * Height must not exceed template maximum height requirement (when template is available).
 */
const GEOM_005_MaximumHeight: DeterministicConstraint = {
  constraintId: 'GEOM-005',
  ruleId: 'AICS-001-4.3.1-5',
  description: 'Height must not exceed template maximum height requirement',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (!context.template) {
      return true; // No template constraint, pass (will be validated by generic constraints)
    }
    return context.height <= context.template.max_height;
  },
};

/**
 * GEOM-006: Aspect Ratio Constraint (Template-Based)
 * 
 * AICS-001 Section 4.3.1: Geometric constraints ensure design can physically exist.
 * Aspect ratio (height/width) must not exceed template maximum sash ratio (when template is available).
 */
const GEOM_006_AspectRatio: DeterministicConstraint = {
  constraintId: 'GEOM-006',
  ruleId: 'AICS-001-4.3.1-6',
  description: 'Aspect ratio (height/width) must not exceed template maximum sash ratio',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (!context.template?.max_sash_ratio) {
      return true; // No aspect ratio constraint, pass
    }
    if (context.width <= 0) {
      return false; // Invalid width
    }
    const ratio = context.height / context.width;
    return ratio <= context.template.max_sash_ratio;
  },
};

/**
 * GEOM-007: Generic Minimum Sash Width Constraint
 * 
 * AICS-001 Section 4.3.1: Minimum lengths are geometric constraints.
 * Average sash width must meet manufacturing minimum (300mm for generic/non-template cases).
 */
const GEOM_007_GenericMinSashWidth: DeterministicConstraint = {
  constraintId: 'GEOM-007',
  ruleId: 'AICS-001-4.3.1-7',
  description: 'Average sash width must meet manufacturing minimum (300mm for generic cases)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (context.template) {
      return true; // Template-based constraints take precedence
    }
    if (!context.grid || context.grid.cols <= 0 || context.width === undefined) {
      return true; // Cannot compute without grid or dimensions
    }
    const avgCellWidth = context.width / context.grid.cols;
    return avgCellWidth >= 300;
  },
};

/**
 * GEOM-008: Generic Maximum Unit Height Constraint
 * 
 * AICS-001 Section 4.3.1: Maximum lengths are geometric constraints.
 * Unit height must not exceed standard profile limits (3000mm for generic/non-template cases).
 */
const GEOM_008_GenericMaxUnitHeight: DeterministicConstraint = {
  constraintId: 'GEOM-008',
  ruleId: 'AICS-001-4.3.1-8',
  description: 'Unit height must not exceed standard profile limits (3000mm for generic cases)',
  source: 'Engineering Standard',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (context.template) {
      return true; // Template-based constraints take precedence
    }
    if (context.height === undefined) {
      return true; // Missing height passes (not a design context)
    }
    return context.height <= 3000;
  },
};

/**
 * GEOM-009: Cell-Level Minimum Width Constraint (Template-Based)
 * 
 * AICS-001 Section 4.3.1: Geometric constraints ensure assembly compatibility.
 * Column width must meet cell-level minimum width requirements (when template cell constraints are available).
 */
const GEOM_009_CellMinWidth: DeterministicConstraint = {
  constraintId: 'GEOM-009',
  ruleId: 'AICS-001-4.3.1-9',
  description: 'Column width must meet cell-level minimum width requirements',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (!context.template?.cell_constraints || context.grid.cols <= 0) {
      return true; // No cell constraints, pass
    }
    
    const colWidth = context.width / context.grid.cols;
    
    return context.template.cell_constraints.every((cc) => {
      if (cc.col_index == null || cc.min_width == null) {
        return true; // Skip constraints without col_index or min_width
      }
      return colWidth >= cc.min_width;
    });
  },
};

/**
 * GEOM-010: Cell-Level Maximum Width Constraint (Template-Based)
 * 
 * AICS-001 Section 4.3.1: Geometric constraints ensure assembly compatibility.
 * Column width must not exceed cell-level maximum width requirements (when template cell constraints are available).
 */
const GEOM_010_CellMaxWidth: DeterministicConstraint = {
  constraintId: 'GEOM-010',
  ruleId: 'AICS-001-4.3.1-10',
  description: 'Column width must not exceed cell-level maximum width requirements',
  source: 'AICS-001',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as DesignValidationContext;
    if (!context.template?.cell_constraints || context.grid.cols <= 0) {
      return true; // No cell constraints, pass
    }
    
    const colWidth = context.width / context.grid.cols;
    
    return context.template.cell_constraints.every((cc) => {
      if (cc.col_index == null || cc.max_width == null) {
        return true; // Skip constraints without col_index or max_width
      }
      return colWidth <= cc.max_width;
    });
  },
};

/**
 * Register all geometric constraints
 * 
 * Registers geometric constraints extracted from ConstraintEngine.validateDesign()
 * with the ValidationEnvelope system.
 * 
 * AICS-001 Section 4.3.1: Geometric constraints are registered in the GEOMETRIC category.
 * 
 * Constraints are registered in priority order (lower priority number = higher priority).
 */
export function registerGeometricConstraints(): void {
  const registry = getConstraintRegistry();
  
  // Register constraints in priority order (lower priority = higher priority)
  registry.register(GEOM_001_PositiveDimensions, ConstraintCategory.GEOMETRIC, 10);
  registry.register(GEOM_002_MinimumWidth, ConstraintCategory.GEOMETRIC, 20);
  registry.register(GEOM_003_MaximumWidth, ConstraintCategory.GEOMETRIC, 30);
  registry.register(GEOM_004_MinimumHeight, ConstraintCategory.GEOMETRIC, 40);
  registry.register(GEOM_005_MaximumHeight, ConstraintCategory.GEOMETRIC, 50);
  registry.register(GEOM_006_AspectRatio, ConstraintCategory.GEOMETRIC, 60);
  registry.register(GEOM_007_GenericMinSashWidth, ConstraintCategory.GEOMETRIC, 70);
  registry.register(GEOM_008_GenericMaxUnitHeight, ConstraintCategory.GEOMETRIC, 80);
  registry.register(GEOM_009_CellMinWidth, ConstraintCategory.GEOMETRIC, 90);
  registry.register(GEOM_010_CellMaxWidth, ConstraintCategory.GEOMETRIC, 100);
}

/**
 * Export constraint definitions for reference
 */
export const GeometricConstraints = {
  GEOM_001_PositiveDimensions,
  GEOM_002_MinimumWidth,
  GEOM_003_MaximumWidth,
  GEOM_004_MinimumHeight,
  GEOM_005_MaximumHeight,
  GEOM_006_AspectRatio,
  GEOM_007_GenericMinSashWidth,
  GEOM_008_GenericMaxUnitHeight,
  GEOM_009_CellMinWidth,
  GEOM_010_CellMaxWidth,
};
