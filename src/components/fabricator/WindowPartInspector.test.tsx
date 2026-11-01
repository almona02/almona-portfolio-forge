import { describe, expect, it, vi } from 'vitest';
import { Object3D } from 'three';
import type { WindowComponent, WindowUnit } from '@/types/fabricator';
import { buildAssemblyManifest } from '@/lib/fabricator/assembly/assemblyManifest';
import { selectionKeyOf } from '@/lib/3d/visualPartRefs';
import { describeSelection, findInspectablePart } from './WindowPartInspector';

vi.mock('@react-three/fiber', () => ({ useFrame: () => undefined, useThree: () => null }));

function unit(): WindowUnit {
  const component = (id: string, type: string, profileId: string, raw: number[]): WindowComponent => ({
    id, type, profile: { id: profileId, material: 'aluminum', name: `${profileId} profile` } as WindowComponent['profile'], quantity: 1,
    cuttingLengths: raw, angles: [45, 45], machiningOperations: [], glazingType: 'none', hardware: [], width: 0, height: 0,
  });
  return {
    id: 'pose-1', revision: 3, color: 'white', type: 'sliding', overallWidth: 1500, overallHeight: 1800, systemPackId: 'caluminium-ps',
    grid: { rows: 1, cols: 2, cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'sash' }] },
    components: [
      component('frame_top_1', 'frame', 'PS-6601-FRAME', [1500]),
      component('frame_bottom_1', 'frame', 'PS-9601-FRAME', [1500]),
      component('sash_0-0_top', 'sash', 'PS-6601-SASH', [650]),
    ],
    glazing: {}, hardware: [], orderNumber: 'O', posNumber: '1', status: 'design', optimization: null, createdAt: new Date(0), updatedAt: new Date(0),
  };
}

describe('customer part information', () => {
  it('reads the exact saved code of the clicked member instead of a role-level guess', () => {
    const u = unit();
    const manifest = buildAssemblyManifest(u, { visualPartKeys: ['frame||top|', 'frame||bottom|', 'sash|0-0|top|'] });
    expect(describeSelection('frame||top|', manifest, u)!.entries[0]).toMatchObject({ catalogueCode: 'PS-6601-FRAME', material: 'aluminum', finish: 'white' });
    // Two different frame profiles no longer collapse to "not assigned": each member keeps its own code.
    expect(describeSelection('frame||bottom|', manifest, u)!.entries[0].catalogueCode).toBe('PS-9601-FRAME');
    expect(describeSelection('sash|0-0|top|', manifest, u)!.title).toBe('Sash — Sash 1 (top)');
  });

  it('is explicit about visual-only pieces and unmodelled records', () => {
    const u = unit();
    const manifest = buildAssemblyManifest(u, { visualPartKeys: ['frame||top|', 'corner||top_left|'] });
    const corner = describeSelection('corner||top_left|', manifest, u)!;
    expect(corner).toMatchObject({ visualOnly: true, title: 'Corner reinforcement plate (top-left)' });
    expect(corner.entries).toEqual([]);
    const sashTop = describeSelection('sash_0-0_top:0', manifest, u)!;
    expect(sashTop).toMatchObject({ unmodelled: true, visualOnly: false });
    expect(describeSelection('view:frame-7', manifest, u)!.visualOnly).toBe(true);
    expect(describeSelection(null, manifest, u)).toBeNull();
  });

  it('resolves nested meshes to their tagged part and never uses the mesh uuid as identity', () => {
    const root = new Object3D(); root.userData.partRef = 'hardware|0-0|handle|0'; root.userData.componentKey = 'hardware-handle-0';
    const mesh = new Object3D(); root.add(mesh);
    expect(findInspectablePart(mesh)).toBe(root);
    expect(selectionKeyOf(root)).toBe('hardware|0-0|handle|0');
    const legacy = new Object3D(); legacy.userData.componentKey = 'frame-0';
    expect(selectionKeyOf(legacy)).toBe('view:frame-0');
    expect(selectionKeyOf(new Object3D())).toBeNull();
  });
});
