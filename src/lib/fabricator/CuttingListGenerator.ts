/**
 * Cutting List Generator - Phase 2: University-Grade Precision
 * 
 * Generates cutting lists from window dimensions and system packs.
 * Uses UnitProfileGatherer for comprehensive profile gathering with all 25+ roles.
 * Maintains backward compatibility with legacy code.
 * 
 * @version 2.0.0
 */

import type { SystemPack } from '@/data/systemPacks';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import type { WindowUnit } from '@/types/fabricator';
import { micronEngine } from './MicronEngine';
import type { Cut } from './OptimizationEngine';
import { unitProfileGatherer } from './UnitProfileGatherer';
import {
    DEFAULT_CUTTING_RULE_OFFSETS,
    DEFAULT_GLAZING_SPECS,
    DEFAULT_GRID_CONFIG,
    SYSTEM_CUTTING_RULES,
} from './cuttingListConstants';

/**
 * Generate cutting list from dimensions and system pack
 * 
 * Enhanced to use UnitProfileGatherer for comprehensive profile gathering.
 * Maintains backward compatibility with legacy options.
 * 
 * @param systemPackId - System pack identifier
 * @param width - Window width in mm
 * @param height - Window height in mm
 * @param options - Optional configuration (backward compatible)
 * @returns Array of cuts with all profile roles
 */
export function generateCuttingListFromSystemPack(
  systemPackId: string,
  width: number,
  height: number,
  options?: {
    includeTransom?: boolean;
    transomHeight?: number;
    includeBeads?: boolean;
    /** Use comprehensive profile gathering (default: true) */
    useComprehensiveGathering?: boolean;
  }
): Cut[] {
  const systemPack = SYSTEM_PACKS.find(p => p.meta.id === systemPackId);
  if (!systemPack) {
    throw new Error(`System pack ${systemPackId} not found`);
  }

  // Use comprehensive gathering by default (can be disabled for backward compatibility)
  const useComprehensive = options?.useComprehensiveGathering !== false;

  if (useComprehensive && systemPack.profiles && systemPack.profiles.length > 0) {
    // Use new comprehensive profile gathering
    return generateCuttingListComprehensive(systemPack, width, height, options);
  }

  // Fallback to legacy implementation for backward compatibility
  return generateCuttingListLegacy(systemPack, width, height, options);
}

/**
 * Generate cutting list using comprehensive profile gathering (University-Grade)
 * 
 * Gathers ALL profiles from system pack, not just frame/sash/bead.
 */
function generateCuttingListComprehensive(
  systemPack: SystemPack,
  width: number,
  height: number,
  options?: {
    includeTransom?: boolean;
    transomHeight?: number;
    includeBeads?: boolean;
  }
): Cut[] {
  // Create a window unit for profile gathering
  const windowUnit: WindowUnit = {
    id: 'cutting-list-generation',
    orderNumber: 'CL-GEN',
    posNumber: 'P-01',
    type: 'sliding_window',
    components: [],
    overallWidth: width,
    overallHeight: height,
    color: 'Silver',
    glazing: options?.includeBeads !== false 
      ? { 
          type: 'double', 
          totalThickness: DEFAULT_GLAZING_SPECS.DEFAULT_TOTAL_THICKNESS_MM, 
          weightPerSqm: DEFAULT_GLAZING_SPECS.DEFAULT_WEIGHT_PER_SQM_KG 
        } 
      : { type: 'none' },
    hardware: [],
    status: 'design',
    optimization: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    systemPackId: systemPack.meta.id,
    grid: options?.includeTransom ? {
      rows: DEFAULT_GRID_CONFIG.DEFAULT_TRANSOM_ROWS,
      cols: DEFAULT_GRID_CONFIG.DEFAULT_TRANSOM_COLS,
      cells: [
        { id: '1', row: 0, col: 0, type: 'fixed' },
        { id: '2', row: 1, col: 0, type: 'fixed' },
      ],
    } : undefined,
  };

  try {
    // Gather all profiles with comprehensive validation
    // For sliding windows, ensure grid is set up to generate sash components
    if (!windowUnit.grid && windowUnit.type?.includes('sliding')) {
      // Create default 2-sash sliding grid for sliding windows
      windowUnit.grid = {
        rows: DEFAULT_GRID_CONFIG.DEFAULT_SLIDING_ROWS,
        cols: DEFAULT_GRID_CONFIG.DEFAULT_SLIDING_COLS,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'sliding' },
          { id: '0-1', row: 0, col: 1, type: 'sliding' },
        ],
        colWidths: [
          DEFAULT_GRID_CONFIG.EQUAL_WIDTH_RATIO, 
          DEFAULT_GRID_CONFIG.EQUAL_WIDTH_RATIO
        ], // Equal width sashes
      };
    }
    
    const gatheringResult = unitProfileGatherer.gatherAllProfiles(windowUnit, systemPack);

    // Convert RequiredCut[] to Cut[]
    const cuts: Cut[] = [];
    for (const item of gatheringResult.profilesWithCuts) {
      for (const requiredCut of item.requiredCuts) {
        // Map role to Cut interface (handle legacy role names)
        const legacyRole = mapRoleToLegacy(requiredCut.role);
        
        cuts.push({
          id: requiredCut.id,
          label: requiredCut.label,
          plannedLength: requiredCut.finalLength, // Use final length (after formula)
          role: legacyRole,
          profileId: requiredCut.profileId,
          quantity: requiredCut.quantity,
        });
      }
    }

    // Log warnings if any (non-critical)
    if (gatheringResult.warnings.length > 0) {
      console.warn('Cutting list generation warnings:', gatheringResult.warnings);
    }

    // Throw error if critical issues found
    if (gatheringResult.errors.length > 0) {
      console.error('Cutting list generation errors:', gatheringResult.errors);
      // Don't throw - return partial results with errors logged
    }

    return cuts;
  } catch (error) {
    console.error('Error in comprehensive profile gathering, falling back to legacy:', error);
    // Fallback to legacy implementation
    return generateCuttingListLegacy(systemPack, width, height, options);
  }
}

