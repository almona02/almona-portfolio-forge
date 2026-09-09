/**
 * FP-024 — YilmazCAD/DoWin parity length model (independent of calculateKFactor).
 *
 * Behavioural formulas from the licensed dealer audit (9 Sep 2026).
 * Not wired into generateOptimizedCutList / K-factor engines.
 * Do not treat ALMONA outputs from this module as DoWin expected lengths.
 *
 * Evidenced:
 *   sash rebate = finished − 2 × SashOffset
 *   sash horizontal = sashInnerW + YatayBasma + YatayKaynak + WeldingWaste
 *   sash vertical   = sashInnerH + DikeyBasma + DikeyKaynak + WeldingWaste
 *   glass           = daylight − 2 × GlazingClearance; reject < minGlass
 *   angle ends      = CompLessThan90 or CompGreaterThan90 left+right
 *
 * Unevidenced (DoWin seed Basma/Kaynak null on frame; mullion formula incomplete):
 *   frame horizontal / vertical, PVC mullion full length.
 */

import {
  YILMAZCAD_PARITY_MANUFACTURING_SETTINGS,
  roundManufacturingMm,
} from '@/lib/fabricator/ManufacturingSettings';
import type { DowinProfileOverlap } from '@/lib/fabricator/golden/dowinPhysicalLengthFixture';

export type DowinParityFormulaStatus = 'evidenced' | 'unevidenced';

export interface DowinParityLengthInput {
  finishedWidthMm: number;
  finishedHeightMm: number;
  overlap: DowinProfileOverlap;
  sashOffsetMm: number;
  weldingWasteMm: number;
  glazingClearanceMm: number;
  minGlassProductionSizeMm: number;
  pvcMullionOffsetMm: number;
  /** Optional daylight. If omitted, sash inner is used as daylight (documented approximation). */
  glassDaylightWidthMm?: number;
  glassDaylightHeightMm?: number;
  leftAngleDeg?: number;
  rightAngleDeg?: number;
  compLessThan90LeftMm?: number;
  compLessThan90RightMm?: number;
  compGreaterThan90LeftMm?: number;
  compGreaterThan90RightMm?: number;
}

export interface DowinParityLengthLine {
  category:
    | 'frame_horizontal'
    | 'frame_vertical'
    | 'sash_horizontal'
    | 'sash_vertical'
    | 'mullion'
    | 'glass'
    | 'angle_compensation';
  lengthMm: number | null;
  status: DowinParityFormulaStatus;
  note: string;
}

export interface DowinParityLengthResult {
  sashInnerWidthMm: number;
  sashInnerHeightMm: number;
  lines: DowinParityLengthLine[];
}

export function sashInnerOpeningMm(
  finishedMm: number,
  sashOffsetMm: number
): number {
  return roundManufacturingMm(finishedMm - 2 * sashOffsetMm);
}

export function sashHorizontalCutMm(
  finishedWidthMm: number,
  sashOffsetMm: number,
  overlap: Pick<DowinProfileOverlap, 'horizontalBasmaMm' | 'horizontalKaynakMm'>,
  weldingWasteMm: number
): number {
  const inner = sashInnerOpeningMm(finishedWidthMm, sashOffsetMm);
  return roundManufacturingMm(
    inner + overlap.horizontalBasmaMm + overlap.horizontalKaynakMm + weldingWasteMm
  );
}

export function sashVerticalCutMm(
  finishedHeightMm: number,
  sashOffsetMm: number,
  overlap: Pick<DowinProfileOverlap, 'verticalBasmaMm' | 'verticalKaynakMm'>,
  weldingWasteMm: number
): number {
  const inner = sashInnerOpeningMm(finishedHeightMm, sashOffsetMm);
  return roundManufacturingMm(
    inner + overlap.verticalBasmaMm + overlap.verticalKaynakMm + weldingWasteMm
  );
}

export function glassSizeMm(
  daylightMm: number,
  glazingClearanceMm: number,
  minGlassProductionSizeMm: number
): { lengthMm: number | null; rejected: boolean } {
  const size = roundManufacturingMm(daylightMm - 2 * glazingClearanceMm);
  if (size < minGlassProductionSizeMm) {
    return { lengthMm: null, rejected: true };
  }
  return { lengthMm: size, rejected: false };
}

export function endAngleCompensationMm(
  angleDeg: number,
  comps: {
    compLessThan90LeftMm: number;
    compLessThan90RightMm: number;
    compGreaterThan90LeftMm: number;
    compGreaterThan90RightMm: number;
  },
  end: 'left' | 'right'
): number {
  if (angleDeg < 90) {
    return end === 'left' ? comps.compLessThan90LeftMm : comps.compLessThan90RightMm;
  }
  if (angleDeg > 90) {
    return end === 'left' ? comps.compGreaterThan90LeftMm : comps.compGreaterThan90RightMm;
  }
  return 0;
}

