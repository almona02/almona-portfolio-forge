import { beforeEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { UsedMachineService } from './UsedMachineService';
const mock = vi.hoisted(() => ({ insert: vi.fn(), upload: vi.fn(), from: vi.fn(), getUrl: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: {
  from: mock.from,
  storage: { from: () => ({ upload: mock.upload, getPublicUrl: mock.getUrl }) },
} }));
const image = { type: 'image/jpeg', size: 5, arrayBuffer: () => Promise.resolve(new TextEncoder().encode('photo').buffer) } as File;
const input = { title: 'Machine', price: 100, currency: 'EGP', location: 'Cairo', condition: 'good', category: 'Saw', description: 'Working cutting machine', contactName: 'Seller', contactPhone: '01000000000', files: [image] };
beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('crypto', webcrypto);
  localStorage.clear();
  mock.insert.mockReset(); mock.upload.mockReset(); mock.from.mockReset();
  mock.from.mockReturnValue({ insert: mock.insert });
  mock.upload.mockResolvedValue({ error: null });
  mock.getUrl.mockImplementation(path => ({ data: { publicUrl: `https://example.invalid/${path}` } }));
});

it('recovers an insert whose response was lost without creating another listing', async () => {
  let stored: object | null = null;
  vi.spyOn(UsedMachineService, 'getListing').mockImplementation(() => Promise.resolve(stored as never));
  mock.insert.mockImplementation(row => {
    stored = row;
    return { select: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'NETWORK_ERROR' } }) }) };
  });
  const first = await UsedMachineService.createListing(input);
  const retry = await UsedMachineService.createListing(input);
  expect(retry).toEqual(first);
  expect(mock.insert).toHaveBeenCalledTimes(1);
  expect(mock.upload).toHaveBeenCalledTimes(1);
});

it('uses the same primary key and immutable photo path after an uncommitted failure', async () => {
  vi.spyOn(UsedMachineService, 'getListing').mockResolvedValue(null);
  mock.insert.mockImplementation(() => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Failed') }) }) }));
  await expect(UsedMachineService.createListing(input)).rejects.toThrow('Failed');
  mock.upload.mockResolvedValue({ error: { statusCode: '409' } });
  mock.insert.mockImplementation(row => ({ select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }));
  await UsedMachineService.createListing(input);
  expect(mock.insert.mock.calls[0][0].id).toBe(mock.insert.mock.calls[1][0].id);
  expect(mock.upload.mock.calls[0][0]).toBe(mock.upload.mock.calls[1][0]);
  expect(mock.upload.mock.calls[1][2]).toEqual({ upsert: false });
});

it('does not mistake storage errors for successful uploads', async () => {
  vi.spyOn(UsedMachineService, 'getListing').mockResolvedValue(null);
  mock.upload.mockResolvedValue({ error: { statusCode: '403', message: 'Denied' } });
  await expect(UsedMachineService.createListing(input)).rejects.toEqual({ statusCode: '403', message: 'Denied' });
  expect(mock.insert).not.toHaveBeenCalled();
});
