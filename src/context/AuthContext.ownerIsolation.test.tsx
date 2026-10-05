import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowStore } from '@/store/workflowStore';

const mocks = vi.hoisted(() => ({ listener: null as null | ((event: string, session: any) => void), getSession: vi.fn(), getProfile: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ handleAuthError: vi.fn(), supabase: { auth: {
  getSession: mocks.getSession,
  onAuthStateChange: (callback: typeof mocks.listener) => { mocks.listener = callback; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
} } }));
vi.mock('@/lib/data/profilesClient', () => ({ getProfileById: mocks.getProfile, ensureOwnProfile: vi.fn(), updateProfile: vi.fn() }));
import { AuthProvider, useAuth } from './AuthContext';

function Identity() { const { user, loading } = useAuth(); return <><span data-testid="identity">{user ? `${user.id}:${user.role}` : 'anonymous'}</span><span data-testid="loading">{String(loading)}</span></>; }
const session = (id: string) => ({ user: { id, email: `${id}@fixture.local`, user_metadata: {} } });
describe('authentication owner isolation', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fixture-public-key');
    localStorage.clear(); sessionStorage.clear(); useWorkflowStore.getState().clearWorkflow();
    mocks.getProfile.mockReset(); mocks.getSession.mockReset();
    mocks.getSession.mockReturnValue(new Promise(() => {}));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('clears the old owner immediately and ignores a late privileged profile', async () => {
    let finishA!: (profile: any) => void;
    mocks.getProfile.mockImplementation((id: string) => id === 'owner-a' ? new Promise(resolve => { finishA = resolve; }) : Promise.resolve({ id, role: 'customer' }));
    const queryClient = new QueryClient();
    render(<QueryClientProvider client={queryClient}><AuthProvider><Identity /></AuthProvider></QueryClientProvider>);
    await act(async () => { mocks.listener!('SIGNED_IN', session('owner-a')); });
    await waitFor(() => expect(mocks.getProfile).toHaveBeenCalledWith('owner-a'));
    queryClient.setQueryData(['private-records'], ['owner-a-record']);
    useWorkflowStore.setState({ workflowIdentity: { ownerUserId: 'owner-a', projectId: 'a', positionId: 'a', source: 'v2', revision: 1 } });
    await act(async () => { mocks.listener!('SIGNED_IN', session('owner-b')); });
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous');
    expect(queryClient.getQueryData(['private-records'])).toBeUndefined();
    expect(useWorkflowStore.getState().workflowIdentity).toBeNull();
    await act(async () => { finishA({ id: 'owner-a', role: 'admin' }); });
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('owner-b:customer'));
  });

  it('ignores a stale initial session after a newer sign-in event', async () => {
    let finishInitial!: (value: any) => void;
    mocks.getSession.mockReturnValue(new Promise(resolve => { finishInitial = resolve; }));
    mocks.getProfile.mockImplementation((id: string) => Promise.resolve({ id, role: 'customer' }));
    render(<QueryClientProvider client={new QueryClient()}><AuthProvider><Identity /></AuthProvider></QueryClientProvider>);
    await act(async () => { mocks.listener!('SIGNED_IN', session('owner-b')); });
    await act(async () => { finishInitial({ data: { session: session('owner-a') }, error: null }); });
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('identity')).toHaveTextContent('owner-b:customer'));
  });
});
