import type { FabricationData } from '@/types/fabricator';

/** cuttingLengths is the expanded physical ledger in millimetres, not a metre quantity. */
export function bomStockDemand(profiles: FabricationData['profiles']): Record<string, number> {
  if (!profiles.length) throw new Error('BOM has no physical profile ledger.');
  const demand: Record<string, number> = {};
  for (const profile of profiles) {
    const ownedId = profile.profileCode || profile.id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownedId)) {
      throw new Error(`Profile ${ownedId} requires an owned inventory UUID.`);
    }
    if (!profile.cuttingLengths?.length || profile.cuttingLengths.some(length => !Number.isFinite(length) || length <= 0)) {
      throw new Error(`Profile ${profile.id} has an invalid physical cut ledger.`);
    }
    demand[ownedId] = (demand[ownedId] ?? 0) + profile.cuttingLengths.reduce((sum, length) => sum + length, 0) / 1000;
  }
  return demand;
}
