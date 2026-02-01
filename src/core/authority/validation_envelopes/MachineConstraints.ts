/**
 * @file MachineConstraints.ts
 * @description Machine Constraints
 * 
 * AICS-001 Reference: Section 4.3.3 (Machine Constraints)
 * 
 * Registers machine constraints extracted from optimization algorithms,
 * CNC integration code, and profile system configurations.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type { DeterministicConstraint, ValidationContext } from './index';
import { ConstraintCategory, getConstraintRegistry } from './ConstraintRegistry';

/**
 * Machine Validation Context
 * 
 * Extended validation context for machine constraint validation.
 */
export interface MachineValidationContext extends ValidationContext {
  material?: 'aluminum' | 'upvc';
  cuttingLength?: number; // mm
  profileWidth?: number; // mm
  profileHeight?: number; // mm
  toolReach?: number; // mm
  axisX?: number; // mm - X-axis travel
  axisY?: number; // mm - Y-axis travel
  axisZ?: number; // mm - Z-axis travel
  operationType?: 'cutting' | 'drilling' | 'milling' | 'welding';
  safetyMargin?: number; // mm
  instructionFormat?: string;
  stockLength?: number; // mm - Profile stock length (for MACH-016)
  clampZoneX?: number; // mm - X position for clamp zone validation (for MACH-026)
  rapidHeight?: number; // mm - Height for rapid movements (for MACH-027)
}

// ============================================================================
// MACHINE CONSTRAINTS (AICS-001 Section 4.3.3)
// ============================================================================

/**
 * Standard machine specifications for aluminum and UPVC fabrication
 * 
 * Based on typical CNC machines used in window and door fabrication:
 * - Standard cutting length: 6000mm (6 meters)
 * - Maximum safe cutting length: 6500mm (with safety margin)
 * - Standard tool reach: 300mm
 * - Standard safety margin: 50mm
 */

/**
 * MACH-001: Maximum Cutting Length (Standard)
 * 
 * AICS-001 Section 4.3.3: Maximum cutting length.
 * Standard CNC machines for aluminum/UPVC have maximum cutting length of 6000mm.
 */
const MACH_001_MaxCuttingLength: DeterministicConstraint = {
  constraintId: 'MACH-001',
  ruleId: 'AICS-001-4.3.3-1',
  description: 'Maximum cutting length must not exceed 6000mm (standard CNC machine limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.cuttingLength) {
      return true; // Pass if cutting length not specified
    }
    return context.cuttingLength <= 6000;
  },
};

/**
 * MACH-002: Maximum Cutting Length (With Safety Margin)
 * 
 * AICS-001 Section 4.3.3: Machine-specific safety margins.
 * Maximum safe cutting length with safety margin: 6500mm.
 */
const MACH_002_MaxSafeCuttingLength: DeterministicConstraint = {
  constraintId: 'MACH-002',
  ruleId: 'AICS-001-4.3.3-2',
  description: 'Maximum safe cutting length with safety margin must not exceed 6500mm',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.cuttingLength || !context.safetyMargin) {
      return true; // Pass if cutting length or safety margin not specified
    }
    const safeLength = context.cuttingLength + (context.safetyMargin || 50);
    return safeLength <= 6500;
  },
};

/**
 * MACH-003: Tool Reach Limit
 * 
 * AICS-001 Section 4.3.3: Tool reach and travel limits.
 * Standard tool reach for cutting operations: 300mm.
 */
const MACH_003_ToolReachLimit: DeterministicConstraint = {
  constraintId: 'MACH-003',
  ruleId: 'AICS-001-4.3.3-3',
  description: 'Tool reach must not exceed 300mm (standard tool reach limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.toolReach) {
      return true; // Pass if tool reach not specified
    }
    return context.toolReach <= 300;
  },
};

/**
 * MACH-004: X-Axis Travel Limit
 * 
 * AICS-001 Section 4.3.3: Axis constraints.
 * Maximum X-axis travel: 6000mm (standard CNC machine).
 */
const MACH_004_XAxisTravelLimit: DeterministicConstraint = {
  constraintId: 'MACH-004',
  ruleId: 'AICS-001-4.3.3-4',
  description: 'X-axis travel must not exceed 6000mm (standard CNC machine limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.axisX) {
      return true; // Pass if X-axis not specified
    }
    return context.axisX <= 6000;
  },
};

