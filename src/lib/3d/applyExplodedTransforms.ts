import { Object3D } from 'three';
import type { ComponentTransform } from './explodedViewUtils';

/** Scene key the exploded-view offsets are looked up by (view key, never a manufacturing ID). */
export function explodeKeyOf(object: Object3D): string | undefined {
  const key = object.userData.explodeKey ?? object.userData.componentKey;
  return typeof key === 'string' ? key : undefined;
}

function restore(object: Object3D, base: ComponentTransform): void {
  object.position.copy(base.position);
  object.rotation.copy(base.rotation);
  object.scale.copy(base.scale);
}

/**
 * Offsets are relative to each object's assembled transform, never world origin.
 * The controller remembers the assembled transform the first time it moves an object
 * and restores it exactly when the offset disappears (toggle back, regenerated model,
 * or a key that is no longer in the transform map).
 */
export function createExplodedTransformController() {
  const assembled = new Map<Object3D, ComponentTransform>();
  return (root: Object3D, transforms: Map<string, ComponentTransform> | null) => {
    if (!transforms) {
      for (const [object, base] of assembled) restore(object, base);
      assembled.clear();
      return;
    }
    const touched = new Set<Object3D>();
    root.traverse(object => {
      const key = explodeKeyOf(object);
      const offset = key ? transforms.get(key) : undefined;
      if (!offset) return;
      touched.add(object);
      if (!assembled.has(object)) assembled.set(object, {
        position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone(),
      });
      const base = assembled.get(object)!;
      object.position.copy(base.position).add(offset.position);
      object.rotation.set(base.rotation.x + offset.rotation.x, base.rotation.y + offset.rotation.y, base.rotation.z + offset.rotation.z);
      object.scale.copy(base.scale).multiply(offset.scale);
    });
    for (const [object, base] of assembled) {
      if (touched.has(object)) continue;
      restore(object, base);
      assembled.delete(object);
    }
  };
}
