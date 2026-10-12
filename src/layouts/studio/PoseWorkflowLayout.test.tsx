import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PoseWorkflowLayout from './PoseWorkflowLayout';
const mocks = vi.hoisted(() => ({ dispatch: vi.fn(), hydrated: true, position: { id: 'pose', revision: 4 } }));
vi.mock('@/hooks/useFabricatorQueries', () => ({ useAuthoritativePosition: () => ({ data: { position: mocks.position }, isLoading: false, error: null, isHydrated: mocks.hydrated }) }));
vi.mock('@/context/FabricatorWorkspaceContext', () => ({ useFabricatorWorkspace: () => ({ dispatch: mocks.dispatch }) }));
vi.mock('@/components/fabricator/workflow/ValidationGate', () => ({ ValidationGate: () => null }));
vi.mock('@/components/fabricator/SavePoseActions', () => ({ SavePoseActions: () => null }));
vi.mock('react-router-dom', () => ({ useParams: () => ({ projectId: 'project', poseId: 'pose' }), useLocation: () => ({ pathname: '/projects/project/positions/pose/bom' }), Outlet: () => null }));
beforeEach(() => { vi.clearAllMocks(); mocks.hydrated = true; mocks.position = { id: 'pose', revision: 4 }; });
afterEach(cleanup);
describe('pose header coordination', () => {
 it('publishes an acknowledged position to the workspace header', () => { render(<PoseWorkflowLayout />); expect(mocks.dispatch).toHaveBeenCalledWith({ type: 'SET_CURRENT_PROJECT', payload: mocks.position }); });
 it('does not republish a cached position after save-and-close clears hydration', () => { const { rerender } = render(<PoseWorkflowLayout />); mocks.hydrated = false; mocks.position = { id: 'pose', revision: 3 }; rerender(<PoseWorkflowLayout />); expect(mocks.dispatch).toHaveBeenCalledTimes(1); });
});
