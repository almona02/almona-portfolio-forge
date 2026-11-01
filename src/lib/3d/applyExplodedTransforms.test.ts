import { describe, expect, it } from 'vitest';
import { Euler, Group, Object3D, Vector3 } from 'three';
import { createExplodedTransformController } from './applyExplodedTransforms';
import { calculateExplodedTransforms } from './explodedViewUtils';
import type { SashData } from './windowGeometry';

describe('exploded window transforms', () => {
  it('preserves assembled offsets and rotations, does not drift, and restores on close', () => {
    const root = new Group();
    const sash = new Object3D();
    sash.userData.componentKey = 'sash-0';
    sash.position.set(1, 2, 3); sash.rotation.z = 0.4;
    root.add(sash);
    const apply = createExplodedTransformController();
    const offsets = new Map([['sash-0', { position: new Vector3(0.1, 0, 0.2), rotation: new Euler(), scale: new Vector3(1, 1, 1) }]]);
    apply(root, offsets); apply(root, offsets);
    expect(sash.position.toArray()).toEqual([1.1, 2, 3.2]);
    expect(sash.rotation.z).toBe(0.4);
    apply(root, null);
    expect(sash.position.toArray()).toEqual([1, 2, 3]);
    expect(sash.rotation.z).toBe(0.4);
    // A later assembled animation becomes the next baseline.
    sash.position.x = 4;
    apply(root, offsets);
    expect(sash.position.x).toBe(4.1);
  });

  it('addresses each rendered pane, including fixed glazing', () => {
    const transforms = calculateExplodedTransforms({ frame: { parts: [] },
      sashes: [{ glass: [{}, {}] } as SashData], fixedGlass: [{}],
    }, { enabled: true, intensity: 1, animationDuration: 0,
      componentGroups: { frame: false, sashes: false, glass: true, hardware: false, mullions: false },
    });
    expect([...transforms.keys()]).toEqual(['glass-0-0', 'glass-0-1', 'fixed-glass-0']);
  });
});
