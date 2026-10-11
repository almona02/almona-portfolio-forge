import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateEngineeringSystemPacks, useEngineeringSystemPacks } from './useEngineeringSystemPacks';

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

type Pack = { meta: { id: string }; profiles: unknown[] };
const pack = (id: string): Pack => ({ meta: { id }, profiles: [] });

/** Resolve the most recent pending request. */
function resolveLast(pending: Array<(packs: Pack[]) => void>, packs: Pack[]): Promise<void> {
  return act(async () => { pending[pending.length - 1](packs); });
}

describe('engineering owner packs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The pack cache is module state; each test starts from a cold cache.
    invalidateEngineeringSystemPacks();
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

  it('does not publish or cache packs that were invalidated while the load was in flight', async () => {
    const pending: Array<(packs: Pack[]) => void> = [];
    load.mockImplementation(() => new Promise<Pack[]>(resolve => { pending.push(resolve); }));
    const { result, unmount } = renderHook(useEngineeringSystemPacks);
    await waitFor(() => expect(pending.length).toBeGreaterThan(0));
    const callsAtMount = load.mock.calls.length;

    // The owner edits a profile while the first load is still in flight: a fresh
    // request must start rather than the invalidated promise being reused.
    await act(async () => { window.dispatchEvent(new Event('customProfileAdded')); });
    await waitFor(() => expect(load.mock.calls.length).toBeGreaterThan(callsAtMount));

    await resolveLast(pending, [pack('custom-fresh')]);
    await waitFor(() => expect(result.current.some(p => p.meta.id === 'custom-fresh')).toBe(true));

    // The superseded response arrives last and must not surface or repopulate the cache.
    await act(async () => {
      pending.slice(0, -1).forEach(resolve => resolve([pack('custom-stale')]));
    });
    expect(result.current.some(p => p.meta.id === 'custom-stale')).toBe(false);
    expect(result.current.some(p => p.meta.id === 'custom-fresh')).toBe(true);
    unmount();

    const second = renderHook(useEngineeringSystemPacks);
    await waitFor(() => expect(second.result.current.some(p => p.meta.id === 'custom-fresh')).toBe(true));
    expect(second.result.current.some(p => p.meta.id === 'custom-stale')).toBe(false);
    second.unmount();
  });

  it('cannot repopulate the cache from a load that outlives sign-out', async () => {
    const pending: Array<(packs: Pack[]) => void> = [];
    load.mockImplementation(() => new Promise<Pack[]>(resolve => { pending.push(resolve); }));
    const { result, unmount } = renderHook(useEngineeringSystemPacks);
    await waitFor(() => expect(pending.length).toBeGreaterThan(0));

    act(() => auth.changed?.('SIGNED_OUT', null));
    expect(result.current.some(p => p.meta.id === 'custom-late')).toBe(false);

    const callsBeforeNewSession = load.mock.calls.length;
    await act(async () => { pending.forEach(resolve => resolve([pack('custom-late')])); });
    expect(result.current.some(p => p.meta.id === 'custom-late')).toBe(false);

    // The next session must fetch again instead of reading a pre-logout cache entry.
    load.mockImplementation(() => Promise.resolve([pack('custom-new')]));
    act(() => auth.changed?.('SIGNED_IN', { user: { id: 'owner-a' } }));
    await waitFor(() => expect(load.mock.calls.length).toBeGreaterThan(callsBeforeNewSession));
    await waitFor(() => expect(result.current.some(p => p.meta.id === 'custom-new')).toBe(true));
    expect(result.current.some(p => p.meta.id === 'custom-late')).toBe(false);
    unmount();
  });
});