import type { SystemPack, WindowUnit } from '@/types/fabricator';

/** Exact source receipt: changed quantities, designs, profiles or tuning invalidate estimates. */
export function estimateSource(positions: readonly WindowUnit[], packs: readonly SystemPack[]): string {
  const ids = new Set(positions.map(position => position.systemPackId));
  return JSON.stringify({
    positions: [...positions].sort((a, b) => a.id.localeCompare(b.id)),
    packs: packs.filter(pack => ids.has(pack.meta.id)).sort((a, b) => a.meta.id.localeCompare(b.meta.id)),
  });
}
