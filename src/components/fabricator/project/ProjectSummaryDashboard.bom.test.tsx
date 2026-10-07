import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { WindowUnit } from '@/types/fabricator';
import { ProjectSummaryDashboard } from './ProjectSummaryDashboard';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), save: vi.fn(), upsert: vi.fn().mockResolvedValue({}), packs: [{ meta: { id: 'owned-pack' } }] }));
vi.mock('@/hooks/fabricator/useEngineeringSystemPacks', () => ({ useEngineeringSystemPacks: () => mocks.packs }));
vi.mock('@/hooks/useFabricatorQueries', () => ({ useDeletePose: () => ({}), useUpsertPose: () => ({ mutateAsync: mocks.upsert }), useUpdateProject: () => ({ mutate: mocks.save }) }));
vi.mock('@/components/fabricator/project/PoseLayoutPreview', () => ({ PoseLayoutPreview: () => null }));
vi.mock('@/pages/fabricator/workflow/MeasuringPage', () => ({ nextPoseNumber: () => '2' }));
vi.mock('@/lib/fabricator/PresetAwareBOMGenerator', () => ({ PresetAwareBOMGenerator: class { generateCompleteBOM = mocks.generate; } }));

const pose = { id: 'pose', systemPackId: 'owned-pack', quantity: 1, overallWidth: 1200, overallHeight: 1400,
  grid: { rows: 1, cols: 1, cells: [{ id: 'cell', row: 0, col: 0, type: 'fixed' }] },
} as WindowUnit;
function renderProject(positions: WindowUnit[]) {
  render(<MemoryRouter><ProjectSummaryDashboard projectId="project" projectMeta={undefined} positions={positions} onOpenStudio={() => {}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Aggregate Project BOM' }));
}

describe('project BOM failures', () => {
  it('restores a saved BOM after remount and invalidates changed quantities', async () => {
    const view = render(<MemoryRouter><ProjectSummaryDashboard projectId="project" projectMeta={{ id: 'project' }} positions={[pose]} onOpenStudio={() => {}} /></MemoryRouter>);
    mocks.generate.mockResolvedValueOnce({ qualification: { requiredPieceCount: 4, generatedPieceCount: 4 },
      profiles: [{ cuttingLengths: [1200, 1200, 1400, 1400] }], hardware: [], glazing: [], accessories: [],
      cost: { materialCost: 100, hardwareCost: 0, glazingCost: 0, accessoriesCost: 0, laborCost: 0 } });
    fireEvent.click(screen.getByRole('button', { name: 'Aggregate Project BOM' }));
    await waitFor(() => expect(screen.getByText('Project estimate total')).toBeVisible());
    const meta = mocks.save.mock.calls.at(-1)![0].updates.meta;
    view.unmount();
    const restored = render(<MemoryRouter><ProjectSummaryDashboard projectId="project" projectMeta={{ id: 'project', meta }} positions={[pose]} onOpenStudio={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Project estimate total')).toBeVisible();
    restored.rerender(<MemoryRouter><ProjectSummaryDashboard projectId="project" projectMeta={{ id: 'project', meta }} positions={[{ ...pose, quantity: 3 }]} onOpenStudio={() => {}} /></MemoryRouter>);
    expect(screen.queryByText('Project estimate total')).toBeNull();
  });
  it('distinguishes ten positions from eighteen units and totals 30.24 square metres', () => {
    const positions = Array.from({ length: 10 }, (_, index) => ({ ...pose, id: String(index), posNumber: String(index + 1), quantity: index < 8 ? 2 : 1 }));
    render(<MemoryRouter><ProjectSummaryDashboard projectId="project" projectMeta={undefined} positions={positions} onOpenStudio={() => {}} /></MemoryRouter>);
    expect(screen.getByText('18')).toBeVisible();
    expect(screen.getByText('30.24 m²')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Positions (10)' })).toBeVisible();
  });
  it('saves quantity without discarding the design grid or system pack', async () => {
    render(<MemoryRouter><ProjectSummaryDashboard projectId="project" projectMeta={undefined} positions={[{ ...pose, posNumber: '1' }]} onOpenStudio={() => {}} /></MemoryRouter>);
    const input = screen.getByRole('spinbutton', { name: 'Quantity for pose 1' });
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);
    await waitFor(() => expect(mocks.upsert).toHaveBeenCalled());
    const write = mocks.upsert.mock.calls.at(-1)![0];
    expect(write.windowUnit.quantity).toBe(2);
    expect(write.windowUnit.systemPackId).toBe('owned-pack');
    expect(write.grid).toEqual(pose.grid);
  });
  it('shows the owner pack failure and no zero-cost total when all positions fail', async () => {
    renderProject([{ ...pose, systemPackId: 'missing' }]);
    await waitFor(() => expect(screen.getByText(/Partial estimate only/)).toBeVisible());
    expect(screen.getByText('Saved system pack is unavailable to the signed-in owner.')).toBeVisible();
    expect(screen.queryByText(/Project estimate total|Partial estimate subtotal|Estimated Cost Breakdown|0 EGP/)).toBeNull();
  });
  it('rejects a returned BOM with missing profile pieces rather than counting it resolved', async () => {
    mocks.generate.mockResolvedValueOnce({ qualification: { requiredPieceCount: 5, generatedPieceCount: 4 } });
    renderProject([pose]);
    await waitFor(() => expect(screen.getByText(/Incomplete profile ledger: 4\/5/)).toBeVisible());
    expect(screen.getByText(/0\/1 positions/)).toBeVisible();
    expect(screen.queryByText('Project estimate total')).toBeNull();
  });
  it('saves the failure audit as estimate-only data and preserves existing project metadata', async () => {
    render(<MemoryRouter><ProjectSummaryDashboard projectId="project" projectMeta={{ id: 'project', meta: { customerReference: 'retained' } }} positions={[{ ...pose, systemPackId: 'missing' }]} onOpenStudio={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Aggregate Project BOM' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    const snapshot = mocks.save.mock.calls.at(-1)![0].updates.meta;
    expect(snapshot.customerReference).toBe('retained');
    expect(snapshot.bom_estimate.manufacturingEligible).toBe(false);
    expect(snapshot.bom_estimate.isPartialEstimate).toBe(true);
    expect(snapshot.bom_estimate.positionBOMs).toEqual([]);
    expect(snapshot.bom_estimate.failures).toHaveLength(1);
  });
});
