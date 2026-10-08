/**
 * Cross-path ledger: real generateComponentsFromGrid → persist/hydrate → re-BOM
 * → qualification → optimizer. Compare canonical cut tuples (not totals only).
 *
 * Design components store pre-allowance lengths; BOM/optimizer apply
 * physicalCutForOccurrence once. Empty-component generated BOM must match.
 */
import { describe, expect, it } from 'vitest';
import { generateComponentsFromGrid } from '@/algorithms/smartDraw';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { mapPositionRowToWindowUnit } from '@/lib/supabase/fabricatorClientV2';
import { optimizeProjectEstimate } from '@/lib/fabricator/production/ProjectOptimizationEstimate';
import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import type { Database } from '@/types/database';
import type { Profile, WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';
import { ProfileBOMCalculator } from './ProfileBOMCalculator';
import { assessBOMQualification, countRequiredProfilePieces } from './bomQualification';

type PositionRow = Database['public']['Tables']['fabricator_positions_v2']['Row'];

const identity = {
  ownerUserId: 'owner',
  projectId: 'project',
  positionId: 'pose',
  source: 'v2' as const,
  revision: 1,
};

type CutTuple = {
  profileId: string;
  role: string;
  length: number;
  angle: number;
  occurrenceIndex: number;
};

function grid(cols: number, rows: number, cellType: string, colWidths?: number[]): WindowGrid {
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      cells.push({ id: `${r}-${c}`, row: r, col: c, type: cellType });
    }
  }
  return {
    rows,
    cols,
    cells,
    colWidths: colWidths ?? Array.from({ length: cols }, () => 1),
    rowHeights: Array.from({ length: rows }, () => 1),
  } as WindowGrid;
}

function patternFor(type: string, g: WindowGrid): EgyptianPattern {
  return {
    id: `pat-${type}`,
    name: type,
    type: type.includes('sliding') ? 'sliding' : type.includes('tilt') ? 'tilt_turn' : type,
    openingMechanism: type.includes('sliding') ? { type: 'sliding' } : undefined,
    gridSpec: g,
    mullions: [],
    transoms: [],
  } as unknown as EgyptianPattern;
}

function baseUnit(type: string, g: WindowGrid, w: number, h: number): WindowUnit {
  return {
    id: `wu-${type}-${g.cols}x${g.rows}`,
    type,
    overallWidth: w,
    overallHeight: h,
    systemPackId: 'caluminium-ps',
    grid: g,
    quantity: 1,
    components: [],
  } as WindowUnit;
}

function normalizeRole(role: string | undefined): string {
  if (!role) return 'unknown';
  if (role === 'screen_track') return 'track';
  if (role === 'sash_sliding' || role.startsWith('sash_')) return 'sash';
  if (role === 'glazing_bead_inner' || role === 'glazing_bead_outer' || role === 'bead') {
    return 'glazing_bead';
  }
  return role;
}

function tuplesFromBomProfiles(
  profiles: Array<{
    profileCode?: string;
    role?: string;
    cuttingLengths: number[];
    angles?: number[];
  }>,
): CutTuple[] {
  const out: CutTuple[] = [];
  for (const row of profiles) {
    const role = normalizeRole(row.role);
    row.cuttingLengths.forEach((length, occurrenceIndex) => {
      out.push({
        profileId: String(row.profileCode ?? ''),
        role,
        length: Number(length.toFixed(3)),
        angle: Number((row.angles?.[occurrenceIndex] ?? 90).toFixed(3)),
        occurrenceIndex,
      });
    });
  }
  return out.sort((a, b) =>
    JSON.stringify([a.profileId, a.role, a.length, a.angle, a.occurrenceIndex]).localeCompare(
      JSON.stringify([b.profileId, b.role, b.length, b.angle, b.occurrenceIndex]),
    ),
  );
}

/** Physical cut tuples from design components (optimizer consumption path). */
function tuplesFromComponents(unit: WindowUnit): CutTuple[] {
  const out: CutTuple[] = [];
  for (const component of unit.components ?? []) {
    const profile = component.profile;
    if (!profile?.id) continue;
    const role = normalizeRole(
      (typeof profile.specifications?.bomRole === 'string' && profile.specifications.bomRole) ||
        profile.profileRole ||
        component.type,
    );
    component.cuttingLengths.forEach((_, index) => {
      const cut = physicalCutForOccurrence(component, index, profile, unit.systemPackId);
      out.push({
        profileId: profile.id,
        role,
        length: Number(cut.length.toFixed(3)),
        angle: Number(cut.angle.toFixed(3)),
        occurrenceIndex: index,
      });
    });
  }
  return out.sort((a, b) =>
    JSON.stringify([a.profileId, a.role, a.length, a.angle, a.occurrenceIndex]).localeCompare(
      JSON.stringify([b.profileId, b.role, b.length, b.angle, b.occurrenceIndex]),
    ),
  );
}

