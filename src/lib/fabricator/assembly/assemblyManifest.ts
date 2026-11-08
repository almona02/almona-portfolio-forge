/**
 * Revision-bound assembly manifest.
 *
 * One record per physical piece of a saved position, shared by the saved design
 * (components / hardware / glazing), the BOM (cut identities `componentId:index`)
 * and the visual model (part refs). The manifest is a *read model*: it is derived
 * deterministically from persisted data and never writes back.
 *
 * Honesty rules (AICS-001 Tier 3 — no advisory inference):
 * - A catalogue code is reported only when the saved record carries it; otherwise it
 *   is explicitly UNKNOWN.
 * - A piece is bound to the 3D model only when the design record names its place
 *   unambiguously; otherwise it is listed as unmodelled with the reason.
 * - Quantities come from the saved design / BOM; system-pack kits without a BOM
 *   row are listed as "specified by system" with no quantity.
 * - Mesh identity is never a manufacturing identity: the manifest id is the cut id
 *   (or an occurrence id built from the position id, revision, kind and cell).
 */

import type { FabricationData, GridCell, SystemPack, WindowComponent, WindowUnit } from '@/types/fabricator';
import { isGlazingSpecFlat } from '@/types/fabricator';
import { normalizeOpeningType } from '@/lib/fabricator/openingType';
import { resolveLedgerRole } from '@/lib/fabricator/bom/ledgerRole';
import { listKitsFromPackSpec } from '@/lib/fabricator/manufacturing/hardwareKitOverrides';
import { buildOccurrenceId } from './occurrenceIdentity';
import {
  BORDER_ORDER,
  CORNER_ORDER,
  parsePartRefKey,
  partRefKey,
  type AssemblyPartRef,
  type AssemblyPlacement,
} from './partRef';

export type ManifestCategory = 'profile' | 'glass' | 'hardware' | 'accessory' | 'reinforcement' | 'fastener';
export type ManifestModelling = 'mapped' | 'unmodelled' | 'pending';
export type ManifestSource = 'saved_design' | 'saved_bom' | 'saved_hardware' | 'glazing_spec' | 'system_pack';
export type ManifestBomStatus = 'in_bom' | 'missing_from_bom' | 'profile_mismatch' | 'not_applicable' | 'bom_unavailable';

export const UNKNOWN_CODE = 'UNKNOWN';

export interface AssemblyManifestEntry {
  /** Stable identity: the BOM cut id for profile pieces, otherwise an occurrence id. */
  id: string;
  componentId: string | null;
  /** `componentId:index` — the same identity the BOM, solver and evidence ledger use. */
  cutId: string | null;
  occurrenceIndex: number | null;
  category: ManifestCategory;
  /** Ledger role (frame, sash, glazing_bead, interlock, track, mullion, transom, glass, handle…). */
  role: string;
  /** Plain-language name for customers. */
  name: string;
  /** Plain-language purpose. */
  purpose: string;
  cellId: string | null;
  /** Human cell label (Sash 1, Fixed pane 2) when the piece belongs to a cell. */
  cellLabel: string | null;
  placement: string | null;
  /** Catalogue / profile code, or UNKNOWN when the saved record carries none. */
  catalogueCode: string;
  supplierCode: string | null;
  profileName: string | null;
  material: string | null;
  finish: string | null;
  dimensions: {
    designLengthMm: number | null;
    bomCutLengthMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
    angles: number[];
  };
  /** Pieces represented by this record (1 for an occurrence; null = not quantified). */
  quantity: number | null;
  partRef: AssemblyPartRef | null;
  partRefKey: string | null;
  modelling: ManifestModelling;
  source: ManifestSource;
  bom: ManifestBomStatus;
  notes: string[];
}

export interface UnmappedVisualPart {
  partRefKey: string;
  partRef: AssemblyPartRef;
  name: string;
}

