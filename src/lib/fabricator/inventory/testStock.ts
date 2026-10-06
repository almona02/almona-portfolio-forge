/**
 * Disposable / verification lots must never inflate production readiness.
 * Match explicit flag or the conventional name marker used in live test lots.
 */

export function isTestStockProfile(profile: {
  name?: string | null;
  specifications?: unknown;
}): boolean {
  const specs = (profile.specifications || {}) as Record<string, unknown>;
  return specs.testStock === true || /TEST STOCK/i.test(profile.name || '');
}

export function partitionProductionInventory<T extends {
  name?: string | null;
  specifications?: unknown;
}>(profiles: T[]): { production: T[]; testStock: T[] } {
  const production: T[] = [];
  const testStock: T[] = [];
  for (const profile of profiles) {
    if (isTestStockProfile(profile)) testStock.push(profile);
    else production.push(profile);
  }
  return { production, testStock };
}
