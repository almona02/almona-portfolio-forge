import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemPack } from '@/types/fabricator';

const db = vi.hoisted(() => {
  const query: any = {};
  for (const key of ['select', 'eq', 'is']) query[key] = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
  query.insert = vi.fn(async () => ({ error: null }));
  query.then = (resolve: any) => resolve({ data: [], error: null });
  return { query, from: vi.fn(() => query) };
});
vi.mock('@/lib/supabase', () => ({ supabase: { from: db.from } }));
import { loadCustomSystemsFromSupabase, saveSystemPackToSupabase } from '../systemPackSupabase';

describe('system pack database scope', () => {
  beforeEach(() => vi.clearAllMocks());
  const pack = { meta: { id: 'custom-e2e', name: 'E2E' }, profiles: [] } as unknown as SystemPack;
  it('persists owned packs with the deployed tenant scope', async () => {
    expect(await saveSystemPackToSupabase(pack, 'owner')).toBe(true);
    expect(db.query.insert).toHaveBeenCalledWith(expect.objectContaining({ scope: 'tenant', owner_user_id: 'owner' }));
  });
  it('loads shared packs with the deployed global scope', async () => {
    await loadCustomSystemsFromSupabase(null);
    expect(db.query.eq).toHaveBeenCalledWith('scope', 'global');
    expect(db.query.is).toHaveBeenCalledWith('owner_user_id', null);
  });
  it('reports a rejected insert rather than success', async () => {
    db.query.insert.mockResolvedValueOnce({ error: { message: 'constraint rejected' } });
    expect(await saveSystemPackToSupabase(pack, 'owner')).toBe(false);
  });
});
