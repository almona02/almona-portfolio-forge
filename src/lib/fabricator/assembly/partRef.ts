/**
 * Visual part reference shared by the assembly manifest and the 3D renderer.
 *
 * A part ref names *where a piece sits in the assembly* (kind, cell, placement,
 * occurrence index). It is derived deterministically from the saved design or the
 * generated geometry, never from a mesh UUID, so the same saved revision always
 * yields the same keys (AICS-001: deterministic string composition only).
 */

export type AssemblyPartKind =
  | 'frame'
  | 'sash'
  | 'bead'
  | 'interlock'
  | 'mullion'
  | 'transom'
  | 'track'
  | 'track_guide'
  | 'glass'
  | 'spacer'
  | 'gasket'
  | 'corner'
  | 'screen_sash'
  | 'screen_mesh'
  | 'hardware';

export type AssemblyPlacement = 'top' | 'bottom' | 'left' | 'right';
export type AssemblyCornerPlacement = 'top_left' | 'top_right' | 'bottom_right' | 'bottom_left';

export interface AssemblyPartRef {
  kind: AssemblyPartKind;
  /** Grid cell the piece belongs to; null for frame-level pieces. */
  cellId: string | null;
  /** Member placement (frame/sash/bead) or corner position; hardware uses its type here. */
  placement: string | null;
  /** Occurrence index for repeated pieces (tracks, interlocks, rollers…) or a manual-mullion id. */
  index: number | string | null;
}

const SEPARATOR = '|';

export function partRefKey(ref: AssemblyPartRef): string {
  return [ref.kind, ref.cellId ?? '', ref.placement ?? '', ref.index == null ? '' : String(ref.index)].join(SEPARATOR);
}

export function parsePartRefKey(key: string | null | undefined): AssemblyPartRef | null {
  if (typeof key !== 'string') return null;
  const [kind, cellId, placement, index] = key.split(SEPARATOR);
  if (!kind) return null;
  const numeric = index !== undefined && index !== '' && /^\d+$/.test(index) ? Number(index) : index;
  return {
    kind: kind as AssemblyPartKind,
    cellId: cellId ? cellId : null,
    placement: placement ? placement : null,
    index: numeric === undefined || numeric === '' ? null : numeric,
  };
}

/** Map `createGoldTierMiteredFrame` metadata.type to an assembly placement. */
export function placementFromBarType(type: string | undefined): AssemblyPlacement | null {
  switch (type) {
    case 'top_bar': return 'top';
    case 'bottom_bar': return 'bottom';
    case 'left_bar': return 'left';
    case 'right_bar': return 'right';
    default: return null;
  }
}

export const CORNER_ORDER: AssemblyCornerPlacement[] = ['top_left', 'top_right', 'bottom_right', 'bottom_left'];
export const BORDER_ORDER: AssemblyPlacement[] = ['top', 'bottom', 'left', 'right'];
