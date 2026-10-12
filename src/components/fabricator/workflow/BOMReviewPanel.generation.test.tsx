import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WindowUnit } from '@/types/fabricator';
import { useWorkflowStore, type WorkflowIdentity } from '@/store/workflowStore';
import { BOMReviewPanel } from './BOMReviewPanel';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(), save: vi.fn(), read: vi.fn(), authority: vi.fn(), generate: vi.fn(),
  packs: [{ meta: { id: 'test-pack' } }],
}));
vi.mock('@/hooks/fabricator/useEngineeringSystemPacks', () => ({ useEngineeringSystemPacks: () => mocks.packs }));
vi.mock('@/lib/fabricator/bom/resolveEstimatePattern', () => ({ resolveEstimatePattern: () => ({ id: 'test-pattern' }) }));
vi.mock('@/lib/fabricator/bom/ProfileBOMCalculator', () => ({ ProfileBOMCalculator: class {
  resolvePhysicalDesignComponents(...args: unknown[]) { return mocks.resolve(...args); }
} }));
vi.mock('@/lib/fabricator/PresetAwareBOMGenerator', () => ({ PresetAwareBOMGenerator: class {
  generateCompleteBOM(...args: unknown[]) { return mocks.generate(...args); }
} }));
vi.mock('@/lib/supabase/fabricatorClientV2', () => ({ fabricatorClientV2: {
  savePose: mocks.save, getAuthoritativePosition: mocks.read,
} }));
vi.mock('@/lib/fabricator/bom/approvedBOMContext', () => ({ approvedBOMContext: mocks.authority }));
vi.mock('./ManufacturingApprovalPanel', () => ({ ManufacturingApprovalPanel: () => null }));

const identity: WorkflowIdentity = { ownerUserId: 'owner', projectId: 'project', positionId: 'pose', source: 'v2', revision: 4 };
const position = { id: 'pose', projectId: 'project', type: 'sliding', systemPackId: 'test-pack',
  overallWidth: 1200, overallHeight: 1400, grid: { rows: 1, cols: 1, cells: [{ id: 'cell', row: 0, col: 0, type: 'sash' }] }, components: [{ id: 'saved-cut' }],
} as unknown as WindowUnit;
function mount() {
  return render(<MemoryRouter initialEntries={['/projects/project/positions/pose/bom']}><Routes>
    <Route path="/projects/:projectId/positions/:poseId/bom" element={<BOMReviewPanel />} />
  </Routes></MemoryRouter>);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  useWorkflowStore.getState().clearWorkflow();
  useWorkflowStore.getState().hydrateAuthoritativePosition(identity, position);
  mocks.resolve.mockResolvedValue(position.components);
  mocks.save.mockResolvedValue(undefined);
  mocks.read.mockResolvedValue({ identity, position });
  mocks.authority.mockResolvedValue({ identity, catalogueVersion: 'fresh', ruleVersion: 'a'.repeat(64) });
  // Stop before presentation; these tests check the panel's actual async wiring.
  mocks.generate.mockRejectedValue(new Error('presentation sentinel'));
});
afterEach(cleanup);

