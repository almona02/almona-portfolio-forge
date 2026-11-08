/**
 * Batch 4 — revision-bound assembly manifest shared by saved design, BOM and 3D model.
 * Fixture: saved CALUMINIUM PS 2-sash sliding pose FP-Y0RIPV pos 1 R9 (see Batch 1 notes).
 */
import { describe, expect, it } from 'vitest';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { collectVisualPartKeys } from '@/lib/3d/visualPartRefs';
import { generateHardwarePlaceholders } from '@/lib/3d/hardwarePlaceholder';
import { generateModelGeometries } from '@/lib/3d/windowGeometry';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import type { Profile, SystemPack, WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';
import { UNKNOWN_CODE, buildAssemblyManifest, entriesForPartRef, parseDesignComponentId, searchManifest } from './assemblyManifest';
import { partRefKey } from './partRef';

const POSITION_ID = '3ecb65c7-8897-4cce-8392-23c78441ff08';
const PACK = CALUMINIUM_PS_PACK as unknown as SystemPack;

function packProfile(id: string): Profile {
  const found = (CALUMINIUM_PS_PACK.profiles ?? []).find((p) => p.id === id);
  if (!found) throw new Error(`CALUMINIUM PS profile ${id} missing`);
  return found;
}
function component(id: string, type: string, profileId: string, raw: number[], angles: number[]): WindowComponent {
  return { id, type, profile: packProfile(profileId), quantity: 1, cuttingLengths: raw, angles, machiningOperations: [], glazingType: 'none', hardware: [] } as unknown as WindowComponent;
}
function savedR9Components(): WindowComponent[] {
  const stamp = '1793549220583';
  const out = [
    component(`frame_top_${stamp}`, 'frame', 'PS-6601-FRAME', [1500], [45, 45]),
    component(`frame_bottom_${stamp}`, 'frame', 'PS-6601-FRAME', [1500], [45, 45]),
    component(`frame_left_${stamp}`, 'frame', 'PS-6601-FRAME', [1800], [45, 45]),
    component(`frame_right_${stamp}`, 'frame', 'PS-6601-FRAME', [1800], [45, 45]),
    component(`interlock_vertical_${stamp}`, 'interlock', 'PS-6601-INTERLOCK', [1605.7], [90]),
  ];
  for (const cell of ['0-0', '0-1']) {
    out.push(
      component(`sash_${cell}_top`, 'sash', 'PS-6601-SASH', [652.85], [45, 45]),
      component(`sash_${cell}_bottom`, 'sash', 'PS-6601-SASH', [652.85], [45, 45]),
      component(`sash_${cell}_left`, 'sash', 'PS-6601-SASH', [1605.7], [45, 45]),
      component(`sash_${cell}_right`, 'sash', 'PS-6601-SASH', [1605.7], [45, 45]),
      component(`bead_${cell}_top`, 'glazing_bead', 'PS-6601-BEAD', [644.85], [45, 45]),
      component(`bead_${cell}_bottom`, 'glazing_bead', 'PS-6601-BEAD', [644.85], [45, 45]),
      component(`bead_${cell}_left`, 'glazing_bead', 'PS-6601-BEAD', [1597.7], [45, 45]),
      component(`bead_${cell}_right`, 'glazing_bead', 'PS-6601-BEAD', [1597.7], [45, 45]),
    );
  }
  out.push(component(`design-track-${POSITION_ID}`, 'track', 'PS-6601-TRACK', [1305.7, 1305.7], [90, 90]));
  return out;
}
const grid: WindowGrid = {
  rows: 1, cols: 2, colWidths: [1, 1], rowHeights: [1],
  cells: [{ id: '0-0', row: 0, col: 0, type: 'sash' }, { id: '0-1', row: 0, col: 1, type: 'sash' }],
};
const pattern = {
  id: 'r9-sliding-2sash', name: 'sliding', type: 'sliding', openingMechanism: { type: 'sliding' }, gridSpec: grid, mullions: [], transoms: [],
} as unknown as EgyptianPattern;
function savedR9Unit(): WindowUnit {
  return {
    id: POSITION_ID, orderNumber: 'FP-Y0RIPV', posNumber: '1', type: 'sliding_window_2sash',
    overallWidth: 1500, overallHeight: 1800, systemPackId: 'caluminium-ps', quantity: 1, revision: 9,
    grid, components: savedR9Components(), color: 'bronze', glazing: {}, hardware: [],
  } as unknown as WindowUnit;
}

describe('assembly manifest — saved design identities', () => {
  it('parses the saved component id conventions and refuses to guess otherwise', () => {
    expect(parseDesignComponentId('frame_top_1793549220583')).toMatchObject({ kind: 'frame', placement: 'top' });
    expect(parseDesignComponentId('sash_0-1_left')).toMatchObject({ kind: 'sash', cellId: '0-1', placement: 'left' });
    expect(parseDesignComponentId('bead_0-0_bottom')).toMatchObject({ kind: 'bead', cellId: '0-0', placement: 'bottom' });
    expect(parseDesignComponentId('mullion_v_2_123')).toMatchObject({ kind: 'mullion', ordinal: 2 });
    expect(parseDesignComponentId(`design-track-${POSITION_ID}`)).toMatchObject({ kind: 'track' });
    expect(parseDesignComponentId('frame-caluminium-ps')).toEqual({ kind: null, cellId: null, placement: null, ordinal: null });
  });

  it('gives every cut occurrence a distinct record whose id is the BOM cut id', () => {
    const manifest = buildAssemblyManifest(savedR9Unit());
    const profiles = manifest.entries.filter((e) => e.category === 'profile');
    expect(profiles).toHaveLength(23);
    expect(new Set(profiles.map((e) => e.id)).size).toBe(23);
    expect(profiles.every((e) => e.cutId === `${e.componentId}:${e.occurrenceIndex}`)).toBe(true);
    // Repeated pieces are distinct identities with distinct places.
    const tracks = profiles.filter((e) => e.role === 'track');
    expect(tracks.map((e) => e.partRefKey)).toEqual(['track|||0', 'track|||1']);
    const sashTops = profiles.filter((e) => e.role === 'sash' && e.placement === 'top');
    expect(sashTops.map((e) => [e.cellLabel, e.catalogueCode])).toEqual([['Sash 1', 'PS-6601-SASH'], ['Sash 2', 'PS-6601-SASH']]);
    // Glass and spacers are their own records, codes explicit UNKNOWN when not saved.
    const glass = manifest.entries.filter((e) => e.category === 'glass');
    expect(glass.map((e) => e.name)).toEqual(['Glass — Sash 1', 'Glass — Sash 2']);
    expect(glass.every((e) => e.catalogueCode === UNKNOWN_CODE)).toBe(true);
    expect(manifest.summary.unknownCodes).toBeGreaterThan(0);
    expect(manifest.revision).toBe(9);
    expect(manifest.openingType).toBe('sliding');
  });

  it('never invents a code or a place for a component the saved design does not describe', () => {
    const unit = savedR9Unit();
    unit.components = [
      { id: 'frame-caluminium-ps', type: 'frame', profile: { ...packProfile('PS-6601-FRAME'), id: '' } as Profile, quantity: 1, cuttingLengths: [1500, 1500, 1800, 1800], angles: [45, 45], machiningOperations: [], glazingType: 'none', hardware: [] } as unknown as WindowComponent,
    ];
    const manifest = buildAssemblyManifest(unit, { visualPartKeys: [partRefKey({ kind: 'frame', cellId: null, placement: 'top', index: null })] });
    const frame = manifest.entries.filter((e) => e.role === 'frame');
    expect(frame).toHaveLength(4);
    expect(frame.every((e) => e.catalogueCode === UNKNOWN_CODE)).toBe(true);
    expect(frame.every((e) => e.partRef === null && e.modelling === 'unmodelled')).toBe(true);
    expect(frame[0].notes.join(' ')).toMatch(/not recorded/);
  });

  it('is stable across JSON save/reload', () => {
    const a = buildAssemblyManifest(savedR9Unit());
    const b = buildAssemblyManifest(JSON.parse(JSON.stringify(savedR9Unit())) as WindowUnit);
    expect(b.entries.map((e) => [e.id, e.partRefKey, e.catalogueCode])).toEqual(a.entries.map((e) => [e.id, e.partRefKey, e.catalogueCode]));
  });

  it('agrees with the saved BOM cut identities and flags cuts the BOM does not carry', async () => {
    const unit = savedR9Unit();
    const rows = await new ProfileBOMCalculator().calculateProfileBOM(unit, pattern, PACK);
    const manifest = buildAssemblyManifest(unit, { bom: { profiles: rows, hardware: [] } });
    const profiles = manifest.entries.filter((e) => e.category === 'profile');
    expect(profiles.every((e) => e.bom === 'in_bom')).toBe(true);
    expect(profiles.every((e) => e.dimensions.bomCutLengthMm! > e.dimensions.designLengthMm!)).toBe(true); // allowance applied once in BOM
    const frameTop = profiles.find((e) => e.componentId === 'frame_top_1793549220583')!;
    expect(frameTop.dimensions.bomCutLengthMm).toBe(1503);
    expect(frameTop.catalogueCode).toBe(rows.find((r) => r.cutIds?.includes(frameTop.cutId!))!.profileCode);

    // A stale BOM (missing one occurrence) is reported on that record only.
    const stale = rows.map((row) => row.profileCode === 'PS-6601-BEAD'
      ? { ...row, cutIds: row.cutIds!.filter((id) => id !== 'bead_0-1_right:0'), cuttingLengths: row.cuttingLengths.slice(1) }
      : row);
    const flagged = buildAssemblyManifest(unit, { bom: { profiles: stale, hardware: [] } });
    const missing = flagged.entries.filter((e) => e.bom === 'missing_from_bom');
    expect(missing.map((e) => e.cutId)).toEqual(['bead_0-1_right:0']);
    expect(flagged.summary.bomMissing).toBe(1);
  });

  it('places per-sash hardware from BOM quantities and lists uneven quantities without placing them', () => {
    const unit = savedR9Unit();
    const hardware = (id: string, category: 'roller' | 'handle' | 'lock' | 'corner_key', quantity: number, name: string, role?: string) => ({
      id, supplierCode: id, name, category, quantity, positionSpec: '', installationNotes: [], alternatives: [], estimatedTime: 0,
      ...(role ? { metadata: { role } } : {}),
    });
    const manifest = buildAssemblyManifest(unit, {
      bom: { profiles: [], hardware: [
        hardware('ps_sliding_roller', 'roller', 4, 'PS Sliding Roller System'),
        hardware('ps_sliding_handle', 'handle', 2, 'PS Sliding Window Handle'),
        hardware('ps_sliding_lock', 'lock', 3, 'PS Sliding Window Lock'),
        hardware('ps_corner_key_frame', 'corner_key', 4, 'PS Frame Corner Key', 'frame'),
        hardware('ps_corner_key_sash', 'corner_key', 8, 'PS Sash Corner Key', 'sash'),
      ] },
    });
    const rollers = manifest.entries.filter((e) => e.role === 'roller');
    expect(rollers.map((e) => e.partRefKey)).toEqual(['hardware|0-0|roller|0', 'hardware|0-0|roller|1', 'hardware|0-1|roller|0', 'hardware|0-1|roller|1']);
    expect(new Set(rollers.map((e) => e.id)).size).toBe(4);
    expect(manifest.entries.filter((e) => e.role === 'handle').map((e) => e.name)).toEqual(['PS Sliding Window Handle — Sash 1', 'PS Sliding Window Handle — Sash 2']);
    const lock = manifest.entries.filter((e) => e.role === 'lock');
    expect(lock).toHaveLength(1);
    expect(lock[0]).toMatchObject({ quantity: 3, partRef: null, catalogueCode: 'ps_sliding_lock' });
    expect(lock[0].notes.join(' ')).toMatch(/not evenly distributed/);
    expect(manifest.entries.filter((e) => e.role === 'corner_key' && e.cellId === null).map((e) => e.placement)).toEqual(['top_left', 'top_right', 'bottom_right', 'bottom_left']);
    expect(manifest.entries.filter((e) => e.role === 'corner_key' && e.cellId !== null)).toHaveLength(8);
  });

  it('lists system-specified hardware without quantities when neither BOM nor saved hardware exists', () => {
    const manifest = buildAssemblyManifest(savedR9Unit(), { systemPack: PACK });
    const system = manifest.entries.filter((e) => e.source === 'system_pack');
    expect(system.map((e) => e.catalogueCode)).toEqual(expect.arrayContaining(['ps_sliding_roller', 'ps_sliding_handle', 'ps_sliding_lock', 'ps_corner_key_frame', 'ps_corner_key_sash']));
    expect(system.find((e) => e.catalogueCode === 'ps_hinge_kit')).toBeUndefined(); // hinges are not sliding hardware
    expect(system.every((e) => e.quantity === null && e.partRef === null)).toBe(true);
  });
});

describe('assembly manifest — binding to the generated 3D model', () => {
  it('binds every placed R9 profile cut, glass pane and spacer to a rendered part and names the rest explicitly', () => {
    const unit = savedR9Unit();
    const geometry = generateModelGeometries(unit, null, { forceRegenerate: true });
    const hardware = generateHardwarePlaceholders(unit);
    const visual = collectVisualPartKeys(geometry, hardware);
    const manifest = buildAssemblyManifest(unit, { visualPartKeys: visual });

    const profiles = manifest.entries.filter((e) => e.category === 'profile');
    const unmodelled = profiles.filter((e) => e.modelling !== 'mapped');
    expect(unmodelled.map((e) => e.cutId)).toEqual([]);
    expect(manifest.entries.filter((e) => e.category === 'glass').every((e) => e.modelling === 'mapped')).toBe(true);
    expect(manifest.entries.filter((e) => e.role === 'spacer').every((e) => e.modelling === 'mapped')).toBe(true);
    // Sash corner plates and sliding hardware placeholders are drawn but have no saved record → visual only.
    expect(manifest.unmappedVisualParts.map((p) => p.partRefKey)).toEqual(expect.arrayContaining([
      partRefKey({ kind: 'corner', cellId: null, placement: 'top_left', index: null }),
      partRefKey({ kind: 'hardware', cellId: '0-0', placement: 'roller', index: 0 }),
      partRefKey({ kind: 'hardware', cellId: '0-1', placement: 'handle', index: 0 }),
    ]));
    expect(manifest.unmappedVisualParts.find((p) => p.partRefKey === 'hardware|0-0|roller|0')?.name).toBe('Roller — Sash 1 1');
    // Each visual key selects exactly the records bound to it (mesh ↔ list agree).
    for (const key of visual) {
      const bound = entriesForPartRef(manifest, key);
      const visualOnly = manifest.unmappedVisualParts.some((p) => p.partRefKey === key);
      expect(bound.length > 0 || visualOnly).toBe(true);
    }
    // Sliding sashes get rollers + handle + lock, not hinges.
    expect(hardware.map((hw) => hw.type)).not.toContain('hinge');
    expect(hardware.filter((hw) => hw.type === 'roller')).toHaveLength(4);
  });

  it('CALUMINIUM PS 2-sash sliding coverage: every listed part is either drawn or explicitly unmodelled (Batch 5 audit)', () => {
    const unit = savedR9Unit();
    const geometry = generateModelGeometries(unit, null, { forceRegenerate: true });
    const visual = collectVisualPartKeys(geometry, generateHardwarePlaceholders(unit));
    const manifest = buildAssemblyManifest(unit, { visualPartKeys: visual, systemPack: PACK });
    const byRole = (role: string) => manifest.entries.filter((e) => e.role === role);
    const allMapped = (role: string) => byRole(role).length > 0 && byRole(role).every((e) => e.modelling === 'mapped');
    // Profiles from the saved design are all drawn: frame, sash members, interlock, 2 tracks, beads.
    for (const role of ['frame', 'sash', 'interlock', 'track', 'glazing_bead']) expect(allMapped(role)).toBe(true);
    expect(byRole('track')).toHaveLength(2); // PS is a two-track system; no third track is invented
    // Glass and spacer/gasket sets per sash are drawn; their codes are UNKNOWN until saved.
    expect(allMapped('glass')).toBe(true);
    expect(allMapped('spacer')).toBe(true);
    // Hardware specified by the system pack is listed, unquantified and not placed (no BOM yet).
    const system = manifest.entries.filter((e) => e.source === 'system_pack');
    expect(system.map((e) => e.role).sort()).toEqual(['accessory', 'corner_key', 'corner_key', 'handle', 'lock', 'roller']);
    expect(system.every((e) => e.modelling === 'unmodelled' && e.quantity === null)).toBe(true);
    // Drawn pieces without a saved record are named as visual only: corner plates, top guide rails, hardware placeholders.
    const visualOnly = manifest.unmappedVisualParts.map((p) => p.partRef.kind);
    expect(new Set(visualOnly)).toEqual(new Set(['corner', 'track_guide', 'hardware']));
    expect(manifest.entries.filter((e) => e.modelling === 'pending')).toHaveLength(0);
    // Nothing in the manifest is priced: no cost fields exist on any record.
    expect(manifest.entries.every((e) => !('cost' in e) && !('unitPrice' in e))).toBe(true);
  });

  it('search finds parts by name, code and cell label', () => {
    const manifest = buildAssemblyManifest(savedR9Unit());
    expect(searchManifest(manifest, 'PS-6601-BEAD')).toHaveLength(8);
    expect(searchManifest(manifest, 'sash 2').every((e) => e.cellLabel === 'Sash 2')).toBe(true);
    expect(searchManifest(manifest, 'interlock')).toHaveLength(1);
    expect(searchManifest(manifest, '')).toHaveLength(manifest.entries.length);
  });
});

describe('assembly manifest — fixed / single-sash / mixed honesty (Batch E)', () => {
  function fixedSingleSashUnit(): WindowUnit {
    const stamp = 'fixed1s';
    const components = [
      component(`frame_top_${stamp}`, 'frame', 'PS-6601-FRAME', [900], [45, 45]),
      component(`frame_bottom_${stamp}`, 'frame', 'PS-6601-FRAME', [900], [45, 45]),
      component(`frame_left_${stamp}`, 'frame', 'PS-6601-FRAME', [1200], [45, 45]),
      component(`frame_right_${stamp}`, 'frame', 'PS-6601-FRAME', [1200], [45, 45]),
    ];
    const fixedGrid: WindowGrid = {
      rows: 1, cols: 1, colWidths: [1], rowHeights: [1],
      cells: [{ id: '0-0', row: 0, col: 0, type: 'fixed' }],
    };
    return {
      id: 'fixed-1s-unit', orderNumber: 'FP-FIXED', posNumber: '1', type: 'fixed_window',
      overallWidth: 900, overallHeight: 1200, systemPackId: 'caluminium-ps', quantity: 1, revision: 1,
      grid: fixedGrid, components, color: 'white', glazing: {}, hardware: [],
    } as unknown as WindowUnit;
  }

  function mixedFixedSlidingUnit(): WindowUnit {
    const stamp = 'mixed1';
    const components = [
      component(`frame_top_${stamp}`, 'frame', 'PS-6601-FRAME', [1500], [45, 45]),
      component(`frame_bottom_${stamp}`, 'frame', 'PS-6601-FRAME', [1500], [45, 45]),
      component(`frame_left_${stamp}`, 'frame', 'PS-6601-FRAME', [1400], [45, 45]),
      component(`frame_right_${stamp}`, 'frame', 'PS-6601-FRAME', [1400], [45, 45]),
      component(`sash_0-1_top`, 'sash', 'PS-6601-SASH', [700], [45, 45]),
      component(`sash_0-1_bottom`, 'sash', 'PS-6601-SASH', [700], [45, 45]),
      component(`sash_0-1_left`, 'sash', 'PS-6601-SASH', [1200], [45, 45]),
      component(`sash_0-1_right`, 'sash', 'PS-6601-SASH', [1200], [45, 45]),
    ];
    const mixedGrid: WindowGrid = {
      rows: 1, cols: 2, colWidths: [1, 1], rowHeights: [1],
      cells: [
        { id: '0-0', row: 0, col: 0, type: 'fixed' },
        { id: '0-1', row: 0, col: 1, type: 'sash' },
      ],
    };
    return {
      id: 'mixed-unit', orderNumber: 'FP-MIXED', posNumber: '2', type: 'mixed_window',
      overallWidth: 1500, overallHeight: 1400, systemPackId: 'caluminium-ps', quantity: 1, revision: 2,
      grid: mixedGrid, components, color: 'bronze', glazing: {}, hardware: [],
    } as unknown as WindowUnit;
  }

  it('fixed single-sash: listed profiles map or are explicitly unmodelled; no invented codes', () => {
    const unit = fixedSingleSashUnit();
    const geometry = generateModelGeometries(unit, null, { forceRegenerate: true });
    const visual = collectVisualPartKeys(geometry, generateHardwarePlaceholders(unit));
    const manifest = buildAssemblyManifest(unit, { visualPartKeys: visual, systemPack: PACK });
    expect(manifest.openingType).toMatch(/fixed/i);
    const profiles = manifest.entries.filter((e) => e.category === 'profile');
    expect(profiles.length).toBeGreaterThan(0);
    expect(profiles.every((e) => e.modelling === 'mapped' || e.modelling === 'unmodelled')).toBe(true);
    expect(manifest.entries.every((e) => e.catalogueCode !== '' && e.catalogueCode != null)).toBe(true);
    // System-pack hardware for fixed stays unmodelled / unquantified until assigned — never invented as placed.
    const system = manifest.entries.filter((e) => e.source === 'system_pack');
    expect(system.every((e) => e.modelling === 'unmodelled')).toBe(true);
    expect(manifest.entries.filter((e) => e.modelling === 'pending')).toHaveLength(0);
  });

  it('mixed fixed+sash: every listed part is drawn or explicitly unmodelled', () => {
    const unit = mixedFixedSlidingUnit();
    const geometry = generateModelGeometries(unit, null, { forceRegenerate: true });
    const visual = collectVisualPartKeys(geometry, generateHardwarePlaceholders(unit));
    const manifest = buildAssemblyManifest(unit, { visualPartKeys: visual, systemPack: PACK });
    expect(manifest.entries.every((e) => e.modelling === 'mapped' || e.modelling === 'unmodelled')).toBe(true);
    expect(manifest.entries.filter((e) => e.modelling === 'pending')).toHaveLength(0);
    const frames = manifest.entries.filter((e) => e.role === 'frame');
    const sashes = manifest.entries.filter((e) => e.role === 'sash');
    expect(frames.length).toBeGreaterThan(0);
    expect(sashes.length).toBeGreaterThan(0);
  });

  it('legacy frame-only component id stays unmodelled without inventing PS codes', () => {
    const unit = fixedSingleSashUnit();
    unit.components = [
      {
        id: 'frame-caluminium-ps',
        type: 'frame',
        profile: { ...packProfile('PS-6601-FRAME'), id: '' } as Profile,
        quantity: 1,
        cuttingLengths: [900, 900, 1200, 1200],
        angles: [45, 45],
        machiningOperations: [],
        glazingType: 'none',
        hardware: [],
      } as unknown as WindowComponent,
    ];
    const manifest = buildAssemblyManifest(unit, {
      visualPartKeys: [partRefKey({ kind: 'frame', cellId: null, placement: 'top', index: null })],
      systemPack: PACK,
    });
    const frame = manifest.entries.filter((e) => e.role === 'frame');
    expect(frame).toHaveLength(4);
    expect(frame.every((e) => e.catalogueCode === UNKNOWN_CODE)).toBe(true);
    expect(frame.every((e) => e.partRef === null && e.modelling === 'unmodelled')).toBe(true);
  });
});
