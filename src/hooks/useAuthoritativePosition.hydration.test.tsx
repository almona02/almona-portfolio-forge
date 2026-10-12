import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowStore } from '@/store/workflowStore';
import { useAuthoritativePosition } from './useFabricatorQueries';
const fixture = vi.hoisted(() => ({ data: null as any, userId: 'owner' }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: fixture.userId } }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: fixture.data, isLoading: false, error: null }), useMutation: vi.fn(), useQueryClient: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
const identity = { ownerUserId: 'owner', projectId: 'project', positionId: 'pose', source: 'v2' as const, revision: 4 };
const pose = { id: 'pose', projectId: 'project', overallWidth: 1200, overallHeight: 1400, components: [], revision: 4 };
describe('authoritative hydration after an acknowledged save', () => {
    beforeEach(() => { fixture.userId = 'owner'; useWorkflowStore.getState().clearWorkflow(); useWorkflowStore.getState().hydrateAuthoritativePosition(identity, pose as never); fixture.data = { identity: { ...identity, revision: 3 }, position: { ...pose, revision: 3 } }; });
    it('does not deadlock on an older cached response after a newer acknowledged revision', () => { const { result } = renderHook(() => useAuthoritativePosition('project', 'pose')); expect(result.current.isHydrated).toBe(true); expect(result.current.data?.position.revision).toBe(4); expect(result.current.data?.identity.revision).toBe(4); expect(useWorkflowStore.getState().workflowIdentity?.revision).toBe(4); });
    it('does not accept another owner using the same identifiers', () => { fixture.userId = 'other'; const { result } = renderHook(() => useAuthoritativePosition('project', 'pose')); expect(result.current.isHydrated).toBe(false); expect(useWorkflowStore.getState().workflowIdentity).toBeNull(); });
});
