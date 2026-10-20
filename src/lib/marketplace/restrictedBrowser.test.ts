import { afterEach, expect, it, vi } from 'vitest';
import { browserAuthStorage } from './browserAuthStorage';
import { marketplaceRead } from './readRequest';
import { readSellerDraft, saveSellerDraft, emptySellerDraft } from './sellerDraft';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it('keeps blocked-storage sessions in memory and clears them on removal', () => {
  vi.stubGlobal('window', { get localStorage() { throw new Error('SecurityError'); } });
  browserAuthStorage.setItem('test-session', 'test-value');
  expect(browserAuthStorage.getItem('test-session')).toBe('test-value');
  browserAuthStorage.removeItem('test-session');
  expect(browserAuthStorage.getItem('test-session')).toBeNull();
});
it('restricted draft storage never throws or falsely claims persistence', () => {
  vi.stubGlobal('localStorage', { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } });
  expect(readSellerDraft().restored).toBe(false);
  expect(saveSellerDraft({ ...emptySellerDraft, title: 'Machine' }, false)).toBe(false);
});
it('aborts a hung inventory read and clears its timeout', async () => {
  vi.useFakeTimers();
  const result = marketplaceRead(signal => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Read timed out')))));
  const rejected = expect(result).rejects.toThrow('Read timed out');
  await vi.runAllTimersAsync();
  await rejected;
  expect(vi.getTimerCount()).toBe(0);
});
