import {
  UNKNOWN_CODE,
  describeVisualOnlyPart,
  cellLabels,
  entriesForPartRef,
  type AssemblyManifest,
  type AssemblyManifestEntry,
} from '@/lib/fabricator/assembly/assemblyManifest';
import { parsePartRefKey } from '@/lib/fabricator/assembly/partRef';
import { findObjectBySelectionKey } from '@/lib/3d/visualPartRefs';
import type { WindowUnit } from '@/types/fabricator';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BoxHelper, Object3D } from 'three';

export type PartViewMode = 'manufacturing' | 'customer';

/** Walk up to the nearest object that carries an assembly part ref or a view key. */
export function findInspectablePart(object: Object3D): Object3D {
  let current: Object3D | null = object;
  while (current) {
    if (typeof current.userData.partRef === 'string' || typeof current.userData.componentKey === 'string') return current;
    current = current.parent;
  }
  return object;
}

export interface SelectedPartDescription {
  title: string;
  entries: AssemblyManifestEntry[];
  /** Rendered piece without a saved record. */
  visualOnly: boolean;
  /** Selected record that has no mesh (list selection of an unmodelled part). */
  unmodelled: boolean;
}

/**
 * Describe a selection key (assembly part ref, `view:<componentKey>` or a manifest entry id)
 * strictly from the manifest. Never invents a catalogue assignment.
 */
export function describeSelection(
  key: string | null,
  manifest: AssemblyManifest | null,
  unit: WindowUnit,
): SelectedPartDescription | null {
  if (!key) return null;
  if (!manifest) {
    return { title: key.startsWith('view:') ? 'Visual part' : key, entries: [], visualOnly: true, unmodelled: false };
  }
  const byRef = entriesForPartRef(manifest, key);
  if (byRef.length) {
    return { title: byRef[0].name, entries: byRef, visualOnly: false, unmodelled: byRef.every(e => e.modelling === 'unmodelled') };
  }
  const byId = manifest.entries.find(entry => entry.id === key);
  if (byId) return { title: byId.name, entries: [byId], visualOnly: false, unmodelled: byId.modelling !== 'mapped' };
  if (key.startsWith('view:')) {
    return { title: 'Visual part (preset geometry, not bound to the saved part list)', entries: [], visualOnly: true, unmodelled: false };
  }
  const ref = parsePartRefKey(key);
  const title = ref ? describeVisualOnlyPart(ref, cellLabels(unit)) : key;
  return { title, entries: [], visualOnly: true, unmodelled: false };
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return <><dt className="text-slate-400">{label}</dt><dd className="break-words">{value}</dd></>;
}

function EntryDetails({ entry, mode }: { entry: AssemblyManifestEntry; mode: PartViewMode }) {
  const unknown = entry.catalogueCode === UNKNOWN_CODE;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      <Row label="Code" value={unknown ? 'UNKNOWN — not assigned' : entry.catalogueCode} />
      {entry.supplierCode && entry.supplierCode !== entry.catalogueCode && <Row label="Supplier ref" value={entry.supplierCode} />}
      <Row label="Material" value={entry.material} />
      <Row label="Finish" value={entry.finish} />
      <Row label="Purpose" value={entry.purpose} />
      <Row label="Quantity" value={entry.quantity ?? 'Set at BOM'} />
      {mode === 'manufacturing' && (
        <>
          <Row label="Cut id" value={entry.cutId} />
          <Row label="Design length" value={entry.dimensions.designLengthMm != null ? `${entry.dimensions.designLengthMm.toFixed(2)} mm` : null} />
          <Row label="BOM cut" value={entry.dimensions.bomCutLengthMm != null ? `${entry.dimensions.bomCutLengthMm.toFixed(2)} mm` : null} />
          <Row label="Angles" value={entry.dimensions.angles.length ? entry.dimensions.angles.join('° / ') + '°' : null} />
          <Row label="BOM" value={entry.bom.replace(/_/g, ' ')} />
          <Row label="Model" value={entry.modelling} />
          <Row label="Source" value={entry.source.replace(/_/g, ' ')} />
        </>
      )}
    </dl>
  );
}

export function WindowPartDetails({
  selectionKey,
  manifest,
  unit,
  mode = 'manufacturing',
  onClose,
}: {
  selectionKey: string | null;
  manifest: AssemblyManifest | null;
  unit: WindowUnit;
  mode?: PartViewMode;
  onClose: () => void;
}) {
  const description = describeSelection(selectionKey, manifest, unit);
  if (!description) return null;
  return (
    <section
      aria-label="Selected window part"
      aria-live="polite"
      className="absolute bottom-4 right-4 z-20 max-h-[60%] w-[min(22rem,calc(100%-2rem))] overflow-y-auto rounded-lg border border-amber-400/60 bg-slate-950/95 p-4 text-sm text-slate-100 shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <h3 className="font-semibold">{description.title}</h3>
        <button type="button" onClick={onClose} aria-label="Close part details" className="h-7 w-7 rounded hover:bg-slate-800">×</button>
      </div>
      {description.visualOnly && (
        <p className="text-xs text-amber-200">
          Shown in the 3D model for appearance only — it has no record in the saved part list and is not cut or priced from this view.
        </p>
      )}
      {description.unmodelled && !description.visualOnly && (
        <p className="mb-2 text-xs text-amber-200">This part is in the saved part list but is not drawn in the 3D model.</p>
      )}
      {description.entries.map(entry => (
        <div key={entry.id} className={description.entries.length > 1 ? 'mt-3 border-t border-slate-800 pt-3 first:mt-0 first:border-0 first:pt-0' : ''}>
          {description.entries.length > 1 && <p className="mb-1 text-xs font-medium text-slate-300">{entry.name}</p>}
          <EntryDetails entry={entry} mode={mode} />
          {mode === 'manufacturing' && entry.notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-400">
              {entry.notes.map(note => <li key={note}>{note}</li>)}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}

/**
 * Outline the scene object bound to a selection key. Re-resolves the object when the model is
 * regenerated (the previous mesh is detached) so the highlight survives regen and explode.
 */
export function WindowPartOutline({ selectionKey }: { selectionKey: string | null }) {
  const scene = useThree(state => state.scene);
  const targetRef = useRef<Object3D | null>(null);
  const outline = useMemo(() => new BoxHelper(new Object3D(), 0xfbbf24), []);
  useEffect(() => () => outline.dispose(), [outline]);
  useEffect(() => { targetRef.current = null; }, [selectionKey]);
  useFrame(() => {
    const attached = (object: Object3D | null) => {
      let current = object;
      while (current) { if (current === scene) return true; current = current.parent; }
      return false;
    };
    if (!attached(targetRef.current)) targetRef.current = findObjectBySelectionKey(scene, selectionKey);
    const target = targetRef.current;
    outline.visible = Boolean(target);
    if (target) { outline.setFromObject(target); outline.update(); }
  });
  return <primitive object={outline} raycast={() => null} />;
}
