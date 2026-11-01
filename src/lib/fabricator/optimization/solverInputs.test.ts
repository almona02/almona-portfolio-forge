/**
 * Batch 2 — approved solver inputs, stock readiness, remnant eligibility.
 * AICS-001 Tier 3: no default bar, no catalogue-inferred availability.
 */
import { describe, expect, it } from 'vitest';
import { AdaptiveSolver, StockBindingError } from '@/algorithms/adaptiveSolver';
import { fingerprintBom } from '@/lib/fabricator/positionRelease';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import type { StockReservationEvidence, WorkflowIdentity } from '@/store/workflowStore';
import type { Profile, WindowComponent } from '@/types/fabricator';
import {
  approvedStockOptions,
  assessStockReadiness,
  barsByProfile,
  filterEligibleRemnants,
  resolveApprovedSolverInputs,
} from './solverInputs';

const frame: Profile = {
  id: 'PS-6601-FRAME', name: 'Frame', material: 'aluminum', width: 97.15, color: '#fff', costPerMeter: 10,
  cuttingAllowance: 3, stockQuantity: 0, minStockLevel: 0, supplier: 'x', profileRole: 'frame',
} as Profile;
const sash: Profile = { ...frame, id: 'PS-6601-SASH', name: 'Sash', profileRole: 'sash' } as Profile;

const authority = {
  manufacturingSettings: { sawKerfMm: 4, trimCutMm: 10 },
  profiles: [
    { profileId: 'PS-6601-FRAME', stockLengthMm: 6500, evidenceStatus: 'approved' },
    { profileId: 'PS-6601-SASH', stockLengthMm: 6000, evidenceStatus: 'approved' },
    { profileId: 'PS-6601-SASH', stockLengthMm: 6500, evidenceStatus: 'approved' },
    { profileId: 'PS-6601-SASH', stockLengthMm: 7000, evidenceStatus: 'pending' },
  ],
};

const identity: WorkflowIdentity = { ownerUserId: 'owner', projectId: 'project', positionId: 'pose', source: 'v2', revision: 9 };
const bom = { profiles: [{ id: 'PS-6601-FRAME:frame', profileCode: 'PS-6601-FRAME', cuttingLengths: [1503, 1803], cutIds: ['a:0', 'b:0'], angles: [45, 45], length: 3306, quantity: 1 }] } as unknown as CompleteBOM;
const ack = (overrides: Partial<StockReservationEvidence> = {}): StockReservationEvidence => ({
  identity, profileIds: ['owned-1'], metersByProfile: { 'owned-1': 3.306 }, reservedAt: new Date().toISOString(),
  availabilityOk: true, bomFingerprint: fingerprintBom(bom), stockVersionByProfile: { 'owned-1': 1 }, ...overrides,
});

describe('resolveApprovedSolverInputs', () => {
  it('binds approved kerf/trim and a non-6000 stock length to each profile (no default bar)', () => {
    const resolved = resolveApprovedSolverInputs([frame], authority);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.kerfMm).toBe(4);
    expect(resolved.trimMm).toBe(10);
    expect(resolved.stockByProfile).toEqual({ 'PS-6601-FRAME': { stockLengthMm: 6500 } });
    expect(resolved.profiles[0].specifications).toMatchObject({ stockLengthMm: 6500, sawKerf: 4, barEndTrim: 10 });
    expect(resolved.profiles[0].barLength).toBe(6500);
    // Allowance is untouched: it is applied once by physicalCutForOccurrence, not here.
    expect(resolved.profiles[0].cuttingAllowance).toBe(3);
  });

  it('requires an explicit choice when several stock lengths are approved and rejects unapproved picks', () => {
    const unresolved = resolveApprovedSolverInputs([sash], authority);
    expect(unresolved.ok).toBe(false);
    if (unresolved.ok) return;
    expect(unresolved.issues).toEqual([expect.objectContaining({ code: 'STOCK_SELECTION_REQUIRED', profileId: 'PS-6601-SASH', options: [6000, 6500] })]);
    expect(approvedStockOptions(authority, 'PS-6601-SASH')).toEqual([6000, 6500]); // pending 7000 excluded

    const chosen = resolveApprovedSolverInputs([sash], authority, { 'PS-6601-SASH': 6500 });
    expect(chosen.ok && chosen.stockByProfile['PS-6601-SASH'].stockLengthMm).toBe(6500);

    const invented = resolveApprovedSolverInputs([sash], authority, { 'PS-6601-SASH': 7000 });
    expect(invented.ok).toBe(false);
    if (!invented.ok) expect(invented.issues[0]).toMatchObject({ code: 'STOCK_NOT_APPROVED', profileId: 'PS-6601-SASH' });
  });

  it('reports unapproved profiles and missing machining settings as separate issues', () => {
    const bead = { ...frame, id: 'PS-6601-BEAD' } as Profile;
    const resolved = resolveApprovedSolverInputs([frame, bead], { ...authority, manufacturingSettings: null });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.issues.map((issue) => issue.code)).toEqual(['SETTINGS_MISSING', 'PROFILE_NOT_APPROVED']);
    expect(resolved.issues[1].profileId).toBe('PS-6601-BEAD');
  });

  it('carries finite available bar counts into the binding', () => {
    const resolved = resolveApprovedSolverInputs([frame], authority, {}, { 'PS-6601-FRAME': 2 });
    expect(resolved.ok && resolved.stockByProfile['PS-6601-FRAME']).toEqual({ stockLengthMm: 6500, availableBars: 2 });
  });
});

