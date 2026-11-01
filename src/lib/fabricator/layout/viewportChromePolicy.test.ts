import { describe, expect, it } from 'vitest';
import {
  ENGINEERING_BAY_PREVIEW_RAIL_PX,
  resolveShellRailMode,
  resolveViewportChromePolicy,
  VIEWPORT_COMPACT_WIDTH_PX,
  VIEWPORT_MIN_USABLE_CANVAS_PX,
} from './viewportChromePolicy';

describe('resolveViewportChromePolicy', () => {
  it('defaults to docked when unmeasured', () => {
    const p = resolveViewportChromePolicy({
      widthPx: null,
      heightPx: null,
      partsOpen: true,
      detailsOpen: true,
      hasStatus: true,
    });
    expect(p.mode).toBe('docked');
    expect(p.showParts).toBe(true);
  });

  it('at 380px with Parts+details: exclusive Parts drawer — details deferred, canvas reserved', () => {
    expect(ENGINEERING_BAY_PREVIEW_RAIL_PX).toBe(380);
    expect(ENGINEERING_BAY_PREVIEW_RAIL_PX).toBeLessThan(VIEWPORT_COMPACT_WIDTH_PX);

    const p = resolveViewportChromePolicy({
      widthPx: ENGINEERING_BAY_PREVIEW_RAIL_PX,
      heightPx: 720,
      partsOpen: true,
      detailsOpen: true,
      hasStatus: true,
    });
    expect(p.mode).toBe('compact');
    expect(p.inspectionMode).toBe('exclusive-parts');
    expect(p.showParts).toBe(true);
    expect(p.showDetails).toBe(false);
    expect(p.panelMaxWidthPx).toBeLessThanOrEqual(380 - VIEWPORT_MIN_USABLE_CANVAS_PX);
    expect(p.statusRowPx).toBeGreaterThan(0);
  });

  it('marks short containers', () => {
    const p = resolveViewportChromePolicy({
      widthPx: 380,
      heightPx: 120,
      partsOpen: true,
      detailsOpen: false,
      hasStatus: true,
    });
    expect(p.shortContainer).toBe(true);
  });

  it('details-exclusive when Parts closed', () => {
    const p = resolveViewportChromePolicy({
      widthPx: 1024,
      heightPx: 800,
      partsOpen: false,
      detailsOpen: true,
      hasStatus: false,
    });
    expect(p.mode).toBe('docked');
    expect(p.panelPlacement).toBe('details-exclusive');
    expect(p.showDetails).toBe(true);
  });
});

describe('resolveShellRailMode', () => {
  it('uses container width bands', () => {
    expect(resolveShellRailMode(null)).toBe('inline');
    expect(resolveShellRailMode(500)).toBe('overlay');
    expect(resolveShellRailMode(900)).toBe('collapse-left');
    expect(resolveShellRailMode(1400)).toBe('inline');
  });
});
