/**
 * Machine Abstraction Layer — Core exports
 *
 * Single import path for all machine-related functionality:
 *   import { quickMachineCheck, YILMAZ_ALM_6510 } from '@/lib/machines/core';
 *
 * For the Yilmaz driver (validate → generate → send pipeline):
 *   import { createYilmazDriver } from '@/lib/machines/yilmaz';
 *
 * @since Defragmentation Phase 1 — 2026-02-08
 */

export type {
    CompatibilitySeverity,
    MachineAngleConstraints,
    MachineClampZone,
    MachineConstraintViolation,
    MachineDefinition,
    MachineInterface,
    MachineProfileConstraints,
    MachineValidationResult,
    TransferStatus
} from './MachineInterface';

export {
    SUPPORTED_MACHINES,
    YILMAZ_AIM_3410,
    YILMAZ_ALM_6510,
    YILMAZ_DC_421_PBS,
    YILMAZ_PIM_6509, checkAllMachines,
    checkMachineCompatibility,
    quickMachineCheck
} from './MachineCompatibilityChecker';