/**
 * MACH-005: Y-Axis Travel Limit
 * 
 * AICS-001 Section 4.3.3: Axis constraints.
 * Maximum Y-axis travel: 3000mm (standard CNC machine).
 */
const MACH_005_YAxisTravelLimit: DeterministicConstraint = {
  constraintId: 'MACH-005',
  ruleId: 'AICS-001-4.3.3-5',
  description: 'Y-axis travel must not exceed 3000mm (standard CNC machine limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.axisY) {
      return true; // Pass if Y-axis not specified
    }
    return context.axisY <= 3000;
  },
};

/**
 * MACH-006: Z-Axis Travel Limit
 * 
 * AICS-001 Section 4.3.3: Axis constraints.
 * Maximum Z-axis travel: 300mm (standard CNC machine).
 */
const MACH_006_ZAxisTravelLimit: DeterministicConstraint = {
  constraintId: 'MACH-006',
  ruleId: 'AICS-001-4.3.3-6',
  description: 'Z-axis travel must not exceed 300mm (standard CNC machine limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.axisZ) {
      return true; // Pass if Z-axis not specified
    }
    return context.axisZ <= 300;
  },
};

/**
 * MACH-007: Safety Margin Requirement
 * 
 * AICS-001 Section 4.3.3: Machine-specific safety margins.
 * Minimum safety margin: 50mm for cutting operations.
 */
const MACH_007_SafetyMarginRequirement: DeterministicConstraint = {
  constraintId: 'MACH-007',
  ruleId: 'AICS-001-4.3.3-7',
  description: 'Safety margin must be at least 50mm for cutting operations',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.safetyMargin) {
      return true; // Pass if safety margin not specified (may be handled elsewhere)
    }
    return context.safetyMargin >= 50;
  },
};

/**
 * MACH-008: Profile Width Limit (Aluminum)
 * 
 * AICS-001 Section 4.3.3: Maximum cutting length.
 * Maximum profile width for aluminum: 6000mm (standard cutting length).
 */
const MACH_008_ProfileWidthLimitAluminum: DeterministicConstraint = {
  constraintId: 'MACH-008',
  ruleId: 'AICS-001-4.3.3-8',
  description: 'Profile width for aluminum must not exceed 6000mm (standard cutting length)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (context.material !== 'aluminum' || !context.profileWidth) {
      return true; // Pass if not aluminum or profile width not specified
    }
    return context.profileWidth <= 6000;
  },
};

/**
 * MACH-009: Profile Width Limit (UPVC)
 * 
 * AICS-001 Section 4.3.3: Maximum cutting length.
 * Maximum profile width for UPVC: 6000mm (standard cutting length).
 */
const MACH_009_ProfileWidthLimitUPVC: DeterministicConstraint = {
  constraintId: 'MACH-009',
  ruleId: 'AICS-001-4.3.3-9',
  description: 'Profile width for UPVC must not exceed 6000mm (standard cutting length)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (context.material !== 'upvc' || !context.profileWidth) {
      return true; // Pass if not UPVC or profile width not specified
    }
    return context.profileWidth <= 6000;
  },
};

/**
 * MACH-010: Profile Height Limit (Aluminum)
 * 
 * AICS-001 Section 4.3.3: Axis constraints.
 * Maximum profile height for aluminum: 3000mm (Y-axis travel limit).
 */
const MACH_010_ProfileHeightLimitAluminum: DeterministicConstraint = {
  constraintId: 'MACH-010',
  ruleId: 'AICS-001-4.3.3-10',
  description: 'Profile height for aluminum must not exceed 3000mm (Y-axis travel limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (context.material !== 'aluminum' || !context.profileHeight) {
      return true; // Pass if not aluminum or profile height not specified
    }
    return context.profileHeight <= 3000;
  },
};

/**
 * MACH-011: Profile Height Limit (UPVC)
 * 
 * AICS-001 Section 4.3.3: Axis constraints.
 * Maximum profile height for UPVC: 3000mm (Y-axis travel limit).
 */
const MACH_011_ProfileHeightLimitUPVC: DeterministicConstraint = {
  constraintId: 'MACH-011',
  ruleId: 'AICS-001-4.3.3-11',
  description: 'Profile height for UPVC must not exceed 3000mm (Y-axis travel limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (context.material !== 'upvc' || !context.profileHeight) {
      return true; // Pass if not UPVC or profile height not specified
    }
    return context.profileHeight <= 3000;
  },
};

/**
 * MACH-012: Operation Type Support
 * 
 * AICS-001 Section 4.3.3: Supported instruction formats.
 * Supported operation types: cutting, drilling, milling, welding.
 */
