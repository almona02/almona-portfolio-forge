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

/** Minimum canvas strip the shell must keep hittable while panels are open. */
export const VIEWPORT_MIN_USABLE_CANVAS_PX = 120;

/** Reserved status strip height (px) outside the panel region. */
export const VIEWPORT_STATUS_ROW_PX = 72;

export type ViewportChromeMode = 'docked' | 'compact';

export type ViewportPanelPlacement =
  | 'parts-exclusive'
  | 'details-exclusive'
  | 'parts-drawer'
  | 'none';

export type ViewportInspectionMode = 'inline' | 'exclusive-parts' | 'exclusive-details';

export interface ViewportChromePolicyInput {
  widthPx: number | null;
  heightPx: number | null;
  partsOpen: boolean;
  detailsOpen: boolean;
  hasStatus: boolean;
}

export interface ViewportChromePolicy {
  mode: ViewportChromeMode;
  panelPlacement: ViewportPanelPlacement;
  /**
   * Compact + both open → Parts takes the drawer; details wait until Parts closes
   * (exclusive inspection). Docked may show Parts with details stacked under it
   * only when width leaves a usable canvas.
   */
  inspectionMode: ViewportInspectionMode;
  showParts: boolean;
  showDetails: boolean;
  /** Max panel column width so canvas keeps minUsableCanvasPx. */
  panelMaxWidthPx: number;
  statusRowPx: number;
  minUsableCanvasPx: number;
  /** True when height is too short for stacked panels + status. */
  shortContainer: boolean;
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
  const height = input.heightPx;
  const compact = width != null && width > 0 && width < VIEWPORT_COMPACT_WIDTH_PX;
  const mode: ViewportChromeMode = compact ? 'compact' : 'docked';
  const shortContainer =
    height != null && height > 0 && height < VIEWPORT_STATUS_ROW_PX + 180;

  const minUsable = VIEWPORT_MIN_USABLE_CANVAS_PX;
  const measuredW = width != null && width > 0 ? width : 1024;
  // Leave a hittable canvas strip; panels never claim more than the remainder.
  const panelMaxWidthPx = Math.max(
    160,
    Math.min(compact ? measuredW : 320, measuredW - minUsable),
  );

  let panelPlacement: ViewportPanelPlacement = 'none';
  let inspectionMode: ViewportInspectionMode = 'inline';
  let showParts = false;
  let showDetails = false;

  if (input.partsOpen && input.detailsOpen) {
    if (compact) {
      // Exclusive drawer: Parts wins while open; details reopen after Parts closes.
      panelPlacement = 'parts-drawer';
      inspectionMode = 'exclusive-parts';
      showParts = true;
      showDetails = false;
    } else if (measuredW - panelMaxWidthPx >= minUsable) {
      panelPlacement = 'parts-exclusive';
      inspectionMode = 'inline';
      showParts = true;
      showDetails = true; // stacked under Parts in the reserved column
    } else {
      panelPlacement = 'parts-drawer';
      inspectionMode = 'exclusive-parts';
      showParts = true;
      showDetails = false;
    }
  } else if (input.partsOpen) {
    panelPlacement = compact ? 'parts-drawer' : 'parts-exclusive';
    inspectionMode = compact ? 'exclusive-parts' : 'inline';
    showParts = true;
  } else if (input.detailsOpen) {
    panelPlacement = 'details-exclusive';
    inspectionMode = compact ? 'exclusive-details' : 'inline';
    showDetails = true;
  }

  return {
    mode,
    panelPlacement,
    inspectionMode,
    showParts,
    showDetails,
    panelMaxWidthPx,
    statusRowPx: input.hasStatus ? VIEWPORT_STATUS_ROW_PX : 0,
    minUsableCanvasPx: minUsable,
    shortContainer,
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
