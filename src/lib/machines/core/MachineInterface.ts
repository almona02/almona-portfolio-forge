/**
 * MachineInterface — The Unified Machine Abstraction Layer
 *
 * Every supported machine (Yilmaz, Elumatec, …) MUST implement this
 * interface so that the design→production pipeline has a single contract
 * regardless of hardware brand or model.
 *
 * The three questions every machine answers:
 *   1. validate()  — "Can this design be manufactured on me?"
 *   2. generateProductionFile() — "Give me the file I need to cut/mill."
 *   3. sendToMachine() — "Upload the file over the wire."
 *
 * @since Defragmentation Phase 1 — 2026-02-08
 */

import type { WindowUnit } from '@/types/fabricator';

// ─── Validation types ───────────────────────────────────────────────

export type CompatibilitySeverity = 'ok' | 'warning' | 'error';

export interface MachineConstraintViolation {
  /** Human-readable constraint that was violated */
  constraint: string;
  /** The design value that caused the violation */
  actualValue: number | string;
  /** The machine limit that was exceeded */
  machineLimit: number | string;
  /** Severity: 'error' blocks production, 'warning' needs operator review */
  severity: CompatibilitySeverity;
  /** Which component or dimension caused the issue */
  affectedComponent?: string;
  /** Suggested fix for the operator / designer */
  suggestion?: string;
}

export interface MachineValidationResult {
  /** True if the design can be manufactured without errors */
  compatible: boolean;
  /** Overall severity: worst violation wins */
  overallSeverity: CompatibilitySeverity;
  /** Machine model that performed the check */
  machineModel: string;
  /** Machine brand */
  machineBrand: string;
  /** List of all constraint checks (passed and failed) */
  violations: MachineConstraintViolation[];
  /** Single-line summary for UI badges */
  summary: string;
  /** Timestamp of the check */
  checkedAt: Date;
}

// ─── Transfer types ─────────────────────────────────────────────────

export type TransferStatus =
  | { success: true; filename: string; bytesTransferred: number }
  | { success: false; error: string };

// ─── The core interface ─────────────────────────────────────────────

export interface MachineInterface {
  /** Machine identifier (e.g. 'alm-6510', 'aim-3410') */
  readonly machineId: string;
  /** Display name (e.g. 'ALM 6510') */
  readonly machineName: string;
  /** Brand (e.g. 'yilmaz') */
  readonly machineBrand: string;

  /**
   * 1. VALIDATE — "Can this design be produced on this machine?"
   *
   * Checks the WindowUnit against machine constraints:
   *   - Profile dimensions (min/max height, width, length)
   *   - Angle capabilities
   *   - Clamping zone dead-zones
   *   - Material type support
   *
   * This is the "Nano Banana" logic: machine-aware constraint checking
   * that no pure-software competitor can replicate.
   */
  validate(unit: WindowUnit): MachineValidationResult;

  /**
   * 2. GENERATE — "Create the production file for this cutting plan."
   *
   * Returns a Blob (MDB, CSV, G-code, etc.) ready for the machine controller.
   * The format is machine-specific:
   *   - ALM 6510: MDB with 37-column Table1
   *   - PIM 6509: MDB or CSV
   *   - DC-421-PBS: CSV cut list
   */
  generateProductionFile(unit: WindowUnit): Promise<Blob>;

  /**
   * 3. SEND — "Upload the file to the machine over the network."
   *
   * Uses the machine's native protocol (WebSocket, USB, Ethernet).
   */
  sendToMachine(file: Blob): Promise<TransferStatus>;
}

// ─── Machine spec types (for the definition layer) ──────────────────

export interface MachineProfileConstraints {
  minLength: number;  // mm
  maxLength: number;  // mm
  minHeight: number;  // mm
  maxHeight: number;  // mm
  minWidth: number;   // mm
  maxWidth: number;   // mm
}

export interface MachineAngleConstraints {
  /** All angles this machine can cut, in degrees */
  supportedAngles: number[];
  /** Minimum angle (degrees) */
  minAngle: number;
  /** Maximum angle (degrees) */
  maxAngle: number;
}

export interface MachineClampZone {
  id: string;
  description: string;
  /** X range in mm */
  x: { min: number; max: number };
  /** Y range in mm */
  y: { min: number; max: number };
  /** Z range in mm */
  z: { min: number; max: number };
}

export interface MachineDefinition {
  machineId: string;
  machineName: string;
  machineBrand: string;
  /** Material types this machine handles */
  supportedMaterials: string[];
  /** Profile dimension limits */
  profileConstraints: MachineProfileConstraints;
  /** Cutting angle constraints */
  angleConstraints: MachineAngleConstraints;
  /** Dead-zones where clamps block tool access */
  clampZones: MachineClampZone[];
  /** CNC axes count */
  cncAxes: number;
  /** Max spindle speed (RPM) */
  maxSpindleSpeed: number;
  /** Max feed rate (mm/min) */
  maxFeedRate: number;
  /** Export format (mdb, csv, gcode) */
  exportFormat: 'mdb' | 'csv' | 'gcode';
}
