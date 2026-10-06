import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ save: vi.fn(), navigate: vi.fn(), complete: vi.fn(), error: vi.fn(), project: {
  id: '22222222-2222-4222-8222-222222222222', projectId: '11111111-1111-4111-8111-111111111111', components: [],
} }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useParams: () => ({ projectId: mocks.project.projectId, poseId: mocks.project.id }) }));
vi.mock('@/context/FabricatorWorkspaceContext', () => ({ useFabricatorWorkspace: () => ({ state: {}, dispatch: vi.fn() }) }));
vi.mock('@/hooks/useFabricatorQueries', () => ({ useProjectPositions: () => [], useUpsertPose: () => ({ mutateAsync: mocks.save }) }));
vi.mock('@/store/jobsStore', () => ({ useJobsStore: () => ({ jobs: [], setSelectedJob: vi.fn() }) }));
vi.mock('@/store/workflowStore', () => ({ useWorkflowStore: () => ({ currentProject: mocks.project, setCurrentProject: vi.fn(), setDesignData: vi.fn(), completeStep: mocks.complete }) }));
vi.mock('@/lib/fabricator/catalog/CatalogResolver', () => ({ catalogProfilesOrEmpty: () => [] }));
vi.mock('@/lib/featureFlags', () => ({ FeatureFlags: {} }));
vi.mock('@/lib/supabase/fabricatorClientV2', () => ({ isFabricatorUuid: () => true, persistenceErrorMessage: (error: Error) => error.message }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
vi.mock('./shell/DesignWorkspaceShell', () => ({ DesignWorkspaceShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./EngineeringBay', () => ({ EngineeringBay: ({ onDesignComplete }: { onDesignComplete: (payload: unknown) => void }) => <button onClick={() => void onDesignComplete({ components: [], grid: { rows: 1 }, systemPackId: 'custom', presetId: 'sliding-2s' })}>Review BOM</button> }));

import { EngineeringBayWrapper } from './EngineeringBayWrapper';

describe('authoritative design completion', () => {
  beforeEach(() => vi.clearAllMocks());
  it('awaits persistence and prevents duplicate saves before advancing', async () => {
    let resolve!: () => void;
    mocks.save.mockImplementation(() => new Promise<void>(done => { resolve = done; }));
    render(<EngineeringBayWrapper />);
    fireEvent.click(screen.getByRole('button', { name: 'Review BOM' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review BOM' }));
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ selectedPreset: 'sliding-2s', grid: { rows: 1 } }));
    expect(mocks.navigate).not.toHaveBeenCalled();
    await act(async () => resolve());
    expect(mocks.complete).toHaveBeenCalledWith('design');
    expect(mocks.navigate).toHaveBeenCalledWith(expect.stringContaining('/bom'));
  });
  it('keeps a failed save in design without completing the step', async () => {
    mocks.save.mockRejectedValue(new Error('Database unavailable'));
    render(<EngineeringBayWrapper />);
    fireEvent.click(screen.getByRole('button', { name: 'Review BOM' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Failed to save design: Database unavailable'));
    expect(mocks.complete).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