describe('BOM panel authoritative generation', () => {
  it('does not bump an unchanged saved revision before checking its approved authority', async () => {
    mount();
    await screen.findByText('presentation sentinel');
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.authority).toHaveBeenCalledWith(position, identity, mocks.packs[0]);
    expect(mocks.generate.mock.calls[0][0]).toBe(position);
    expect(useWorkflowStore.getState().bom).toBeNull();
  });

  it('stops visibly after a failed dirty save without qualifying or publishing', async () => {
    useWorkflowStore.getState().setDesignData({ ...position, overallWidth: 1300 });
    mocks.save.mockRejectedValueOnce(new Error('save denied'));
    mount();
    await screen.findByText('save denied');
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.authority).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(useWorkflowStore.getState().bom).toBeNull();
  });

  it('qualifies the acknowledged revision and server components after materializing cuts', async () => {
    mocks.resolve.mockResolvedValue([{ id: 'local-materialized' }]);
    const saved = { ...position, components: [{ id: 'server-materialized' }] } as unknown as WindowUnit;
    const savedIdentity = { ...identity, revision: 5 };
    mocks.read.mockResolvedValue({ identity: savedIdentity, position: saved });
    mount();
    await screen.findByText('presentation sentinel');
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.authority).toHaveBeenCalledWith(saved, savedIdentity, mocks.packs[0]);
    expect(mocks.generate.mock.calls[0][0]).toBe(saved);
  });

  it('publishes a freshly qualified BOM bound to the acknowledged server revision', async () => {
    mocks.resolve.mockResolvedValue([{ id: 'materialized' }]);
    const savedIdentity = { ...identity, revision: 5 };
    const saved = { ...position, components: [{ id: 'server-materialized' }] } as unknown as WindowUnit;
    mocks.read.mockResolvedValue({ identity: savedIdentity, position: saved });
    const bom = {
      profiles: [], hardware: [], glazing: [], accessories: [], assemblySequence: [], confidence: 1,
      cost: { materialCost: 0, hardwareCost: 0, glazingCost: 0, accessoriesCost: 0, laborCost: 0, totalCost: 0 },
      metadata: { checksum: 'acknowledged-test', generationTimestamp: '2026-10-11', patternUsed: 'test', systemPackUsed: 'test-pack' },
      qualification: { status: 'qualified', identity: savedIdentity, catalogueVersion: 'fresh', ruleVersion: 'a'.repeat(64),
        requiredPieceCount: 14, generatedPieceCount: 14, unplacedPieceCount: 0, reasons: [] },
    };
    mocks.generate.mockResolvedValueOnce(bom);
    mount();
    await screen.findByText('Manufacturing qualified');
    expect(useWorkflowStore.getState().currentProject).toBe(saved);
    expect(useWorkflowStore.getState().workflowIdentity).toEqual(savedIdentity);
    expect(useWorkflowStore.getState().bom).toBe(bom);
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.authority).toHaveBeenCalledWith(saved, savedIdentity, expect.objectContaining({ meta: { id: 'test-pack' } }));
  });

  it('keeps an acknowledged estimate visible when approved authority is unavailable', async () => {
    mocks.authority.mockRejectedValueOnce(new Error('approval missing'));
    mocks.generate.mockResolvedValueOnce({
      profiles: [], hardware: [], glazing: [], accessories: [], assemblySequence: [], confidence: 1,
      cost: { materialCost: 0, hardwareCost: 0, glazingCost: 0, accessoriesCost: 0, laborCost: 0, totalCost: 0 },
      metadata: { checksum: 'estimate-test', generationTimestamp: '2026-10-11', patternUsed: 'test', systemPackUsed: 'test-pack' },
      qualification: { status: 'estimate', identity, catalogueVersion: null, ruleVersion: null,
        requiredPieceCount: 14, generatedPieceCount: 14, unplacedPieceCount: 0, reasons: ['Approved authority missing'] },
    });
    mount();
    await screen.findByText('Estimate only');
    for (const reason of screen.getAllByText('Approved authority missing')) expect(reason).toBeVisible();
    expect(screen.queryByText('Manufacturing qualified')).not.toBeInTheDocument();
    expect(mocks.generate.mock.calls[0][4]).toEqual({ identity, blockers: ['approval missing'] });
    expect(useWorkflowStore.getState().bom?.qualification?.status).toBe('estimate');
    expect(useWorkflowStore.getState().completedSteps.has('bom')).toBe(false);
  });

  it('rejects a non-advancing read after a write instead of restamping old qualification', async () => {
    mocks.resolve.mockResolvedValue([{ id: 'materialized' }]);
    mount();
    await screen.findByText('The saved position revision could not be acknowledged. Reload and retry.');
    expect(mocks.authority).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(useWorkflowStore.getState().bom).toBeNull();
  });

  it('does not restore or qualify an old pose when a save finishes after switching poses', async () => {
    const gate = deferred<void>();
    mocks.resolve.mockResolvedValue([{ id: 'new-cut' }]);
    mocks.save.mockReturnValueOnce(gate.promise);
    mount();
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    const next = { ...position, id: 'next-pose' };
    act(() => useWorkflowStore.getState().hydrateAuthoritativePosition({ ...identity, positionId: 'next-pose' }, next));
    await act(async () => { gate.resolve(); await gate.promise; });
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.authority).not.toHaveBeenCalled();
    expect(useWorkflowStore.getState().currentProject?.id).toBe('next-pose');
    expect(useWorkflowStore.getState().bom).toBeNull();
  });
});