export interface AssemblyManifest {
  schemaVersion: 1;
  positionId: string;
  revision: number | null;
  systemPackId: string | null;
  openingType: string;
  entries: AssemblyManifestEntry[];
  /** Visual pieces rendered without a saved record (visual only — never priced or cut). */
  unmappedVisualParts: UnmappedVisualPart[];
  summary: {
    total: number;
    mapped: number;
    unmodelled: number;
    unknownCodes: number;
    bomMissing: number;
    unmappedVisual: number;
    bomAvailable: boolean;
  };
}

export interface AssemblyManifestOptions {
  /** Saved BOM for the same revision (profiles carry aligned `cutIds`). */
  bom?: Pick<FabricationData, 'profiles' | 'hardware'> | null;
  /** Part-ref keys the renderer actually produced for this unit. */
  visualPartKeys?: Iterable<string> | null;
  /** System pack, used only to list system-specified hardware when no BOM/saved hardware exists. */
  systemPack?: SystemPack | null;
}

// ---------------------------------------------------------------------------
// Design component id conventions (smartDraw / glazingBeadUtils / slidingSystemUtils /
// ProfileBOMCalculator). Anything that does not match is reported as unresolved.
// ---------------------------------------------------------------------------

const PLACEMENTS: ReadonlySet<string> = new Set(BORDER_ORDER);

function placementOf(value: string | undefined): AssemblyPlacement | null {
  return value && PLACEMENTS.has(value) ? (value as AssemblyPlacement) : null;
}

export interface ParsedDesignComponentId {
  kind: AssemblyPartRef['kind'] | null;
  cellId: string | null;
  placement: AssemblyPlacement | null;
  /** 1-based divider ordinal for `mullion_v_<n>_…` / `transom_h_<n>_…`. */
  ordinal: number | null;
}

export function parseDesignComponentId(id: string): ParsedDesignComponentId {
  const none: ParsedDesignComponentId = { kind: null, cellId: null, placement: null, ordinal: null };
  if (!id) return none;
  let match = /^frame_(top|bottom|left|right)_/.exec(id);
  if (match) return { kind: 'frame', cellId: null, placement: placementOf(match[1]), ordinal: null };
  match = /^sash_(.+)_(top|bottom|left|right)$/.exec(id);
  if (match) return { kind: 'sash', cellId: match[1], placement: placementOf(match[2]), ordinal: null };
  match = /^bead_(.+)_(top|bottom|left|right)$/.exec(id);
  if (match) return { kind: 'bead', cellId: match[1], placement: placementOf(match[2]), ordinal: null };
  if (/^interlock_/.test(id)) return { kind: 'interlock', cellId: null, placement: null, ordinal: null };
  match = /^mullion_v_(\d+)_/.exec(id);
  if (match) return { kind: 'mullion', cellId: null, placement: null, ordinal: Number(match[1]) };
  match = /^transom_h_(\d+)_/.exec(id);
  if (match) return { kind: 'transom', cellId: null, placement: null, ordinal: Number(match[1]) };
  if (/^design-track-/.test(id) || /^enrich-track-/.test(id)) return { kind: 'track', cellId: null, placement: null, ordinal: null };
  return none;
}

const ROLE_KIND: Record<string, AssemblyPartRef['kind']> = {
  frame: 'frame',
  sash: 'sash',
  glazing_bead: 'bead',
  bead: 'bead',
  interlock: 'interlock',
  mullion: 'mullion',
  transom: 'transom',
  track: 'track',
  screen_track: 'track',
};

const ROLE_NAME: Record<string, string> = {
  frame: 'Outer frame',
  sash: 'Sash',
  glazing_bead: 'Glazing bead',
  interlock: 'Interlock (meeting stile)',
  mullion: 'Mullion',
  transom: 'Transom',
  track: 'Sliding track',
  reinforcement: 'Reinforcement',
};

