/**
 * FP-028 / Phase 5 / P5.4 — Preview identity and estimate surface labels.
 *
 * Late 3D commits must match the still-current manufacturing identity.
 * Preview/BOM chrome must not claim manufacturing readiness without authority.
 */

import type { WindowGrid, WindowUnit } from '@/types/fabricator';

export type PreviewSurfaceStatus = 'estimate_only';

export interface PreviewSurfaceAssessment {
  readonly status: PreviewSurfaceStatus;
  readonly badgeLabel: 'ESTIMATE';
  readonly description: string;
}

/**
 * Identity token for 3D preview commits (aligned with BOM request key fields).
 */
export function buildPreviewRequestKey(
  unit: Pick<
    WindowUnit,
    'id' | 'revision' | 'overallWidth' | 'overallHeight' | 'quantity' | 'presetId' | 'systemPackId'
  >,
  grid: WindowGrid | null | undefined
): string {
  return JSON.stringify({
    id: unit.id,
    revision: unit.revision ?? null,
    systemPackId: unit.systemPackId ?? null,
    overallWidth: unit.overallWidth,
    overallHeight: unit.overallHeight,
    quantity: unit.quantity ?? 1,
    presetId: unit.presetId ?? null,
    grid: grid ?? null,
  });
}

/** True only when the in-flight request still matches the live identity. */
export function isPreviewCommitCurrent(
  currentKey: string | null | undefined,
  requestKey: string
): boolean {
  return Boolean(currentKey) && currentKey === requestKey;
}

/**
 * Design-studio 3D/BOM surfaces are estimate-only until a manufacturing
 * contract + approved authority revise the claim (Phase 4/6 gates).
 */
export function assessPreviewSurfaceAuthority(args: {
  readonly hasApprovedManufacturingContract?: boolean;
}): PreviewSurfaceAssessment {
  if (args.hasApprovedManufacturingContract) {
    // Reserved: contract-backed surfaces still labeled estimate in Design Studio
    // until Phase 6 production acceptance. Fail closed.
  }
  return {
    status: 'estimate_only',
    badgeLabel: 'ESTIMATE',
    description:
      'Estimate only — 3D preview and design BOM are not manufacturing-ready without an approved contract and authority revision.',
  };
}
