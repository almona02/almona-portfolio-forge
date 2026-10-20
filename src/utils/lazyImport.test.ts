import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, loadLazyModule } from './lazyImport';

const failure = new TypeError('Failed to fetch dynamically imported module: /assets/UsedMachines-old.js');

describe('lazy route recovery', () => {
  const reload = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    reload.mockClear();
    vi.stubGlobal('window', { sessionStorage, location: { reload } });
    vi.stubGlobal('navigator', { onLine: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    failure.message,
    'error loading dynamically imported module: /assets/page.js',
    'Importing a module script failed.',
    'Loading chunk 42 failed.',
    'Unable to preload CSS for /assets/page.css',
  ])('recognizes browser download failure: %s', message => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('loads successfully even when storage is blocked', async () => {
    vi.stubGlobal('window', { get sessionStorage() { throw new Error('SecurityError'); } });
    await expect(loadLazyModule(async () => 'page', 'UsedMachines')).resolves.toBe('page');
  });

  it('recovers a transient failure without reloading', async () => {
    const importer = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue('page');
    const result = loadLazyModule(importer, 'UsedMachines');
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('page');
    expect(importer).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads a stale chunk once and preserves the guard after success', async () => {
    const importer = vi.fn().mockRejectedValue(failure);
    void loadLazyModule(importer, 'UsedMachines');
    await vi.runAllTimersAsync();
    expect(reload).toHaveBeenCalledTimes(1);
    await loadLazyModule(async () => 'page', 'UsedMachines');
    const second = expect(loadLazyModule(importer, 'UsedMachines')).rejects.toBe(failure);
    await vi.runAllTimersAsync();
    await second;
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not retry or reload application errors', async () => {
    const error = new Error('Cannot read properties of undefined');
    const importer = vi.fn().mockRejectedValue(error);
    await expect(loadLazyModule(importer, 'UsedMachines')).rejects.toBe(error);
    expect(importer).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
  });

  it.each(['offline', 'blocked storage', 'malformed marker'])('fails safely with %s', async mode => {
    if (mode === 'offline') vi.stubGlobal('navigator', { onLine: false });
    if (mode === 'blocked storage') {
      vi.stubGlobal('window', { get sessionStorage() { throw new Error('SecurityError'); } });
    }
    if (mode === 'malformed marker') {
      sessionStorage.setItem('page-refreshed-UsedMachines', 'invalid-json');
    }
    const result = loadLazyModule(vi.fn().mockRejectedValue(failure), 'UsedMachines');
    if (mode === 'malformed marker') {
      await vi.runAllTimersAsync();
      expect(reload).toHaveBeenCalledTimes(1);
    } else {
      const rejected = expect(result).rejects.toBe(failure);
      await vi.runAllTimersAsync();
      await rejected;
      expect(reload).not.toHaveBeenCalled();
    }
  });
});