const ROLE_PURPOSE: Record<string, string> = {
  frame: 'Fixed outer frame that is anchored to the wall opening.',
  sash: 'Moving panel member that carries the glass.',
  glazing_bead: 'Clip-in strip that holds the glass in the sash or frame.',
  interlock: 'Vertical member where the two sliding panels meet and seal.',
  mullion: 'Vertical divider between panes.',
  transom: 'Horizontal divider between panes.',
  track: 'Rail the sliding panel rollers run on.',
  reinforcement: 'Steel insert that stiffens the profile.',
};

const PLACEMENT_LABEL: Record<string, string> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  top_left: 'top-left',
  top_right: 'top-right',
  bottom_right: 'bottom-right',
  bottom_left: 'bottom-left',
};

const HARDWARE_NAME: Record<string, string> = {
  handle: 'Handle',
  lock: 'Lock',
  roller: 'Roller',
  hinge: 'Hinge',
  corner_key: 'Corner key',
  gasket: 'Gasket',
  hardener: 'Reinforcement',
  screw: 'Screw',
  accessory: 'Accessory',
};

const HARDWARE_PURPOSE: Record<string, string> = {
  handle: 'Grip used to open and close the panel.',
  lock: 'Secures the panel in the closed position.',
  roller: 'Wheel set under the sliding panel.',
  hinge: 'Pivot that carries the opening panel.',
  corner_key: 'Hidden cleat that joins two mitred profile ends.',
  gasket: 'Rubber seal against air and water.',
  hardener: 'Steel insert that stiffens the profile.',
  screw: 'Fastener.',
  accessory: 'System accessory.',
};

/** Hardware types that are placed once (or k times) on each operable sash. */
const PER_SASH_HARDWARE: ReadonlySet<string> = new Set(['handle', 'lock', 'roller', 'hinge']);

// ---------------------------------------------------------------------------

function orderedCells(unit: WindowUnit): GridCell[] {
  return [...(unit.grid?.cells ?? [])]
    .filter((cell) => cell.type !== 'empty')
    .sort((a, b) => (a.row - b.row) || (a.col - b.col));
}

function isOperable(cell: GridCell): boolean {
  return cell.type === 'sash' || cell.type === 'sliding';
}

/** Deterministic human labels: "Sash 1", "Fixed pane 2", in reading order. */
export function cellLabels(unit: WindowUnit): Map<string, string> {
  const labels = new Map<string, string>();
  let sash = 0;
  let fixed = 0;
  for (const cell of orderedCells(unit)) {
    if (isOperable(cell)) labels.set(cell.id, `Sash ${++sash}`);
    else labels.set(cell.id, `Fixed pane ${++fixed}`);
  }
  return labels;
}

function finishOf(unit: WindowUnit): string | null {
  return unit.color ? String(unit.color) : null;
}

function supplierCodeOf(profile: WindowComponent['profile'] | undefined): string | null {
  const spec = profile?.specifications as { supplierCode?: unknown; profile_number?: unknown } | undefined;
  if (typeof spec?.supplierCode === 'string' && spec.supplierCode) return spec.supplierCode;
  if (typeof spec?.profile_number === 'string' && spec.profile_number) return spec.profile_number;
  return null;
}

function statusFor(key: string | null, visual: Set<string> | null): ManifestModelling {
  if (!visual) return 'pending';
  return key && visual.has(key) ? 'mapped' : 'unmodelled';
}

function bomCutIndex(bom: AssemblyManifestOptions['bom'], cutId: string): { row: FabricationData['profiles'][number]; index: number } | null {
  if (!bom) return null;
  for (const row of bom.profiles ?? []) {
    const index = row.cutIds?.indexOf(cutId) ?? -1;
    if (index >= 0) return { row, index };
  }
  return null;
}

// ---------------------------------------------------------------------------

