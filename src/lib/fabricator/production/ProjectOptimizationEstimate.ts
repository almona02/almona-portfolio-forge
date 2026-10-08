import { optimizeLinearCuts, type CutRequest, type OptimizationResult } from '@/lib/algorithms/LinearOptimizer';
import { PLATFORM_MANUFACTURING_DEFAULTS } from '@/lib/fabricator/ManufacturingSettings';
import { physicalCutForOccurrence } from '@/lib/fabricator/optimization/physicalCutContract';
import { resolveEstimatePattern } from '@/lib/fabricator/bom/resolveEstimatePattern';
import { countRequiredProfilePieces } from '@/lib/fabricator/bom/bomQualification';
import type { EgyptianPattern } from '@/data/egyptian-window-patterns';
import type { SystemPack, WindowUnit } from '@/types/fabricator';

/**
 * Pattern used only to count required ledger pieces. Preset/fixed manual grids
 * use resolveEstimatePattern; complete sash/sliding ledgers fall back to the
 * saved grid + opening type so optimizer consumption is not blocked.
 */
function patternForLedgerCount(position: WindowUnit): EgyptianPattern {
  try {
    return resolveEstimatePattern(position);
  } catch (error) {
    const grid = position.grid;
    if (!grid?.cells?.length) throw error;
    const sliding =
      String(position.type ?? '').toLowerCase().includes('sliding') ||
      grid.cells.some((cell) => String(cell.type ?? '').toLowerCase().includes('sliding'));
    return {
      id: `saved-ledger:${position.id}`,
      name: 'Saved design ledger (estimate)',
      type: sliding ? 'sliding' : String(position.type || 'fixed'),
      openingMechanism: sliding ? { type: 'sliding' } : undefined,
      gridSpec: grid,
      mullions: [],
      transoms: [],
    } as unknown as EgyptianPattern;
  }
}

export interface ProjectOptimizationEstimate {
  classification: 'estimate_only';
  manufacturingEligible: false;
  positions: number;
  pieces: number;
  groups: Array<{ profileId: string; systemPackId: string; stockLengthMm: number; kerfMm: number; trimMm: number; result: OptimizationResult }>;
}

/** Pool only identical saved profiles and settings; never create production evidence. */
export function optimizeProjectEstimate(positions: readonly WindowUnit[], packs: readonly SystemPack[]): ProjectOptimizationEstimate {
  if (!positions.length) throw new Error('No saved positions to optimize.');
  const groups = new Map<string, ProjectOptimizationEstimate['groups'][number] & { requests: CutRequest[] }>();
  const positionIds = new Set<string>();
  let pieces = 0;
  for (const position of positions) {
    const label = `Pose ${position.posNumber || position.id}`;
    if (positionIds.has(position.id)) throw new Error(`${label}: duplicate position identity.`);
    positionIds.add(position.id);
    const pack = packs.find(pack => pack.meta.id === position.systemPackId);
    if (!pack) throw new Error(`${label}: saved system pack is unavailable to the signed-in owner.`);
    const pattern = patternForLedgerCount(position);
    const expected = countRequiredProfilePieces(position, pattern);
    const actual = (position.components ?? []).reduce((sum, component) => sum + component.cuttingLengths.length, 0);
    if (actual !== expected) throw new Error(`${label}: incomplete saved cut ledger (${actual}/${expected} pieces). Resolve frame and divider profiles in Design.`);
    const quantity = position.quantity ?? 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error(`${label}: quantity must be a positive integer.`);
    for (const component of position.components) {
      const profile = component.profile;
      if (!profile?.id || !pack.profiles?.some(candidate => candidate.id === profile.id)) {
        throw new Error(`${label}: component profile is missing from the saved system pack.`);
      }
      const savedProfile = pack.profiles.find(candidate => candidate.id === profile.id)!;
      const specs = savedProfile.specifications ?? {};
      const stockLengthMm = Number(savedProfile.barLength ?? specs.barLength ?? 6000);
      // Simple tuning saves millimetres in specifications (not FenestrationSystem microns).
      const kerfMm = Number(specs.sawKerf ?? PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm);
      const trimMm = Number(specs.barEndTrim ?? PLATFORM_MANUFACTURING_DEFAULTS.trimCutMm);
      if (![stockLengthMm, kerfMm, trimMm].every(Number.isFinite) || stockLengthMm <= 0 || kerfMm < 0 || trimMm < 0 || trimMm >= stockLengthMm) {
        throw new Error(`${label}: invalid stock, kerf or trim settings for ${profile.id}.`);
      }
      const key = JSON.stringify([pack.meta.id, profile.id, stockLengthMm, kerfMm, trimMm]);
      let group = groups.get(key);
      if (!group) {
        group = { profileId: profile.id, systemPackId: pack.meta.id, stockLengthMm, kerfMm, trimMm,
          requests: [], result: { stockUsed: [], totalStockLength: 0, totalCutLength: 0, totalWaste: 0, efficiency: 0, barsCount: 0 } };
        groups.set(key, group);
      }
      component.cuttingLengths.forEach((_, index) => {
        const cut = physicalCutForOccurrence(component, index, profile, position.systemPackId);
        if (!Number.isFinite(cut.length) || cut.length <= 0 || cut.length + kerfMm + trimMm > stockLengthMm) {
          throw new Error(`${label}: cut ${component.id}:${index} does not fit stock after kerf and trim.`);
        }
        group!.requests.push({ id: `${position.id}:${component.id}:${index}`, length: cut.length, quantity, label: `${label} · ${component.type} · ${index + 1}` });
        pieces += quantity;
      });
    }
  }
  return { classification: 'estimate_only', manufacturingEligible: false, positions: positions.length, pieces,
    groups: Array.from(groups.values()).map(({ requests, ...group }) => {
      const result = optimizeLinearCuts(requests, group.stockLengthMm, group.kerfMm, group.trimMm);
      const required = requests.reduce((sum, request) => sum + request.quantity, 0);
      if (result.stockUsed.reduce((sum, bar) => sum + bar.cuts.length, 0) !== required || result.stockUsed.some(bar => bar.waste < 0)) {
        throw new Error('Batch estimate failed cut reconciliation; no complete result was produced.');
      }
      return { ...group, result };
    }),
  };
}