export function computeDowinParityLengths(
  input: DowinParityLengthInput
): DowinParityLengthResult {
  const sashInnerWidthMm = sashInnerOpeningMm(input.finishedWidthMm, input.sashOffsetMm);
  const sashInnerHeightMm = sashInnerOpeningMm(input.finishedHeightMm, input.sashOffsetMm);

  const sashH = sashHorizontalCutMm(
    input.finishedWidthMm,
    input.sashOffsetMm,
    input.overlap,
    input.weldingWasteMm
  );
  const sashV = sashVerticalCutMm(
    input.finishedHeightMm,
    input.sashOffsetMm,
    input.overlap,
    input.weldingWasteMm
  );

  const daylightW = input.glassDaylightWidthMm ?? sashInnerWidthMm;
  const daylightH = input.glassDaylightHeightMm ?? sashInnerHeightMm;
  const glassW = glassSizeMm(
    daylightW,
    input.glazingClearanceMm,
    input.minGlassProductionSizeMm
  );
  const glassH = glassSizeMm(
    daylightH,
    input.glazingClearanceMm,
    input.minGlassProductionSizeMm
  );

  const left = input.leftAngleDeg ?? 45;
  const right = input.rightAngleDeg ?? 45;
  const comps = {
    compLessThan90LeftMm: input.compLessThan90LeftMm ?? 0,
    compLessThan90RightMm: input.compLessThan90RightMm ?? 0,
    compGreaterThan90LeftMm: input.compGreaterThan90LeftMm ?? 0,
    compGreaterThan90RightMm: input.compGreaterThan90RightMm ?? 0,
  };
  const angleExtra = roundManufacturingMm(
    endAngleCompensationMm(left, comps, 'left') +
      endAngleCompensationMm(right, comps, 'right')
  );

  const lines: DowinParityLengthLine[] = [
    {
      category: 'frame_horizontal',
      lengthMm: null,
      status: 'unevidenced',
      note: 'DoWin seed Basma/Kaynak is null on frames. Do not guess a frame formula.',
    },
    {
      category: 'frame_vertical',
      lengthMm: null,
      status: 'unevidenced',
      note: 'DoWin seed Basma/Kaynak is null on frames. Do not guess a frame formula.',
    },
    {
      category: 'sash_horizontal',
      lengthMm: sashH,
      status: 'evidenced',
      note: 'sashInnerW + YatayBasma + YatayKaynak + WeldingWaste',
    },
    {
      category: 'sash_vertical',
      lengthMm: sashV,
      status: 'evidenced',
      note: 'sashInnerH + DikeyBasma + DikeyKaynak + WeldingWaste',
    },
    {
      category: 'mullion',
      lengthMm: null,
      status: 'unevidenced',
      note: 'Dealer audit only records +PvcMullionOffset; full mullion length formula is not evidenced.',
    },
    {
      category: 'glass',
      lengthMm: glassW.lengthMm,
      status: 'evidenced',
      note: glassW.rejected
        ? `rejected: below min glass ${input.minGlassProductionSizeMm} mm`
        : `daylightW − 2×GlazingClearance (height pane ${glassH.lengthMm ?? 'rejected'})`,
    },
    {
      category: 'angle_compensation',
      lengthMm: angleExtra,
      status: 'evidenced',
      note: 'CompLessThan90 / CompGreaterThan90 left+right; factory defaults 0',
    },
  ];

  return { sashInnerWidthMm, sashInnerHeightMm, lines };
}

/** Convenience input using yilmazcad-parity settings + Deceuninck 70 Z overlap. */
export function deceuninck70zParityInput(
  finishedWidthMm: number,
  finishedHeightMm: number
): DowinParityLengthInput {
  const s = YILMAZCAD_PARITY_MANUFACTURING_SETTINGS;
  return {
    finishedWidthMm,
    finishedHeightMm,
    overlap: {
      horizontalBasmaMm: 12,
      verticalBasmaMm: 16,
      horizontalKaynakMm: 6,
      verticalKaynakMm: 6,
    },
    sashOffsetMm: s.sashOffsetMm,
    weldingWasteMm: s.weldingWasteMm,
    glazingClearanceMm: s.glazingClearanceMm,
    minGlassProductionSizeMm: 50,
    pvcMullionOffsetMm: s.pvcMullionOffsetMm,
    compLessThan90LeftMm: s.compLessThan90LeftMm,
    compLessThan90RightMm: s.compLessThan90RightMm,
    compGreaterThan90LeftMm: s.compGreaterThan90LeftMm,
    compGreaterThan90RightMm: s.compGreaterThan90RightMm,
  };
}