function profileEntries(
  unit: WindowUnit,
  labels: Map<string, string>,
  options: AssemblyManifestOptions,
  visual: Set<string> | null,
): AssemblyManifestEntry[] {
  const entries: AssemblyManifestEntry[] = [];
  const bomAvailable = Boolean(options.bom);
  const sliding = normalizeOpeningType(unit.type, unit.grid) === 'sliding';
  // Occurrence counters for frame-level repeated pieces resolved by role order.
  const interlockCounter = { value: 0 };
  const trackCounter = { value: 0 };

  for (const component of unit.components ?? []) {
    const cuts = component.cuttingLengths ?? [];
    if (!cuts.length) continue;
    const profile = component.profile;
    const role = resolveLedgerRole(profile, component.type);
    const parsed = parseDesignComponentId(component.id);
    const kind = parsed.kind ?? ROLE_KIND[role] ?? null;
    const code = profile?.id ? String(profile.id) : UNKNOWN_CODE;

    cuts.forEach((designLength, index) => {
      const cutId = `${component.id}:${index}`;
      const notes: string[] = [];
      if (code === UNKNOWN_CODE) notes.push('Catalogue code UNKNOWN: the saved component has no profile code.');

      let partRef: AssemblyPartRef | null = null;
      if (kind === 'frame' || kind === 'sash' || kind === 'bead') {
        if (parsed.placement && (kind === 'frame' || parsed.cellId)) {
          partRef = { kind, cellId: kind === 'frame' ? null : parsed.cellId, placement: parsed.placement, index: null };
          if (cuts.length > 1) {
            // A placed member has one cut; extra cuts cannot be located.
            if (index > 0) { partRef = null; notes.push('Additional cut on a single placed member: position not recorded.'); }
          }
        } else {
          notes.push('Position within the assembly is not recorded in the saved component id; listed only.');
        }
      } else if (kind === 'interlock') {
        partRef = { kind: 'interlock', cellId: null, placement: null, index: interlockCounter.value++ };
      } else if (kind === 'track') {
        partRef = { kind: 'track', cellId: null, placement: null, index: trackCounter.value++ };
      } else if (kind === 'mullion' || kind === 'transom') {
        if (parsed.ordinal != null) {
          partRef = { kind: sliding && kind === 'mullion' ? 'interlock' : kind, cellId: null, placement: null, index: parsed.ordinal - 1 };
        } else {
          notes.push('Divider ordinal is not recorded in the saved component id; listed only.');
        }
      } else {
        notes.push(`No visual model for role "${role}".`);
      }

      const key = partRef ? partRefKey(partRef) : null;
      const bomHit = bomCutIndex(options.bom, cutId);
      let bom: ManifestBomStatus = 'bom_unavailable';
      let bomCutLengthMm: number | null = null;
      if (bomAvailable) {
        if (!bomHit) {
          bom = 'missing_from_bom';
          notes.push('Cut id is not in the saved BOM: regenerate the BOM from this design.');
        } else if (bomHit.row.profileCode !== code) {
          bom = 'profile_mismatch';
          notes.push(`Saved BOM uses profile ${bomHit.row.profileCode} for this cut.`);
          bomCutLengthMm = bomHit.row.cuttingLengths[bomHit.index] ?? null;
        } else {
          bom = 'in_bom';
          bomCutLengthMm = bomHit.row.cuttingLengths[bomHit.index] ?? null;
        }
      }

      const cellLabel = parsed.cellId ? labels.get(parsed.cellId) ?? parsed.cellId : null;
      const baseName = ROLE_NAME[role] ?? role.replace(/_/g, ' ');
      const placementLabel = parsed.placement ? PLACEMENT_LABEL[parsed.placement] : null;
      const nameParts = [baseName];
      if (cellLabel) nameParts.push(`— ${cellLabel}`);
      if (placementLabel) nameParts.push(`(${placementLabel})`);
      else if (partRef && typeof partRef.index === 'number' && (kind === 'interlock' || kind === 'track' || kind === 'mullion' || kind === 'transom')) {
        nameParts.push(`${partRef.index + 1}`);
      }

      entries.push({
        id: cutId,
        componentId: component.id,
        cutId,
        occurrenceIndex: index,
        category: role === 'reinforcement' ? 'reinforcement' : 'profile',
        role,
        name: nameParts.join(' '),
        purpose: ROLE_PURPOSE[role] ?? 'Profile member.',
        cellId: parsed.cellId,
        cellLabel,
        placement: partRef?.placement ?? parsed.placement ?? null,
        catalogueCode: code,
        supplierCode: supplierCodeOf(profile),
        profileName: profile?.name ?? null,
        material: profile?.material ?? null,
        finish: finishOf(unit),
        dimensions: {
          designLengthMm: Number.isFinite(designLength) ? designLength : null,
          bomCutLengthMm,
          widthMm: profile?.width ?? null,
          heightMm: profile?.height ?? null,
          angles: component.angles ?? [],
        },
        quantity: 1,
        partRef,
        partRefKey: key,
        modelling: statusFor(key, visual),
        source: 'saved_design',
        bom,
        notes,
      });
    });
  }
  return entries;
}

