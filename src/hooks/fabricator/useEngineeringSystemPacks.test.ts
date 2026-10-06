import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEngineeringSystemPacks } from './useEngineeringSystemPacks';

const auth = vi.hoisted(() => ({ getUser: vi.fn(), changed: undefined as undefined | ((event: string, session: { user: { id: string } } | null) => void), unsubscribe: vi.fn() }));
const load = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({ supabase: { auth: {
  getUser: auth.getUser,
  onAuthStateChange: (callback: typeof auth.changed) => {
    auth.changed = callback;
    return { data: { subscription: { unsubscribe: auth.unsubscribe } } };
  },
} } }));
vi.mock('@/lib/fabricator/systemPackSupabase', () => ({ loadCustomSystemsFromSupabase: load }));

describe('engineering owner packs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getUser.mockResolvedValue({ data: { user: { id: 'owner-a' } } });
  });
  it('drops an old account response and removes custom packs on logout', async () => {
    let resolveA!: (packs: unknown[]) => void;
    load.mockImplementation((owner: string) => owner === 'owner-a'
      ? new Promise(resolve => { resolveA = resolve; })
      : Promise.resolve([{ meta: { id: 'custom-b' }, profiles: [] }]));
    const { result, unmount } = renderHook(useEngineeringSystemPacks);
    await waitFor(() => expect(load).toHaveBeenCalledWith('owner-a'));
    act(() => auth.changed?.('SIGNED_IN', { user: { id: 'owner-b' } }));
    await waitFor(() => expect(result.current.some(pack => pack.meta.id === 'custom-b')).toBe(true));
    await act(async () => resolveA([{ meta: { id: 'custom-a' }, profiles: [] }]));
    expect(result.current.some(pack => pack.meta.id === 'custom-a')).toBe(false);
    act(() => auth.changed?.('SIGNED_OUT', null));
    expect(result.current.some(pack => pack.meta.id === 'custom-b')).toBe(false);
    unmount();
    expect(auth.unsubscribe).toHaveBeenCalled();
  });
});
