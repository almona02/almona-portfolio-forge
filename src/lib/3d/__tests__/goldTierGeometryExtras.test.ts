import { describe, expect, it } from 'vitest';
import { createFrameWithOpeningPocket } from '../csgTrueMiters';
import { solveMullionTransomLayout } from '../mullionConstraintSolver';

describe('Phase 7 gold-tier geometry extras', () => {
  it('CSG frame pocket yields non-empty geometry', () => {
    const geo = createFrameWithOpeningPocket({
      width: 1.2,
      height: 1.5,
      profileWidth: 0.05,
    });
    expect(geo.attributes.position.count).toBeGreaterThan(8);
    geo.dispose();
  });

  it('kiwi mullion solver equal-panels 1 mullion + 1 transom', () => {
    const result = solveMullionTransomLayout({
      outerWidthMm: 1200,
      outerHeightMm: 1500,
      frameWidthMm: 50,
      verticalMullionCount: 1,
      horizontalTransomCount: 1,
      minPanelWidthMm: 250,
      minPanelHeightMm: 250,
    });
    expect(result.ok).toBe(true);
    expect(result.mullionXs).toHaveLength(1);
    expect(result.transomYs).toHaveLength(1);
    expect(result.panelWidthsMm[0]).toBeCloseTo(result.panelWidthsMm[1], 0);
    expect(result.mullionXs[0]).toBeCloseTo(50 + 550, 0);
  });

  it('kiwi rejects over-divided layout', () => {
    const result = solveMullionTransomLayout({
      outerWidthMm: 800,
      outerHeightMm: 800,
      frameWidthMm: 50,
      verticalMullionCount: 5,
      horizontalTransomCount: 0,
      minPanelWidthMm: 250,
    });
    expect(result.ok).toBe(false);
  });
});
