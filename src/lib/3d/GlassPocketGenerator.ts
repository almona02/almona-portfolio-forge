/**
 * GlassPocketGenerator - Glass Pocket Geometry
 * 
 * Generates accurate glass pocket geometry for profiles
 * 
 * @since Phase 4: 3D Visual Upgrade (Week 19)
 */

import { Vector2 } from 'three';

export interface GlassPocketGeometry {
  shape: Vector2[];
  depth: number;
  width: number;
  offsetZ: number;
  gasketGroove?: Vector2[];
}

/**
 * GlassPocketGenerator - Generates glass pocket geometry
 */
export class GlassPocketGenerator {
  /**
   * Generate glass pocket geometry
   */
  generateGlassPocket(
    profileWidth: number,
    profileDepth: number,
    glassThickness: number = 0.004, // 4mm default
    gasketThickness: number = 0.003 // 3mm gasket
  ): GlassPocketGeometry {
    const pocketDepth = glassThickness + gasketThickness * 2;
    const pocketWidth = profileWidth * 0.4; // 40% of profile width
    const pocketHalf = pocketWidth / 2;
    const offsetZ = -profileDepth / 2 + pocketDepth / 2;

    // Main pocket shape
    const shape: Vector2[] = [
      new Vector2(-pocketHalf, -pocketDepth / 2),
      new Vector2(pocketHalf, -pocketDepth / 2),
      new Vector2(pocketHalf, pocketDepth / 2),
      new Vector2(-pocketHalf, pocketDepth / 2)
    ];

    // Gasket groove (for rubber gasket)
    const gasketGroove: Vector2[] = [
      new Vector2(-pocketHalf + 0.001, -pocketDepth / 2 + gasketThickness),
      new Vector2(pocketHalf - 0.001, -pocketDepth / 2 + gasketThickness),
      new Vector2(pocketHalf - 0.001, -pocketDepth / 2 + gasketThickness * 2),
      new Vector2(-pocketHalf + 0.001, -pocketDepth / 2 + gasketThickness * 2)
    ];

    return {
      shape,
      depth: pocketDepth,
      width: pocketWidth,
      offsetZ,
      gasketGroove
    };
  }

  /**
   * Generate double-glazing pocket (for insulated glass units)
   */
  generateDoubleGlazingPocket(
    profileWidth: number,
    profileDepth: number,
    glassThickness: number = 0.004,
    airGap: number = 0.012 // 12mm air gap
  ): GlassPocketGeometry {
    const totalDepth = glassThickness * 2 + airGap;
    const pocketWidth = profileWidth * 0.45; // Slightly wider for double glazing
    const pocketHalf = pocketWidth / 2;
    const offsetZ = -profileDepth / 2 + totalDepth / 2;

    const shape: Vector2[] = [
      new Vector2(-pocketHalf, -totalDepth / 2),
      new Vector2(pocketHalf, -totalDepth / 2),
      new Vector2(pocketHalf, totalDepth / 2),
      new Vector2(-pocketHalf, totalDepth / 2)
    ];

    return {
      shape,
      depth: totalDepth,
      width: pocketWidth,
      offsetZ
    };
  }
}


