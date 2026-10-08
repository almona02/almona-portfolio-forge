import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/FabricatorWorkspaceContext', () => ({
  useFabricatorWorkspace: () => ({ state: { currentProject: null }, dispatch: vi.fn() }),
}));
vi.mock('@/hooks/useFabricatorQueries', () => ({
  useProjectPositions: () => [],
  useUpsertPose: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/store/jobsStore', () => ({
  useJobsStore: () => ({
    jobs: [
      {
        id: 'pose-1',
        projectCode: 'PRJ-1',
        projectId: 'proj-1',
        positionMeta: { posNumber: 'U1' },
      },
    ],
    setSelectedJob: vi.fn(),
  }),
}));
vi.mock('@/store/workflowStore', () => ({
  useWorkflowStore: () => ({
    currentProject: null,
    setCurrentProject: vi.fn(),
    setDesignData: vi.fn(),
    completeStep: vi.fn(),
  }),
}));
vi.mock('@/lib/fabricator/catalog/CatalogResolver', () => ({ catalogProfilesOrEmpty: () => [] }));
vi.mock('@/lib/featureFlags', () => ({ FeatureFlags: { FABRICATOR_READ_V2: true } }));
vi.mock('@/lib/supabase/fabricatorClientV2', () => ({
  isFabricatorUuid: () => true,
  persistenceErrorMessage: (e: Error) => e.message,
}));
vi.mock('./shell/DesignWorkspaceShell', () => ({
  DesignWorkspaceShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('./EngineeringBay', () => ({ EngineeringBay: () => <div>EngineeringBay</div> }));

import { EngineeringBayWrapper } from './EngineeringBayWrapper';

describe('EngineeringBayWrapper bare design route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows project/pose picker when route has no ids', () => {
    render(
      <MemoryRouter initialEntries={['/fabricator/studio/design']}>
        <Routes>
          <Route path="/fabricator/studio/design" element={<EngineeringBayWrapper />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('design-pose-picker')).toBeInTheDocument();
    expect(screen.getByText(/Select a project position/i)).toBeInTheDocument();
    expect(screen.queryByText(/Authoritative project/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Projects/i })).toHaveAttribute(
      'href',
      '/fabricator/studio/projects',
    );
  });
});
