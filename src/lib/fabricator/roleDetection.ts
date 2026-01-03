/**
 * Smart Role Detection from Profile Names
 * 
 * Automatically detects profile roles from profile names to ensure accuracy
 * in sliding systems, casement systems, and door systems.
 */

import type { Profile } from '@/types/fabricator';
import {
    DEFAULT_CUTTING_FORMULA,
    FRAME_CUTTING_OFFSETS,
    GLAZING_BEAD_CUTTING_OFFSETS,
    SASH_CUTTING_OFFSETS,
    STRUCTURAL_CUTTING_OFFSETS,
} from './cuttingFormulaConstants';

/**
 * Detect profile role from profile name
 * Uses pattern matching to identify roles accurately
 */
export function detectRoleFromName(profileName: string, profileType?: string): Profile['profileRole'] {
  const name = profileName.toLowerCase();
  
  // Frame roles
  if (name.includes('architrave') && name.includes('frame')) {
    return 'frame_architrave';
  }
  if (name.includes('architrave') && !name.includes('frame')) {
    return 'architrave';
  }
  if (name.includes('threshold')) {
    return 'threshold';
  }
  if (name.includes('sill')) {
    return 'sill';
  }
  if (name.includes('head')) {
    return 'head';
  }
  if (name.includes('jamb')) {
    return 'jamb';
  }
  if (name.includes('frame') || profileType === 'frame') {
    return 'frame';
  }
  
  // Sash roles - CRITICAL: Differentiate between sliding, fly-screen, door, casement
  if (name.includes('fly') || name.includes('flyscreen') || name.includes('mosquito') || name.includes('screen sash')) {
    return 'sash_flyscreen'; // ✅ Fly-screen is SEPARATE from main sash
  }
  if (name.includes('sliding') && name.includes('sash')) {
    return 'sash_sliding'; // ✅ Sliding sash (main operable sash)
  }
  if (name.includes('door') && name.includes('sash')) {
    return 'sash_door'; // ✅ Door sash
  }
  if (name.includes('casement') && name.includes('sash')) {
    return 'sash_casement'; // ✅ Casement sash
  }
  if (name.includes('sash') || profileType === 'sash') {
    // Default to standard sash if no specific type
    return 'sash';
  }
  
  // Structural roles
  if (name.includes('false') && name.includes('mullion')) {
    return 'mullion_false'; // ✅ False mullion (NOT sash!)
  }
  if (name.includes('mullion') || profileType === 'mullion') {
    return 'mullion'; // True mullion
  }
  if (name.includes('transom') || profileType === 'transom') {
    return 'transom';
  }
  if (name.includes('reinforcement')) {
    return 'reinforcement';
  }
  if (name.includes('corner') && name.includes('cleat')) {
    return 'corner_cleat';
  }
  
  // Glazing roles
  if (name.includes('glazing') || name.includes('bead')) {
    if (name.includes('inner')) {
      return 'glazing_bead_inner';
    }
    if (name.includes('outer')) {
      return 'glazing_bead_outer';
    }
    return 'glazing_bead';
  }
  
  // Accessory roles
  if (name.includes('interlock')) {
    return 'interlock'; // ✅ Interlock profile (connects sashes in sliding systems)
  }
  if (name.includes('screen') && name.includes('adapter')) {
    return 'screen_adapter';
  }
  if (name.includes('panel') || name.includes('filler')) {
    return 'panel';
  }
  if (name.includes('gasket')) {
    return 'gasket';
  }
  if (name.includes('weather') && name.includes('strip')) {
    return 'weather_strip';
  }
  if (name.includes('accessory') || profileType === 'accessory') {
    return 'accessory';
  }
  
  // Default fallback
  return 'frame';
}

/**
 * Get role-specific cutting formula
 * Each role has different cutting requirements based on system architecture
 */
