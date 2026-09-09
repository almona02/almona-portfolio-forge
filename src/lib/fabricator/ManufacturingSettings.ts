/**
 * FP-023A — Canonical manufacturing settings contract (AICS-001 Tier 3)
 *
 * One resolved object supplies kerf, weld, offsets, trim, remnant threshold
 * and angle-compensation fields to every canonical bar-pack / cut-sheet path.
 *
 * Resolution is deterministic (no Date.now, no Math.random):
 *   1. explicit job/project settings
 *   2. selected machine override
 *   3. selected SystemPack / profile override
 *   4. named named-profile (e.g. yilmazcad-parity)
 *   5. platform default
 *
 * YilmazCAD/DoWin numbers are a named parity profile, not a claim that every
 * ALMONA machine or Egyptian system uses 4 mm kerf.
 *
 * trimCutMm and endDeductionMm are intentionally separate:
 *   - trimCutMm: bar-end trim applied (or reserved) during packing
 *   - endDeductionMm: ALMONA cut-sheet report header only (historical 20 mm)
 * Do not alias them (FP-023A stop condition).
 *
 * @see docs/audits/FP-023A-MANUFACTURING-SETTINGS-CONTRACT_2026-09-09.md
 */

export type ManufacturingSettingsSource =
  | 'job'
  | 'machine'
  | 'systemPack'
  | 'namedProfile'
  | 'platform';

export type NamedManufacturingProfileId = 'platform' | 'yilmazcad-parity';

export interface ManufacturingSettings {
  sawKerfMm: number;
  weldingWasteMm: number;
  glazingClearanceMm: number;
  sashOffsetMm: number;
  pvcMullionOffsetMm: number;
  /** Bar-end trim reserved during packing (DoWin TrimCut analogue). */
  trimCutMm: number;
  /**
   * Report-header "End Deduction Total" in AlmonaCuttingEngine.
   * Not applied to bar packing today. Not the same as trimCutMm.
   */
  endDeductionMm: number;
  minimumReusableLengthMm: number;
  profileWasteMarginPercent: number;
  robotSafetyLengthMm: number;
  compLessThan90LeftMm: number;
  compLessThan90RightMm: number;
  compGreaterThan90LeftMm: number;
  compGreaterThan90RightMm: number;
}

export type ManufacturingSettingsOverride = Partial<ManufacturingSettings>;

export interface ManufacturingSettingsProvenance {
  [K in keyof ManufacturingSettings]: ManufacturingSettingsSource;
}

export interface ResolvedManufacturingSettings extends ManufacturingSettings {
  namedProfileId: NamedManufacturingProfileId;
  machineId?: string;
  provenance: ManufacturingSettingsProvenance;
}

export interface ManufacturingSettingsInput {
  job?: ManufacturingSettingsOverride;
  machineId?: string;
  machineOverride?: ManufacturingSettingsOverride;
  systemPack?: ManufacturingSettingsOverride;
  namedProfileId?: NamedManufacturingProfileId;
}

export const MANUFACTURING_SETTING_KEYS: (keyof ManufacturingSettings)[] = [
  'sawKerfMm',
  'weldingWasteMm',
  'glazingClearanceMm',
  'sashOffsetMm',
  'pvcMullionOffsetMm',
  'trimCutMm',
  'endDeductionMm',
  'minimumReusableLengthMm',
  'profileWasteMarginPercent',
  'robotSafetyLengthMm',
  'compLessThan90LeftMm',
  'compLessThan90RightMm',
  'compGreaterThan90LeftMm',
  'compGreaterThan90RightMm',
];

/**
 * Platform default: unifies the undocumented 3/5/10 mm bar-pack kerf split
 * without claiming Yilmaz parity remnant (500) for every Egypt job.
 * Remnant 300 preserves AlmonaCuttingEngine historical keep/drop.
 */
