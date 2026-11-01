import { describe, expect, it } from 'vitest';
import { Object3D } from 'three';
import type { WindowUnit } from '@/types/fabricator';
import { describeWindowPart, findInspectablePart } from './WindowPartInspector';

describe('customer part information', () => {
  it('reads saved profile codes and material rather than inventing catalogue assignments', () => {
    const unit = { components: [{ type: 'frame', profile: { id: 'PS-6601-FRAME', material: 'aluminum' } }], color: 'white' } as WindowUnit;
    expect(describeWindowPart('frame-0', unit)).toMatchObject({ code: 'PS-6601-FRAME', material: 'aluminum' });
    expect(describeWindowPart('hardware-handle-0', unit).code).toBeNull();
    expect(describeWindowPart('glass-0-0', unit)).toMatchObject({ material: 'Glass', code: null });
  });
  it('does not select one of several different profiles for a visual role', () => {
    const unit = { components: [
      { type: 'frame', profile: { id: 'A' } }, { type: 'frame', profile: { id: 'B' } },
    ] } as WindowUnit;
    expect(describeWindowPart('frame-0', unit).code).toBeNull();
  });
  it('resolves nested hardware meshes to their tagged item', () => {
    const root = new Object3D(); root.userData.componentKey = 'hardware-handle-0';
    const mesh = new Object3D(); root.add(mesh);
    expect(findInspectablePart(mesh)).toBe(root);
  });
});
