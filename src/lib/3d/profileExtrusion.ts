import { BufferGeometry, Matrix4 } from 'three';
import type { MiteredFrameData } from './windowGeometry';

/**
 * ExtrudeGeometry runs the cross-section (profile width along X, depth along Y) from z=0 to
 * z=length. The frame matrices from windowGeometry describe a bar that is *centred* on its
 * position and runs along +X in the window plane (face width along Y, depth along Z), so the
 * raw extrusion must be re-based before the part matrix is applied. Without this every bar
 * pointed at the camera as a spike (defect reproduced on the saved CALUMINIUM PS pose).
 * Corner plates are flat squares: only centre them on their depth.
 *
 * Mapping (cyclic permutation, det +1): extrusion Z → X, shape X → Y, shape Y → Z.
 */
export const BAR_BASIS = new Matrix4().set(
  0, 0, 1, 0,
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
);

export function isCornerPlate(part: Pick<MiteredFrameData, 'metadata'>): boolean {
  return Boolean(part.metadata?.type?.startsWith('corner_reinforcement'));
}

/** Re-base a raw extrusion in place so `part.matrix` can be applied as windowGeometry intends. */
export function orientExtrudedPart(geometry: BufferGeometry, part: Pick<MiteredFrameData, 'length' | 'metadata'>): BufferGeometry {
  geometry.translate(0, 0, -part.length / 2);
  if (!isCornerPlate(part)) geometry.applyMatrix4(BAR_BASIS);
  return geometry;
}
