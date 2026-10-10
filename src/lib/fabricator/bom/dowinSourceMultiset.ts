/**
 * Evidence-only DoWin profile cut multisets (AICS-001).
 * Source expected counts are never adjusted to match the generator.
 */

export type DowinSourceCut = {
  assembly: string;
  profileCode: string;
  nominalLengthMm: number;
  leftAngleDeg: number;
  rightAngleDeg: number;
  quantity: number;
  sourceFile?: string;
};

export type DowinSourcePosition = {
  key: string;
  position: string;
  order: string;
  n: number;
  total: number;
  layout: string;
  cuts: DowinSourceCut[];
};

export type DowinSourceReference = {
  source: string;
  capturedAt: string;
  positions: DowinSourcePosition[];
};

/** Exact source multiset key: profile|length|leftAngle|rightAngle (3 dp length). */
export function dowinCutKey(cut: Pick<DowinSourceCut, 'profileCode' | 'nominalLengthMm' | 'leftAngleDeg' | 'rightAngleDeg'>): string {
  return [
    String(cut.profileCode),
    Number(cut.nominalLengthMm).toFixed(3),
    Number(cut.leftAngleDeg),
    Number(cut.rightAngleDeg),
  ].join('|');
}

/** Expand quantity into multiset keys (sorted). */
export function dowinPositionMultiset(position: DowinSourcePosition): string[] {
  const keys: string[] = [];
  for (const cut of position.cuts ?? []) {
    const qty = Number(cut.quantity);
    if (!Number.isFinite(qty) || qty < 1) continue;
    const key = dowinCutKey(cut);
    for (let i = 0; i < qty; i += 1) keys.push(key);
  }
  return keys.sort();
}

export type MultisetMismatchReport = {
  leftLabel: string;
  rightLabel: string;
  leftCount: number;
  rightCount: number;
  matched: boolean;
  missingInRight: string[];
  extraInRight: string[];
};

/** Exact multiset diff — never rewrites either side. */
export function reportMultisetMismatch(
  left: readonly string[],
  right: readonly string[],
  labels: { leftLabel: string; rightLabel: string },
): MultisetMismatchReport {
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  const missingInRight: string[] = [];
  const extraInRight: string[] = [];
  let i = 0;
  let j = 0;
  while (i < leftSorted.length || j < rightSorted.length) {
    const a = leftSorted[i];
    const b = rightSorted[j];
    if (a === undefined) {
      extraInRight.push(b);
      j += 1;
      continue;
    }
    if (b === undefined) {
      missingInRight.push(a);
      i += 1;
      continue;
    }
    if (a === b) {
      i += 1;
      j += 1;
    } else if (a < b) {
      missingInRight.push(a);
      i += 1;
    } else {
      extraInRight.push(b);
      j += 1;
    }
  }
  return {
    leftLabel: labels.leftLabel,
    rightLabel: labels.rightLabel,
    leftCount: leftSorted.length,
    rightCount: rightSorted.length,
    matched: missingInRight.length === 0 && extraInRight.length === 0,
    missingInRight,
    extraInRight,
  };
}

export const DOWIN_LAYOUT_FAMILIES = [
  'double casement with structural mullion',
  'single fixed 500x500',
  'single casement 1000x1500',
  'fixed left / casement right 1000x1500',
  'two fixed panes 1200x1200',
] as const;

export type DowinLayoutFamily = (typeof DOWIN_LAYOUT_FAMILIES)[number];

export function groupPositionsByLayout(
  positions: readonly DowinSourcePosition[],
): Record<string, DowinSourcePosition[]> {
  const out: Record<string, DowinSourcePosition[]> = {};
  for (const position of positions) {
    const layout = position.layout || 'unknown';
    (out[layout] ??= []).push(position);
  }
  return out;
}
