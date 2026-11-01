import { describe, expect, it } from 'vitest';
import {
  ENGINEERING_BAY_PREVIEW_RAIL_PX,
  resolveShellRailMode,
  resolveViewportChromePolicy,
  VIEWPORT_COMPACT_WIDTH_PX,
} from './viewportChromePolicy';

describe('resolveViewportChromePolicy', () => {
  it('defaults to docked when unmeasured', () => {
    const p = resolveViewportChromePolicy({
      widthPx: null,
      heightPx: null,
      partsOpen: true,
      detailsOpen: true,
    });
    expect(p.mode).toBe('docked');
    expect(p.stackPartsAndDetails).toBe(true);
  });

  it('stacks Parts + details at Engineering Bay 380px rail — never side-by-side cards', () => {
    expect(ENGINEERING_BAY_PREVIEW_RAIL_PX).toBe(380);
    expect(ENGINEERING_BAY_PREVIEW_RAIL_PX).toBeLessThan(VIEWPORT_COMPACT_WIDTH_PX);

    const p = resolveViewportChromePolicy({
      widthPx: ENGINEERING_BAY_PREVIEW_RAIL_PX,
      heightPx: 720,
      partsOpen: true,
      detailsOpen: true,
    });
    expect(p.mode).toBe('compact');
    expect(p.stackPartsAndDetails).toBe(true);
    expect(p.panelPlacement).toBe('parts-left-details-stack');
  });

  it('keeps exclusive Parts when details closed', () => {
    const p = resolveViewportChromePolicy({
      widthPx: 380,
      heightPx: 600,
      partsOpen: true,
      detailsOpen: false,
    });
    expect(p.panelPlacement).toBe('parts-exclusive');
    expect(p.stackPartsAndDetails).toBe(false);
  });

  it('details-exclusive when Parts closed', () => {
    const p = resolveViewportChromePolicy({
      widthPx: 1024,
      heightPx: 800,
      partsOpen: false,
      detailsOpen: true,
    });
    expect(p.mode).toBe('docked');
    expect(p.panelPlacement).toBe('details-exclusive');
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
