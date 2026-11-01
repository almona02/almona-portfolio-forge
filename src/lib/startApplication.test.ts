import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startApplication } from './startApplication';

describe('startup before React is available', () => {
  const reload = vi.fn();
  const failure = new TypeError('Failed to fetch dynamically imported module: /assets/main-old.js');
  beforeEach(() => {
    sessionStorage.clear();
    reload.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
    vi.stubGlobal('window', { location: { reload }, sessionStorage });
    vi.stubGlobal('navigator', { onLine: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('starts the application without refreshing', async () => {
    const load = vi.fn().mockResolvedValue(undefined);
    await startApplication(load);
    expect(load).toHaveBeenCalledOnce();
    expect(reload).not.toHaveBeenCalled();
  });

  it('refreshes a missing startup dependency only once across page loads', async () => {
    const load = vi.fn().mockRejectedValue(failure);
    await startApplication(load);
    expect(reload).toHaveBeenCalledOnce();
    await startApplication(load);
    expect(reload).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain('ALMONA');
    expect(document.querySelector('button')?.textContent).toBe('Try again');
    document.querySelector('button')?.click();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it.each(['offline', 'blocked storage', 'application error'])('provides a manual retry for %s', async mode => {
    document.getElementById('root')!.classList.add('app-fade-enter');
    if (mode === 'offline') vi.stubGlobal('navigator', { onLine: false });
    if (mode === 'blocked storage') {
      vi.stubGlobal('window', { get sessionStorage() { throw new Error('SecurityError'); } });
    }
    await startApplication(vi.fn().mockRejectedValue(mode === 'application error' ? new Error('bad code') : failure));
    expect(reload).not.toHaveBeenCalled();
    expect(document.querySelector('button')).not.toBeNull();
    expect(document.getElementById('root')!.classList.contains('app-fade-enter')).toBe(false);
    expect(document.getElementById('root')!.getAttribute('role')).toBe('alert');
  });

  it('preserves public product HTML when application startup fails', async () => {
    document.body.innerHTML = '<div id="root" data-public-catalogue="true"><h1>ALM 6510</h1><p>Machine specifications</p></div>';
    await startApplication(vi.fn().mockRejectedValue(new Error('Application unavailable')));
    expect(document.querySelector('h1')?.textContent).toBe('ALM 6510');
    expect(document.body.textContent).toContain('Machine specifications');
    expect(document.querySelector('button')?.textContent).toBe('Try again');
  });
});