function glazingEntries(unit: WindowUnit, labels: Map<string, string>, visual: Set<string> | null): AssemblyManifestEntry[] {
  const entries: AssemblyManifestEntry[] = [];
  const glazing = unit.glazing ?? {};
  const flat = isGlazingSpecFlat(glazing) ? glazing : null;
  const perCell = flat ? null : (glazing as Record<string, { type?: string; color?: string }>);

  for (const cell of orderedCells(unit)) {
    const label = labels.get(cell.id) ?? cell.id;
    const spec = perCell?.[cell.id];
    const glassType = spec?.type ?? flat?.type ?? null;
    const code = flat?.glassCode ? String(flat.glassCode) : UNKNOWN_CODE;
    const glassRef: AssemblyPartRef = { kind: 'glass', cellId: cell.id, placement: null, index: null };
    const glassKey = partRefKey(glassRef);
    const notes: string[] = [];
    if (code === UNKNOWN_CODE) notes.push('Glass code UNKNOWN: the saved glazing has no supplier reference.');
    entries.push({
      id: buildOccurrenceId({ positionId: unit.id, revision: unit.revision ?? null, kind: 'glass', cellId: cell.id }),
      componentId: null,
      cutId: null,
      occurrenceIndex: null,
      category: 'glass',
      role: 'glass',
      name: `Glass — ${label}`,
      purpose: isOperable(cell) ? 'Glass pane carried by the sash.' : 'Fixed glass pane in the frame.',
      cellId: cell.id,
      cellLabel: label,
      placement: null,
      catalogueCode: code,
      supplierCode: null,
      profileName: glassType ? `${glassType} glazing` : null,
      material: 'glass',
      finish: spec?.color ?? flat?.color ?? null,
      dimensions: { designLengthMm: null, bomCutLengthMm: null, widthMm: null, heightMm: flat?.thickness ?? null, angles: [] },
      quantity: 1,
      partRef: glassRef,
      partRefKey: glassKey,
      modelling: statusFor(glassKey, visual),
      source: 'glazing_spec',
      bom: 'not_applicable',
      notes,
    });

    const spacerRef: AssemblyPartRef = { kind: 'spacer', cellId: cell.id, placement: null, index: null };
    const spacerKey = partRefKey(spacerRef);
    entries.push({
      id: buildOccurrenceId({ positionId: unit.id, revision: unit.revision ?? null, kind: 'glass', cellId: cell.id, componentId: 'spacer' }),
      componentId: null,
      cutId: null,
      occurrenceIndex: null,
      category: 'accessory',
      role: 'spacer',
      name: `Glass spacer & gaskets — ${label}`,
      purpose: 'Spacer frame and rubber seals around the glass edge.',
      cellId: cell.id,
      cellLabel: label,
      placement: null,
      catalogueCode: flat?.spacer ? String(flat.spacer) : UNKNOWN_CODE,
      supplierCode: null,
      profileName: null,
      material: null,
      finish: null,
      dimensions: { designLengthMm: null, bomCutLengthMm: null, widthMm: null, heightMm: null, angles: [] },
      quantity: 1,
      partRef: spacerRef,
      partRefKey: spacerKey,
      modelling: statusFor(spacerKey, visual),
      source: 'glazing_spec',
      bom: 'not_applicable',
      notes: flat?.spacer ? [] : ['Spacer / gasket code UNKNOWN: not recorded in the saved glazing.'],
    });
  }
  return entries;
}

