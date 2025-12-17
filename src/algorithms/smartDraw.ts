/**
 * Smart Draw Algorithm Utilities
 * ---------------------------------------------------------------------------
 * Helpers for façade mullion / transom layout:
 * - Equal spacing calculation with basic constraint validation
 * - Project + layout validation against system constraints
 * - Generation of mullion components compatible with WindowUnit export
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';
import {
  deriveSystemConstraintsFromProfiles,
  validateProjectWithConstraints,
  type SystemConstraints,
  type ValidationError,
  type ValidationResult,
} from '@/lib/fabricatorValidation';
import type { Profile, WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';

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
  for (const _position of usableMullions) {
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

// ---------------------------------------------------------------------------
// Grid → Components (New function)
// ---------------------------------------------------------------------------

export function generateComponentsFromGrid(
  project: WindowUnit | null,
  grid: WindowGrid,
  profiles: Profile[],
  systemPackId: string | null,
  systemPack?: any | null // Gold Tier: System pack for glass allowances and hardware
): { components: WindowComponent[]; hardware: any[] } {
  if (!project || !grid) {
    return { components: [], hardware: [] };
  }

  const components: WindowComponent[] = [];
  const hardware: any[] = [];

  // Gold Tier: Use systemProfileSelections if available
  const systemProfileSelections = project.systemProfileSelections || {};
  
  // Helper to find profile by role with systemProfileSelections priority
  const getProfileByRole = (role: string, fallbackRole?: string): Profile | null => {
    // 1. Try systemProfileSelections first
    if (role === 'frame' && systemProfileSelections.frameProfileCode) {
      const selected = profiles.find(p => 
        p.code === systemProfileSelections.frameProfileCode || 
        p.id === systemProfileSelections.frameProfileCode
      );
      if (selected) return selected;
    }
    if (role === 'sash' && systemProfileSelections.sashProfileCode) {
      const selected = profiles.find(p => 
        p.code === systemProfileSelections.sashProfileCode || 
        p.id === systemProfileSelections.sashProfileCode
      );
      if (selected) return selected;
    }
    if ((role === 'glazing_bead' || role === 'bead') && systemProfileSelections.beadProfileCode) {
      const selected = profiles.find(p => 
        p.code === systemProfileSelections.beadProfileCode || 
        p.id === systemProfileSelections.beadProfileCode
      );
      if (selected) return selected;
    }
    
    // 2. Try system pack profiles
    if (systemPack?.profiles) {
      const systemProfile = systemPack.profiles.find((p: Profile) => p.profileRole === role);
      if (systemProfile) {
        const matched = profiles.find(p => 
          p.id === systemProfile.id || 
          (p.code === systemProfile.code && p.profileRole === role)
        );
        if (matched) return matched;
      }
    }
    
    // 3. Fallback to generic search
    const found = profiles.find(p => 
      p.profileRole === role && 
      (!systemPackId || (p.systemPackIds && p.systemPackIds.includes(systemPackId)))
    );
    if (found) return found;
    
    // 4. Try fallback role
    if (fallbackRole) {
      return profiles.find(p => p.profileRole === fallbackRole) || null;
    }
    
    return null;
  };

  // Find appropriate profiles based on systemPackId or defaults
  const frameProfile = getProfileByRole('frame') || profiles.find(p => p.profileRole === 'frame') || profiles[0];

  // Find appropriate sash profile - prioritize sliding sash for sliding systems
  const isSlidingSystem = project.type?.includes('sliding') || 
                          grid.cells.some(cell => cell.type === 'sliding');
  
  const sashProfile = isSlidingSystem
    ? getProfileByRole('sash_sliding') || getProfileByRole('sash') || profiles.find(p => p.profileRole === 'sash_sliding') || profiles.find(p => p.profileRole === 'sash') || profiles[0]
    : getProfileByRole('sash') || profiles.find(p => p.profileRole === 'sash') || profiles[0];
  
  const mullionProfile = getProfileByRole('mullion') || profiles.find(p => p.profileRole === 'mullion') || null;

  // Find glazing bead profile
  const beadProfile = getProfileByRole('glazing_bead', 'bead') || 
    profiles.find(p => 
      (p.profileRole === 'glazing_bead' || p.profileRole === 'glazing_bead_inner' || p.profileRole === 'glazing_bead_outer') && 
      (!systemPackId || (p.systemPackIds && p.systemPackIds.includes(systemPackId)))
    ) || profiles.find(p => p.profileRole === 'glazing_bead' || p.profileRole === 'glazing_bead_inner' || p.profileRole === 'glazing_bead_outer') || null;

  // Get UPVC-specific hardware (reinforcement bars)
  const upvcSpec = systemPack && 'upvcSpec' in systemPack ? (systemPack as any).upvcSpec : null;
  
  // Gold Tier: Get glass allowances from system pack
  const glassAllowances = systemPack?.glassAllowances;

  if (!frameProfile) {
      return { components: [], hardware: [] };
  }

  const width = project.overallWidth;
  const height = project.overallHeight;

  // Hardware for frame assembly
  const isUPVC = frameProfile.material === 'upvc';
  const framePerimeter = (width + height) * 2; // mm
  
  // Frame screws (for mounting to wall - typically every 400-600mm)
  const frameScrewSpacing = 500; // mm
  const frameScrewCount = Math.ceil(framePerimeter / frameScrewSpacing);
  hardware.push({
    id: `screws_frame_mounting`,
    name: isUPVC ? 'Frame Mounting Screws (6×80mm)' : 'Frame Mounting Screws (6×60mm)',
    type: 'screw',
    quantity: frameScrewCount,
    position: 'frame_perimeter'
  });

  // Frame gaskets/weather strips (outer perimeter)
  const frameGasketLength = Math.ceil(framePerimeter / 1000); // meters
  hardware.push({
    id: `gasket_frame`,
    name: 'Frame Gasket/Weather Strip',
    type: 'gasket',
    quantity: frameGasketLength, // in meters
    position: 'frame_perimeter'
  });

  // 1. Outer Frame (4 pieces)
  components.push({
    id: `frame_top_${Date.now()}`,
    type: 'frame',
    profile: frameProfile,
    width: width,
    height: frameProfile.width, 
    quantity: 1,
    cuttingLengths: [width],
    angles: [45, 45],
    machiningOperations: [],
    glazingType: 'none',
    hardware: []
  });
  components.push({
    id: `frame_bottom_${Date.now()}`,
    type: 'frame',
    profile: frameProfile,
    width: width,
    height: frameProfile.width,
    quantity: 1,
    cuttingLengths: [width],
    angles: [45, 45],
    machiningOperations: [],
    glazingType: 'none',
    hardware: []
  });
  components.push({
    id: `frame_left_${Date.now()}`,
    type: 'frame',
    profile: frameProfile,
    width: frameProfile.width,
    height: height,
    quantity: 1,
    cuttingLengths: [height],
    angles: [45, 45],
    machiningOperations: [],
    glazingType: 'none',
    hardware: []
  });
  components.push({
    id: `frame_right_${Date.now()}`,
    type: 'frame',
    profile: frameProfile,
    width: frameProfile.width,
    height: height,
    quantity: 1,
    cuttingLengths: [height],
    angles: [45, 45],
    machiningOperations: [],
    glazingType: 'none',
    hardware: []
  });

  // 2. Internal Grid (Mullions/Transoms) - Maalem-Grade Precision
  // CRITICAL: Sliding systems do NOT use mullions - sashes slide past each other with interlock
  // isSlidingSystem already determined above when finding sash profile
  
  // Find interlock profile for sliding systems
  const interlockProfile = profiles.find(p => 
    (p.profileRole === 'interlock') && 
    (!systemPackId || (p.systemPackIds && p.systemPackIds.includes(systemPackId)))
  ) || profiles.find(p => p.profileRole === 'interlock');

  if (grid.cols > 1) {
    if (isSlidingSystem) {
      // SLIDING SYSTEM: Use interlock profile, NOT mullion
      // Interlock connects the two sliding sashes in the middle
      if (interlockProfile) {
        const interlockHeight = height - (2 * frameProfile.width);
        components.push({
          id: `interlock_vertical_${Date.now()}`,
          type: 'interlock',
          profile: interlockProfile,
          width: interlockProfile.width || 20, // Typical interlock width
          height: interlockHeight,
          quantity: grid.cols - 1, // One interlock per gap between sashes
          cuttingLengths: [interlockHeight],
          angles: [90, 90], // Vertical interlock
          machiningOperations: [],
          glazingType: 'none',
          hardware: []
        });
      }
      // NO MULLION for sliding systems - sashes slide past each other
    } else {
      // NON-SLIDING SYSTEM: Use mullion (e.g., fixed panels, casement windows)
      if (mullionProfile) {
        for (let i = 1; i < grid.cols; i++) {
          components.push({
            id: `mullion_v_${i}_${Date.now()}`,
            type: 'mullion',
            profile: mullionProfile,
            width: mullionProfile.width,
            height: height - (2 * frameProfile.width),
            quantity: 1,
            cuttingLengths: [height - (2 * frameProfile.width)],
            angles: [90, 90],
            machiningOperations: [],
            glazingType: 'none',
            hardware: []
          });
        }
      }
    }
  }

  if (grid.rows > 1 && mullionProfile) {
      for (let i = 1; i < grid.rows; i++) {
          components.push({
            id: `transom_h_${i}_${Date.now()}`,
            type: 'transom',
            profile: mullionProfile,
            width: width - (2 * frameProfile.width),
            height: mullionProfile.width,
            quantity: 1,
            cuttingLengths: [width - (2 * frameProfile.width)],
            angles: [90, 90],
            machiningOperations: [],
            glazingType: 'none',
            hardware: []
          });
      }
  }

  // 3. Sashes - Maalem-Grade Precision
  // For sliding systems: Each sash is a complete unit (4 pieces: top, bottom, left, right)
  // For casement systems: Each sash is also a complete unit (4 pieces: top, bottom, left, right)
  // Sashes slide past each other - NO mullion between them
  grid.cells.forEach(cell => {
      const isSashCell = cell.type === 'sliding' || cell.type === 'sash';
      if (isSashCell && sashProfile) {
          // Calculate cell dimensions accurately
          // For sliding systems: Each sash takes full height, width is divided by number of sashes
          const cellW = (width - (2 * frameProfile.width)) / grid.cols;
          const cellH = height - (2 * frameProfile.width); // Full height for sliding sashes
          
           components.push({
            id: `sash_${cell.id}_top`,
            type: 'sash',
            profile: sashProfile,
            width: cellW,
            height: sashProfile.width,
            quantity: 1,
            cuttingLengths: [cellW],
            angles: [45, 45],
            machiningOperations: [],
            glazingType: 'double',
            hardware: []
          });
           components.push({
            id: `sash_${cell.id}_bottom`,
            type: 'sash',
            profile: sashProfile,
            width: cellW,
            height: sashProfile.width,
            quantity: 1,
            cuttingLengths: [cellW],
            angles: [45, 45],
            machiningOperations: [],
            glazingType: 'double',
            hardware: []
          });
           components.push({
            id: `sash_${cell.id}_left`,
            type: 'sash',
            profile: sashProfile,
            width: sashProfile.width,
            height: cellH,
            quantity: 1,
            cuttingLengths: [cellH],
            angles: [45, 45],
            machiningOperations: [],
            glazingType: 'double',
            hardware: []
          });
           components.push({
            id: `sash_${cell.id}_right`,
            type: 'sash',
            profile: sashProfile,
            width: sashProfile.width,
            height: cellH,
            quantity: 1,
            cuttingLengths: [cellH],
            angles: [45, 45],
            machiningOperations: [],
            glazingType: 'double',
            hardware: []
          });
          
          hardware.push({
              id: `handle_${cell.id}`,
              name: 'Standard Handle',
              type: 'handle',
              quantity: 1,
              position: 'left'
          });

          // UPVC Reinforcement Bars (if required)
          if (isUPVC && upvcSpec?.reinforcement?.required) {
            // Calculate if sash requires reinforcement (typically >800mm width or >1200mm height)
            const requiresReinforcement = cellW >= 800 || cellH >= 1200;
            if (requiresReinforcement) {
              // Calculate reinforcement bar lengths (steel is shorter than PVC by deductionMm)
              const reinforcementDeduction = upvcSpec.reinforcement.deductionMm || 15;
              const horizontalBarLength = Math.max(0, cellW - reinforcementDeduction);
              const verticalBarLength = Math.max(0, cellH - reinforcementDeduction);
              
              hardware.push({
                id: `reinforcement_horizontal_${cell.id}`,
                name: `Steel Reinforcement Bar (${upvcSpec.reinforcement.profileCode || 'U-10-30-10'})`,
                type: 'reinforcement',
                quantity: 2, // Top and bottom
                length: horizontalBarLength,
                position: 'sash_horizontal'
              });
              
              hardware.push({
                id: `reinforcement_vertical_${cell.id}`,
                name: `Steel Reinforcement Bar (${upvcSpec.reinforcement.profileCode || 'U-10-30-10'})`,
                type: 'reinforcement',
                quantity: 2, // Left and right
                length: verticalBarLength,
                position: 'sash_vertical'
              });
            }
          }

          // Add glazing bead components for each sash (4 pieces: top, bottom, left, right)
          // Glazing beads are required for all sashes with glazing (double, triple, etc.)
          // If glazing type is not explicitly set, assume double glazing (standard for UPVC)
          // CRITICAL: Glazing bead length = glass size (inside sash frame), not sash opening
          const hasGlazing = project.glazing && (
            (typeof project.glazing === 'object' && 'type' in project.glazing && project.glazing.type !== 'none') ||
            (typeof project.glazing === 'string' && project.glazing !== 'none')
          );
          if (beadProfile && (hasGlazing || !project.glazing)) { // Add beads if glazing exists or if not specified (default to double)
            // Gold Tier: Glass dimensions using system pack glassAllowances
            let glassWidth: number;
            let glassHeight: number;
            
            if (glassAllowances) {
              // Use system pack glass allowance rules (e.g., edgeClearanceMm)
              const edgeClearance = glassAllowances.edgeClearanceMm || 0;
              glassWidth = Math.max(0, cellW - (2 * edgeClearance));
              glassHeight = Math.max(0, cellH - (2 * edgeClearance));
            } else {
              // Fallback: sash opening minus sash profile width on all sides
              glassWidth = cellW - (2 * sashProfile.width);
              glassHeight = cellH - (2 * sashProfile.width);
            }
            
            // Top bead (horizontal) - matches glass width
            components.push({
              id: `bead_${cell.id}_top`,
              type: 'glazing_bead',
              profile: beadProfile,
              width: glassWidth,
              height: beadProfile.width || 20,
              quantity: 1,
              cuttingLengths: [Math.max(0, glassWidth)], // Ensure non-negative
              angles: [45, 45],
              machiningOperations: [],
              glazingType: (typeof project.glazing === 'object' && 'type' in project.glazing) ? project.glazing.type : (project.glazing || 'double'),
              hardware: []
            });
            // Bottom bead (horizontal) - matches glass width
            components.push({
              id: `bead_${cell.id}_bottom`,
              type: 'glazing_bead',
              profile: beadProfile,
              width: glassWidth,
              height: beadProfile.width || 20,
              quantity: 1,
              cuttingLengths: [Math.max(0, glassWidth)],
              angles: [45, 45],
              machiningOperations: [],
              glazingType: (typeof project.glazing === 'object' && 'type' in project.glazing) ? project.glazing.type : (project.glazing || 'double'),
              hardware: []
            });
            // Left bead (vertical) - matches glass height
            components.push({
              id: `bead_${cell.id}_left`,
              type: 'glazing_bead',
              profile: beadProfile,
              width: beadProfile.width || 20,
              height: glassHeight,
              quantity: 1,
              cuttingLengths: [Math.max(0, glassHeight)],
              angles: [45, 45],
              machiningOperations: [],
              glazingType: (typeof project.glazing === 'object' && 'type' in project.glazing) ? project.glazing.type : (project.glazing || 'double'),
              hardware: []
            });
            // Right bead (vertical) - matches glass height
            components.push({
              id: `bead_${cell.id}_right`,
              type: 'glazing_bead',
              profile: beadProfile,
              width: beadProfile.width || 20,
              height: glassHeight,
              quantity: 1,
              cuttingLengths: [Math.max(0, glassHeight)],
              angles: [45, 45],
              machiningOperations: [],
              glazingType: (typeof project.glazing === 'object' && 'type' in project.glazing) ? project.glazing.type : (project.glazing || 'double'),
              hardware: []
            });
          }
      }
  });

  return { components, hardware };
}
