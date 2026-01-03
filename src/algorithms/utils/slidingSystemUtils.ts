/**
 * Sliding System Utilities
 * 
 * Handles internal divider generation for sliding vs non-sliding window systems.
 * Constitutional: Pure deterministic logic, no ML/AI.
 */

import type { Profile, WindowComponent, WindowGrid } from '@/types/fabricator';

/**
 * Generate internal dividers (interlocks for sliding, mullions for others)
 * 
 * @param grid - The window grid
 * @param isSlidingSystem - Whether this is a sliding system
 * @param interlockProfile - Interlock profile (for sliding systems)
 * @param mullionProfile - Mullion profile (for non-sliding systems)
 * @param frameProfile - Frame profile (for dimension calculations)
 * @param height - Overall height in mm
 * @param width - Overall width in mm
 * @param systemPackId - System pack ID (optional)
 * @returns Array of divider components
 */
export function generateInternalDividers(
  grid: WindowGrid,
  isSlidingSystem: boolean,
  interlockProfile: Profile | null,
  mullionProfile: Profile | null,
  frameProfile: Profile,
  height: number,
  width: number,
  _systemPackId: string | null
): WindowComponent[] {
  const components: WindowComponent[] = [];
  
  // Vertical dividers (interlock for sliding, mullion for others)
  if (grid.cols > 1) {
    if (isSlidingSystem && interlockProfile) {
      // Sliding system: Use interlock profile
      const interlockHeight = height - (2 * frameProfile.width);
      components.push({
        id: `interlock_vertical_${Date.now()}`,
        type: 'interlock',
        profile: interlockProfile,
        width: interlockProfile.width || 20,
        height: interlockHeight,
        quantity: grid.cols - 1,
        cuttingLengths: [interlockHeight],
        angles: [90, 90],
        machiningOperations: [],
        glazingType: 'none',
        hardware: []
      });
    } else if (!isSlidingSystem && mullionProfile) {
      // Non-sliding: Use mullion profile
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
  
  // Horizontal dividers (transoms - always mullion profile)
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
  
  return components;
}

