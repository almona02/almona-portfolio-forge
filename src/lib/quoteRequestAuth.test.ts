import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getQuoteRequestHeaders } from './quoteRequestAuth';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession } } }));

describe('quote request authentication', () => {
  beforeEach(() => getSession.mockReset());

  it('preserves guest enquiries without an authorization header', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    expect(await getQuoteRequestHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });

  it('sends the current access token for an authenticated owner', async () => {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'owner' }, access_token: 'test-session-token' } }, error: null,
    });
    expect(await getQuoteRequestHeaders('owner')).toEqual({
      'Content-Type': 'application/json', Authorization: 'Bearer test-session-token',
    });
  });

  it.each([null, { user: { id: 'other' }, access_token: 'other-token' }])(
    'rejects a missing or changed session instead of falling back to guest', async (session) => {
      getSession.mockResolvedValue({ data: { session }, error: null });
      await expect(getQuoteRequestHeaders('owner')).rejects.toThrow('Your session changed');
    },
  );

  it('propagates session lookup failures', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: new Error('Session unavailable') });
    await expect(getQuoteRequestHeaders()).rejects.toThrow('Session unavailable');
  });
});
