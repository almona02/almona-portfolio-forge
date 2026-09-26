/**
 * FP-024A — Machine-export preflight (AICS-001 Tier 3)
 *
 * Blocks production export when physical cuts are unplaced or when the
 * requested format is not implemented. NCW is unsupported until a legitimate
 * encoder exists — do not fake success.
 */

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
