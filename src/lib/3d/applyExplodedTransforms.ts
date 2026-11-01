import { Object3D } from 'three';
import type { ComponentTransform } from './explodedViewUtils';

/** Offsets are relative to each object's assembled transform, never world origin. */
export function createExplodedTransformController() {
  const assembled = new Map<Object3D, ComponentTransform>();
  return (root: Object3D, transforms: Map<string, ComponentTransform> | null) => {
    if (!transforms) {
      for (const [object, base] of assembled) {
        object.position.copy(base.position);
        object.rotation.copy(base.rotation);
        object.scale.copy(base.scale);
      }
      assembled.clear();
      return;
    }
    root.traverse(object => {
      const offset = transforms.get(object.userData.componentKey);
      if (!offset) return;
      if (!assembled.has(object)) assembled.set(object, {
        position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone(),
      });
      const base = assembled.get(object)!;
      object.position.copy(base.position).add(offset.position);
      object.rotation.set(base.rotation.x + offset.rotation.x, base.rotation.y + offset.rotation.y, base.rotation.z + offset.rotation.z);
      object.scale.copy(base.scale).multiply(offset.scale);
    });
  };
}