const MACH_012_OperationTypeSupport: DeterministicConstraint = {
  constraintId: 'MACH-012',
  ruleId: 'AICS-001-4.3.3-12',
  description: 'Operation type must be one of: cutting, drilling, milling, welding',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.operationType) {
      return true; // Pass if operation type not specified
    }
    const supportedOperations: Array<'cutting' | 'drilling' | 'milling' | 'welding'> = [
      'cutting',
      'drilling',
      'milling',
      'welding',
    ];
    return supportedOperations.includes(context.operationType);
  },
};

/**
 * MACH-013: Minimum Cutting Length
 * 
 * AICS-001 Section 4.3.3: Machine operating limits.
 * Minimum cutting length: 50mm (tool safety requirement).
 */
const MACH_013_MinCuttingLength: DeterministicConstraint = {
  constraintId: 'MACH-013',
  ruleId: 'AICS-001-4.3.3-13',
  description: 'Minimum cutting length must be at least 50mm (tool safety requirement)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.cuttingLength) {
      return true; // Pass if cutting length not specified
    }
    return context.cuttingLength >= 50;
  },
};

/**
 * MACH-014: Combined Axis Travel Limit (X+Y)
 * 
 * AICS-001 Section 4.3.3: Axis constraints.
 * Combined X+Y axis travel must not exceed machine envelope (6000mm + 3000mm = 9000mm theoretical max, but practical limit is 6000mm for standard operations).
 */
const MACH_014_CombinedAxisTravelLimit: DeterministicConstraint = {
  constraintId: 'MACH-014',
  ruleId: 'AICS-001-4.3.3-14',
  description: 'Combined X+Y axis travel must respect machine envelope constraints',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.axisX || !context.axisY) {
      return true; // Pass if axis values not specified
    }
    // Standard machine envelope: 6000mm X, 3000mm Y
    // Combined travel is valid if both axes are within limits
    return context.axisX <= 6000 && context.axisY <= 3000;
  },
};

/**
 * MACH-015: Tool Reach vs Z-Axis Compatibility
 * 
 * AICS-001 Section 4.3.3: Tool reach and travel limits.
 * Tool reach must not exceed Z-axis travel limit.
 */
const MACH_015_ToolReachZAxisCompatibility: DeterministicConstraint = {
  constraintId: 'MACH-015',
  ruleId: 'AICS-001-4.3.3-15',
  description: 'Tool reach must not exceed Z-axis travel limit (300mm)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.toolReach || !context.axisZ) {
      return true; // Pass if tool reach or Z-axis not specified
    }
    return context.toolReach <= context.axisZ;
  },
};

/**
 * MACH-016: Maximum Stock Length
 * 
 * AICS-001 Section 4.3.3: Machine operating limits.
 * Global hard safety limit for profile stock length: 8000mm.
 * Many regional suppliers use 6–7.5m bars; we cap all cutting calculations at 8000mm
 * to prevent impossible cuts from being generated.
 * 
 * Source: FabricatorWorkflow.tsx:702
 */
const MACH_016_MaxStockLength: DeterministicConstraint = {
  constraintId: 'MACH-016',
  ruleId: 'AICS-001-4.3.3-16',
  description: 'Maximum stock length must not exceed 8000mm (global safety limit)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.stockLength) {
      return true; // Pass if stock length not specified
    }
    return context.stockLength <= 8000;
  },
};

/**
 * MACH-026: Clamp Zone Avoidance
 * 
 * AICS-001 Section 4.3.3: Safety margins.
 * Clamp zones where cutting operations cannot occur (safety-critical, collision prevention).
 * Left clamp: X 0-200mm, Right clamp: X 6300-6500mm (for 6500mm machine).
 * 
 * Source: Machine safety profiles (yilmaz_alm_6510.json)
 */
const MACH_026_ClampZoneAvoidance: DeterministicConstraint = {
  constraintId: 'MACH-026',
  ruleId: 'AICS-001-4.3.3-26',
  description: 'Cutting operations must not occur in clamp zones (Left: X 0-200mm, Right: X 6300-6500mm)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.clampZoneX) {
      return true; // Pass if clamp zone X position not specified
    }
    // Left clamp zone: X 0-200mm
    // Right clamp zone: X 6300-6500mm (for 6500mm machine)
    const inLeftClamp = context.clampZoneX >= 0 && context.clampZoneX <= 200;
    const inRightClamp = context.clampZoneX >= 6300 && context.clampZoneX <= 6500;
    return !inLeftClamp && !inRightClamp;
  },
};

