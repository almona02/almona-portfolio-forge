/**
 * AICS-001 / FP-023A — manufacturing settings must not silently fragment.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { calculateKFactor } from '@/lib/fabricator/UPVCCuttingEngine';
import {
  PLATFORM_MANUFACTURING_DEFAULTS,
  resolveManufacturingSettings,
} from '@/lib/fabricator/ManufacturingSettings';
import {
  DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION,
  DOWIN_GOLDEN_FIXTURE_STATUS,
} from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';

function sourceOf(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf8');
}

describe('AICS-001 FP-023A manufacturing settings contract', () => {
  test('canonical consumers import ManufacturingSettings rather than independent kerf literals', () => {
    const linear = sourceOf('src/lib/algorithms/LinearOptimizer.ts');
    const almona = sourceOf('src/lib/fabricator/AlmonaCuttingEngine.ts');
    const visual = sourceOf('src/components/fabricator/VisualCuttingPlan.tsx');
    const cutSheet = sourceOf('src/lib/fabricator/production/CutSheetGenerator.ts');
    const batch = sourceOf('src/lib/fabricator/production/BatchOptimizationService.ts');

    expect(linear).toContain('PLATFORM_MANUFACTURING_DEFAULTS');
    expect(linear).not.toMatch(/kerfWidth:\s*number\s*=\s*5\b/);
    expect(almona).toContain('resolveManufacturingSettings');
    expect(almona).not.toMatch(/const DEFAULT_SAW_KERF\s*=\s*10/);
    expect(visual).toContain('PLATFORM_MANUFACTURING_DEFAULTS');
    expect(visual).not.toMatch(/DEFAULT_SAW_KERF_MM\s*=\s*10/);
    expect(cutSheet).toContain('resolveManufacturingSettings');
    expect(cutSheet).not.toMatch(/cut\.length \+ 4/);
    expect(batch).toContain('settings.sawKerfMm');
    expect(batch).not.toMatch(/const KERF_MM\s*=\s*5/);
  });

  test('ManufacturingSettings resolution is deterministic (no Date.now / Math.random)', () => {
    const src = sourceOf('src/lib/fabricator/ManufacturingSettings.ts');
    expect(src).not.toMatch(/Date\.now\s*\(/);
    expect(src).not.toMatch(/Math\.random\s*\(/);
    const a = resolveManufacturingSettings({ machineId: 'upvc-single-head' });
    const b = resolveManufacturingSettings({ machineId: 'upvc-single-head' });
    expect(a.sawKerfMm).toBe(3);
    expect(a.sawKerfMm).toBe(b.sawKerfMm);
    expect(a.sawKerfMm).not.toBe(PLATFORM_MANUFACTURING_DEFAULTS.sawKerfMm);
  });

  test('calculateKFactor remains available (FP-023A does not delete it)', () => {
    const k = calculateKFactor({
      profileWidthMm: 70,
      wallThicknessMm: 2.5,
      miterAngleDegrees: 45,
    });
    expect(k).toBeGreaterThan(0);
  });

  test('DoWin golden fixture remains PENDING_EXTERNAL_FIXTURE', () => {
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.status).toBe(DOWIN_GOLDEN_FIXTURE_STATUS);
    expect(DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows).toEqual([]);
    expect(
      DECEUNINCK_70Z_SASH_GOLDEN_PREPARATION.rows.every((row) => row.expectedLengthMm == null)
    ).toBe(true);
  });
});