interface HardwareSeed {
  id: string;
  code: string;
  name: string;
  type: string;
  quantity: number | null;
  source: ManifestSource;
  /** 'frame' | 'sash' for corner keys when known. */
  role: string | null;
  material: string | null;
}

function hardwareSeeds(unit: WindowUnit, options: AssemblyManifestOptions): { seeds: HardwareSeed[]; note: string | null } {
  if (options.bom) {
    return {
      seeds: (options.bom.hardware ?? []).map((row) => ({
        id: row.id,
        code: row.supplierCode || row.id || UNKNOWN_CODE,
        name: row.name,
        type: row.category,
        quantity: row.quantity,
        source: 'saved_bom',
        role: typeof row.metadata?.role === 'string' ? row.metadata.role : (/frame/i.test(row.name) ? 'frame' : /sash/i.test(row.name) ? 'sash' : null),
        material: null,
      })),
      note: null,
    };
  }
  const saved = Array.isArray(unit.hardware) ? unit.hardware : [];
  if (saved.length) {
    return {
      seeds: saved.map((item, i) => ({
        id: item.id ?? `hardware-${i}`,
        code: item.supplierCode || UNKNOWN_CODE,
        name: item.name ?? HARDWARE_NAME[item.type ?? ''] ?? 'Hardware',
        type: item.type ?? item.category ?? 'accessory',
        quantity: typeof item.quantity === 'number' ? item.quantity : null,
        source: 'saved_hardware',
        role: /frame/i.test(item.name ?? '') ? 'frame' : /sash/i.test(item.name ?? '') ? 'sash' : null,
        material: null,
      })),
      note: null,
    };
  }
  const pack = options.systemPack;
  if (pack) {
    const kits = listKitsFromPackSpec(pack.windowSystemSpec as Record<string, unknown> | undefined);
    const opening = normalizeOpeningType(unit.type, unit.grid);
    const relevant = kits.filter((kit) => {
      const type = String(kit.type ?? '').toLowerCase();
      if (opening === 'fixed') return type === 'corner_key';
      if (type === 'roller') return opening === 'sliding';
      if (type === 'hinge') return opening !== 'sliding';
      return true;
    });
    return {
      seeds: relevant.map((kit) => ({
        id: String(kit.id ?? kit.name ?? 'kit'),
        code: String(kit.id ?? UNKNOWN_CODE),
        name: String(kit.name ?? HARDWARE_NAME[String(kit.type ?? '')] ?? 'Hardware kit'),
        type: String(kit.type ?? 'accessory'),
        quantity: null,
        source: 'system_pack',
        role: typeof kit.specifications?.role === 'string' ? kit.specifications.role : null,
        material: typeof kit.specifications?.material === 'string' ? kit.specifications.material : null,
      })),
      note: 'Specified by the system pack; quantity is set when the BOM is generated.',
    };
  }
  return { seeds: [], note: null };
}

