import { afterEach, expect, it, vi } from 'vitest';
import { MessageChannel } from 'node:worker_threads';
import { canActivateWorker } from './serviceWorkerLifecycle';

afterEach(() => vi.unstubAllGlobals());
it('honors the waiting worker decision about other windows', async () => {
  vi.stubGlobal('MessageChannel', MessageChannel);
  for (const safe of [true, false]) {
    const worker = { postMessage: (_message: unknown, ports: MessagePort[]) => ports[0].postMessage({ safe }) };
    expect(await canActivateWorker(worker as ServiceWorker)).toBe(safe);
  }
});
it('fails closed when message channels are unavailable', async () => {
  vi.stubGlobal('MessageChannel', undefined);
  expect(await canActivateWorker({} as ServiceWorker)).toBe(false);
});