describe('AdaptiveSolver with approved stock binding', () => {
  const solver = () => new AdaptiveSolver({ maxSolvingTime: 30, complexityThresholds: { simple: 50, medium: 500 } });
  const components = (lengths: number[]): WindowComponent[] => lengths.map((length, index) => ({
    id: `c${index}`, type: 'frame', profile: frame, quantity: 1, cuttingLengths: [length], angles: [45],
  } as unknown as WindowComponent));

  it('uses the bound stock length instead of 6000 and packs with the approved kerf/trim', async () => {
    const resolved = resolveApprovedSolverInputs([frame], authority);
    if (!resolved.ok) throw new Error('fixture');
    const result = await solver().solve(
      { components: components([3000, 3000]), profiles: resolved.profiles, stockByProfile: resolved.stockByProfile },
      resolved.profiles,
    );
    // 3003 + 3003 + 2×4 kerf + 2×10 trim = 6034 → fits one 6500 bar, would not fit 6000.
    expect(result.cuttingPlan).toHaveLength(1);
    expect(result.cuttingPlan[0].stockLength).toBe(6500);
    expect(result.cuttingPlan[0].cuts.map((cut) => cut.length)).toEqual([3003, 3003]);
  });

  it('kerf/trim variation changes bar count (same cuts, tighter approved settings)', async () => {
    const loose = resolveApprovedSolverInputs([frame], { ...authority, manufacturingSettings: { sawKerfMm: 0, trimCutMm: 0 }, profiles: [{ profileId: 'PS-6601-FRAME', stockLengthMm: 6010, evidenceStatus: 'approved' }] });
    const tight = resolveApprovedSolverInputs([frame], { ...authority, manufacturingSettings: { sawKerfMm: 4, trimCutMm: 10 }, profiles: [{ profileId: 'PS-6601-FRAME', stockLengthMm: 6010, evidenceStatus: 'approved' }] });
    if (!loose.ok || !tight.ok) throw new Error('fixture');
    const job = (r: typeof loose) => ({ components: components([3000, 3000]), profiles: r.profiles, stockByProfile: r.stockByProfile });
    expect((await solver().solve(job(loose), loose.profiles)).cuttingPlan).toHaveLength(1);
    expect((await solver().solve(job(tight), tight.profiles)).cuttingPlan).toHaveLength(2);
  });

  it('fails closed when a profile has no approved binding (no silent default bar)', async () => {
    const resolved = resolveApprovedSolverInputs([frame], authority);
    if (!resolved.ok) throw new Error('fixture');
    const sashComponent = { id: 's0', type: 'sash', profile: sash, quantity: 1, cuttingLengths: [1000], angles: [45] } as unknown as WindowComponent;
    await expect(solver().solve(
      { components: [...components([1000]), sashComponent], profiles: [...resolved.profiles, sash], stockByProfile: resolved.stockByProfile },
      [...resolved.profiles, sash],
    )).rejects.toBeInstanceOf(StockBindingError);
  });

  it('fails closed on insufficient finite stock (bars needed > bars available)', async () => {
    const resolved = resolveApprovedSolverInputs([frame], authority, {}, { 'PS-6601-FRAME': 1 });
    if (!resolved.ok) throw new Error('fixture');
    await expect(solver().solve(
      { components: components([3000, 3000, 3000]), profiles: resolved.profiles, stockByProfile: resolved.stockByProfile },
      resolved.profiles,
    )).rejects.toThrow(/Insufficient stock for PS-6601-FRAME: plan needs 2 × 6500 mm bars, 1 available/);
    const enough = resolveApprovedSolverInputs([frame], authority, {}, { 'PS-6601-FRAME': 2 });
    if (!enough.ok) throw new Error('fixture');
    const result = await solver().solve({ components: components([3000, 3000, 3000]), profiles: enough.profiles, stockByProfile: enough.stockByProfile }, enough.profiles);
    expect(barsByProfile(result.cuttingPlan)).toEqual({ 'PS-6601-FRAME': { bars: 2, stockLengthMm: 6500 } });
  });
});