/**
 * MACH-027: Rapid Safety Height
 * 
 * AICS-001 Section 4.3.3: Safety margins.
 * Minimum height for rapid movements to avoid collisions: 50mm.
 * Safety-critical constraint for collision prevention.
 * 
 * Source: Collision detector (python_backend/core/kinematics/collision_detector.py:177)
 */
const MACH_027_RapidSafetyHeight: DeterministicConstraint = {
  constraintId: 'MACH-027',
  ruleId: 'AICS-001-4.3.3-27',
  description: 'Rapid movement height must be at least 50mm (safety requirement for collision prevention)',
  source: 'Machine Limit',
  deterministic: true,
  validationFn: (input: unknown): boolean => {
    const context = input as MachineValidationContext;
    if (!context.rapidHeight) {
      return true; // Pass if rapid height not specified
    }
    return context.rapidHeight >= 50;
  },
};

/**
 * Register all machine constraints
 * 
 * Registers machine constraints extracted from optimization algorithms,
 * CNC integration code, and profile system configurations.
 * 
 * AICS-001 Section 4.3.3: Machine constraints are registered in the MACHINE category.
 */
export function registerMachineConstraints(): void {
  const registry = getConstraintRegistry();
  
  // Register machine constraints in priority order (lower priority = higher priority)
  // High-priority safety-critical constraints first
  registry.register(MACH_016_MaxStockLength, ConstraintCategory.MACHINE, 5);
  registry.register(MACH_026_ClampZoneAvoidance, ConstraintCategory.MACHINE, 10);
  registry.register(MACH_027_RapidSafetyHeight, ConstraintCategory.MACHINE, 15);
  
  // Standard constraints
  registry.register(MACH_001_MaxCuttingLength, ConstraintCategory.MACHINE, 20);
  registry.register(MACH_002_MaxSafeCuttingLength, ConstraintCategory.MACHINE, 30);
  registry.register(MACH_003_ToolReachLimit, ConstraintCategory.MACHINE, 40);
  registry.register(MACH_004_XAxisTravelLimit, ConstraintCategory.MACHINE, 50);
  registry.register(MACH_005_YAxisTravelLimit, ConstraintCategory.MACHINE, 60);
  registry.register(MACH_006_ZAxisTravelLimit, ConstraintCategory.MACHINE, 70);
  registry.register(MACH_007_SafetyMarginRequirement, ConstraintCategory.MACHINE, 80);
  registry.register(MACH_008_ProfileWidthLimitAluminum, ConstraintCategory.MACHINE, 90);
  registry.register(MACH_009_ProfileWidthLimitUPVC, ConstraintCategory.MACHINE, 100);
  registry.register(MACH_010_ProfileHeightLimitAluminum, ConstraintCategory.MACHINE, 110);
  registry.register(MACH_011_ProfileHeightLimitUPVC, ConstraintCategory.MACHINE, 120);
  registry.register(MACH_012_OperationTypeSupport, ConstraintCategory.MACHINE, 130);
  registry.register(MACH_013_MinCuttingLength, ConstraintCategory.MACHINE, 140);
  registry.register(MACH_014_CombinedAxisTravelLimit, ConstraintCategory.MACHINE, 150);
  registry.register(MACH_015_ToolReachZAxisCompatibility, ConstraintCategory.MACHINE, 160);
}

/**
 * Export constraint definitions for reference
 */
export const MachineConstraints = {
  MACH_001_MaxCuttingLength,
  MACH_002_MaxSafeCuttingLength,
  MACH_003_ToolReachLimit,
  MACH_004_XAxisTravelLimit,
  MACH_005_YAxisTravelLimit,
  MACH_006_ZAxisTravelLimit,
  MACH_007_SafetyMarginRequirement,
  MACH_008_ProfileWidthLimitAluminum,
  MACH_009_ProfileWidthLimitUPVC,
  MACH_010_ProfileHeightLimitAluminum,
  MACH_011_ProfileHeightLimitUPVC,
  MACH_012_OperationTypeSupport,
  MACH_013_MinCuttingLength,
  MACH_014_CombinedAxisTravelLimit,
  MACH_015_ToolReachZAxisCompatibility,
  MACH_016_MaxStockLength,
  MACH_026_ClampZoneAvoidance,
  MACH_027_RapidSafetyHeight,
};