export const PLATFORM_MANUFACTURING_DEFAULTS: ManufacturingSettings = {
  sawKerfMm: 4,
  weldingWasteMm: 3,
  glazingClearanceMm: 2.5,
  sashOffsetMm: 7,
  pvcMullionOffsetMm: 0,
  trimCutMm: 0,
  endDeductionMm: 20,
  minimumReusableLengthMm: 300,
  profileWasteMarginPercent: 0,
  robotSafetyLengthMm: 0,
  compLessThan90LeftMm: 0,
  compLessThan90RightMm: 0,
  compGreaterThan90LeftMm: 0,
  compGreaterThan90RightMm: 0,
};

/**
 * Licensed YilmazCAD/DoWin factory Settings row (9 Sep 2026 dealer audit).
 * Overridable. Not a physical constant for every machine/system.
 */
export const YILMAZCAD_PARITY_MANUFACTURING_SETTINGS: ManufacturingSettings = {
  sawKerfMm: 4,
  weldingWasteMm: 3,
  glazingClearanceMm: 2.5,
  sashOffsetMm: 7,
  pvcMullionOffsetMm: 0,
  trimCutMm: 0,
  endDeductionMm: 20,
  minimumReusableLengthMm: 500,
  profileWasteMarginPercent: 0,
  robotSafetyLengthMm: 0,
  compLessThan90LeftMm: 0,
  compLessThan90RightMm: 0,
  compGreaterThan90LeftMm: 0,
  compGreaterThan90RightMm: 0,
};

export const NAMED_MANUFACTURING_PROFILES: Record<
  NamedManufacturingProfileId,
  ManufacturingSettings
> = {
  platform: PLATFORM_MANUFACTURING_DEFAULTS,
  'yilmazcad-parity': YILMAZCAD_PARITY_MANUFACTURING_SETTINGS,
};

/**
 * Optional machine catalog. Values here override named profile, not job.
 * aluminum-micron trimCutMm maps MicronEngine barEndTrim (15 mm/end) — not
 * AlmonaCuttingEngine endDeductionMm.
 */
export const MACHINE_MANUFACTURING_OVERRIDES: Record<string, ManufacturingSettingsOverride> = {
  'yilmaz-dc-550-skh': { sawKerfMm: 4 },
  'yilmaz-dc-600': { sawKerfMm: 4 },
  'upvc-single-head': { sawKerfMm: 3 },
  'aluminum-micron': { sawKerfMm: 4.2, trimCutMm: 15, robotSafetyLengthMm: 50 },
};

function emptyProvenance(source: ManufacturingSettingsSource): ManufacturingSettingsProvenance {
  return MANUFACTURING_SETTING_KEYS.reduce((acc, key) => {
    acc[key] = source;
    return acc;
  }, {} as ManufacturingSettingsProvenance);
}

function applyOverride(
  base: ResolvedManufacturingSettings,
  override: ManufacturingSettingsOverride | undefined,
  source: ManufacturingSettingsSource
): ResolvedManufacturingSettings {
  if (!override) return base;
  const next: ResolvedManufacturingSettings = {
    ...base,
    provenance: { ...base.provenance },
  };
  for (const key of MANUFACTURING_SETTING_KEYS) {
    const value = override[key];
    if (value !== undefined) {
      (next as ManufacturingSettings)[key] = value;
      next.provenance[key] = source;
    }
  }
  return next;
}

/**
 * Deterministic settings resolution. Same input → same resolved object.
 */
export function resolveManufacturingSettings(
  input: ManufacturingSettingsInput = {}
): ResolvedManufacturingSettings {
  const namedProfileId = input.namedProfileId ?? 'platform';
  const named = NAMED_MANUFACTURING_PROFILES[namedProfileId] ?? PLATFORM_MANUFACTURING_DEFAULTS;

  let resolved: ResolvedManufacturingSettings = {
    ...named,
    namedProfileId,
    machineId: input.machineId,
    provenance: emptyProvenance(namedProfileId === 'platform' ? 'platform' : 'namedProfile'),
  };

  resolved = applyOverride(resolved, input.systemPack, 'systemPack');

  const catalogMachine = input.machineId
    ? MACHINE_MANUFACTURING_OVERRIDES[input.machineId]
    : undefined;
  resolved = applyOverride(resolved, catalogMachine, 'machine');
  resolved = applyOverride(resolved, input.machineOverride, 'machine');
  if (input.machineId) {
    resolved.machineId = input.machineId;
  }

  resolved = applyOverride(resolved, input.job, 'job');
  return resolved;
}