describe('assessStockReadiness', () => {
  it('is ready only for a current, BOM-bound, mapped acknowledgement without shortage', () => {
    expect(assessStockReadiness({ stockReservation: ack(), workflowIdentity: identity, bom })).toEqual({ ready: true, issues: [] });
  });

  it('separates missing ack, stale revision, stale BOM, missing mapping and shortage', () => {
    const codes = (r: ReturnType<typeof assessStockReadiness>) => r.issues.map((issue) => issue.code);
    expect(codes(assessStockReadiness({ stockReservation: null, workflowIdentity: identity, bom }))).toEqual(['STOCK_NOT_ACKNOWLEDGED']);
    expect(codes(assessStockReadiness({ stockReservation: ack(), workflowIdentity: { ...identity, revision: 10 }, bom }))).toEqual(['STOCK_ACK_STALE_REVISION']);
    const changedBom = { profiles: [{ ...bom.profiles[0], cuttingLengths: [1503, 1803, 700] }] } as unknown as CompleteBOM;
    expect(codes(assessStockReadiness({ stockReservation: ack(), workflowIdentity: identity, bom: changedBom }))).toEqual(['STOCK_ACK_STALE_BOM']);
    expect(codes(assessStockReadiness({ stockReservation: ack({ profileIds: [], metersByProfile: {} }), workflowIdentity: identity, bom }))).toEqual(['STOCK_MAPPING_MISSING']);
    expect(codes(assessStockReadiness({ stockReservation: ack({ availabilityOk: false }), workflowIdentity: identity, bom }))).toEqual(['STOCK_SHORTAGE']);
    // Multiple failures are all reported, not collapsed into one.
    expect(codes(assessStockReadiness({ stockReservation: ack({ availabilityOk: false }), workflowIdentity: { ...identity, revision: 10 }, bom }))).toEqual(['STOCK_ACK_STALE_REVISION', 'STOCK_SHORTAGE']);
  });
});

describe('filterEligibleRemnants', () => {
  const now = new Date('2026-11-01T12:00:00Z');
  const remnant = (id: string, overrides: Partial<Parameters<typeof filterEligibleRemnants>[0][number]> = {}) => ({
    id, profileId: 'PS-6601-FRAME', lengthMm: 1200, createdAt: '2026-10-20T00:00:00Z', status: 'available', ...overrides,
  });

  it('excludes expired, too old, too short and non-available remnants with reasons', () => {
    const result = filterEligibleRemnants([
      remnant('ok'),
      remnant('expired', { expirationDate: '2026-10-31T00:00:00Z' }),
      remnant('old', { createdAt: '2026-01-01T00:00:00Z' }),
      remnant('short', { lengthMm: 200 }),
      remnant('used', { status: 'used' }),
    ], { minRemnantLengthMm: 300, maxRemnantAgeDays: 90, now });
    expect(result.eligible.map((r) => r.id)).toEqual(['ok']);
    expect(result.excluded.map((e) => [e.remnant.id, e.reason])).toEqual([
      ['expired', 'expired'], ['old', 'too_old'], ['short', 'too_short'], ['used', 'not_available'],
    ]);
  });
});
