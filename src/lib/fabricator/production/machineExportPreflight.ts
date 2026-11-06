/**
 * FP-024A — Machine-export preflight (AICS-001 Tier 3)
 *
 * Blocks production export when physical cuts are unplaced or when the
 * requested format is not implemented. NCW is unsupported until a legitimate
 * encoder exists — do not fake success.
 *
 * `evaluateProductionExportGate` is the shared production caller: every
 * machine-file export (G-code, ALM 6510) must pass it before generating or
 * downloading anything. Conservation is judged by the same reconciliation the
 * workflow and pipeline gates use, so no export path can disagree with the
 * approved design ledger.
 */

import type { OptimizationResult, WindowUnit } from '@/types/fabricator';
import { validateOptimizationReconciliation } from '@/lib/fabricator/validation/WorkflowValidator';

export type ImplementedMachineExportFormat = 'mdb' | 'gcode';
export type MachineExportFormat = ImplementedMachineExportFormat | 'ncw';

export const IMPLEMENTED_MACHINE_EXPORT_FORMATS: readonly ImplementedMachineExportFormat[] = [
  'mdb',
  'gcode',
];

export interface UnplacedPhysicalCut {
  pieceId: string;
}

export interface MachineExportPreflightInput {
  unplacedPhysicalCuts: UnplacedPhysicalCut[];
  requestedFormat: MachineExportFormat;
}

export interface MachineExportPreflightResult {
  allowed: boolean;
  ncwSupported: boolean;
  blockingReasons: string[];
}

export function isImplementedMachineExportFormat(
  format: MachineExportFormat
): format is ImplementedMachineExportFormat {
  return (IMPLEMENTED_MACHINE_EXPORT_FORMATS as readonly string[]).includes(format);
}

export function evaluateMachineExportPreflight(
  input: MachineExportPreflightInput
): MachineExportPreflightResult {
  const blockingReasons: string[] = [];
  const ncwSupported = false;

  if (input.unplacedPhysicalCuts.length > 0) {
    const ids = input.unplacedPhysicalCuts.map((cut) => cut.pieceId).join(', ');
    blockingReasons.push(`Unplaced physical cuts prevent export: ${ids}`);
  }

  if (!isImplementedMachineExportFormat(input.requestedFormat)) {
    blockingReasons.push(
      `Format ${input.requestedFormat} is unsupported. Implemented: ${IMPLEMENTED_MACHINE_EXPORT_FORMATS.join(', ')}.`
    );
  }

  return {
    allowed: blockingReasons.length === 0,
    ncwSupported,
    blockingReasons,
  };
}

/**
 * Production release gate for machine-file exports.
 *
 * Fails closed: any reconciliation error (missing, duplicated, foreign, or
 * geometry-mismatched cuts) or any unimplemented format blocks the export.
 * Callers must throw on `allowed === false` before generating or downloading.
 */
export function evaluateProductionExportGate(
  project: WindowUnit | null,
  optimization: OptimizationResult | null,
  requestedFormat: MachineExportFormat
): MachineExportPreflightResult {
  const blockingReasons: string[] = [];
  const ncwSupported = false;

  const reconciliation = validateOptimizationReconciliation(optimization, project);
  if (!reconciliation.valid) {
    for (const error of reconciliation.errors) {
      blockingReasons.push(`Cut list does not reconcile to the saved design: ${error.message}`);
    }
  }

  if (!isImplementedMachineExportFormat(requestedFormat)) {
    blockingReasons.push(
      `Format ${requestedFormat} is unsupported. Implemented: ${IMPLEMENTED_MACHINE_EXPORT_FORMATS.join(', ')}.`
    );
  }

  return {
    allowed: blockingReasons.length === 0,
    ncwSupported,
    blockingReasons,
  };
}
