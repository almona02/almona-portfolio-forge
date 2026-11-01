/**
 * Batch 3/5 — rendered geometry must sit where the assembly says it sits.
 * Reproduces the saved CALUMINIUM PS 2-sash sliding pose (FP-Y0RIPV pos 1 R9).
 */
import { describe, expect, it } from 'vitest';
import { Box3, ExtrudeGeometry, Shape, Vector3 } from 'three';
import type { WindowUnit } from '@/types/fabricator';
import { orientExtrudedPart } from './profileExtrusion';
import { createGoldTierMiteredFrame, generateModelGeometries, generateProfileCrossSection } from './windowGeometry';

const unit = {
  id: 'r9', type: 'sliding_window_2sash', overallWidth: 1500, overallHeight: 1800, systemPackId: 'caluminium-ps',
  grid: { rows: 1, cols: 2, colWidths: [1, 1], rowHeights: [1], cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'sash' }] },
  components: [], glazing: {}, hardware: [],
} as unknown as WindowUnit;

function boundsOf(part: { shape: unknown; length: number; matrix: import('three').Matrix4; metadata?: { type?: string } }): Box3 {
  const geometry = new ExtrudeGeometry(new Shape(part.shape as never), { steps: 1, depth: part.length, bevelEnabled: false });
  orientExtrudedPart(geometry, part);
  geometry.applyMatrix4(part.matrix);
  geometry.computeBoundingBox();
  return geometry.boundingBox!;
}

describe('profile extrusion orientation', () => {
  it('lays frame bars in the window plane instead of pointing them at the camera', () => {
    const profile = generateProfileCrossSection({ width: 60, height: 60, thickness: 1.6, material: 'aluminum', profileRole: 'frame' } as never);
    const parts = createGoldTierMiteredFrame(1.5, 1.8, profile, true);
    const top = boundsOf(parts.find(p => p.metadata?.type === 'top_bar')!);
    const size = top.getSize(new Vector3());
    expect(size.x).toBeCloseTo(1.5, 3);                 // runs the full width
    expect(size.y).toBeCloseTo(profile.width, 3);       // visible face = profile width
    expect(size.z).toBeCloseTo(profile.depth, 3);       // depth into the wall
    expect(top.getCenter(new Vector3()).x).toBeCloseTo(0, 6);
    expect(top.max.y).toBeCloseTo(0.9, 3);              // flush with the outer edge

    const left = boundsOf(parts.find(p => p.metadata?.type === 'left_bar')!);
    const leftSize = left.getSize(new Vector3());
    expect(leftSize.y).toBeCloseTo(1.8 - profile.width * 2, 3);
    expect(leftSize.x).toBeCloseTo(profile.width, 3);
    expect(left.min.x).toBeCloseTo(-0.75, 3);

    const corner = boundsOf(parts.find(p => p.metadata?.type === 'corner_reinforcement')!);
    const cornerSize = corner.getSize(new Vector3());
    expect(cornerSize.z).toBeLessThan(cornerSize.x);    // flat plate, not a spike
    expect(corner.min.z).toBeCloseTo(profile.depth / 2, 3);
  });
});

describe('sash geometry is local to the sash group', () => {
  it('centres each sash on its own origin so the group offset is applied exactly once', () => {
    const geometry = generateModelGeometries(unit, null, { forceRegenerate: true });
    expect(geometry.sashes.map(s => s.cellId)).toEqual(['0-0', '0-1']);
    for (const sash of geometry.sashes) {
      expect(Math.abs(sash.openingPath.position.x)).toBeCloseTo(0.375, 3);
      const top = sash.parts.find(p => p.partRef?.startsWith('sash|') && p.partRef.endsWith('|top|'))!;
      expect(new Vector3().setFromMatrixPosition(top.matrix).x).toBeCloseTo(0, 6);
      sash.glass[0].computeBoundingBox();
      expect(sash.glass[0].boundingBox!.getCenter(new Vector3()).x).toBeCloseTo(0, 6);
      for (const spacer of sash.spacers) {
        spacer.computeBoundingBox();
        const centre = spacer.boundingBox!.getCenter(new Vector3());
        // beads/spacer sit inside the sash width (730 mm), never at the cell offset
        expect(Math.abs(centre.x)).toBeLessThan(0.37);
      }
    }
    // Frame-level pieces stay in world coordinates.
    const interlock = (geometry.muntins as import('three').BufferGeometry[])[0];
    interlock.computeBoundingBox();
    expect(interlock.boundingBox!.getCenter(new Vector3()).x).toBeCloseTo(0, 6);
    expect(interlock.userData.partRef).toBe('interlock|||0');
    const trackRefs = geometry.fixedSpacers.map(g => g.userData.partRef).filter(Boolean);
    expect(trackRefs).toEqual(['track|||0', 'track|||1', 'track_guide|||0', 'track_guide|||1']);
  });
});