export function getRoleCuttingFormula(
  role: Profile['profileRole'],
  _systemType?: 'sliding' | 'casement' | 'tilt_turn' | 'fixed'
): string {
  switch (role) {
    // Frame roles: Add allowance for miter joints
    case 'frame':
    case 'frame_architrave':
    case 'architrave':
    case 'threshold':
    case 'sill':
    case 'head':
    case 'jamb':
      return `L + ${FRAME_CUTTING_OFFSETS.STANDARD_FRAME_ALLOWANCE_MM}`; // Standard frame allowance
    
    // Sliding sash: Deduct for overlap and track clearance
    case 'sash_sliding':
      return `L - ${SASH_CUTTING_OFFSETS.STANDARD_SASH_DEDUCTION_MM}`; // Standard sliding sash deduction
    
    // Fly-screen sash: Smaller deduction (no overlap needed)
    case 'sash_flyscreen':
      return `L - ${SASH_CUTTING_OFFSETS.FLYSCREEN_SASH_DEDUCTION_MM}`; // Fly-screen has minimal overlap
    
    // Door sash: Similar to sliding but may vary
    case 'sash_door':
      return `L - ${SASH_CUTTING_OFFSETS.STANDARD_SASH_DEDUCTION_MM}`; // Door sash deduction
    
    // Casement sash: Standard deduction
    case 'sash_casement':
    case 'sash':
      return `L - ${SASH_CUTTING_OFFSETS.STANDARD_SASH_DEDUCTION_MM}`; // Standard sash deduction
    
    // Screen sash: Similar to fly-screen
    case 'screen_sash':
      return `L - ${SASH_CUTTING_OFFSETS.SCREEN_SASH_DEDUCTION_MM}`;
    
    // Mullion: Exact length (no deduction, no allowance)
    case 'mullion':
    case 'mullion_false':
      return DEFAULT_CUTTING_FORMULA.EXACT_LENGTH; // Exact length
    
    // Transom: Exact length
    case 'transom':
      return DEFAULT_CUTTING_FORMULA.EXACT_LENGTH;
    
    // Interlock: Small deduction (fits between sashes)
    case 'interlock':
      return `L - ${STRUCTURAL_CUTTING_OFFSETS.INTERLOCK_DEDUCTION_MM}`; // Small deduction for interlock
    
    // Glazing bead: Large deduction (fits inside sash)
    case 'glazing_bead':
    case 'glazing_bead_inner':
    case 'glazing_bead_outer':
      return `L - ${GLAZING_BEAD_CUTTING_OFFSETS.STANDARD_BEAD_DEDUCTION_MM}`; // Standard glazing bead deduction
    
    // Accessories: Varies by type
    case 'panel':
      return DEFAULT_CUTTING_FORMULA.EXACT_LENGTH; // Exact length
    case 'gasket':
    case 'weather_strip':
      return DEFAULT_CUTTING_FORMULA.EXACT_LENGTH; // Exact length
    case 'accessory':
      return DEFAULT_CUTTING_FORMULA.EXACT_LENGTH; // Default: exact length
    
    // Structural
    case 'reinforcement':
      return `L - ${STRUCTURAL_CUTTING_OFFSETS.REINFORCEMENT_DEDUCTION_MM}`; // Reinforcement is shorter than PVC
    case 'corner_cleat':
      return DEFAULT_CUTTING_FORMULA.EXACT_LENGTH; // Exact length
    
    default:
      return DEFAULT_CUTTING_FORMULA.NO_CHANGE; // Default: no change
  }
}

/**
 * Parse cutting formula and calculate length
 * Supports formulas like "L + 50", "L - 40", "L"
 */
export function parseCuttingFormula(formula: string, dimension: number): number {
  const trimmed = formula.trim();
  
  if (trimmed === 'L') {
    return dimension; // Exact length
  }
  
  const plusMatch = trimmed.match(/L\s*\+\s*(\d+)/);
  if (plusMatch) {
    return dimension + Number(plusMatch[1]);
  }
  
  const minusMatch = trimmed.match(/L\s*-\s*(\d+)/);
  if (minusMatch) {
    return dimension - Number(minusMatch[1]);
  }
  
  // Default: return dimension as-is
  return dimension;
}

