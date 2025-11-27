/**
 * Smart Draw Algorithm Utilities
 * ---------------------------------------------------------------------------
 * Helpers for façade mullion / transom layout:
 * - Equal spacing calculation with basic constraint validation
 * - Project + layout validation against system constraints
 * - Generation of mullion components compatible with WindowUnit export
 */

import type { WindowUnit, WindowComponent, Profile } from '@/types/fabricator';
import {
  type ValidationResult,
  type ValidationError,
  type SystemConstraints,
  validateProjectWithConstraints,
  deriveSystemConstraintsFromProfiles,
} from '@/lib/fabricatorValidation';

// ---------------------------------------------------------------------------
// Equal Spacing
// ---------------------------------------------------------------------------

export interface EqualSpacingOptions {
  /**
   * Optional minimum spacing in mm between vertical elements (typically maps
   * to minimum panel width from the system pack).
   */
  minSpacingMm?: number;

  /**
   * Optional maximum spacing in mm between vertical elements (typically maps
   * to maximum panel width from the system pack).
   */
  maxSpacingMm?: number;
}

export interface EqualSpacingResult {
  /**
   * The uniform spacing in mm between segments.
   */
  spacingMm: number;

  /**
   * Internal positions in mm measured from the start of the span.
   * Does not include the start (0) or end (totalSpanMm) boundaries.
   */
  positionsMm: number[];

  /**
   * Any soft validation errors (e.g. spacing outside min/max). Callers can
   * surface these in the UI but still allow manual override if needed.
   */
  errors: ValidationError[];
}

/**
 * Calculate equal spacing across a given span.
 *
 * Example:
 *  - totalSpanMm = 3000
 *  - segmentCount = 3 (three panels)
 *  -> spacingMm = 1000
 *  -> positionsMm = [1000, 2000]
 */
