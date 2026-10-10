/**
 * Simulates save → reload / fresh-login payload persistence for evidence v2.
 * Not a live Auth walk — proves the design ledger + kerf fields survive JSON round-trip.
 */
import { describe, expect, it } from 'vitest';
import {
  sha256Hex,
  validateOptimizationEvidencePayload,
  type OptimizationEvidencePayload,
} from './validateOptimizationEvidencePayload';

describe('optimization evidence persistence (reload / fresh login shape)', () => {
  it('round-trips schemaVersion 2 payload through JSON without losing ledger bind', async () => {
    const original: OptimizationEvidencePayload = {
      schema: 'almona.optimization-result',
      schemaVersion: 2,
      kerfMm: 4,
      trimMm: 0,
      requiredCuts: [
        { cutId: 'frame:0', profileId: 'PS-FRAME', length: 1200, angle: 45 },
        { cutId: 'frame:1', profileId: 'PS-FRAME', length: 1400, angle: 45 },
      ],
      cuttingPlan: [
        {
          stockLength: 6000,
          profile: { id: 'PS-FRAME' },
          cuts: [
            { cutId: 'frame:0', length: 1200, angle: 45 },
            { cutId: 'frame:1', length: 1400, angle: 45 },
          ],
        },
      ],
    };

    const reloaded = JSON.parse(JSON.stringify(original)) as OptimizationEvidencePayload;
    const before = validateOptimizationEvidencePayload(original, 2);
    const after = validateOptimizationEvidencePayload(reloaded, 2);
    expect(before.ok && after.ok).toBe(true);
    if (!before.ok || !after.ok) return;

    expect(await sha256Hex(before.designCanonical)).toBe(await sha256Hex(after.designCanonical));
    expect(await sha256Hex(before.placementCanonical)).toBe(
      await sha256Hex(after.placementCanonical),
    );
    const ledger = `${await sha256Hex(before.designCanonical)}||${await sha256Hex(before.placementCanonical)}`;
    expect(ledger).toMatch(/^[a-f0-9]{64}\|\|[a-f0-9]{64}$/);
  });
});
