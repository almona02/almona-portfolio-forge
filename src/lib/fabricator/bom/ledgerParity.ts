/**
 * Exact design ↔ saved cut-ledger reconciliation (AICS-001).
 * Multiset parity is bound to pose revision in error messages.
 */

import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { ProfileBOMCalculator } from '@/lib/fabricator/bom/ProfileBOMCalculator';
import {
  assertLedgerMultisetParity,
  ledgerMultisetsEqual,
} from '@/lib/fabricator/bom/preserveCutLedger';
import type { SystemPack, WindowComponent, WindowUnit } from '@/types/fabricator';

const calculator = new ProfileBOMCalculator();

/**
 * Synthesise the design-true cut ledger from geometry/grid/pack.
 * Always ignores any saved `position.components` so reconciliation cannot
 * treat a stale ledger as its own expected baseline.
 */
export async function resolveExpectedDesignLedger(
  position: WindowUnit,
  pattern: EgyptianPattern,
  pack: SystemPack,
): Promise<WindowComponent[]> {
  return calculator.resolveCanonicalDesignLedger(
    { ...position, components: [] },
    pattern,
    pack,
  );
}

/** Throws when saved cuts are not an exact profile/length/angle multiset match. */
export async function reconcilePoseCutLedger(input: {
  position: WindowUnit;
  pattern: EgyptianPattern;
  pack: SystemPack;
  revision?: number | null;
}): Promise<WindowComponent[]> {
  const expected = await resolveExpectedDesignLedger(input.position, input.pattern, input.pack);
  assertLedgerMultisetParity(input.position.components, expected, {
    poseLabel: `Pose ${input.position.posNumber || input.position.id}`,
    revision: input.revision ?? input.position.revision ?? null,
  });
  return expected;
}

export function savedLedgerNeedsMaterialize(
  saved: readonly WindowComponent[] | null | undefined,
  expected: readonly WindowComponent[] | null | undefined,
): boolean {
  return !ledgerMultisetsEqual(saved, expected);
}
