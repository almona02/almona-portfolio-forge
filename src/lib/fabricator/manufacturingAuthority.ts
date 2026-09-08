/**
 * FP-016 Option B / AICS-001 — Manufacturing authority boundary
 *
 * Tier-3 manufacturing truth may only use deterministic algorithms (greedy | linear).
 * Genetic / stochastic selection is advisory/search-only and must fail closed
 * when attempting to become production / CNC / QC authority.
 */

export type Tier3ManufacturingAlgorithm = 'greedy' | 'linear';

export const TIER3_MANUFACTURING_ALGORITHMS: readonly Tier3ManufacturingAlgorithm[] = [
  'greedy',
  'linear',
] as const;

export class ManufacturingAuthorityError extends Error {
  readonly code = 'MANUFACTURING_AUTHORITY_VIOLATION' as const;

  constructor(message: string) {
    super(message);
    this.name = 'ManufacturingAuthorityError';
  }
}

export function isTier3ManufacturingAlgorithm(
  algorithm: string | null | undefined
): algorithm is Tier3ManufacturingAlgorithm {
  return algorithm === 'greedy' || algorithm === 'linear';
}

/**
 * Fail closed: reject any non–Tier-3 algorithm before it can drive
 * Optimization → Cut → Production → CutSheet → CNC → QC.
 */
export function assertTier3ManufacturingAlgorithm(
  algorithm: string,
  context = 'manufacturing execution'
): asserts algorithm is Tier3ManufacturingAlgorithm {
  if (!isTier3ManufacturingAlgorithm(algorithm)) {
    throw new ManufacturingAuthorityError(
      `[AICS-001 / FP-016] Authority violation in ${context}: ` +
        `algorithm="${algorithm}" is not Tier-3 manufacturing truth. ` +
        `Allowed: ${TIER3_MANUFACTURING_ALGORITHMS.join(', ')}. ` +
        `Genetic/stochastic results are advisory/search-only.`
    );
  }
}

/**
 * Fail closed when an advisory selection is presented as manufacturing authority.
 */
export function assertNotAdvisoryManufacturingAuthority(selection: {
  algorithm: string;
  advisoryOnly?: boolean;
}): void {
  if (selection.advisoryOnly === true || selection.algorithm === 'genetic') {
    throw new ManufacturingAuthorityError(
      `[AICS-001 / FP-016] Advisory/search selection (algorithm="${selection.algorithm}", ` +
        `advisoryOnly=${String(selection.advisoryOnly)}) cannot become Tier-3 manufacturing authority.`
    );
  }
  assertTier3ManufacturingAlgorithm(selection.algorithm, 'advisory→Tier-3 bypass');
}
