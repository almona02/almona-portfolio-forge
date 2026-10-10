/**
 * Gold-tier CSG helpers (three-bvh-csg@0.0.17, MIT).
 * Loaded only via dynamic import so CSG stays out of the main studio entry.
 *
 * AICS-001: deterministic geometry ops — no adaptive/ML path.
 */

import {
  BoxGeometry,
  BufferGeometry,
  Euler,
  Matrix4,
  Mesh,
  MeshNormalMaterial,
  Vector3,
} from 'three';
import { ADDITION, Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';

export type CsgMiterPocketSpec = {
  /** Outer frame width (m) */
  width: number;
  /** Outer frame height (m) */
  height: number;
  /** Profile face width (m) */
  profileWidth: number;
  /** Pocket depth along thickness (m) */
  pocketDepth?: number;
};

/**
 * Build a frame outline with an inner opening pocket via CSG subtraction.
 * Used for true miter visualization / hardware pocket previews.
 */
export function createFrameWithOpeningPocket(spec: CsgMiterPocketSpec): BufferGeometry {
  const { width, height, profileWidth } = spec;
  const depth = spec.pocketDepth ?? Math.max(0.02, profileWidth * 0.6);

  const outer = new Brush(new BoxGeometry(width, height, depth));
  outer.updateMatrixWorld();

  const innerW = Math.max(0.01, width - 2 * profileWidth);
  const innerH = Math.max(0.01, height - 2 * profileWidth);
  const inner = new Brush(new BoxGeometry(innerW, innerH, depth + 0.002));
  inner.updateMatrixWorld();

  const evaluator = new Evaluator();
  const result = evaluator.evaluate(outer, inner, SUBTRACTION);
  return result.geometry;
}

/**
 * Union two profile brushes (e.g. mullion intersecting frame) for pocket cleanup.
 */
export function unionProfileBrushes(
  a: BufferGeometry,
  b: BufferGeometry,
  bOffset: Vector3,
): BufferGeometry {
  const mat = new MeshNormalMaterial();
  const brushA = new Brush(a, mat);
  brushA.updateMatrixWorld();
  const brushB = new Brush(b, mat);
  brushB.position.copy(bOffset);
  brushB.updateMatrixWorld();
  const evaluator = new Evaluator();
  return evaluator.evaluate(brushA, brushB, ADDITION).geometry;
}

/** 45° corner cutter mesh for miter end visualization. */
export function createMiterCornerCutter(
  profileWidth: number,
  depth: number,
): Mesh {
  const geo = new BoxGeometry(profileWidth * 1.5, profileWidth * 1.5, depth + 0.001);
  const mesh = new Mesh(geo);
  mesh.rotation.copy(new Euler(0, 0, Math.PI / 4));
  mesh.updateMatrixWorld();
  return mesh;
}

export function applyWorldMatrix(geometry: BufferGeometry, matrix: Matrix4): BufferGeometry {
  const g = geometry.clone();
  g.applyMatrix4(matrix);
  return g;
}
