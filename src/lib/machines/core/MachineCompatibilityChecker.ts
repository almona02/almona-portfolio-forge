/**
 * MachineCompatibilityChecker
 *
 * Given a WindowUnit (design) and a MachineDefinition (constraints),
 * produces a MachineValidationResult that answers:
 *   "Can this machine produce this window?"
 *
 * This is the "Nano Banana" logic — the unfair advantage Almona has
 * because it controls both the software AND the machine (Yilmaz dealer).
 *
 * Used by:
 *   - Enhanced3DPreview (badge: "Yilmaz Ready ✅" / "Machine Conflict ❌")
 *   - Cut list export (pre-flight check before sending to machine)
 *   - Production view (operator warnings)
 *
 * @since Defragmentation Phase 1 — 2026-02-08
 */

import type { WindowUnit } from '@/types/fabricator';
import type {
    CompatibilitySeverity,
    MachineConstraintViolation,
    MachineDefinition,
    MachineValidationResult,
} from './MachineInterface';

// ─── Built-in machine definitions ───────────────────────────────────
// Derived from existing safety profiles + machine set configs.
// These are the machines Almona (as Yilmaz dealer in Egypt) sells and supports.

export const YILMAZ_ALM_6510: MachineDefinition = {
  machineId: 'alm-6510',
  machineName: 'ALM 6510',
  machineBrand: 'yilmaz',
  supportedMaterials: ['aluminum', 'aluminium'],
  profileConstraints: {
    minLength: 700,
    maxLength: 6500,
    minHeight: 40,
    maxHeight: 180,
    minWidth: 40,
    maxWidth: 130,
  },
  angleConstraints: {
    supportedAngles: [45, 90, 135],
    minAngle: 45,
    maxAngle: 135,
  },
  clampZones: [
    {
      id: 'clamp_left',
      description: 'Left clamp zone — avoid cuts in first 200mm',
      x: { min: 0, max: 200 },
      y: { min: 0, max: 1200 },
      z: { min: 0, max: 50 },
    },
    {
      id: 'clamp_right',
      description: 'Right clamp zone — avoid cuts in last 200mm',
      x: { min: 6300, max: 6500 },
      y: { min: 0, max: 1200 },
      z: { min: 0, max: 50 },
    },
    {
      id: 'clamp_front',
      description: 'Front clamp zone — 100mm dead zone',
      x: { min: 0, max: 6500 },
      y: { min: 0, max: 100 },
      z: { min: 0, max: 50 },
    },
    {
      id: 'clamp_back',
      description: 'Back clamp zone — 100mm dead zone',
      x: { min: 0, max: 6500 },
      y: { min: 1100, max: 1200 },
      z: { min: 0, max: 50 },
    },
  ],
  cncAxes: 8,
  maxSpindleSpeed: 12000,
  maxFeedRate: 40000,
  exportFormat: 'mdb',
};

export const YILMAZ_PIM_6509: MachineDefinition = {
  machineId: 'pim-6509',
  machineName: 'PIM 6509',
  machineBrand: 'yilmaz',
  supportedMaterials: ['upvc', 'pvc'],
  profileConstraints: {
    minLength: 700,
    maxLength: 6500,
    minHeight: 40,
    maxHeight: 180,
    minWidth: 40,
    maxWidth: 130,
  },
  angleConstraints: {
    supportedAngles: [30, 45, 60, 90, 120, 135, 150],
    minAngle: 30,
    maxAngle: 150,
  },
  clampZones: [
    {
      id: 'clamp_left',
      description: 'Left clamp zone — avoid cuts in first 200mm',
      x: { min: 0, max: 200 },
      y: { min: 0, max: 1200 },
      z: { min: 0, max: 50 },
    },
    {
      id: 'clamp_right',
      description: 'Right clamp zone — avoid cuts in last 200mm',
      x: { min: 6300, max: 6500 },
      y: { min: 0, max: 1200 },
      z: { min: 0, max: 50 },
    },
  ],
  cncAxes: 8,
  maxSpindleSpeed: 18000,
  maxFeedRate: 40000,
  exportFormat: 'mdb',
};

export const YILMAZ_DC_421_PBS: MachineDefinition = {
  machineId: 'dc-421-pbs',
  machineName: 'DC-421-PBS',
  machineBrand: 'yilmaz',
  supportedMaterials: ['aluminum', 'aluminium', 'upvc', 'pvc'],
  profileConstraints: {
    minLength: 200,
    maxLength: 4510,
    minHeight: 20,
    maxHeight: 200,
    minWidth: 20,
    maxWidth: 200,
  },
  angleConstraints: {
    supportedAngles: [45, 90],
    minAngle: 45,
    maxAngle: 90,
  },
  clampZones: [],
  cncAxes: 0,
  maxSpindleSpeed: 2900,
  maxFeedRate: 0,
  exportFormat: 'csv',
};

