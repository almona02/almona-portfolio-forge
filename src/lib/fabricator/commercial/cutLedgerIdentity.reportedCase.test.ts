/**
 * Batch 1 regression — reported case FP-Y0RIPV / position 1 / revision R9
 * (CALUMINIUM PS, 2-sash sliding, 1500 × 1800, aluminum).
 *
 * The saved design has 22 components (23 physical cuts: the track component has
 * two). Several distinct components share one profile/role (4 frame sides,
 * 8 sash sides, 8 bead sides), so grouping by profile/role must keep each
 * component occurrence's identity (`componentId:index`) — equal dimensions and
 * counts are not enough. The reported failure was
 * `design ledger missing cut PS-6601-BEAD:glazing_bead:0:…` because the BOM
 * row reconstructed identities from the aggregate row ID.
 *
 * Component IDs and raw design lengths mirror the saved R9 position as read
 * from the database (read-only). Allowances (frame/sash 3, interlock/track 2,
 * bead 1) are applied exactly once by physicalCutForOccurrence.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdaptiveSolver } from '@/algorithms/adaptiveSolver';
import { CALUMINIUM_PS_PACK } from '@/data/profileSystems/egyptian/caluminium/ps';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import { mapPositionRowToWindowUnit } from '@/lib/supabase/fabricatorClientV2';
import {
  assessBomDesignParity,
  bomMatchesPhysicalDesign,
  completeDesignLedger,
  validateOptimizationReconciliation,
  validateStepTransition,
} from '@/lib/fabricator/validation/WorkflowValidator';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { Database } from '@/types/database';
import type { OptimizationResult, Profile, SystemPack, WindowComponent, WindowGrid, WindowUnit } from '@/types/fabricator';
import { recordOptimizationEvidence, requiredCutsFromBom } from './recordOptimizationEvidence';
import {
  validateOptimizationEvidencePayload,
  type EvidenceCutSpec,
  type OptimizationEvidencePayload,
} from './validateOptimizationEvidencePayload';

const rpc = vi.fn();
const resolveManufacturingAuthority = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));
vi.mock('@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver', () => ({
  resolveManufacturingAuthority: (...args: unknown[]) => resolveManufacturingAuthority(...args),
}));

type PositionRow = Database['public']['Tables']['fabricator_positions_v2']['Row'];

const POSITION_ID = '3ecb65c7-8897-4cce-8392-23c78441ff08';
const PACK_ID = 'caluminium-ps';
const KERF_MM = 3;
const TRIM_MM = 0;

function packProfile(id: string): Profile {
  const found = (CALUMINIUM_PS_PACK.profiles ?? []).find((p) => p.id === id);
  if (!found) throw new Error(`CALUMINIUM PS profile ${id} missing`);
  return found;
}

function component(id: string, type: string, profileId: string, raw: number[], angles: number[]): WindowComponent {
  return {
    id, type, profile: packProfile(profileId), quantity: 1,
    cuttingLengths: raw, angles, machiningOperations: [], glazingType: 'none', hardware: [],
  } as unknown as WindowComponent;
}

/** Saved R9 design: raw (pre-allowance) lengths, real component IDs. */
function savedR9Components(): WindowComponent[] {
  const stamp = '1793549220583';
  const out: WindowComponent[] = [
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
  cells: [
    { id: '0-0', row: 0, col: 0, type: 'sash' },
    { id: '0-1', row: 0, col: 1, type: 'sash' },
  ],
} as WindowGrid;

const pattern = {
  id: 'r9-sliding-2sash', name: 'sliding', type: 'sliding',
  openingMechanism: { type: 'sliding' }, gridSpec: grid, mullions: [], transoms: [],
} as unknown as EgyptianPattern;

function savedR9Unit(): WindowUnit {
  return {
    id: POSITION_ID, orderNumber: 'FP-Y0RIPV', posNumber: '1', type: 'sliding_window_2sash',
    overallWidth: 1500, overallHeight: 1800, systemPackId: PACK_ID, quantity: 1, revision: 9,
    grid, components: savedR9Components(), color: 'aluminum',
  } as unknown as WindowUnit;
}

/** positions_v2 row → hydrated unit, as the app reloads a saved revision. */
function persistAndHydrate(unit: WindowUnit): WindowUnit {
  const now = new Date().toISOString();
  const row = {
    id: unit.id, project_id: '00000000-0000-4000-8000-000000000099', owner_user_id: '00000000-0000-4000-8000-000000000001',
    order_number: unit.orderNumber ?? null, pos_number: unit.posNumber ?? '1', type: unit.type,
    overall_width_mm: unit.overallWidth, overall_height_mm: unit.overallHeight, color: unit.color ?? null,
    glazing: {}, system_pack_id: unit.systemPackId ?? null, status: 'design', quantity: unit.quantity ?? 1,
    position_meta: {}, meta: {}, optimization: null, grid: unit.grid as unknown as Record<string, unknown>,
    components: JSON.parse(JSON.stringify(unit.components ?? [])), hardware: {}, selected_preset: null,
    window_unit: JSON.parse(JSON.stringify({ ...unit, createdAt: now, updatedAt: now })),
    tier: 'standard', deterministic: true, constitutional_hash: null, audit_trail: [], last_validated_at: null,
    created_at: now, updated_at: now, qc_revision: unit.revision ?? 9,
  } as unknown as PositionRow;
  const hydrated = mapPositionRowToWindowUnit(row);
  if (!hydrated) throw new Error('Hydration returned null');
  return hydrated;
}

/** Expected physical ledger (allowance applied once): 23 pieces, 28871.5 mm. */
const EXPECTED_PHYSICAL: Record<string, Array<[number, number, number]>> = {
  // profile → [length, angle, count]
  'PS-6601-FRAME': [[1503, 45, 2], [1803, 45, 2]],
  'PS-6601-INTERLOCK': [[1607.7, 90, 1]],
  'PS-6601-SASH': [[655.85, 45, 4], [1608.7, 45, 4]],
  'PS-6601-BEAD': [[645.85, 45, 4], [1598.7, 45, 4]],
  'PS-6601-TRACK': [[1307.7, 90, 2]],
};

function expectedLedger(components: WindowComponent[]): EvidenceCutSpec[] {
  return components.flatMap((c) => c.cuttingLengths.map((_, index) => {
    const cut = physicalCutForOccurrence(c, index, c.profile, PACK_ID);
    return { cutId: cut.cutId!, profileId: c.profile.id, length: Number(cut.length.toFixed(3)), angle: cut.angle };
  }));
}

function solverProfiles(components: WindowComponent[]): Profile[] {
  return Array.from(new Map(components.map((c) => [c.profile.id, c.profile])).values());
}

async function solve(components: WindowComponent[]): Promise<OptimizationResult> {
  const profiles = solverProfiles(components);
  const solver = new AdaptiveSolver({ maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } });
  return solver.solve({ components, profiles, defaultStockLength: 6000, systemPackId: PACK_ID }, profiles);
}