function hardwareEntries(unit: WindowUnit, labels: Map<string, string>, options: AssemblyManifestOptions, visual: Set<string> | null): AssemblyManifestEntry[] {
  const entries: AssemblyManifestEntry[] = [];
  const { seeds, note } = hardwareSeeds(unit, options);
  const sashCells = orderedCells(unit).filter(isOperable);
  const finish = finishOf(unit);

  const push = (seed: HardwareSeed, partRef: AssemblyPartRef | null, quantity: number | null, cellId: string | null, ordinal: number | null, extraNotes: string[], showOrdinal = false) => {
    const key = partRef ? partRefKey(partRef) : null;
    const cellLabel = cellId ? labels.get(cellId) ?? cellId : null;
    const notes = [...extraNotes];
    if (note) notes.push(note);
    if (seed.code === UNKNOWN_CODE) notes.push('Catalogue code UNKNOWN.');
    const baseName = seed.name || HARDWARE_NAME[seed.type] || 'Hardware';
    const nameParts = [baseName];
    if (cellLabel) nameParts.push(`— ${cellLabel}`);
    if (partRef?.placement && partRef.kind === 'corner') nameParts.push(`(${PLACEMENT_LABEL[partRef.placement] ?? partRef.placement})`);
    else if (showOrdinal && ordinal != null) nameParts.push(`${ordinal + 1}`);
    entries.push({
      id: buildOccurrenceId({
        positionId: unit.id, revision: unit.revision ?? null, kind: 'hardware', cellId,
        memberIndex: ordinal, componentId: partRef?.kind === 'corner' && partRef.placement ? `${seed.id}:${partRef.placement}` : seed.id,
      }),
      componentId: null,
      cutId: null,
      occurrenceIndex: ordinal,
      category: seed.type === 'corner_key' || seed.type === 'hardener' ? 'reinforcement' : seed.type === 'screw' ? 'fastener' : seed.type === 'gasket' || seed.type === 'accessory' ? 'accessory' : 'hardware',
      role: seed.type,
      name: nameParts.join(' '),
      purpose: HARDWARE_PURPOSE[seed.type] ?? 'System accessory.',
      cellId,
      cellLabel,
      placement: partRef?.placement ?? null,
      catalogueCode: seed.code,
      supplierCode: seed.code === UNKNOWN_CODE ? null : seed.code,
      profileName: null,
      material: seed.material,
      finish: seed.type === 'handle' ? finish : null,
      dimensions: { designLengthMm: null, bomCutLengthMm: null, widthMm: null, heightMm: null, angles: [] },
      quantity,
      partRef,
      partRefKey: key,
      modelling: statusFor(key, visual),
      source: seed.source,
      bom: seed.source === 'saved_bom' ? 'in_bom' : seed.source === 'system_pack' ? 'bom_unavailable' : 'not_applicable',
      notes,
    });
  };

  for (const seed of seeds) {
    const type = seed.type;
    if (seed.quantity == null) {
      push(seed, null, null, null, null, []);
      continue;
    }
    if (type === 'corner_key') {
      const role = seed.role;
      if (role === 'frame' && seed.quantity === CORNER_ORDER.length) {
        CORNER_ORDER.forEach((corner, i) => push(seed, { kind: 'corner', cellId: null, placement: corner, index: null }, 1, null, i, []));
        continue;
      }
      if (role === 'sash' && sashCells.length && seed.quantity === CORNER_ORDER.length * sashCells.length) {
        sashCells.forEach((cell) => CORNER_ORDER.forEach((corner, i) => push(seed, { kind: 'corner', cellId: cell.id, placement: corner, index: null }, 1, cell.id, i, [])));
        continue;
      }
      push(seed, null, seed.quantity, null, null, ['Corner keys are not placed per corner: quantity does not match the modelled corners.']);
      continue;
    }
    if (PER_SASH_HARDWARE.has(type) && sashCells.length && seed.quantity % sashCells.length === 0) {
      const perSash = seed.quantity / sashCells.length;
      sashCells.forEach((cell) => {
        for (let i = 0; i < perSash; i++) {
          push(seed, { kind: 'hardware', cellId: cell.id, placement: type, index: i }, 1, cell.id, i, [], perSash > 1);
        }
      });
      continue;
    }
    push(seed, null, seed.quantity, null, null, PER_SASH_HARDWARE.has(type)
      ? ['Quantity is not evenly distributed across sashes: not placed in the model.']
      : ['Not represented in the 3D model.']);
  }
  return entries;
}