export function calculateEqualSpacing(
  totalSpanMm: number,
  segmentCount: number,
  options: EqualSpacingOptions = {},
): EqualSpacingResult {
  const errors: ValidationError[] = [];

  if (!Number.isFinite(totalSpanMm) || totalSpanMm <= 0) {
    errors.push({
      field: 'spacing',
      message: 'Span must be a positive number in millimetres.',
    });
  }

  if (!Number.isFinite(segmentCount) || segmentCount <= 0) {
    errors.push({
      field: 'segments',
      message: 'Number of segments must be greater than 0.',
    });
  }

  if (errors.length > 0) {
    return {
      spacingMm: 0,
      positionsMm: [],
      errors,
    };
  }

  const spacingMm = totalSpanMm / segmentCount;

  if (options.minSpacingMm !== undefined && spacingMm < options.minSpacingMm) {
    errors.push({
      field: 'spacing',
      message: `Calculated spacing (${spacingMm.toFixed(
        1,
      )}mm) is below minimum allowed (${options.minSpacingMm}mm).`,
    });
  }

  if (options.maxSpacingMm !== undefined && spacingMm > options.maxSpacingMm) {
    errors.push({
      field: 'spacing',
      message: `Calculated spacing (${spacingMm.toFixed(
        1,
      )}mm) exceeds maximum allowed (${options.maxSpacingMm}mm).`,
    });
  }

  const positionsMm: number[] = [];
  for (let i = 1; i < segmentCount; i += 1) {
    positionsMm.push(spacingMm * i);
  }

  return {
    spacingMm,
    positionsMm,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Project + Layout Validation
// ---------------------------------------------------------------------------

export interface SmartDrawLayout {
  /**
   * Absolute mullion positions in mm from the left edge of the opening.
   * Values are expected to be within (0, overallWidth).
   */
  mullionsMm: number[];

  /**
   * Computed panel widths in mm between façade edges and mullions.
   * Length = mullionsMm.length + 1
   */
  panelWidthsMm: number[];
}

export interface SmartDrawValidationResult extends ValidationResult {
  layout: SmartDrawLayout;
}

/**
 * Validate a project and its mullion layout against optional system
 * constraints. Builds on top of `validateProjectWithConstraints` and adds
 * per-panel width checks (min/max).
 */
export function validateProjectLayoutWithConstraints(
  project: WindowUnit | null,
  constraints: SystemConstraints | null,
  mullionsMm: number[],
): SmartDrawValidationResult {
  const base = validateProjectWithConstraints(project, constraints);

  const sortedMullions = [...mullionsMm].sort((a, b) => a - b);
  const layout: SmartDrawLayout = {
    mullionsMm: sortedMullions,
    panelWidthsMm: [],
  };

  // If project missing or no constraints available, just return base result
  if (!project || !constraints || !project.overallWidth || !project.overallHeight) {
    return {
      ...base,
      layout,
    };
  }

  const errors = [...base.errors];

  const width = project.overallWidth;

  // Keep only mullions strictly inside the opening
  const usableMullions = sortedMullions.filter((p) => p > 0 && p < width).sort((a, b) => a - b);

  const positionsWithEdges = [0, ...usableMullions, width];

  for (let i = 0; i < positionsWithEdges.length - 1; i += 1) {
    const panelWidth = positionsWithEdges[i + 1] - positionsWithEdges[i];
    layout.panelWidthsMm.push(panelWidth);

    if (constraints.minWidthMm !== undefined && panelWidth < constraints.minWidthMm) {
      errors.push({
        field: `panelWidth[${i}]`,
        message: `Panel ${i + 1} width (${panelWidth.toFixed(
          1,
        )}mm) is below minimum allowed for this system (${constraints.minWidthMm}mm).`,
      });
    }

    if (constraints.maxWidthMm !== undefined && panelWidth > constraints.maxWidthMm) {
      errors.push({
        field: `panelWidth[${i}]`,
        message: `Panel ${i + 1} width (${panelWidth.toFixed(
          1,
        )}mm) exceeds maximum allowed for this system (${constraints.maxWidthMm}mm).`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    layout,
  };
}

/**
 * Thin wrapper for deriving system constraints from profile inventory.
 * Useful for SmartDrawTool to stay independent of where constraints live.
 */
export function deriveConstraintsFromProfiles(profiles: Profile[]): SystemConstraints | null {
  return deriveSystemConstraintsFromProfiles(profiles);
}

// ---------------------------------------------------------------------------
// Layout → WindowUnit Export Helpers
// ---------------------------------------------------------------------------

export interface LayoutExportResult {
  layout: SmartDrawLayout;
  components: WindowComponent[];
}

/**
 * Generate vertical mullion components for a given layout.
 *
 * - Only vertical mullions are generated (no transoms yet).
 * - Each mullion is a full-height bar using the provided profile.
 * - Cutting length = overallHeight + 2 × cuttingAllowance (if defined).
 */
export function generateMullionComponentsFromLayout(
  project: WindowUnit | null,
  mullionsMm: number[],
  mullionProfile: Profile | null,
): LayoutExportResult {
  const sortedMullions = [...mullionsMm].sort((a, b) => a - b);

  const layout: SmartDrawLayout = {
    mullionsMm: sortedMullions,
    panelWidthsMm: [],
  };

  const components: WindowComponent[] = [];

  if (!project || !mullionProfile || !project.overallHeight || !project.overallWidth) {
    return { layout, components };
  }

  const width = project.overallWidth;
  const heightMm = project.overallHeight;
  const cuttingAllowance = mullionProfile.cuttingAllowance ?? 0;
  const cutLength = heightMm + cuttingAllowance * 2;

  // Only use mullions that are strictly inside the opening
  const usableMullions = sortedMullions.filter((p) => p > 0 && p < width).sort((a, b) => a - b);

  // Compute panel widths for completeness
  const positionsWithEdges = [0, ...usableMullions, width];
  for (let i = 0; i < positionsWithEdges.length - 1; i += 1) {
    layout.panelWidthsMm.push(positionsWithEdges[i + 1] - positionsWithEdges[i]);
  }

  let index = 0;
  for (const position of usableMullions) {
    const id = `mullion_${project.id}_${index}`;
    index += 1;

    const component: WindowComponent = {
      id,
      type: 'mullion',
      profile: mullionProfile,
      width: mullionProfile.width,
      height: heightMm,
      quantity: 1,
      cuttingLengths: [cutLength],
      angles: [90],
      machiningOperations: [],
      glazingType: String((project as any).glazing?.type ?? 'double'),
      hardware: [],
    };

    components.push(component);
  }

  return { layout, components };
}


