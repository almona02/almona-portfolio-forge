import type { GlassAllowanceSpec } from '@/data/systemPacks';

export interface DerivedGlassSize {
  widthMm: number;
  heightMm: number;
}

export interface GlassSizeValidationResult {
  size: DerivedGlassSize;
  isValid: boolean;
  errors: string[];
}

/**
 * Derive glass manufacturing size from a clear frame opening and system
 * glass allowances (edge clearance and bite).
 *
 * This assumes `openingWidthMm` / `openingHeightMm` are the clear opening
 * inside the frame pocket (before applying glass edge clearances).
 */
export function deriveGlassSize(
  openingWidthMm: number,
  openingHeightMm: number,
  allowances: GlassAllowanceSpec,
): GlassSizeValidationResult {
  const errors: string[] = [];

  if (openingWidthMm <= 0 || openingHeightMm <= 0) {
    errors.push('Opening dimensions must be positive.');
  }

  const widthMm = openingWidthMm - 2 * allowances.edgeClearanceMm;
  const heightMm = openingHeightMm - 2 * allowances.edgeClearanceMm;

  if (widthMm <= 0 || heightMm <= 0) {
    errors.push('Glass dimensions collapse after applying edge clearances – check system pack setup.');
  }

  const areaM2 = (widthMm * heightMm) / 1_000_000;

  if (allowances.maxWidthMm && widthMm > allowances.maxWidthMm) {
    errors.push(
      `Glass width ${widthMm.toFixed(1)}mm exceeds system max width ${allowances.maxWidthMm}mm.`,
    );
  }
  if (allowances.maxHeightMm && heightMm > allowances.maxHeightMm) {
    errors.push(
      `Glass height ${heightMm.toFixed(1)}mm exceeds system max height ${allowances.maxHeightMm}mm.`,
    );
  }
  if (allowances.maxAreaM2 && areaM2 > allowances.maxAreaM2) {
    errors.push(
      `Glass area ${areaM2.toFixed(2)}m² exceeds system max area ${allowances.maxAreaM2}m².`,
    );
  }

  return {
    size: { widthMm, heightMm },
    isValid: errors.length === 0,
    errors,
  };
}