export const YILMAZ_AIM_3410: MachineDefinition = {
  machineId: 'aim-3410',
  machineName: 'AIM 3410',
  machineBrand: 'yilmaz',
  supportedMaterials: ['aluminum', 'aluminium'],
  profileConstraints: {
    minLength: 50,
    maxLength: 7000,
    minHeight: 30,
    maxHeight: 225,
    minWidth: 30,
    maxWidth: 300,
  },
  angleConstraints: {
    supportedAngles: [0, 15, 22.5, 30, 45, 60, 67.5, 75, 90, 105, 112.5, 120, 135, 150, 165, 180],
    minAngle: 0,
    maxAngle: 180,
  },
  clampZones: [],
  cncAxes: 4,
  maxSpindleSpeed: 24000,
  maxFeedRate: 60000,
  exportFormat: 'gcode',
};

/** All machines Almona sells/supports as a Yilmaz dealer */
export const SUPPORTED_MACHINES: MachineDefinition[] = [
  YILMAZ_ALM_6510,
  YILMAZ_PIM_6509,
  YILMAZ_DC_421_PBS,
  YILMAZ_AIM_3410,
];

// ─── The checker ────────────────────────────────────────────────────

/**
 * Check a WindowUnit against a specific machine's constraints.
 *
 * Returns a MachineValidationResult with:
 *   - compatible: boolean (true = no errors, may have warnings)
 *   - violations: list of constraint checks (passed and failed)
 *   - summary: one-liner for UI badges
 */