const LENGTH_PRECISION = 10;

export function roundManufacturingMm(valueMm: number): number {
  return Math.round(valueMm * LENGTH_PRECISION) / LENGTH_PRECISION;
}

/**
 * Reusable remnant eligibility for a resolved job (0.1 mm convention).
 */
export function isReusableRemnantLength(
  lengthMm: number,
  settings: Pick<ManufacturingSettings, 'minimumReusableLengthMm'>
): boolean {
  return roundManufacturingMm(lengthMm) >= roundManufacturingMm(settings.minimumReusableLengthMm);
}

import { barConsumedLengthMm as consumedLengthOnBarMm } from './barPackAccounting';

export {
  BAR_PACK_KERF_RULE_ID,
  accountBarPack,
  barConsumedLengthMm,
  barRemnantLengthMm,
  kerfLossOnBarMm,
  pieceSlotMm,
  pieceStartPositionsMm,
} from './barPackAccounting';

/** Visual/report used-length with trimCut 0. Canonical packing uses barConsumedLengthMm. */
export function visualBarUsedMm(cutLengthsMm: number[], sawKerfMm: number): number {
  return consumedLengthOnBarMm(cutLengthsMm, { sawKerfMm, trimCutMm: 0 });
}

export function manufacturingSettingsSignature(
  settings: ManufacturingSettings
): string {
  return MANUFACTURING_SETTING_KEYS.map((key) => `${key}=${settings[key]}`).join('|');
}

/**
 * Immutable resolved-settings snapshot for a production/optimization run.
 * No Date.now — timestamp belongs in audit metadata, not the signature.
 */
export interface ManufacturingSettingsSnapshot {
  values: ManufacturingSettings;
  provenance: ManufacturingSettingsProvenance;
  namedProfileId: NamedManufacturingProfileId;
  machineId?: string;
  signature: string;
}

export interface ManufacturingSettingsProvenanceRow {
  key: keyof ManufacturingSettings;
  valueMm: number;
  source: ManufacturingSettingsSource;
}

export function manufacturingSettingsProvenanceRows(
  resolved: ResolvedManufacturingSettings
): ManufacturingSettingsProvenanceRow[] {
  return MANUFACTURING_SETTING_KEYS.map((key) => ({
    key,
    valueMm: resolved[key],
    source: resolved.provenance[key],
  }));
}

export function freezeManufacturingSettings(
  resolved: ResolvedManufacturingSettings
): ManufacturingSettingsSnapshot {
  const values = MANUFACTURING_SETTING_KEYS.reduce((acc, key) => {
    acc[key] = resolved[key];
    return acc;
  }, {} as ManufacturingSettings);
  return {
    values,
    provenance: { ...resolved.provenance },
    namedProfileId: resolved.namedProfileId,
    machineId: resolved.machineId,
    signature: manufacturingSettingsSignature(values),
  };
}

export function barYieldPercent(pieceLengthTotalMm: number, stockLengthMm: number): number {
  if (stockLengthMm <= 0) return 0;
  return roundManufacturingMm((pieceLengthTotalMm / stockLengthMm) * 100);
}

export function barWastePercent(pieceLengthTotalMm: number, stockLengthMm: number): number {
  return roundManufacturingMm(100 - barYieldPercent(pieceLengthTotalMm, stockLengthMm));
}

/** Microns on FenestrationSystem.fabricationRules.cutting → mm override. */
export function systemPackCuttingOverrideFromMicrons(cutting?: {
  sawKerf?: number;
  barEndTrim?: number;
}): ManufacturingSettingsOverride | undefined {
  if (!cutting) return undefined;
  const override: ManufacturingSettingsOverride = {};
  if (typeof cutting.sawKerf === 'number' && cutting.sawKerf > 0) {
    override.sawKerfMm = cutting.sawKerf / 1000;
  }
  if (typeof cutting.barEndTrim === 'number' && cutting.barEndTrim >= 0) {
    override.trimCutMm = cutting.barEndTrim / 1000;
  }
  return Object.keys(override).length > 0 ? override : undefined;
}
