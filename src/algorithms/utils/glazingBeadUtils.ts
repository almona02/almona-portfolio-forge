/**
 * Glazing Bead Utilities
 * 
 * Generates glazing bead components for window cells.
 * Constitutional: Pure deterministic logic, no ML/AI.
 */

import type { WindowComponent, Profile } from '@/types/fabricator';

export interface GlazingBeadSpec {
  cellId: string;
  beadProfile: Profile;
  glassWidth: number;
  glassHeight: number;
  glazingType: string;
}

/**
 * Generate glazing beads for a cell (top, bottom, left, right)
 * 
 * @param spec - Glazing bead specification
 * @returns Array of 4 glazing bead components
 */
export function generateGlazingBeads(
  spec: GlazingBeadSpec
): WindowComponent[] {
  const { cellId, beadProfile, glassWidth, glassHeight, glazingType } = spec;
  
  const beads: Array<{
    position: 'top' | 'bottom' | 'left' | 'right';
    isHorizontal: boolean;
    length: number;
  }> = [
    { position: 'top', isHorizontal: true, length: glassWidth },
    { position: 'bottom', isHorizontal: true, length: glassWidth },
    { position: 'left', isHorizontal: false, length: glassHeight },
    { position: 'right', isHorizontal: false, length: glassHeight },
  ];
  
  return beads.map(bead => ({
    id: `bead_${cellId}_${bead.position}`,
    type: 'glazing_bead' as const,
    profile: beadProfile,
    width: bead.isHorizontal ? bead.length : (beadProfile.width || 20),
    height: bead.isHorizontal ? (beadProfile.width || 20) : bead.length,
    quantity: 1,
    cuttingLengths: [Math.max(0, bead.length)],
    angles: [45, 45],
    machiningOperations: [],
    glazingType,
    hardware: []
  }));
}

