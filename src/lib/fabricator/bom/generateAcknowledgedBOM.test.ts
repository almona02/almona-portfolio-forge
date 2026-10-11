import { describe, expect, it, vi } from 'vitest';
import { generateAcknowledgedBOM, StaleBOMGenerationError } from './generateAcknowledgedBOM';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  const state = { current: true };
  const authoritative = { components: ['server-cut'], revision: 5 };
  const context = { catalogueVersion: 'fresh-catalogue', ruleVersion: 'fresh-rule' };
  const steps = {
    isCurrent: () => state.current,
    prepare: vi.fn(async () => ({ components: ['local-cut'] })),
    persist: vi.fn(async (_prepared: { components: string[] }) => {}),
    read: vi.fn(async () => authoritative),
    qualify: vi.fn(async (_saved: typeof authoritative) => context),
    generate: vi.fn(async (saved: typeof authoritative, authority: typeof context) => ({ saved, authority })),
    publish: vi.fn(),
  };
  return { state, steps, authoritative, context };
}

describe('acknowledged BOM generation', () => {
  it('qualifies and generates from the server read, never the prepared local ledger', async () => {
    const { steps, authoritative, context } = setup();
    await generateAcknowledgedBOM(steps);
    expect(steps.qualify).toHaveBeenCalledWith(authoritative);
    expect(steps.generate).toHaveBeenCalledWith(authoritative, context);
    expect(steps.publish).toHaveBeenCalledWith(authoritative, { saved: authoritative, authority: context });
    expect(steps.persist.mock.invocationCallOrder[0]).toBeLessThan(steps.qualify.mock.invocationCallOrder[0]);
  });

  it('does not read, qualify or publish after a failed save', async () => {
    const { steps } = setup();
    steps.persist.mockRejectedValueOnce(new Error('save denied'));
    await expect(generateAcknowledgedBOM(steps)).rejects.toThrow('save denied');
    expect(steps.read).not.toHaveBeenCalled();
    expect(steps.qualify).not.toHaveBeenCalled();
    expect(steps.publish).not.toHaveBeenCalled();
  });

  it('does not publish after an authoritative read or qualification failure', async () => {
    for (const stage of ['read', 'qualify'] as const) {
      const { steps } = setup();
      steps[stage].mockRejectedValueOnce(new Error(stage));
      await expect(generateAcknowledgedBOM(steps)).rejects.toThrow(stage);
      expect(steps.generate).not.toHaveBeenCalled();
      expect(steps.publish).not.toHaveBeenCalled();
    }
  });

  it.each(['prepare', 'persist', 'read', 'qualify', 'generate'] as const)(
    'rejects pose/design changes while %s is pending', async (stage) => {
      const { state, steps } = setup();
      const gate = deferred<void>();
      const started = deferred<void>();
      const originals = { ...steps };
      const guarded = {
        ...steps,
        [stage]: async (...args: never[]) => {
          started.resolve();
          await gate.promise;
          return (originals[stage] as (...values: never[]) => Promise<unknown>)(...args);
        },
      } as typeof steps;
      const work = generateAcknowledgedBOM(guarded);
      const rejected = expect(work).rejects.toBeInstanceOf(StaleBOMGenerationError);
      await started.promise;
      state.current = false;
      gate.resolve();
      await rejected;
      expect(steps.publish).not.toHaveBeenCalled();
      if (stage === 'prepare') expect(steps.persist).not.toHaveBeenCalled();
      if (stage === 'persist') expect(steps.read).not.toHaveBeenCalled();
    },
  );
});