function payloadFor(result: OptimizationResult, requiredCuts: EvidenceCutSpec[]): OptimizationEvidencePayload {
  return {
    schema: 'almona.optimization-result', schemaVersion: 2,
    materialUsage: result.materialUsage, wastePercentage: result.wastePercentage, nestingEfficiency: result.nestingEfficiency,
    cutCount: result.cuttingPlan.reduce((n, plan) => n + plan.cuts.length, 0),
    kerfMm: KERF_MM, trimMm: TRIM_MM, requiredCuts,
    // Strip plan-level kerf/trim overrides (payload machining settings are authoritative).
    cuttingPlan: result.cuttingPlan.map((plan) => ({
      stockLength: plan.stockLength, profile: { id: plan.profile.id },
      cuts: plan.cuts.map((cut) => ({ cutId: cut.cutId, componentId: cut.componentId, length: cut.length, angle: cut.angle })),
    })),
  };
}

function countCuts(payload: OptimizationEvidencePayload): number {
  return payload.cuttingPlan.reduce((n, plan) => n + (plan.cuts?.length ?? 0), 0);
}

function authority() {
  return {
    systemPack: { id: PACK_ID, revision: 3 },
    cuttingRules: [{ approvalId: 'b2000000-0000-4000-8000-000000000020', ruleId: 'cut-a', revision: 1, evidenceStatus: 'approved', deductions: {}, allowances: {}, applicability: {} }],
    authorityApprovalId: 'auth-1',
    manufacturingSettings: { sawKerfMm: KERF_MM, trimCutMm: TRIM_MM },
    profiles: ['PS-6601-FRAME', 'PS-6601-SASH', 'PS-6601-INTERLOCK', 'PS-6601-TRACK', 'PS-6601-BEAD'].map((profileId) => ({
      profileId, stockLengthMm: 6000, evidenceStatus: 'approved', approvalId: `b1-${profileId}`,
    })),
  };
}

