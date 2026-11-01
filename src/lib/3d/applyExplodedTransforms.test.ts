import { describe, expect, it } from 'vitest';
import { BoxGeometry, Euler, Group, Object3D, Vector3 } from 'three';
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

  it('restores a part exactly when the regenerated transform map no longer addresses it', () => {
    const root = new Group();
    const bead = new Object3D();
    bead.userData.componentKey = 'spacer-0-1';
    bead.position.set(0.5, 0.25, 0.01);
    root.add(bead);
    const apply = createExplodedTransformController();
    apply(root, new Map([['spacer-0-1', { position: new Vector3(0, 0, 0.12), rotation: new Euler(), scale: new Vector3(1, 1, 1) }]]));
    expect(bead.position.z).toBeCloseTo(0.13);
    apply(root, new Map([['frame-0', { position: new Vector3(0.1, 0, 0), rotation: new Euler(), scale: new Vector3(1, 1, 1) }]]));
    expect(bead.position.toArray()).toEqual([0.5, 0.25, 0.01]);
  });

  it('prefers a dedicated explode key over the identity key', () => {
    const root = new Group();
    const part = new Object3D();
    part.userData.componentKey = 'frame:top';
    part.userData.explodeKey = 'frame-0';
    root.add(part);
    const apply = createExplodedTransformController();
    apply(root, new Map([['frame-0', { position: new Vector3(0, 0.2, 0), rotation: new Euler(), scale: new Vector3(1, 1, 1) }]]));
    expect(part.position.y).toBeCloseTo(0.2);
  });

  it('separates beads, tracks, mullions and hardware without touching assembled sash bases', () => {
    const track = new BoxGeometry(1, 0.02, 0.02); track.translate(0, -0.8, 0);
    const mullion = new BoxGeometry(0.05, 1.5, 0.05); mullion.translate(0.3, 0, 0);
    const transforms = calculateExplodedTransforms({
      frame: { parts: [] },
      sashes: [{ glass: [{}], spacers: [{}, {}], openingPath: { position: new Vector3(-0.4, 0, 0), rotation: new Euler() } } as unknown as SashData],
      fixedGlass: [], fixedSpacers: [track], muntins: [mullion],
    }, { enabled: true, intensity: 1, animationDuration: 0,
      componentGroups: { frame: true, sashes: true, glass: true, hardware: true, mullions: true },
    }, { hardware: [{ key: 'hardware-handle-0', position: new Vector3(-0.7, 0.1, 0.03) }] });
    expect([...transforms.keys()].sort()).toEqual([
      'fixed-spacer-0', 'glass-0-0', 'hardware-handle-0', 'muntin-0', 'sash-0', 'spacer-0-0', 'spacer-0-1',
    ]);
    expect(transforms.get('fixed-spacer-0')!.position.y).toBeLessThan(0);
    expect(transforms.get('muntin-0')!.position.x).toBeGreaterThan(0);
    expect(transforms.get('muntin-0')!.position.z).toBe(0);
    expect(transforms.get('hardware-handle-0')!.position.x).toBeLessThan(0);
    expect(transforms.get('hardware-handle-0')!.position.z).toBeGreaterThan(transforms.get('glass-0-0')!.position.z);
    expect(transforms.get('spacer-0-0')!.position.z).toBeGreaterThan(transforms.get('glass-0-0')!.position.z);
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
