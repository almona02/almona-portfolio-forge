import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ table: vi.fn(), monitor: vi.fn() }));
vi.mock('../supabase', () => ({ monitorSupabasePerformance: mocks.monitor }));
vi.mock('./clientCore', () => ({ table: mocks.table }));
import { ensureOwnProfile, invalidateProfileCache } from './profilesClient';

describe('registration profile repair', () => {
  beforeEach(() => { vi.clearAllMocks(); invalidateProfileCache('registration-user'); });
  it('explicitly creates an unverified customer rather than trusting the database default', async () => {
    const row = { id: 'registration-user', role: 'customer', is_verified: false };
    const query = { select: vi.fn(), eq: vi.fn(), insert: vi.fn(), maybeSingle: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.insert.mockReturnValue(query);
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: row, error: null });
    mocks.table.mockReturnValue(query);
    expect(await ensureOwnProfile(row.id, { full_name: 'New user' })).toEqual(row);
    expect(query.insert).toHaveBeenCalledWith({ id: row.id, full_name: 'New user', sector: 'GENERAL', role: 'customer', is_verified: false });
  });
  it('preserves an existing deliberately assigned role', async () => {
    const row = { id: 'registration-user', role: 'admin', is_verified: true };
    const query = { select: vi.fn(), eq: vi.fn(), insert: vi.fn(), maybeSingle: vi.fn() };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: row, error: null }); mocks.table.mockReturnValue(query);
    expect(await ensureOwnProfile(row.id)).toEqual(row);
    expect(query.insert).not.toHaveBeenCalled();
  });
});