describe('Batch 1 — reported case FP-Y0RIPV pos 1 R9: cut-ledger identity', () => {
  const calculator = new ProfileBOMCalculator();
  const pack = CALUMINIUM_PS_PACK as unknown as SystemPack;

  it('saved design reloads with 22 components / 23 cuts and the expected physical ledger', () => {
    const hydrated = persistAndHydrate(savedR9Unit());
    expect(hydrated.components).toHaveLength(22);
    expect(hydrated.components.map((c) => c.id)).toEqual(savedR9Components().map((c) => c.id));
    const completed = completeDesignLedger(hydrated, pack);
    // Track already saved → completion is idempotent (no second synthetic track).
    expect(completed.map((c) => c.id)).toEqual(hydrated.components.map((c) => c.id));

    const ledger = expectedLedger(completed);
    expect(ledger).toHaveLength(23);
    expect(new Set(ledger.map((c) => c.cutId)).size).toBe(23);
    expect(Number(ledger.reduce((sum, c) => sum + c.length, 0).toFixed(1))).toBe(28871.5);
    for (const [profileId, groups] of Object.entries(EXPECTED_PHYSICAL)) {
      for (const [length, angle, count] of groups) {
        expect(ledger.filter((c) => c.profileId === profileId && c.length === length && c.angle === angle)).toHaveLength(count);
      }
    }
  });

  it('grouped BOM rows keep every component occurrence identity and survive JSON reload', async () => {
    const hydrated = persistAndHydrate(savedR9Unit());
    const rows = await calculator.calculateProfileBOM(hydrated, pattern, pack);
    const cuts = rows.reduce((n, row) => n + row.cuttingLengths.length, 0);
    expect(cuts).toBe(23);
    // ≥2 distinct components grouped under one profile/role.
    const frameRow = rows.find((row) => row.profileCode === 'PS-6601-FRAME')!;
    expect(frameRow.cutIds).toHaveLength(4);
    expect(new Set(frameRow.cutIds!.map((id) => id.replace(/:\d+$/, ''))).size).toBe(4);
    for (const row of rows) {
      expect(row.cutIds).toHaveLength(row.cuttingLengths.length);
      expect(row.cutIds).toHaveLength(row.angles.length);
    }

    // Identity + profile + length + angle multiset equals the design's physical ledger.
    const key = (c: EvidenceCutSpec) => JSON.stringify([c.cutId, c.profileId, c.length.toFixed(3), c.angle]);
    const bomLedger = requiredCutsFromBom({ profiles: rows } as CompleteBOM);
    expect(bomLedger.ok).toBe(true);
    if (!bomLedger.ok) return;
    expect(bomLedger.cuts.map(key).sort()).toEqual(expectedLedger(hydrated.components).map(key).sort());
    expect(bomLedger.cuts.find((c) => c.cutId === 'bead_0-0_top:0')).toEqual({ cutId: 'bead_0-0_top:0', profileId: 'PS-6601-BEAD', length: 645.85, angle: 45 });
    expect(bomLedger.cuts.some((c) => c.cutId.startsWith('PS-6601-BEAD:glazing_bead:'))).toBe(false);

    // Persisted BOM (workflow store / review snapshot JSON) keeps identities.
    const reloaded = JSON.parse(JSON.stringify({ profiles: rows })) as CompleteBOM;
    expect(bomMatchesPhysicalDesign(reloaded, hydrated, pack)).toBe(true);
    expect(assessBomDesignParity(reloaded, hydrated, pack)).toEqual({ ok: true });
  });

  it('a BOM cached before identities existed is rejected and routed to a rebuild, never renamed', async () => {
    const hydrated = persistAndHydrate(savedR9Unit());
    const rows = await calculator.calculateProfileBOM(hydrated, pattern, pack);
    const legacy = { profiles: rows.map(({ cutIds: _dropped, ...row }) => row) } as CompleteBOM;
    const parity = assessBomDesignParity(legacy, hydrated, pack);
    expect(parity.ok).toBe(false);
    if (parity.ok) return;
    expect(parity.code).toBe('missing_identity');
    expect(parity.message).toMatch(/Rebuild the BOM from the saved design/);
    expect(requiredCutsFromBom(legacy).ok).toBe(false);
    const gate = validateStepTransition(
      { measurementData: null, currentProject: hydrated, bom: { ...legacy, qualification: { status: 'qualified', reasons: [] } } as never, optimizationResult: null, systemPack: pack },
      'optimization',
    );
    expect(gate.errors.map((e) => e.code)).toContain('BOM_CUT_IDENTITY_MISSING');
    // Rebuilding from the saved design restores a passing ledger.
    const rebuilt = await calculator.calculateProfileBOM(hydrated, pattern, pack);
    expect(assessBomDesignParity({ profiles: rebuilt } as CompleteBOM, hydrated, pack)).toEqual({ ok: true });
  });

  it('solver places all 23 occurrences exactly once and the BOM ledger validates the placement', async () => {
    const hydrated = persistAndHydrate(savedR9Unit());
    const components = completeDesignLedger(hydrated, pack);
    const result = await solve(components);
    expect(validateOptimizationReconciliation(result, { ...hydrated, components }).valid).toBe(true);
    const placedIds = result.cuttingPlan.flatMap((plan) => plan.cuts.map((cut) => cut.cutId));
    expect(placedIds).toHaveLength(23);
    expect(new Set(placedIds).size).toBe(23);
    expect([...placedIds].sort()).toEqual(expectedLedger(components).map((c) => c.cutId).sort());

    const rows = await calculator.calculateProfileBOM(hydrated, pattern, pack);
    const ledger = requiredCutsFromBom({ profiles: rows } as CompleteBOM);
    if (!ledger.ok) throw new Error(ledger.error);
    const payload = payloadFor(result, ledger.cuts);
    const validation = validateOptimizationEvidencePayload(payload, countCuts(payload));
    expect(validation).toMatchObject({ ok: true, serverCutCount: 23 });
  });

  it('rejects deliberate identity, profile, length, angle and quantity corruption with named diagnostics', async () => {
    const hydrated = persistAndHydrate(savedR9Unit());
    const components = completeDesignLedger(hydrated, pack);
    const result = await solve(components);
    const rows = await calculator.calculateProfileBOM(hydrated, pattern, pack);
    const ledger = requiredCutsFromBom({ profiles: rows } as CompleteBOM);
    if (!ledger.ok) throw new Error(ledger.error);
    const good = payloadFor(result, ledger.cuts);
    const clone = () => JSON.parse(JSON.stringify(good)) as OptimizationEvidencePayload;
    // Bead pieces span more than one 6000 mm bar — pick the bar holding the named cut.
    const beadPlan = (cutId = 'bead_0-0_top:0') => {
      const p = clone();
      const plan = p.cuttingPlan.find((pl) => pl.cuts?.some((c) => c.cutId === cutId))!;
      expect(plan.profile?.id).toBe('PS-6601-BEAD');
      return { p, plan };
    };
    const run = (p: OptimizationEvidencePayload) => validateOptimizationEvidencePayload(p, countCuts(p));

    // Identity: row-derived ID in place of the component occurrence (the reported bug shape).
    {
      const { p, plan } = beadPlan();
      const cut = plan.cuts!.find((c) => c.cutId === 'bead_0-0_top:0')!;
      cut.cutId = 'PS-6601-BEAD:glazing_bead:0';
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/^design ledger missing cut bead_0-0_top:0 \(PS-6601-BEAD 645\.850 mm @ 45°\)/);
    }
    // Identity: duplicate occurrence with identical dimensions (bead_0-0_top placed twice, bead_0-1_top never).
    {
      const { p, plan } = beadPlan('bead_0-1_top:0');
      const twin = plan.cuts!.find((c) => c.cutId === 'bead_0-1_top:0')!;
      twin.cutId = 'bead_0-0_top:0';
      twin.componentId = 'bead_0-0_top';
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/duplicate occurrence bead_0-0_top:0 \(placed 2, required 1\)/);
    }
    // Missing identity on a placed cut.
    {
      const { p, plan } = beadPlan();
      const cut = plan.cuts![0];
      delete cut.cutId;
      delete cut.componentId;
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/cutId required \(placed cut has no occurrence identity\)/);
    }
    // Profile substitution: bead cut placed on the sash bar.
    {
      const p = clone();
      const bead = p.cuttingPlan.find((pl) => pl.cuts?.some((c) => c.cutId === 'bead_0-0_left:0'))!;
      const moved = bead.cuts!.find((c) => c.cutId === 'bead_0-0_left:0')!;
      bead.cuts = bead.cuts!.filter((c) => c !== moved);
      // Placed on its own sash bar so bar accounting passes and only the profile is wrong.
      p.cuttingPlan.push({ stockLength: 6000, profile: { id: 'PS-6601-SASH' }, cuts: [moved] });
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/substituted profile for cut bead_0-0_left:0 \(required PS-6601-BEAD, placed PS-6601-SASH\)/);
    }
    // Length: raw design length placed instead of the allowance-applied physical length.
    {
      const { p, plan } = beadPlan();
      plan.cuts!.find((c) => c.cutId === 'bead_0-0_top:0')!.length = 644.85;
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/wrongly sized cut bead_0-0_top:0 \(required 645\.850 mm, placed 644\.850 mm\)/);
    }
    // Angle.
    {
      const { p, plan } = beadPlan();
      plan.cuts!.find((c) => c.cutId === 'bead_0-0_top:0')!.angle = 90;
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/wrong angle for cut bead_0-0_top:0 \(required 45°, placed 90°\)/);
    }
    // Quantity: one occurrence dropped / one extra placed.
    {
      const { p, plan } = beadPlan();
      plan.cuts!.pop();
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/cut count mismatch \(required 23, placed 22\)/);
    }
    {
      const { p, plan } = beadPlan();
      plan.cuts!.push({ ...plan.cuts![0], cutId: 'bead_0-0_top:1', componentId: 'bead_0-0_top' });
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/cut count mismatch \(required 23, placed 24\)/);
    }
    // Unexpected cut with equal count (a legitimate id swapped for an unknown one).
    {
      const { p, plan } = beadPlan('bead_0-1_right:0');
      const cut = plan.cuts!.find((c) => c.cutId === 'bead_0-1_right:0')!;
      cut.cutId = 'bead_0-2_right:0';
      const res = run(p);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(/missing cut bead_0-1_right:0/);
    }
    // Control: unmodified payload still passes.
    expect(run(clone()).ok).toBe(true);
  });

  describe('authenticated evidence path (controlled fixture)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      resolveManufacturingAuthority.mockResolvedValue(authority());
    });

    it('records when the server-derived ledger carries the same identities and physical lengths', async () => {
      const hydrated = persistAndHydrate(savedR9Unit());
      const components = completeDesignLedger(hydrated, pack);
      const result = await solve(components);
      const rows = await calculator.calculateProfileBOM(hydrated, pattern, pack);
      const serverLedger = expectedLedger(components);
      rpc.mockImplementation((name: string) => name === 'derive_required_cuts_from_position'
        ? Promise.resolve({ data: serverLedger, error: null })
        : Promise.resolve({ data: POSITION_ID, error: null }));

      const recorded = await recordOptimizationEvidence({
        positionId: POSITION_ID, expectedRevision: 9, designRevision: 9,
        bom: { profiles: rows } as CompleteBOM, optimizationResult: result,
      });
      expect(recorded).toEqual({ ok: true, positionId: POSITION_ID });
      const call = rpc.mock.calls.find(([name]) => name === 'record_fabricator_optimization_evidence');
      expect(call).toBeDefined();
      const args = call![1] as { p_cut_count: number; p_expected_revision: number; p_evidence_payload: OptimizationEvidencePayload };
      expect(args.p_cut_count).toBe(23);
      expect(args.p_expected_revision).toBe(9);
      expect(args.p_evidence_payload.requiredCuts!.map((c) => c.cutId).sort()).toEqual(serverLedger.map((c) => c.cutId).sort());
    });

    it('fails closed when the server ledger returns raw design lengths (allowance not applied)', async () => {
      // Documents the server contract gap: derive_required_cuts_from_position (migration
      // 20261011052158) emits saved raw cuttingLengths while placements carry the catalogue
      // cutting allowance once. This must be rejected, not silently accepted or renamed.
      const hydrated = persistAndHydrate(savedR9Unit());
      const components = completeDesignLedger(hydrated, pack);
      const result = await solve(components);
      const rows = await calculator.calculateProfileBOM(hydrated, pattern, pack);
      const rawServerLedger = components.flatMap((c) => c.cuttingLengths.map((length, index) => ({
        cutId: `${c.id}:${index}`, profileId: c.profile.id, length, angle: c.angles?.[index] ?? 0,
      })));
      rpc.mockImplementation((name: string) => name === 'derive_required_cuts_from_position'
        ? Promise.resolve({ data: rawServerLedger, error: null })
        : Promise.resolve({ data: POSITION_ID, error: null }));

      const recorded = await recordOptimizationEvidence({
        positionId: POSITION_ID, expectedRevision: 9, designRevision: 9,
        bom: { profiles: rows } as CompleteBOM, optimizationResult: result,
      });
      expect(recorded.ok).toBe(false);
      if (recorded.ok) return;
      expect(recorded.error).toMatch(/^Server design ledger wrongly sized cut .* \(required 1[58]00\.000 mm, placed 1[58]03\.000 mm\)/);
      expect(rpc).not.toHaveBeenCalledWith('record_fabricator_optimization_evidence', expect.anything());
    });

    it('fails closed when the server ledger expands quantity copies the solver did not place', async () => {
      const hydrated = persistAndHydrate(savedR9Unit());
      const components = completeDesignLedger(hydrated, pack);
      const result = await solve(components);
      const rows = await calculator.calculateProfileBOM(hydrated, pattern, pack);
      const ledger = expectedLedger(components);
      rpc.mockImplementation((name: string) => name === 'derive_required_cuts_from_position'
        ? Promise.resolve({ data: [...ledger, ...ledger], error: null })
        : Promise.resolve({ data: POSITION_ID, error: null }));
      const recorded = await recordOptimizationEvidence({
        positionId: POSITION_ID, expectedRevision: 9, designRevision: 9,
        bom: { profiles: rows } as CompleteBOM, optimizationResult: result,
      });
      expect(recorded.ok).toBe(false);
      if (!recorded.ok) expect(recorded.error).toMatch(/cut count mismatch \(required 46, placed 23\)/);
    });
  });
});
