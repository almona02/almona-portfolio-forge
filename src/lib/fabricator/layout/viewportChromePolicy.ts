/**
 * Pure layout policy for 3D viewport chrome.
 * Breakpoints are measured **container** width/height — never window.innerWidth.
 * AICS-001: no geometry/solver state in this module.
 */

export const VIEWPORT_CHROME_Z = {
  canvas: 0,
  controls: 10,
  panels: 20,
  status: 15,
  modal: 40,
} as const;

/** Outer Engineering Bay right rail expanded width (plan acceptance fixture). */
export const ENGINEERING_BAY_PREVIEW_RAIL_PX = 380;

/** Below this container width, Parts and details must not sit side-by-side. */
export const VIEWPORT_COMPACT_WIDTH_PX = 420;

export const VIEWPORT_MIN_USABLE_CANVAS_PX = 160;

export type ViewportChromeMode = 'docked' | 'compact';

export type ViewportPanelPlacement =
  | 'parts-left-details-stack'
  | 'parts-exclusive'
  | 'details-exclusive'
  | 'none';

export interface ViewportChromePolicyInput {
  widthPx: number | null;
  heightPx: number | null;
  partsOpen: boolean;
  detailsOpen: boolean;
}

export interface ViewportChromePolicy {
  mode: ViewportChromeMode;
  panelPlacement: ViewportPanelPlacement;
  /** When true, Parts and details share one column (stacked scroll). */
  stackPartsAndDetails: boolean;
  minUsableCanvasPx: number;
  /** CSS z-index tokens for scoped chrome layers. */
  z: typeof VIEWPORT_CHROME_Z;
}

/**
 * Decide chrome docking from measured container size and open panels.
 * Unmeasured (null) width defaults to docked so SSR/tests stay stable.
 */
export function resolveViewportChromePolicy(
  input: ViewportChromePolicyInput,
): ViewportChromePolicy {
  const width = input.widthPx;
  const compact = width != null && width > 0 && width < VIEWPORT_COMPACT_WIDTH_PX;
  const mode: ViewportChromeMode = compact ? 'compact' : 'docked';

  let panelPlacement: ViewportPanelPlacement = 'none';
  let stackPartsAndDetails = false;

  if (input.partsOpen && input.detailsOpen) {
    if (compact) {
      // Exclusive: prefer Parts list; details stay reachable via selection after close,
      // but we stack both in one column so neither covers the other.
      panelPlacement = 'parts-left-details-stack';
      stackPartsAndDetails = true;
    } else {
      panelPlacement = 'parts-left-details-stack';
      stackPartsAndDetails = true;
    }
  } else if (input.partsOpen) {
    panelPlacement = 'parts-exclusive';
  } else if (input.detailsOpen) {
    panelPlacement = 'details-exclusive';
  }

  return {
    mode,
    panelPlacement,
    stackPartsAndDetails,
    minUsableCanvasPx: VIEWPORT_MIN_USABLE_CANVAS_PX,
    z: VIEWPORT_CHROME_Z,
  };
}

/** Outer shell rail policy from measured shell width (not viewport). */
export type ShellRailMode = 'inline' | 'collapse-left' | 'overlay';

export function resolveShellRailMode(containerWidthPx: number | null): ShellRailMode {
  if (containerWidthPx == null || containerWidthPx <= 0) return 'inline';
  if (containerWidthPx < 768) return 'overlay';
  if (containerWidthPx < 1280) return 'collapse-left';
  return 'inline';
}
