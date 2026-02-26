/**
 * Sliding System Utilities
 * 
 * Handles internal divider generation for sliding vs non-sliding window systems.
 * Constitutional: Pure deterministic logic, no ML/AI.
 */

import type { Profile, WindowComponent, WindowGrid } from '@/types/fabricator';
import { computeActiveDividerBoundaries } from '@/lib/fabricator/gridGeometry';

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
  const { verticalBoundaries, horizontalBoundaries } = computeActiveDividerBoundaries(grid);
  const innerHeight = Math.max(0, height - (2 * frameProfile.width));
  const innerWidth = Math.max(0, width - (2 * frameProfile.width));
  
  // Vertical dividers (interlock for sliding, mullion for others)
  if (verticalBoundaries.length > 0) {
    if (isSlidingSystem && interlockProfile) {
      // Sliding system: Use interlock profile
      const interlockHeight = innerHeight;
      components.push({
        id: `interlock_vertical_${Date.now()}`,
        type: 'interlock',
        profile: interlockProfile,
        width: interlockProfile.width || 20,
        height: interlockHeight,
        quantity: verticalBoundaries.length,
        cuttingLengths: [interlockHeight],
        angles: [90, 90],
        machiningOperations: [],
        glazingType: 'none',
        hardware: []
      });
    } else if (!isSlidingSystem && mullionProfile) {
      // Non-sliding: Use mullion profile
      for (const boundary of verticalBoundaries) {
        components.push({
          id: `mullion_v_${boundary}_${Date.now()}`,
          type: 'mullion',
          profile: mullionProfile,
          width: mullionProfile.width,
          height: innerHeight,
          quantity: 1,
          cuttingLengths: [innerHeight],
          angles: [90, 90],
          machiningOperations: [],
          glazingType: 'none',
          hardware: []
        });
      }
    }
  }
  
  // Horizontal dividers (transoms - always mullion profile)
  if (horizontalBoundaries.length > 0 && mullionProfile) {
    for (const boundary of horizontalBoundaries) {
      components.push({
        id: `transom_h_${boundary}_${Date.now()}`,
        type: 'transom',
        profile: mullionProfile,
        width: innerWidth,
        height: mullionProfile.width,
        quantity: 1,
        cuttingLengths: [innerWidth],
        angles: [90, 90],
        machiningOperations: [],
        glazingType: 'none',
        hardware: []
      });
    }
  }
  
  return components;
}

