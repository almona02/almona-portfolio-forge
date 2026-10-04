/**
 * FP-028 / A7 — Thermal expansion inspection (characterization).
 *
 * Phase 4 rule: do not apply thermal compensation to manufacturing cuts until
 * coefficient units and formula evidence are approved.
 *
 * Current Apex V2 formula (mirrored here for provenance tests):
 *   stored = (widthMicrons / 1e6) * α * ΔT
 * PatternMigrationService documents α as mm/°C/m, so `stored` is millimetres
 * while ManufacturingParameters claims microns — unit mismatch (A7).
 */

export interface ThermalExpansionInspection {
  /** Value Apex currently stores on materialAdjustments.thermalExpansion */
  storedValue: number;
  /** Unit claimed by ManufacturingParameters comments */
  claimedUnit: 'microns';
  /**
   * Physical unit of `storedValue` when α is mm/°C/m (catalog documentation).
   * Not an endorsement — evidence for the A7 defect.
   */
  actualUnitIfAlphaIsMmPerMPerC: 'mm';
  /** ΔT used (°C), including invented defaults when range missing */
  tempDeltaC: number;
  /** Whether invented defaults were used for ΔT */
  usedInventedTempDefaults: boolean;
  /** Micron-equivalent if stored mm were converted (for scale checks only) */
  storedValueAsMicronsIfMm: number;
}

export function inspectThermalExpansionComputation(args: {
  overallWidthMm: number;
  thermalExpansionCoefficient: number;
  operatingTemperatureRange?: { min: number; max: number };
  /** Apex hard-codes 20°C reference today */
  referenceTempC?: number;
  /** Apex invents 25°C when range missing */
  defaultTempDeltaC?: number;
}): ThermalExpansionInspection {
  const referenceTempC = args.referenceTempC ?? 20;
  const defaultTempDeltaC = args.defaultTempDeltaC ?? 25;

  let usedInventedTempDefaults = false;
  let tempDeltaC: number;
  if (args.operatingTemperatureRange) {
    tempDeltaC = args.operatingTemperatureRange.max - referenceTempC;
  } else {
    tempDeltaC = defaultTempDeltaC;
    usedInventedTempDefaults = true;
  }

  const widthMicrons = args.overallWidthMm * 1000;
  // Current Apex V2 expression (do not "fix" units here without evidence)
  const storedValue =
    (widthMicrons / 1_000_000) * args.thermalExpansionCoefficient * tempDeltaC;

  return {
    storedValue,
    claimedUnit: 'microns',
    actualUnitIfAlphaIsMmPerMPerC: 'mm',
    tempDeltaC,
    usedInventedTempDefaults,
    storedValueAsMicronsIfMm: storedValue * 1000,
  };
}