function packProfile(roleOrId: string): Profile {
  const profiles = CALUMINIUM_PS_PACK.profiles ?? [];
  const found =
    profiles.find((p) => p.id === roleOrId) ||
    profiles.find((p) => p.profileRole === roleOrId) ||
    profiles.find((p) => p.specifications?.bomRole === roleOrId) ||
    profiles.find((p) => String(p.profileRole || '').includes(roleOrId));
  if (!found) throw new Error(`Missing caluminium-ps profile for ${roleOrId}`);
  return found;
}

function componentLedgerRole(component: WindowComponent): string {
  return normalizeRole(
    (typeof component.profile?.specifications?.bomRole === 'string' &&
      component.profile.specifications.bomRole) ||
      component.profile?.profileRole ||
      component.type,
  );
}

/**
 * Complete sliding design ledger with design-level track when the grid
 * generator omitted it. Lengths stay pre-allowance (not BOM/physical).
 */
function completeDesignComponents(
  components: WindowComponent[],
  unit: WindowUnit,
  isSliding: boolean,
): WindowComponent[] {
  if (!isSliding) return components;
  if (components.some((c) => componentLedgerRole(c) === 'track')) return components;

  const track = packProfile('PS-6601-TRACK');
  const frame = components.find((c) => componentLedgerRole(c) === 'frame')?.profile;
  const frameWidth = frame?.width ?? 50;
  const trackCut = Math.max(0, unit.overallWidth - frameWidth * 2);
  return [
    ...components,
    {
      id: `design-track-${unit.id}`,
      type: 'track',
      profile: track,
      width: trackCut,
      height: track.width || 0,
      quantity: 1,
      cuttingLengths: [trackCut, trackCut],
      angles: [90, 90],
      machiningOperations: [],
      glazingType: 'none',
      hardware: [],
    } as WindowComponent,
  ];
}

/** Persistence serializer → hydrator round-trip (positions_v2 shape). */
function persistAndHydrate(unit: WindowUnit): WindowUnit {
  const now = new Date().toISOString();
  const row = {
    id: unit.id,
    project_id: '00000000-0000-4000-8000-000000000099',
    owner_user_id: '00000000-0000-4000-8000-000000000001',
    order_number: unit.orderNumber ?? null,
    pos_number: unit.posNumber ?? '1',
    type: unit.type,
    overall_width_mm: unit.overallWidth,
    overall_height_mm: unit.overallHeight,
    color: unit.color ?? null,
    glazing: (unit.glazing ?? {}) as Record<string, unknown>,
    system_pack_id: unit.systemPackId ?? null,
    status: unit.status ?? 'design',
    quantity: unit.quantity ?? 1,
    position_meta: (unit.positionMeta ?? {}) as Record<string, unknown>,
    meta: {},
    optimization: null,
    grid: (unit.grid ?? null) as Record<string, unknown> | null,
    components: JSON.parse(JSON.stringify(unit.components ?? [])),
    hardware: {},
    selected_preset: unit.presetId ?? null,
    window_unit: JSON.parse(
      JSON.stringify({
        ...unit,
        components: unit.components,
        createdAt: now,
        updatedAt: now,
      }),
    ),
    tier: 'standard',
    deterministic: true,
    constitutional_hash: null,
    audit_trail: [],
    last_validated_at: null,
    created_at: now,
    updated_at: now,
    qc_revision: unit.revision ?? 1,
  } as PositionRow;

  const hydrated = mapPositionRowToWindowUnit(row);
  if (!hydrated) throw new Error('Hydration returned null');
  return hydrated;
}

/** Multiset of profile|role|length|angle — ignores per-row occurrenceIndex. */
function physicalMultiset(tuples: CutTuple[]): string[] {
  return tuples
    .map((t) => `${t.profileId}|${t.role}|${t.length}|${t.angle}`)
    .sort();
}