export function checkMachineCompatibility(
  unit: WindowUnit,
  machine: MachineDefinition
): MachineValidationResult {
  const violations: MachineConstraintViolation[] = [];
  const { profileConstraints, angleConstraints, supportedMaterials } = machine;

  // ─── 1. Profile dimensions ────────────────────────────────────────

  // Overall width check (this is the "bar length" dimension for cutting)
  if (unit.overallWidth > profileConstraints.maxLength) {
    violations.push({
      constraint: `Max profile length: ${profileConstraints.maxLength}mm`,
      actualValue: unit.overallWidth,
      machineLimit: profileConstraints.maxLength,
      severity: 'error',
      affectedComponent: 'frame-width',
      suggestion: `Reduce window width to ${profileConstraints.maxLength}mm or use a different machine.`,
    });
  }

  if (unit.overallHeight > profileConstraints.maxLength) {
    violations.push({
      constraint: `Max profile length: ${profileConstraints.maxLength}mm`,
      actualValue: unit.overallHeight,
      machineLimit: profileConstraints.maxLength,
      severity: 'error',
      affectedComponent: 'frame-height',
      suggestion: `Reduce window height to ${profileConstraints.maxLength}mm or use a different machine.`,
    });
  }

  // Minimum length check
  if (unit.overallWidth > 0 && unit.overallWidth < profileConstraints.minLength) {
    violations.push({
      constraint: `Min profile length: ${profileConstraints.minLength}mm`,
      actualValue: unit.overallWidth,
      machineLimit: profileConstraints.minLength,
      severity: 'error',
      affectedComponent: 'frame-width',
      suggestion: `Width is too short for this machine. Minimum: ${profileConstraints.minLength}mm.`,
    });
  }

  if (unit.overallHeight > 0 && unit.overallHeight < profileConstraints.minLength) {
    violations.push({
      constraint: `Min profile length: ${profileConstraints.minLength}mm`,
      actualValue: unit.overallHeight,
      machineLimit: profileConstraints.minLength,
      severity: 'error',
      affectedComponent: 'frame-height',
      suggestion: `Height is too short for this machine. Minimum: ${profileConstraints.minLength}mm.`,
    });
  }

  // ─── 2. Material type check ───────────────────────────────────────

  const unitType = unit.type?.toLowerCase() || '';
  const isAluminum = unitType.includes('alum') || unitType.includes('alu');
  const isUPVC = unitType.includes('upvc') || unitType.includes('pvc');
  const isMaterialSpecified = isAluminum || isUPVC;

  if (isMaterialSpecified) {
    const unitMaterial = isAluminum ? 'aluminum' : 'upvc';
    const materialSupported = supportedMaterials.some(
      m => m.toLowerCase() === unitMaterial || m.toLowerCase().includes(unitMaterial)
    );

    if (!materialSupported) {
      violations.push({
        constraint: `Supported materials: ${supportedMaterials.join(', ')}`,
        actualValue: unitMaterial,
        machineLimit: supportedMaterials.join(', '),
        severity: 'error',
        affectedComponent: 'material',
        suggestion: `${machine.machineName} does not support ${unitMaterial}. Use ${supportedMaterials[0]} or select a different machine.`,
      });
    }
  }

  // ─── 3. Angle capability check ────────────────────────────────────

  // Check components for non-standard angles
  if (unit.components) {
    for (const comp of unit.components) {
      const angle = (comp as any).angle || 90;
      if (angle !== 90) {
        const angleSupported = angleConstraints.supportedAngles.includes(angle)
          || (angle >= angleConstraints.minAngle && angle <= angleConstraints.maxAngle);

        if (!angleSupported) {
          violations.push({
            constraint: `Angle range: ${angleConstraints.minAngle}°–${angleConstraints.maxAngle}°`,
            actualValue: `${angle}°`,
            machineLimit: `${angleConstraints.minAngle}°–${angleConstraints.maxAngle}°`,
            severity: 'error',
            affectedComponent: (comp as any).name || comp.type || 'component',
            suggestion: `${angle}° is not achievable on ${machine.machineName}. Supported: ${angleConstraints.supportedAngles.join('°, ')}°.`,
          });
        }
      }
    }
  }

  // ─── 4. Clamp zone proximity warnings ─────────────────────────────

  // If any cut would land within a clamp dead-zone, warn the operator
  if (machine.clampZones.length > 0) {
    // Check if very small profiles risk clamping issues
    const shortestSide = Math.min(unit.overallWidth, unit.overallHeight);
    const clampDeadZone = machine.clampZones[0]?.x.max || 200; // Typically 200mm

    if (shortestSide > 0 && shortestSide < clampDeadZone * 2) {
      violations.push({
        constraint: `Clamp dead-zone: ${clampDeadZone}mm per side`,
        actualValue: shortestSide,
        machineLimit: clampDeadZone * 2,
        severity: 'warning',
        affectedComponent: 'frame',
        suggestion: `Profile is close to clamp dead-zone limits. Operator should verify clamping clearance.`,
      });
    }
  }

  // ─── 5. Quantity/batch feasibility ────────────────────────────────

  const qty = unit.quantity || 1;
  if (qty > 100) {
    violations.push({
      constraint: 'Large batch warning',
      actualValue: qty,
      machineLimit: 'N/A',
      severity: 'warning',
      affectedComponent: 'batch',
      suggestion: `Batch of ${qty} units. Verify bar stock availability and remnant management strategy.`,
    });
  }

  // ─── Compute summary ─────────────────────────────────────────────

  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');

  let overallSeverity: CompatibilitySeverity = 'ok';
  if (errors.length > 0) overallSeverity = 'error';
  else if (warnings.length > 0) overallSeverity = 'warning';

  const compatible = errors.length === 0;

  let summary: string;
  if (compatible && warnings.length === 0) {
    summary = `${machine.machineName} Ready`;
  } else if (compatible) {
    summary = `${machine.machineName} Ready (${warnings.length} warning${warnings.length > 1 ? 's' : ''})`;
  } else {
    summary = `${machine.machineName} Conflict: ${errors.length} issue${errors.length > 1 ? 's' : ''}`;
  }

  return {
    compatible,
    overallSeverity,
    machineModel: machine.machineName,
    machineBrand: machine.machineBrand,
    violations,
    summary,
    checkedAt: new Date(),
  };
}

/**
 * Check a WindowUnit against ALL supported machines.
 * Returns results sorted: compatible machines first, then by violation count.
 */
export function checkAllMachines(unit: WindowUnit): MachineValidationResult[] {
  return SUPPORTED_MACHINES
    .map(machine => checkMachineCompatibility(unit, machine))
    .sort((a, b) => {
      // Compatible first
      if (a.compatible && !b.compatible) return -1;
      if (!a.compatible && b.compatible) return 1;
      // Then by violation count
      return a.violations.length - b.violations.length;
    });
}

/**
 * Quick check: is this WindowUnit compatible with ANY Yilmaz machine?
 * Used for the badge in Enhanced3DPreview.
 */
export function quickMachineCheck(unit: WindowUnit): {
  anyCompatible: boolean;
  bestMachine: MachineValidationResult | null;
  allResults: MachineValidationResult[];
} {
  const allResults = checkAllMachines(unit);
  const compatible = allResults.filter(r => r.compatible);

  return {
    anyCompatible: compatible.length > 0,
    bestMachine: compatible[0] || allResults[0] || null,
    allResults,
  };
}
