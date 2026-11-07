/**
 * Versioned pack persistence — Supabase mocked, no database.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemPack } from '@/types/fabricator';

const mocks = vi.hoisted(() => ({ chains: {} as Record<string, any> }));

vi.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => mocks.chains[table] },
}));

import {
  listPackVersionsFromSupabase,
  rollbackSystemPackInSupabase,
  saveSystemPackToSupabase,
} from './systemPackSupabase';

const CHAIN_METHODS = ['select', 'eq', 'order', 'limit', 'is', 'single', 'maybeSingle', 'update', 'insert', 'delete'];

function chainable(terminal: Record<string, (...args: any[]) => any>, awaited: any = { error: null }): any {
  const chain: Record<string, any> = {};
  for (const key of CHAIN_METHODS) {
    chain[key] = vi.fn((...args: any[]) => (key in terminal ? terminal[key](...args) : chain));
  }
  // Support `await query.update(...).eq(...)` style chains.
  chain.then = (resolve: (value: any) => void) => resolve(awaited);
  return chain;
}

const pack = {
  meta: { id: 'pack-1', name: 'Pack One', regions: [], brands: [] },
  profiles: [],
} as unknown as SystemPack;

describe('saveSystemPackToSupabase', () => {
  beforeEach(() => {
    mocks.chains = {};
  });

  it('writes a new pack as version 1 with a history snapshot', async () => {
    const historyInsert = vi.fn(() => Promise.resolve({ error: null }));
    const liveInsert = vi.fn(() => Promise.resolve({ error: null }));
    mocks.chains['fabricator_system_pack_history'] = chainable({ insert: historyInsert });
    mocks.chains['fabricator_system_packs'] = chainable({
      maybeSingle: () => Promise.resolve({ data: null }),
      insert: liveInsert,
    });

    await expect(saveSystemPackToSupabase(pack, 'user-1', { changeNote: 'first' })).resolves.toBe(true);

    expect(historyInsert).toHaveBeenCalledWith(
      expect.objectContaining({ pack_id: 'pack-1', version: 1, source: 'initial_setup' })
    );
    expect(liveInsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'pack-1', version: 1, updated_by: 'user-1', change_note: 'first' })
    );
  });

  it('snapshots the current spec then writes version + 1 on update', async () => {
    const currentSpec = { meta: { id: 'pack-1', name: 'Old' } };
    const historyInsert = vi.fn(() => Promise.resolve({ error: null }));
    mocks.chains['fabricator_system_pack_history'] = chainable({ insert: historyInsert });
    const packsChain = chainable({
      maybeSingle: () => Promise.resolve({
        data: { id: 'pack-1', version: 2, spec: currentSpec, scope: 'tenant', owner_user_id: 'user-1' },
      }),
    });
    mocks.chains['fabricator_system_packs'] = packsChain;

    await expect(
      saveSystemPackToSupabase(pack, 'user-1', { changeNote: 'tune', source: 'admin_catalog' })
    ).resolves.toBe(true);

    expect(historyInsert).toHaveBeenCalledWith(
      expect.objectContaining({ pack_id: 'pack-1', version: 2, spec: currentSpec, source: 'admin_catalog' })
    );
    expect(packsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ version: 3, updated_by: 'user-1', change_note: 'tune' })
    );
  });

  it('falls back to the legacy unversioned write when the migration is missing', async () => {
    const ddlError = { code: 'PGRST204', message: "Could not find the 'version' column in the schema cache" };
    const liveInsert = vi.fn(() => Promise.resolve({ error: null }));
    mocks.chains['fabricator_system_pack_history'] = chainable({
      insert: vi.fn(() => Promise.resolve({ error: ddlError })),
    });
    mocks.chains['fabricator_system_packs'] = chainable({
      maybeSingle: () => Promise.resolve({ data: null }),
      insert: liveInsert,
    });

    await expect(saveSystemPackToSupabase(pack, 'user-1')).resolves.toBe(true);
    expect(liveInsert).toHaveBeenCalledWith(expect.not.objectContaining({ version: expect.anything() }));
  });
});

describe('listPackVersionsFromSupabase', () => {
  beforeEach(() => {
    mocks.chains = {};
  });

  it('maps history rows newest-first', async () => {
    // limit() stays chainable like real postgrest; the awaited chain resolves the rows.
    mocks.chains['fabricator_system_pack_history'] = chainable({}, {
      data: [
        { id: 'h2', pack_id: 'pack-1', version: 2, spec: {}, change_note: 'b', source: 'admin_catalog', created_by: 'u', created_at: '2026-11-06T00:00:00Z' },
        { id: 'h1', pack_id: 'pack-1', version: 1, spec: {}, change_note: null, source: 'initial_setup', created_by: 'u', created_at: '2026-11-05T00:00:00Z' },
      ],
      error: null,
    });
    const versions = await listPackVersionsFromSupabase('pack-1', 'user-1');
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    expect(versions[0]).toMatchObject({ source: 'admin_catalog', changeNote: 'b' });
  });

  it('returns [] when the history table does not exist yet', async () => {
    mocks.chains['fabricator_system_pack_history'] = chainable(
      {},
      { data: null, error: { code: '42P01', message: 'relation does not exist' } }
    );
    await expect(listPackVersionsFromSupabase('pack-1', 'user-1')).resolves.toEqual([]);
  });
});

describe('rollbackSystemPackInSupabase', () => {
  beforeEach(() => {
    mocks.chains = {};
  });

  it('re-saves an old snapshot as a new rollback version', async () => {
    const snapshot = { meta: { id: 'pack-1', name: 'Pack One v1' }, profiles: [] };
    mocks.chains['fabricator_system_pack_history'] = chainable({
      maybeSingle: () => Promise.resolve({
        data: { id: 'h1', pack_id: 'pack-1', version: 1, spec: snapshot, change_note: null, source: 'initial_setup', created_by: 'u', created_at: '' },
      }),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    });
    const packsChain = chainable({
      maybeSingle: () => Promise.resolve({
        data: { id: 'pack-1', version: 3, spec: {}, scope: 'tenant', owner_user_id: 'user-1' },
      }),
    });
    mocks.chains['fabricator_system_packs'] = packsChain;

    await expect(rollbackSystemPackInSupabase('pack-1', 1, 'user-1')).resolves.toBe(true);
    expect(packsChain.update).toHaveBeenCalledWith(expect.objectContaining({ version: 4 }));
  });

  it('fails closed when the requested version does not exist', async () => {
    mocks.chains['fabricator_system_pack_history'] = chainable({
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
    });
    mocks.chains['fabricator_system_packs'] = chainable({
      maybeSingle: () => Promise.resolve({ data: null }),
    });
    await expect(rollbackSystemPackInSupabase('pack-1', 9, 'user-1')).resolves.toBe(false);
  });
});