describe('physical ledger cross-path cut tuples', () => {
  const calculator = new ProfileBOMCalculator();
  const packProfiles = CALUMINIUM_PS_PACK.profiles ?? [];

  const cases: Array<{ name: string; type: string; g: WindowGrid; w?: number; h?: number }> = [
    { name: 'fixed 1×1', type: 'fixed_window', g: grid(1, 1, 'fixed') },
    { name: 'casement 1 sash', type: 'casement', g: grid(1, 1, 'sash') },
    { name: 'sliding 2-panel', type: 'sliding_window_2sash', g: grid(2, 1, 'sash') },
    { name: 'sliding 3-panel', type: 'sliding_window_3sash', g: grid(3, 1, 'sash'), w: 2100 },
    { name: 'sliding 4-panel', type: 'sliding_window_4sash', g: grid(4, 1, 'sash'), w: 2800 },
    {
      name: 'asymmetric 2-panel sliding',
      type: 'sliding_window_2sash',
      g: grid(2, 1, 'sash', [1, 2]),
      w: 1500,
      h: 1600,
    },
    {
      name: 'mixed fixed+sash (casement)',
      type: 'casement',
      g: {
        rows: 1,
        cols: 2,
        cells: [
          { id: '0-0', row: 0, col: 0, type: 'fixed' },
          { id: '0-1', row: 0, col: 1, type: 'sash' },
        ],
        colWidths: [1, 1],
        rowHeights: [1],
      } as WindowGrid,
    },
  ];

  it.each(cases)(
    '$name: design→persist→hydrate→reBOM→qualify→optimize share cut tuples',
    async ({ type, g, w = 1200, h = 1400 }) => {
      const pattern = patternFor(type, g);
      const emptyUnit = baseUnit(type, g, w, h);
      const isSliding = type.includes('sliding');
      const required = countRequiredProfilePieces(emptyUnit, pattern);

      // 1) Generated-design BOM (no saved components) — synthesises via grid generator
      const generatedBom = await calculator.calculateProfileBOM(emptyUnit, pattern, CALUMINIUM_PS_PACK);
      const generatedTuples = tuplesFromBomProfiles(generatedBom);
      expect(generatedTuples.length).toBe(required);

      // 2) Real design component generator (raw / design-level lengths)
      const { components: gridComponents } = generateComponentsFromGrid(
        emptyUnit,
        g,
        packProfiles,
        'caluminium-ps',
        CALUMINIUM_PS_PACK,
      );
      const designComponents = completeDesignComponents(gridComponents, emptyUnit, isSliding);
      const designPieceCount = designComponents.reduce((n, c) => n + c.cuttingLengths.length, 0);
      expect(designPieceCount).toBe(required);

      const designedUnit: WindowUnit = {
        ...emptyUnit,
        components: designComponents,
      };

      // 3) Persistence serializer / hydrator
      const hydrated = persistAndHydrate(designedUnit);
      expect(hydrated.components?.length).toBeGreaterThan(0);
      expect(hydrated.overallWidth).toBe(w);
      expect(hydrated.overallHeight).toBe(h);
      expect(hydrated.systemPackId).toBe('caluminium-ps');

      // 4) Saved/reloaded BOM
      const rebom = await calculator.calculateProfileBOM(hydrated, pattern, CALUMINIUM_PS_PACK);
      const rebomTuples = tuplesFromBomProfiles(rebom);
      expect(rebomTuples).toEqual(generatedTuples);

      // 5) Qualification consumes the same ledger
      const qualification = assessBOMQualification(hydrated, pattern, rebom, {
        identity,
        catalogueVersion: 'fixture-catalogue',
        ruleVersion: 'fixture-rules',
      });
      expect(qualification.status).toBe('qualified');
      expect(qualification.requiredPieceCount).toBe(required);
      expect(qualification.generatedPieceCount).toBe(required);
      expect(qualification.unplacedPieceCount).toBe(0);

      // 6) Optimizer physicalCut tuples match BOM physical multiset
      const componentTuples = tuplesFromComponents(hydrated);
      expect(componentTuples.length).toBe(required);
      expect(physicalMultiset(componentTuples)).toEqual(physicalMultiset(generatedTuples));

      const estimate = optimizeProjectEstimate([hydrated], [CALUMINIUM_PS_PACK]);
      expect(estimate.classification).toBe('estimate_only');
      expect(estimate.positions).toBe(1);
      expect(estimate.pieces).toBe(required);
      expect(estimate.groups.length).toBeGreaterThan(0);
      const placed = estimate.groups.reduce(
        (sum, group) => sum + group.result.stockUsed.reduce((n, bar) => n + bar.cuts.length, 0),
        0,
      );
      expect(placed).toBe(required);
    },
  );
});