const VISUAL_ONLY_NAME: Record<string, string> = {
  corner: 'Corner reinforcement plate',
  track_guide: 'Top guide rail',
  track: 'Sliding track',
  gasket: 'Gasket',
  spacer: 'Glass spacer',
  glass: 'Glass',
  screen_sash: 'Fly-screen sash member',
  screen_mesh: 'Fly-screen mesh',
  interlock: 'Interlock (meeting stile)',
  mullion: 'Mullion',
  transom: 'Transom',
  bead: 'Glazing bead',
  frame: 'Outer frame member',
  sash: 'Sash member',
  hardware: 'Hardware',
};

export function describeVisualOnlyPart(ref: AssemblyPartRef, labels: Map<string, string>): string {
  const hardware = ref.kind === 'hardware';
  const base = hardware ? (HARDWARE_NAME[ref.placement ?? ''] ?? 'Hardware') : (VISUAL_ONLY_NAME[ref.kind] ?? ref.kind);
  const parts = [base];
  if (ref.cellId) parts.push(`— ${labels.get(ref.cellId) ?? ref.cellId}`);
  if (ref.placement && !hardware) parts.push(`(${PLACEMENT_LABEL[ref.placement] ?? ref.placement})`);
  if (typeof ref.index === 'number' && (!hardware || ref.index > 0 || ref.placement === 'roller' || ref.placement === 'hinge')) parts.push(`${ref.index + 1}`);
  return parts.join(' ');
}

/** Deterministic manifest for a saved position (and, when supplied, its BOM and rendered parts). */
export function buildAssemblyManifest(unit: WindowUnit, options: AssemblyManifestOptions = {}): AssemblyManifest {
  const visual = options.visualPartKeys ? new Set(options.visualPartKeys) : null;
  const labels = cellLabels(unit);
  const entries = [
    ...profileEntries(unit, labels, options, visual),
    ...glazingEntries(unit, labels, visual),
    ...hardwareEntries(unit, labels, options, visual),
  ];

  const bound = new Set(entries.map((entry) => entry.partRefKey).filter((key): key is string => Boolean(key)));
  const unmappedVisualParts: UnmappedVisualPart[] = [];
  if (visual) {
    for (const key of visual) {
      if (bound.has(key)) continue;
      const ref = parsePartRefKey(key);
      if (!ref) continue;
      unmappedVisualParts.push({ partRefKey: key, partRef: ref, name: describeVisualOnlyPart(ref, labels) });
    }
    unmappedVisualParts.sort((a, b) => a.partRefKey.localeCompare(b.partRefKey));
  }

  return {
    schemaVersion: 1,
    positionId: unit.id,
    revision: unit.revision ?? null,
    systemPackId: unit.systemPackId ?? null,
    openingType: normalizeOpeningType(unit.type, unit.grid),
    entries,
    unmappedVisualParts,
    summary: {
      total: entries.length,
      mapped: entries.filter((entry) => entry.modelling === 'mapped').length,
      unmodelled: entries.filter((entry) => entry.modelling === 'unmodelled').length,
      unknownCodes: entries.filter((entry) => entry.catalogueCode === UNKNOWN_CODE).length,
      bomMissing: entries.filter((entry) => entry.bom === 'missing_from_bom' || entry.bom === 'profile_mismatch').length,
      unmappedVisual: unmappedVisualParts.length,
      bomAvailable: Boolean(options.bom),
    },
  };
}

/** Entries bound to a visual part ref (several records may share a visual piece). */
export function entriesForPartRef(manifest: AssemblyManifest, key: string | null | undefined): AssemblyManifestEntry[] {
  if (!key) return [];
  return manifest.entries.filter((entry) => entry.partRefKey === key);
}

/** Case-insensitive search across the customer-facing fields. */
export function searchManifest(manifest: AssemblyManifest, query: string): AssemblyManifestEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return manifest.entries;
  return manifest.entries.filter((entry) =>
    [entry.name, entry.catalogueCode, entry.supplierCode, entry.profileName, entry.role, entry.cellLabel, entry.purpose, entry.id]
      .some((field) => field && field.toLowerCase().includes(needle)),
  );
}
