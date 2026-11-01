import { act, fireEvent, render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import type { CompleteBOM } from '@/lib/fabricator/PresetAwareBOMGenerator';
import { useWorkflowStore } from '@/store/workflowStore';
import type { OptimizationResult, WindowUnit } from '@/types/fabricator';

const mocks = vi.hoisted(() => ({
  solve: vi.fn(),
  solverConfig: vi.fn(),
  recordEvidence: vi.fn(),
  resolveAuthority: vi.fn(),
  onComplete: undefined as undefined | (() => Promise<void>),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/algorithms/adaptiveSolver', async () => {
  const actual = await vi.importActual<typeof import('@/algorithms/adaptiveSolver')>('@/algorithms/adaptiveSolver');
  return { ...actual, AdaptiveSolver: class { constructor(config: unknown) { mocks.solverConfig(config); } solve = mocks.solve; } };
});
vi.mock('@/lib/fabricator/commercial/recordOptimizationEvidence', () => ({
  recordOptimizationEvidence: (...args: unknown[]) => mocks.recordEvidence(...args),
}));
vi.mock('@/lib/fabricator/manufacturing/ManufacturingAuthorityResolver', () => ({
  resolveManufacturingAuthority: (...args: unknown[]) => mocks.resolveAuthority(...args),
}));
vi.mock('@/components/fabricator/cockpit/OptimizationCockpit', () => ({ OptimizationCockpit: ({ children, result }: { children: React.ReactNode; result: unknown }) => <><div data-testid="cockpit-result">{result ? 'result' : 'none'}</div>{children}</> }));
vi.mock('@/components/fabricator/OptimizationEqualizer', () => ({ OptimizationEqualizer: ({ onComplete, runLabel, runDisabled }: { onComplete: () => Promise<void>; runLabel?: string; runDisabled?: boolean }) => { mocks.onComplete = onComplete; return <button disabled={runDisabled} onClick={() => void onComplete()}>{runLabel ?? 'Optimize'}</button>; } }));
import { fingerprintBom } from '@/lib/fabricator/positionRelease';

import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import { OptimizationPage } from './OptimizationPage';

const pack = SYSTEM_PACKS.find(candidate => candidate.profiles?.length);
if (!pack) throw new Error('Test requires a system pack with profiles.');
const profile = pack.profiles[0];
const project = { id: 'position-1', updatedAt: new Date('2026-09-26'), systemPackId: pack.meta.id, components: [{ id: 'component-1', profile, quantity: 1, cuttingLengths: [1000] }] } as WindowUnit;
const result: OptimizationResult = { materialUsage: 1, wastePercentage: 0, estimatedProductionTime: 1, nestingEfficiency: 100, cuttingPlan: [{ profile, stockLength: 6000, totalWaste: 0, utilization: 100, cuts: [{ length: 1000, angle: 90, componentId: 'component-1', waste: 0 }] }], costBreakdown: { materialCost: 1, laborCost: 0, hardwareCost: 0, glazingCost: 0, totalCost: 1 } };
const qualifiedBom = {
  profiles: [{ profileCode: profile.id, cuttingLengths: [physicalCutForOccurrence(project.components[0], 0, profile, project.systemPackId).length],
    cutIds: [physicalCutForOccurrence(project.components[0], 0, profile, project.systemPackId).cutId ?? 'component-1:0'],
    angles: [physicalCutForOccurrence(project.components[0], 0, profile, project.systemPackId).angle] }],
  qualification: { status: 'qualified', identity: { ownerUserId: 'user-1' }, catalogueVersion: 'fixture-catalogue', ruleVersion: 'fixture-rules', requiredPieceCount: 1, generatedPieceCount: 1, unplacedPieceCount: 0, reasons: [] },
} as CompleteBOM;

const identity = { ownerUserId: 'user-1', projectId: 'project-a', positionId: 'position-1', source: 'v2' as const, revision: 1 };
const APPROVED_STOCK_MM = 6500;
const authority = {
  projectId: 'project-a', positionId: 'position-1', positionSource: 'v2', positionRevision: 1, authorityApprovalId: 'auth-1',
  system: { id: 'sys' }, systemPack: { id: pack.meta.id, revision: 3, evidenceStatus: 'approved', approvalId: 'a' },
  profiles: [{ role: 'frame', profileId: profile.id, stockLengthMm: APPROVED_STOCK_MM, evidenceStatus: 'approved', approvalId: 'b' }],
  cuttingRules: [], toleranceRule: {}, manufacturingSettings: { sawKerfMm: 4, trimCutMm: 10 },
};
const currentAck = () => ({
  identity, profileIds: ['owned-1'], metersByProfile: { 'owned-1': 1 }, reservedAt: new Date().toISOString(),
  availabilityOk: true, bomFingerprint: fingerprintBom(qualifiedBom), stockVersionByProfile: { 'owned-1': 1 },
});
const renderPage = () => render(<MemoryRouter initialEntries={['/project/project-a/position/position-1']}><Routes>
  <Route path="/project/:projectId/position/:poseId" element={<OptimizationPage />} />
  <Route path="*" element={<p>Unexpected navigation</p>} />
</Routes></MemoryRouter>);
const solvedResult = () => {
  const cut = physicalCutForOccurrence(project.components[0], 0, profile, project.systemPackId);
  return { ...result, wastePercentage: (APPROVED_STOCK_MM - cut.length) / APPROVED_STOCK_MM * 100, nestingEfficiency: cut.length / APPROVED_STOCK_MM * 100,
    cuttingPlan: [{ profile, stockLength: APPROVED_STOCK_MM, totalWaste: APPROVED_STOCK_MM - cut.length, utilization: cut.length / APPROVED_STOCK_MM * 100, cuts: [cut] }] };
};

describe('OptimizationPage fail-closed execution', () => {
  beforeEach(() => {
    mocks.solve.mockReset();
    mocks.solverConfig.mockReset();
    mocks.recordEvidence.mockReset();
    mocks.resolveAuthority.mockReset();
    mocks.resolveAuthority.mockResolvedValue(authority);
    mocks.recordEvidence.mockResolvedValue({ ok: true, positionId: 'position-1' });
    mocks.onComplete = undefined;
    useWorkflowStore.getState().clearWorkflow();
    useWorkflowStore.setState({
      currentProject: project,
      bom: qualifiedBom,
      workflowIdentity: identity,
      stockReservation: currentAck(),
    });
  });

  it('keeps a successful result available for PDF export instead of navigating away', async () => {
    mocks.solve.mockResolvedValue(solvedResult());
    renderPage();
    await waitFor(() => expect(mocks.onComplete).toBeDefined());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeEnabled());
    await act(async () => { await mocks.onComplete!(); });
    expect(screen.getByRole('button', { name: 'Download cut-list PDF' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue to Quote' })).toBeVisible();
    expect(screen.queryByText('Unexpected navigation')).toBeNull();
  });

  it('production run binds the solver job to the approved non-6000 stock and kerf/trim, with no default bar', async () => {
    mocks.solve.mockResolvedValue(solvedResult());
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeEnabled());
    expect(screen.getByTestId('approved-machining')).toHaveTextContent('Saw kerf: 4 mm');
    expect(screen.getByTestId('approved-stock-table')).toHaveTextContent(`${APPROVED_STOCK_MM} mm`);
    await act(async () => { await mocks.onComplete!(); });
    expect(mocks.solve).toHaveBeenCalledTimes(1);
    const [job, solverProfiles] = mocks.solve.mock.calls[0] as [import('@/algorithms/adaptiveSolver').CuttingJob, import('@/types/fabricator').Profile[]];
    expect(job.defaultStockLength).toBeUndefined();
    expect(job.stockByProfile).toEqual({ [profile.id]: { stockLengthMm: APPROVED_STOCK_MM } });
    expect(solverProfiles[0].specifications).toMatchObject({ stockLengthMm: APPROVED_STOCK_MM, sawKerf: 4, barEndTrim: 10 });
    expect(mocks.recordEvidence).toHaveBeenCalledTimes(1);
    expect(useWorkflowStore.getState().completedSteps.has('optimization')).toBe(true);
    expect(screen.getByTestId('approved-stock-table')).toHaveTextContent(`1 × ${APPROVED_STOCK_MM} mm`);
  });

  it('exposes no operator algorithm choice: selection stays rule-based inside the solver (FP-025A)', async () => {
    mocks.solve.mockResolvedValue(solvedResult());
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeEnabled());
    expect(screen.queryByLabelText('Solver algorithm')).toBeNull();
    expect(screen.getByTestId('algorithm-note')).toHaveTextContent('not operator-tunable');
    await act(async () => { await mocks.onComplete!(); });
    expect(mocks.solverConfig).toHaveBeenLastCalledWith(expect.not.objectContaining({ preferredAlgorithm: expect.anything() }));
  });

  it('changing the supported approved-stock control changes the solver input', async () => {
    mocks.resolveAuthority.mockResolvedValue({ ...authority, profiles: [authority.profiles[0], { ...authority.profiles[0], stockLengthMm: 6000 }] });
    mocks.solve.mockResolvedValue(solvedResult());
    renderPage();
    await waitFor(() => expect(screen.getByTestId('solver-input-issues')).toHaveTextContent('Choose the approved stock length'));
    expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(`Approved stock length for ${profile.id}`), { target: { value: '6000' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeEnabled());
    await act(async () => { await mocks.onComplete!(); });
    const [job] = mocks.solve.mock.calls[0] as [import('@/algorithms/adaptiveSolver').CuttingJob];
    expect(job.stockByProfile).toEqual({ [profile.id]: { stockLengthMm: 6000 } });
  });

  it.each([
    ['missing acknowledgement', () => ({ stockReservation: null }), 'Acknowledge owned stock availability'],
    ['stale revision', () => ({ stockReservation: { ...currentAck(), identity: { ...identity, revision: 0 } } }), 'revision R0'],
    ['stale BOM', () => ({ stockReservation: { ...currentAck(), bomFingerprint: 'stale' } }), 'BOM changed after stock was acknowledged'],
    ['shortage', () => ({ stockReservation: { ...currentAck(), availabilityOk: false } }), 'metres are short'],
  ])('blocks a production run on %s without solving', async (_name, patch, expected) => {
    useWorkflowStore.setState(patch() as never);
    renderPage();
    await waitFor(() => expect(mocks.onComplete).toBeDefined());
    await waitFor(() => expect(screen.getByTestId('stock-readiness')).toHaveTextContent(expected));
    expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeDisabled();
    await act(async () => { await mocks.onComplete!(); });
    expect(mocks.solve).not.toHaveBeenCalled();
    expect(mocks.recordEvidence).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(expected);
  });

  it('blocks a production run when the design profile has no approved stock length', async () => {
    mocks.resolveAuthority.mockResolvedValue({ ...authority, profiles: [{ ...authority.profiles[0], profileId: 'OTHER-PROFILE' }] });
    renderPage();
    await waitFor(() => expect(screen.getByTestId('solver-input-issues')).toHaveTextContent('no approved catalogue stock length'));
    expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeDisabled();
    await act(async () => { await mocks.onComplete!(); });
    expect(mocks.solve).not.toHaveBeenCalled();
  });

  it('inventory-free simulation solves but cannot unlock production or record evidence', async () => {
    useWorkflowStore.setState({ stockReservation: null });
    mocks.solve.mockResolvedValue(solvedResult());
    renderPage();
    await waitFor(() => expect(mocks.onComplete).toBeDefined());
    fireEvent.change(screen.getByLabelText('Optimization run mode'), { target: { value: 'simulation' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run inventory-free simulation' })).toBeEnabled());
    await act(async () => { await mocks.onComplete!(); });
    expect(mocks.solve).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('simulation-banner')).toHaveTextContent('not production or CNC authority');
    expect(screen.getByTestId('cockpit-result')).toHaveTextContent('result');
    expect(mocks.recordEvidence).not.toHaveBeenCalled();
    expect(useWorkflowStore.getState().optimizationResult).toBeNull();
    expect(useWorkflowStore.getState().completedSteps.has('optimization')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Continue to Quote' })).toBeNull();
    // Yilmaz export reads the store result only — a simulation can never become CNC input.
    expect(screen.queryByTestId('yilmaz-export-action-panel')).toBeNull();
  });

  it('prevents duplicate submissions and ignores a late result after the position changes', async () => {
    let resolve!: (value: OptimizationResult) => void;
    mocks.solve.mockReturnValue(new Promise<OptimizationResult>(done => { resolve = done; }));
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run production optimization' })).toBeEnabled());

    let first!: Promise<void>;
    await act(async () => {
      first = mocks.onComplete!();
      void mocks.onComplete!();
      await Promise.resolve();
    });
    expect(mocks.solve).toHaveBeenCalledTimes(1);

    await act(() => { useWorkflowStore.setState({ currentProject: { ...project, id: 'position-2' } }); return Promise.resolve(); });
    await act(async () => { resolve(result); await first; });
    expect(useWorkflowStore.getState().optimizationResult).toBeNull();
    expect(useWorkflowStore.getState().completedSteps.has('optimization')).toBe(false);
  });
});
