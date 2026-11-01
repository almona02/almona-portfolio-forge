import { canActivateWorker } from './serviceWorkerLifecycle';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { marketplaceNavigationPattern, marketplaceNavigationRule } from './marketplaceCachePolicy';
import { prepareMarketplaceReload } from './marketplaceRecovery';

vi.mock('./serviceWorkerLifecycle', async importOriginal => ({ ...(await importOriginal<typeof import('./serviceWorkerLifecycle')>()), canActivateWorker: vi.fn().mockResolvedValue(true) }));

const route = marketplaceNavigationRule.urlPattern as (input: object) => boolean;

describe('marketplace cache policy', () => {
  it.each(['/used-machines', '/used-machines?tab=sell', '/used-machines/123', '/usedmachines/123'])(
    'bypasses the cached app shell for %s', path => {
      expect(marketplaceNavigationPattern.test(path)).toBe(true);
      expect(route({ request: { mode: 'navigate' }, url: new URL(path, 'https://example.com'), sameOrigin: true })).toBe(true);
    },
  );
  it('fetches fresh HTML while leaving workspace navigation and assets alone', () => {
    expect(marketplaceNavigationRule.handler).toBe('NetworkOnly');
    expect(marketplaceNavigationRule.options?.fetchOptions?.cache).toBe('no-store');
    expect(marketplaceNavigationPattern.test('/fabricator/studio')).toBe(false);
    expect(marketplaceNavigationPattern.test('/used-machines-other')).toBe(false);
    expect(route({ request: { mode: 'cors' }, url: new URL('https://example.com/used-machines/photo.jpg'), sameOrigin: true })).toBe(false);
    expect(route({ request: { mode: 'navigate' }, url: new URL('https://other.com/used-machines'), sameOrigin: false })).toBe(false);
    // A serialized Workbox callback must not depend on imported variables.
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- test asserts Workbox route serialization
    const serialized = new Function(`return (${route.toString()})`)() as typeof route;
    expect(serialized({ request: { mode: 'navigate' }, url: new URL('https://example.com/used-machines'), sameOrigin: true })).toBe(true);
  });
});

describe('marketplace failed-download recovery', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  function setup(path = '/used-machines') {
    vi.stubGlobal('window', { location: { pathname: path } });
    const worker = Object.assign(new EventTarget(), {
      state: 'installed',
      postMessage: vi.fn(() => { worker.state = 'activated'; worker.dispatchEvent(new Event('statechange')); }),
    });
    const registration = { waiting: worker, installing: null, update: vi.fn().mockResolvedValue(undefined) };
    const getRegistration = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration } });
    return { worker, registration, getRegistration };
  }
  it('activates a waiting worker before the guarded marketplace reload', async () => {
    const { worker, registration } = setup();
    await prepareMarketplaceReload();
    expect(registration.update).toHaveBeenCalledOnce();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(worker.state).toBe('activated');
  });
  it('leaves the worker waiting when another tab may contain unsaved work', async () => {
    const { worker } = setup();
    vi.mocked(canActivateWorker).mockResolvedValueOnce(false);
    await prepareMarketplaceReload();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });
  it('does not activate updates in the fabrication workspace', async () => {
    const { getRegistration } = setup('/fabricator/studio');
    await prepareMarketplaceReload();
    expect(getRegistration).not.toHaveBeenCalled();
  });
  it('continues when the browser has no service worker API', async () => {
    setup();
    vi.stubGlobal('navigator', {});
    await expect(prepareMarketplaceReload()).resolves.toBeUndefined();
  });
  it('continues when checking for an update fails', async () => {
    const { registration } = setup();
    registration.update.mockRejectedValue(new Error('Offline'));
    await expect(prepareMarketplaceReload()).resolves.toBeUndefined();
  });
  it('bounds a stalled update check', async () => {
    vi.useFakeTimers();
    const { registration } = setup();
    registration.update.mockReturnValue(new Promise(() => {}));
    const result = prepareMarketplaceReload();
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
  });
  it('bounds activation when the worker does not respond', async () => {
    vi.useFakeTimers();
    const { worker } = setup();
    worker.postMessage.mockImplementation(() => {});
    const result = prepareMarketplaceReload();
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBeUndefined();
  });
});
