/**
 * Pre-flight validation for "Define as Frame".
 * Returns a warning message if the rectangle does not meet system pack constraints.
 */

import { SYSTEM_PACKS } from '@/data/systemPacks';

export interface SystemPackConstraints {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
}

export function getSystemPackConstraints(systemPackId: string): SystemPackConstraints | null {
  const pack = SYSTEM_PACKS.find((p) => p.meta?.id === systemPackId);
  if (!pack) return null;
  const spec = (pack as { windowSystemSpec?: { constraints?: { minWidthMm?: number; maxWidthMm?: number; minHeightMm?: number; maxHeightMm?: number } } }).windowSystemSpec;
  const c = spec?.constraints;
  if (!c) return { minWidth: 400, maxWidth: 4000, minHeight: 400, maxHeight: 2600 };
  return {
    minWidth: c.minWidthMm ?? 400,
    maxWidth: c.maxWidthMm ?? 4000,
    minHeight: c.minHeightMm ?? 400,
    maxHeight: c.maxHeightMm ?? 2600,
  };
}

export function getDefineAsFrameWarning(
  widthMm: number,
  heightMm: number,
  systemPackId: string,
  packName?: string
): string | null {
  const constraints = getSystemPackConstraints(systemPackId);
  if (!constraints) return null;
  const name = packName ?? systemPackId;
  if (widthMm < constraints.minWidth) {
    return `Min width for ${name}: ${constraints.minWidth}mm. Current: ${Math.round(widthMm)}mm.`;
  }
  if (widthMm > constraints.maxWidth) {
    return `Max width for ${name}: ${constraints.maxWidth}mm. Current: ${Math.round(widthMm)}mm.`;
  }
  if (heightMm < constraints.minHeight) {
    return `Min height for ${name}: ${constraints.minHeight}mm. Current: ${Math.round(heightMm)}mm.`;
  }
  if (heightMm > constraints.maxHeight) {
    return `Max height for ${name}: ${constraints.maxHeight}mm. Current: ${Math.round(heightMm)}mm.`;
  }
  return null;
}

/** Min frame dimension for adding sash (typical system pack). */
const MIN_FRAME_FOR_SASH_MM = 400;

export function getAddSashWarning(widthMm: number, heightMm: number): string | null {
  if (widthMm < MIN_FRAME_FOR_SASH_MM) {
    return `Min width for sash: ${MIN_FRAME_FOR_SASH_MM}mm. Current: ${Math.round(widthMm)}mm.`;
  }
  if (heightMm < MIN_FRAME_FOR_SASH_MM) {
    return `Min height for sash: ${MIN_FRAME_FOR_SASH_MM}mm. Current: ${Math.round(heightMm)}mm.`;
  }
  return null;
}
