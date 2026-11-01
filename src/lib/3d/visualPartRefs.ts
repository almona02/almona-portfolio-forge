import type { BufferGeometry, Object3D } from 'three';
import type { HardwarePlaceholder } from './hardwarePlaceholder';
import type { FrameGeometry } from './windowGeometry';

/** Part-ref key carried by a generated geometry (set by windowGeometry / manualMullionRenderer). */
export function geometryPartRef(geometry: BufferGeometry | undefined | null): string | undefined {
  const ref = geometry?.userData?.partRef;
  return typeof ref === 'string' ? ref : undefined;
}

/**
 * Every assembly part-ref key the renderer will attach to a mesh for this model.
 * Pure: lets the manifest mark records as mapped / unmodelled before anything is drawn.
 */
export function collectVisualPartKeys(
  modelData: FrameGeometry | null | undefined,
  hardware: ReadonlyArray<Pick<HardwarePlaceholder, 'userData'>> = [],
): Set<string> {
  const keys = new Set<string>();
  if (!modelData) return keys;
  for (const part of modelData.frame.parts) if (part.partRef) keys.add(part.partRef);
  for (const sash of modelData.sashes) {
    for (const part of sash.parts) if (part.partRef) keys.add(part.partRef);
    for (const glass of sash.glass) { const ref = geometryPartRef(glass); if (ref) keys.add(ref); }
    for (const spacer of sash.spacers) { const ref = geometryPartRef(spacer); if (ref) keys.add(ref); }
  }
  for (const glass of modelData.fixedGlass) { const ref = geometryPartRef(glass); if (ref) keys.add(ref); }
  for (const spacer of modelData.fixedSpacers) { const ref = geometryPartRef(spacer); if (ref) keys.add(ref); }
  const muntins = Array.isArray(modelData.muntins) ? modelData.muntins : modelData.muntins ? [modelData.muntins] : [];
  for (const muntin of muntins) { const ref = geometryPartRef(muntin); if (ref) keys.add(ref); }
  for (const hw of hardware) {
    const ref = hw.userData?.partRef;
    if (typeof ref === 'string') keys.add(ref);
  }
  return keys;
}

/** Selection key of a scene object: the assembly part ref when bound, else its view key. */
export function selectionKeyOf(object: Object3D | null | undefined): string | null {
  if (!object) return null;
  const ref = object.userData.partRef;
  if (typeof ref === 'string') return ref;
  const view = object.userData.componentKey;
  return typeof view === 'string' ? `view:${view}` : null;
}

/** Find the scene object bound to a selection key (part ref or `view:<componentKey>`). */
export function findObjectBySelectionKey(root: Object3D | null | undefined, key: string | null | undefined): Object3D | null {
  if (!root || !key) return null;
  let found: Object3D | null = null;
  root.traverse(object => {
    if (found) return;
    if (selectionKeyOf(object) === key) found = object;
  });
  return found;
}
