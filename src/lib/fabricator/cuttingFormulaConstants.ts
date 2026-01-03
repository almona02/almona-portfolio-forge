/**
 * Cutting Formula Constants
 * 
 * Defines role-specific cutting formula offsets for accurate profile cutting.
 * Each role has different cutting requirements based on system architecture.
 * 
 * Formulas follow the pattern: "L + offset" or "L - offset" where:
 * - L = original dimension (length or height)
 * - + = add allowance (for frames with miter joints)
 * - - = deduct (for sashes, beads that fit inside frames)
 * 
 * @since Phase 2: University-Grade Precision
 */

/**
 * Frame cutting formula offsets (mm)
 * Frames add allowance for miter joints and corner assembly
 */
export const FRAME_CUTTING_OFFSETS = {
  /**
   * Standard frame allowance (mm)
   * Added to window dimension for frame pieces
   * Accounts for miter joints and corner assembly
   */
  STANDARD_FRAME_ALLOWANCE_MM: 50,
} as const;

/**
 * Sash cutting formula offsets (mm)
 * Sashes deduct for overlap, track clearance, and frame fit
 */
export const SASH_CUTTING_OFFSETS = {
  /**
   * Standard sash deduction (mm)
   * Used for sliding sash, door sash, and casement sash
   * Accounts for overlap and track clearance
   */
  STANDARD_SASH_DEDUCTION_MM: 40,

  /**
   * Fly-screen sash deduction (mm)
   * Smaller deduction - fly-screen has minimal overlap
   */
  FLYSCREEN_SASH_DEDUCTION_MM: 25,

  /**
   * Screen sash deduction (mm)
   * Similar to fly-screen - minimal overlap needed
   */
  SCREEN_SASH_DEDUCTION_MM: 25,
} as const;

/**
 * Structural cutting formula offsets (mm)
 * Structural elements typically use exact length or small deductions
 */
export const STRUCTURAL_CUTTING_OFFSETS = {
  /**
   * Interlock deduction (mm)
   * Small deduction - interlock fits between sashes
   */
  INTERLOCK_DEDUCTION_MM: 8,

  /**
   * Reinforcement deduction (mm)
   * Reinforcement is shorter than PVC profile
   */
  REINFORCEMENT_DEDUCTION_MM: 12,
} as const;

/**
 * Glazing bead cutting formula offsets (mm)
 * Glazing beads have large deductions as they fit inside sash
 */
export const GLAZING_BEAD_CUTTING_OFFSETS = {
  /**
   * Standard glazing bead deduction (mm)
   * Large deduction - glazing bead fits inside sash
   */
  STANDARD_BEAD_DEDUCTION_MM: 167,
} as const;

/**
 * Default cutting formula
 */
export const DEFAULT_CUTTING_FORMULA = {
  /**
   * Default formula when no change is needed
   * Returns dimension as-is
   */
  NO_CHANGE: 'L + 0',

  /**
   * Exact length formula
   * Returns dimension exactly (no offset)
   */
  EXACT_LENGTH: 'L',
} as const;