/**
 * Map new role types to legacy Cut interface roles
 * Maintains backward compatibility with existing code
 */
function mapRoleToLegacy(role: NonNullable<import('@/types/fabricator').Profile['profileRole']>): Cut['role'] {
  // Map all frame variants to 'frame'
  if (role.startsWith('frame') || role === 'architrave' || role === 'threshold' || 
      role === 'sill' || role === 'head' || role === 'jamb') {
    return 'frame';
  }
  
  // Map all sash variants to 'sash' or 'screen_sash'
  if (role.startsWith('sash')) {
    return role === 'screen_sash' ? 'screen_sash' : 'sash';
  }
  
  // Map glazing beads to 'bead'
  if (role.startsWith('glazing_bead')) {
    return 'bead';
  }
  
  // Keep structural roles as-is (if supported)
  if (role === 'mullion' || role === 'transom') {
    return role;
  }
  
  // Default to 'frame' for unknown roles (backward compatibility)
  return 'frame';
}

/**
 * Legacy cutting list generation (backward compatibility)
 * 
 * Original implementation for systems without comprehensive profile data.
 */
function generateCuttingListLegacy(
  systemPack: SystemPack,
  width: number,
  height: number,
  options?: {
    includeTransom?: boolean;
    transomHeight?: number;
    includeBeads?: boolean;
  }
): Cut[] {
  const cuts: Cut[] = [];
  const spec = systemPack.windowSystemSpec as any;

  // Get cutting rules from system pack
  const cuttingRules = spec.cutting_rules || {};
  
  // Default rules if not specified (fallback to common values)
  let frameRule = cuttingRules.frame_length || `L + ${DEFAULT_CUTTING_RULE_OFFSETS.DEFAULT_FRAME_ALLOWANCE_MM}`;
  let sashRule = cuttingRules.sash_length || `L - ${DEFAULT_CUTTING_RULE_OFFSETS.DEFAULT_SASH_DEDUCTION_MM}`;
  let beadRule = cuttingRules.bead_length || `L - ${DEFAULT_CUTTING_RULE_OFFSETS.DEFAULT_BEAD_DEDUCTION_MM}`;
  
  // System-specific defaults (from ROCK60_WINDOW_SYSTEM_TEMPLATE and Panda specs)
  const systemPackId = systemPack.meta.id;
  if (systemPackId === 'rock60') {
    // ROCK 60: Frame L+60, Sash L-44, Bead L-167 (from ROCK60_WINDOW_SYSTEM_TEMPLATE)
    frameRule = `L + ${SYSTEM_CUTTING_RULES.ROCK60.FRAME_ALLOWANCE_MM}`;
    sashRule = `L - ${SYSTEM_CUTTING_RULES.ROCK60.SASH_DEDUCTION_MM}`;
    beadRule = `L - ${SYSTEM_CUTTING_RULES.ROCK60.BEAD_DEDUCTION_MM}`;
  } else if (systemPackId === 'panda-50' || systemPackId === 'panda-100') {
    // Panda: Frame L+50, Sash L-40, Bead L-167 (from Panda cutting_rules)
    frameRule = `L + ${SYSTEM_CUTTING_RULES.PANDA.FRAME_ALLOWANCE_MM}`;
    sashRule = `L - ${SYSTEM_CUTTING_RULES.PANDA.SASH_DEDUCTION_MM}`;
    beadRule = `L - ${SYSTEM_CUTTING_RULES.PANDA.BEAD_DEDUCTION_MM}`;
  }
  
  const frameAllowance = parseCuttingRule(frameRule, width, height);
  const sashDeduction = parseCuttingRule(sashRule, width, height);
  const beadDeduction = parseCuttingRule(beadRule, width, height);

  // Frame pieces (4 pieces)
  const frameLength = width + frameAllowance;
  const frameHeight = height + frameAllowance;
  
  cuts.push(
    { 
      id: 'frame-left', 
      label: 'Frame Left', 
      plannedLength: frameLength, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    },
    { 
      id: 'frame-right', 
      label: 'Frame Right', 
      plannedLength: frameLength, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    },
    { 
      id: 'frame-top', 
      label: 'Frame Top', 
      plannedLength: frameHeight, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    },
    { 
      id: 'frame-bottom', 
      label: 'Frame Bottom', 
      plannedLength: frameHeight, 
      role: 'frame', 
      profileId: `${systemPackId}-frame`, 
      quantity: 1 
    }
  );

  // Sash pieces (4 pieces)
  const sashLength = width - sashDeduction;
  const sashHeight = height - sashDeduction;
  
  cuts.push(
    { 
      id: 'sash-left', 
      label: 'Sash Left', 
      plannedLength: sashLength, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    },
    { 
      id: 'sash-right', 
      label: 'Sash Right', 
      plannedLength: sashLength, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    },
    { 
      id: 'sash-top', 
      label: 'Sash Top', 
      plannedLength: sashHeight, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    },
    { 
      id: 'sash-bottom', 
      label: 'Sash Bottom', 
      plannedLength: sashHeight, 
      role: 'sash', 
      profileId: `${systemPackId}-sash`, 
      quantity: 1 
    }
  );

  // Beads (if included)
  if (options?.includeBeads !== false) {
    const beadLength = width - beadDeduction;
    const beadHeight = height - beadDeduction;
    
    cuts.push(
      { 
        id: 'bead-h1', 
        label: 'Bead Horizontal 1', 
        plannedLength: beadLength, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      },
      { 
        id: 'bead-h2', 
        label: 'Bead Horizontal 2', 
        plannedLength: beadLength, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      },
      { 
        id: 'bead-v1', 
        label: 'Bead Vertical 1', 
        plannedLength: beadHeight, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      },
      { 
        id: 'bead-v2', 
        label: 'Bead Vertical 2', 
        plannedLength: beadHeight, 
        role: 'bead', 
        profileId: `${systemPackId}-bead`, 
        quantity: 1 
      }
    );
  }

  // Transom (if included)
  if (options?.includeTransom && options.transomHeight) {
    const transomWidth = width - sashDeduction;
    // Apply transom milling using MicronEngine
    const transomLength = micronEngine.calculateTransomMillingLength(
      transomWidth,
      systemPackId
    );
    
    cuts.push(
      { 
        id: 'transom', 
        label: 'Transom', 
        plannedLength: transomLength, 
        role: 'transom', 
        profileId: `${systemPackId}-transom`, 
        quantity: 1 
      }
    );
  }

  return cuts;
}

/**
 * Parse cutting rule (e.g., "L + 50" or "H - 44")
 */
function parseCuttingRule(rule: string, _width: number, _height: number): number {
  // Simple parser for rules like "L + 50", "H - 44", "L - 167"
  // Note: width/height not used in legacy implementation (only returns offset value)
  const match = rule.match(/([LH])\s*([+-])\s*(\d+)/);
  if (!match) return 0;

  const operator = match[2];
  const value = parseFloat(match[3]);

  return operator === '+' ? value : -value;
}

/**
 * Get available system packs for workshop
 */
export function getAvailableSystemPacks(): SystemPack[] {
  // For Phase 1, only return Panda 50, Panda 100, and ROCK 60
  const availableIds = ['panda-50', 'panda-100', 'rock60'];
  return SYSTEM_PACKS.filter(p => availableIds.includes(p.meta.id));
}

/**
 * Get system pack by ID
 */
export function getSystemPackById(id: string): SystemPack | undefined {
  return SYSTEM_PACKS.find(p => p.meta.id === id);
}

