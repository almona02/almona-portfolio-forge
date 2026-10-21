import { expect, it, vi } from 'vitest';
import handler from '../api/marketplace-events';
function send(body: unknown, origin = 'https://www.almona02.com', method = 'POST') {
  const response = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  handler({ method, body, headers: { origin, host: 'www.almona02.com', 'content-type': 'application/json' } } as never, response as never);
  return response;
}
const payload = { event: 'submission_failure', route: 'sell', category: 'request', browser: 'android', worker: 'controlled', release: 'abcdef123456' };
it('logs only sanitized events to the first-party function log', () => {
  const log = vi.spyOn(console, 'info').mockImplementation(() => {});
  expect(send({ ...payload, phone: 'private', message: 'secret value' }).statusCode).toBe(204);
  const logged = JSON.parse(log.mock.calls[0][0] as string);
  expect(logged.source).toBe('marketplace-reliability');
  expect(logged).not.toHaveProperty('phone');
  expect(logged).not.toHaveProperty('message');
  log.mockRestore();
});
it('rejects unrelated origins, unsupported methods, oversized payloads and unknown categories', () => {
  expect(send(payload, 'https://other.example').statusCode).toBe(403);
  expect(send(payload, undefined, 'GET').statusCode).toBe(405);
  expect(send({ ...payload, extra: 'x'.repeat(2000) }).statusCode).toBe(413);
  expect(send({ ...payload, category: 'raw exception' }).statusCode).toBe(400);
});
