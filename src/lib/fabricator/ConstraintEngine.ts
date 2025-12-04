import type { WindowGrid } from '@/types/fabricator';
import templatesJson from './egyptian_templates.json';

export interface EgyptianTemplate {
  id: string;
  name: string;
  system_type: 'sliding' | 'casement' | 'tilt_turn' | 'fixed';
  topology: {
    rows: number;
    cols: number;
    /** Simple row-major pattern of cell types, e.g. ['fixed', 'sash'] */
    patterns: string[][];
  };
  constraints: {
    min_width: number;
    max_width: number;
    min_height: number;
    max_height: number;
    max_sash_ratio?: number;
    max_sash_weight_kg?: number;
    allowed_profile_systems?: string[];
    cell_constraints?: {
      col_index?: number;
      row_index?: number;
      min_width?: number;
      max_width?: number;
    }[];
  };
  defaults?: {
    width: number;
    height: number;
  };
}

const templates = templatesJson as EgyptianTemplate[];

export interface DesignValidationResult {
  isValid: boolean;
  errors: string[];
  closestTemplate?: string;
}

/**
 * Validate a given design (width/height + SmartDraw grid) against
 * Egyptian-style templates. This runs BEFORE 3D geometry generation.
 */
export const validateDesign = (
  width: number,
  height: number,
  grid: WindowGrid,
  systemId: string | null | undefined
): DesignValidationResult => {
  const errors: string[] = [];

  if (!width || !height || width <= 0 || height <= 0) {
    return {
      isValid: false,
      errors: ['Overall dimensions are missing or invalid.'],
    };
  }

  // 1. Find a matching topology (rows/cols + basic cell types)
  const matchingTemplate = templates.find((t) => {
    if (t.topology.rows !== grid.rows || t.topology.cols !== grid.cols) {
      return false;
    }

    // Very simple pattern check: flatten first pattern and compare types
    const firstPattern = t.topology.patterns[0];
    if (!firstPattern) return true;

    // Map row/col to index in row-major order
    return firstPattern.every((expectedType, index) => {
      const row = Math.floor(index / grid.cols);
      const col = index % grid.cols;
      const cell = grid.cells.find((c) => c.row === row && c.col === col);
      return cell ? cell.type === (expectedType as any) : false;
    });
  });

  if (!matchingTemplate) {
    // No specific Egyptian template, fall back to generic structural rules
    const avgCellWidth = width / grid.cols;
    const avgCellHeight = height / grid.rows;

    if (avgCellWidth < 300) {
      errors.push('Average sash width too small for manufacturing (<300mm).');
    }
    if (avgCellHeight > 3000) {
      errors.push('Unit height exceeds standard profile limits (>3000mm).');
    }

    return {
      isValid: errors.length === 0,
      errors:
        errors.length > 0
          ? errors
          : ['Custom non-standard layout detected (use with caution).'],
    };
  }

  const c = matchingTemplate.constraints;

  // 2. Global dimension constraints
  if (width < c.min_width) {
    errors.push(
      `Width ${width.toFixed(
        0
      )}mm is too small for ${matchingTemplate.name} (min ${c.min_width}mm).`
    );
  }
  if (width > c.max_width) {
    errors.push(
      `Width ${width.toFixed(
        0
      )}mm exceeds maximum for ${matchingTemplate.name} (max ${c.max_width}mm).`
    );
  }
  if (height < c.min_height) {
    errors.push(
      `Height ${height.toFixed(
        0
      )}mm is too small for ${matchingTemplate.name} (min ${c.min_height}mm).`
    );
  }
  if (height > c.max_height) {
    errors.push(
      `Height ${height.toFixed(
        0
      )}mm exceeds maximum for ${matchingTemplate.name} (max ${c.max_height}mm).`
    );
  }

  // 3. Aspect ratio guard (prevents very tall/narrow or flat "spaghetti" windows)
  const ratio = height / width;
  if (c.max_sash_ratio && ratio > c.max_sash_ratio) {
    errors.push(
      `Aspect ratio ${ratio.toFixed(
        2
      )} is unsafe for this template (too tall/narrow).`
    );
  }

  // 4. Cell-level constraints (e.g. door leaf width)
  if (c.cell_constraints && c.cell_constraints.length > 0) {
    const colWidth = width / grid.cols;
    c.cell_constraints.forEach((cc) => {
      if (cc.col_index != null) {
        if (cc.min_width && colWidth < cc.min_width) {
          errors.push(
            `Column ${cc.col_index + 1} width (${colWidth.toFixed(
              0
            )}mm) is below minimum ${cc.min_width}mm for ${matchingTemplate.name}.`
          );
        }
        if (cc.max_width && colWidth > cc.max_width) {
          errors.push(
            `Column ${cc.col_index + 1} width (${colWidth.toFixed(
              0
            )}mm) exceeds maximum ${cc.max_width}mm for ${matchingTemplate.name}.`
          );
        }
      }
    });
  }

  // 5. System compatibility
  const sysId = systemId || 'generic';
  if (
    c.allowed_profile_systems &&
    !c.allowed_profile_systems.includes(sysId) &&
    !c.allowed_profile_systems.includes('generic')
  ) {
    errors.push(
      `System "${sysId}" is not certified for template "${matchingTemplate.name}".`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    closestTemplate: errors.length === 0 ? matchingTemplate.name : undefined,
  };
};


