import type { WindowUnit } from '@/types/fabricator';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { BoxHelper, Object3D } from 'three';

export function findInspectablePart(object: Object3D): Object3D {
  let current: Object3D | null = object;
  while (current) {
    if (typeof current.userData.componentKey === 'string') return current;
    current = current.parent;
  }
  return object;
}

/** Only report a saved profile assignment when it is unambiguous. */
export function describeWindowPart(key: string, unit: WindowUnit) {
  const role = key.startsWith('fixed-glass') || key.startsWith('glass-') ? 'glass'
    : key.includes('spacer') ? 'spacer'
    : key.startsWith('hardware-') ? key.split('-')[1]
    : key.startsWith('frame-') ? 'frame'
    : key.startsWith('sash-') ? 'sash'
    : key.startsWith('muntin-') ? 'mullion' : 'component';
  const candidates = (unit.components ?? []).filter(component => {
    const assignedRole = component.profile?.profileRole ?? component.type;
    return component.type === role || assignedRole === role || (role === 'sash' && assignedRole.startsWith('sash_'));
  });
  const profiles = new Map(candidates.filter(c => c.profile?.id).map(c => [c.profile.id, c.profile]));
  const profile = profiles.size === 1 ? [...profiles.values()][0] : null;
  return {
    name: role.replace(/_/g, ' '),
    viewId: key,
    code: profile?.id ?? null,
    material: profile?.material ?? (role === 'glass' ? 'Glass' : null),
    finish: profile ? unit.color : null,
  };
}

export function WindowPartDetails({ part, unit, onClose }: { part: Object3D; unit: WindowUnit; onClose: () => void }) {
  const details = describeWindowPart(part.userData.componentKey || part.name || part.uuid, unit);
  return <section aria-label="Selected window part" aria-live="polite" className="absolute bottom-4 right-4 z-20 max-w-xs rounded-lg border border-amber-400/60 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-lg">
    <div className="mb-3 flex items-center justify-between gap-4">
      <h3 className="font-semibold capitalize">{details.name}</h3>
      <button type="button" onClick={onClose} aria-label="Close part details">×</button>
    </div>
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
      <dt>Profile code</dt><dd>{details.code ?? 'Not assigned'}</dd>
      <dt>Material</dt><dd className="capitalize">{details.material ?? 'Not recorded'}</dd>
      {details.finish && <><dt>Finish</dt><dd>{details.finish}</dd></>}
      <dt>View item</dt><dd className="break-all">{details.viewId}</dd>
    </dl>
    {!details.code && <p className="mt-3 text-xs text-slate-400">This visual part has no unique saved catalogue assignment.</p>}
  </section>;
}

export function WindowPartOutline({ part }: { part: Object3D }) {
  const outline = useMemo(() => new BoxHelper(part, 0xfbbf24), [part]);
  useEffect(() => () => outline.dispose(), [outline]);
  useFrame(() => outline.update());
  return <primitive object={outline} raycast={() => null} />;
}
