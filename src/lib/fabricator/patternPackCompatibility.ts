/**
 * Separate reusable layout templates from certified pack compatibility.
 * AICS-001: deterministic rule checks only (no ML).
 *
 * - Layout templates: patterns usable as geometry suggestions (may come from donors).
 * - Certified: pattern lists the pack id directly in compatibleSystems.
 * Applying a non-certified template requires explicit operator confirmation.
 */

import {
  EGYPTIAN_PATTERNS,
  getPatternsForSystem,
  type EgyptianPattern,
} from '@/data/egyptian-window-patterns';
import { SYSTEM_PACKS } from '@/data/systemPacks';
import { getConstraintsForSystemPack } from '@/lib/fabricatorValidation';

export type PatternPackFitKind = 'certified' | 'layout_template' | 'incompatible';

export interface PatternPackFit {
  kind: PatternPackFitKind;
  patternId: string;
  systemPackId: string;
  reasons: string[];
  /** False when dimensional or opening limits forbid apply even as a template. */
  canApplyAsTemplate: boolean;
  requiresConfirmation: boolean;
}

/** Patterns listed directly on the pack (certified), excluding donor expansion. */
export function getCertifiedPatternsForPack(systemPackId: string): EgyptianPattern[] {
  return EGYPTIAN_PATTERNS.filter((p) => p.compatibleSystems.includes(systemPackId));
}

/** True when the pattern certifies the pack id (not only a similar donor). */
export function isPatternCertifiedForPack(patternId: string, systemPackId: string): boolean {
  const pattern = EGYPTIAN_PATTERNS.find((p) => p.id === patternId);
  return Boolean(pattern?.compatibleSystems.includes(systemPackId));
}

/**
 * Layout templates available for the pack UI (certified ∪ similar-pack donors).
 * Alias kept for call-site clarity; delegates to getPatternsForSystem.
 */
export function getLayoutTemplatesForSystem(systemPackId: string): EgyptianPattern[] {
  return getPatternsForSystem(systemPackId);
}

function openingTypeSupported(pattern: EgyptianPattern, packId: string): string | null {
  const pack = SYSTEM_PACKS.find((p) => p.meta.id === packId);
  const spec = pack?.windowSystemSpec as
    | { supportedOpenings?: string[]; openingTypes?: string[] }
    | undefined;
  const supported = spec?.supportedOpenings || spec?.openingTypes;
  if (!supported?.length) return null; // unknown → do not invent a hard block
  const needle = pattern.type.toLowerCase();
  const ok = supported.some((s) => {
    const v = String(s).toLowerCase();
    return v === needle || v.includes(needle) || needle.includes(v);
  });
  return ok ? null : `Opening type "${pattern.type}" is not listed for pack ${packId}`;
}

/**
 * Assess whether a pattern may be applied to the selected pack at the given size.
 */
export function assessPatternPackFit(input: {
  patternId: string;
  systemPackId: string;
  widthMm: number;
  heightMm: number;
}): PatternPackFit {
  const pattern = EGYPTIAN_PATTERNS.find((p) => p.id === input.patternId);
  const reasons: string[] = [];

  if (!pattern) {
    return {
      kind: 'incompatible',
      patternId: input.patternId,
      systemPackId: input.systemPackId,
      reasons: [`Unknown pattern "${input.patternId}"`],
      canApplyAsTemplate: false,
      requiresConfirmation: false,
    };
  }

  const templates = getLayoutTemplatesForSystem(input.systemPackId);
  const inTemplateSet = templates.some((p) => p.id === pattern.id);
  if (!inTemplateSet) {
    return {
      kind: 'incompatible',
      patternId: pattern.id,
      systemPackId: input.systemPackId,
      reasons: [`Pattern "${pattern.id}" is not available as a layout template for ${input.systemPackId}`],
      canApplyAsTemplate: false,
      requiresConfirmation: false,
    };
  }

  const certified = isPatternCertifiedForPack(pattern.id, input.systemPackId);
  if (!certified) {
    reasons.push(
      `Layout template from a similar pack — not certified for ${input.systemPackId}. Confirm to apply geometry only.`,
    );
  }

  const [minW, maxW] = pattern.typicalWidthMm;
  const [minH, maxH] = pattern.typicalHeightMm;
  if (input.widthMm < minW || input.widthMm > maxW) {
    reasons.push(`Width ${input.widthMm} mm is outside pattern typical range ${minW}–${maxW} mm`);
  }
  if (input.heightMm < minH || input.heightMm > maxH) {
    reasons.push(`Height ${input.heightMm} mm is outside pattern typical range ${minH}–${maxH} mm`);
  }

  const constraints = getConstraintsForSystemPack(input.systemPackId);
  if (constraints?.minWidthMm && input.widthMm < constraints.minWidthMm) {
    reasons.push(`Width below pack minimum ${constraints.minWidthMm} mm`);
  }
  if (constraints?.maxWidthMm && input.widthMm > constraints.maxWidthMm) {
    reasons.push(`Width above pack maximum ${constraints.maxWidthMm} mm`);
  }
  if (constraints?.minHeightMm && input.heightMm < constraints.minHeightMm) {
    reasons.push(`Height below pack minimum ${constraints.minHeightMm} mm`);
  }
  if (constraints?.maxHeightMm && input.heightMm > constraints.maxHeightMm) {
    reasons.push(`Height above pack maximum ${constraints.maxHeightMm} mm`);
  }
  if (constraints?.maxAreaM2) {
    const area = (input.widthMm * input.heightMm) / 1_000_000;
    if (area > constraints.maxAreaM2) {
      reasons.push(`Area ${area.toFixed(2)} m² exceeds pack max ${constraints.maxAreaM2} m²`);
    }
  }

  const openingIssue = openingTypeSupported(pattern, input.systemPackId);
  if (openingIssue) reasons.push(openingIssue);

  const hardBlock = reasons.some(
    (r) =>
      r.includes('below pack minimum') ||
      r.includes('above pack maximum') ||
      r.includes('exceeds pack max') ||
      r.includes('not available as a layout template'),
  );

  return {
    kind: certified ? 'certified' : 'layout_template',
    patternId: pattern.id,
    systemPackId: input.systemPackId,
    reasons,
    canApplyAsTemplate: !hardBlock,
    requiresConfirmation: !certified || reasons.length > 0,
  };
}
