/** A BOM may only publish after persistence, authoritative read and fresh qualification.
 * isCurrent binds the operation to the original pose, draft and request token.
 */
export class StaleBOMGenerationError extends Error {
  constructor() { super('BOM generation superseded by a newer pose or design.'); }
}

export async function generateAcknowledgedBOM<Prepared, Saved, Context, BOM>(steps: {
  isCurrent: () => boolean;
  prepare: () => Promise<Prepared>;
  persist: (prepared: Prepared) => Promise<void>;
  read: () => Promise<Saved>;
  qualify: (saved: Saved) => Promise<Context>;
  generate: (saved: Saved, context: Context) => Promise<BOM>;
  publish: (saved: Saved, bom: BOM) => void;
}): Promise<void> {
  const assertCurrent = () => {
    if (!steps.isCurrent()) throw new StaleBOMGenerationError();
  };
  assertCurrent();
  const prepared = await steps.prepare();
  assertCurrent();
  await steps.persist(prepared);
  assertCurrent();
  const saved = await steps.read();
  assertCurrent();
  const context = await steps.qualify(saved);
  assertCurrent();
  const bom = await steps.generate(saved, context);
  assertCurrent();
  steps.publish(saved, bom);
}
