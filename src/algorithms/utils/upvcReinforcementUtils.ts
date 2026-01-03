/**
 * UPVC Reinforcement Utilities
 * 
 * Handles UPVC reinforcement bar calculations based on European standards.
 * Constitutional: Pure deterministic logic, no ML/AI.
 */

/**
 * UPVC Reinforcement Rules Configuration
 * 
 * Based on European standard EN 12608 which requires reinforcement for UPVC profiles
 * exceeding certain dimensions to prevent deflection.
 */
export const UPVC_REINFORCEMENT_RULES = {
  // Minimum dimensions requiring reinforcement
  // 800mm width: Standard threshold for horizontal reinforcement
  // 1200mm height: Standard threshold for vertical reinforcement
  MIN_WIDTH_FOR_REINFORCEMENT_MM: 800,  // 80cm width
  MIN_HEIGHT_FOR_REINFORCEMENT_MM: 1200, // 120cm height
  
  // Steel bar is shorter than PVC profile to account for:
  // - Thermal expansion differential (steel expands less than PVC)
  // - Profile end caps and corner joints
  DEFAULT_DEDUCTION_MM: 15,
} as const;

export interface UPVCReinforcementSpec {
  required?: boolean;
  minWidth?: number;
  minHeight?: number;
  deductionMm?: number;
}

/**
 * Check if UPVC reinforcement is required for given dimensions
 * 
 * @param widthMm - Width in millimeters
 * @param heightMm - Height in millimeters
 * @param upvcSpec - UPVC specification from system pack (optional)
 * @returns True if reinforcement is required
 */
export function requiresUPVCReinforcement(
  widthMm: number,
  heightMm: number,
  upvcSpec?: UPVCReinforcementSpec | null
): boolean {
  if (!upvcSpec?.required) return false;
  
  // Use system pack rules if available, otherwise use defaults
  const minWidth = upvcSpec.minWidth || 
                   UPVC_REINFORCEMENT_RULES.MIN_WIDTH_FOR_REINFORCEMENT_MM;
  const minHeight = upvcSpec.minHeight || 
                    UPVC_REINFORCEMENT_RULES.MIN_HEIGHT_FOR_REINFORCEMENT_MM;
  
  return widthMm >= minWidth || heightMm >= minHeight;
}

/**
 * Get reinforcement deduction value
 * 
 * @param upvcSpec - UPVC specification from system pack (optional)
 * @returns Deduction in millimeters
 */
export function getReinforcementDeduction(
  upvcSpec?: UPVCReinforcementSpec | null
): number {
  return upvcSpec?.deductionMm || 
         UPVC_REINFORCEMENT_RULES.DEFAULT_DEDUCTION_MM;
}

