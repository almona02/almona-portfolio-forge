/**
 * @file canonical_truth/index.ts
 * @description Truth Domain Exports
 * 
 * AICS-001 Reference: Section 6.3
 * 
 * Exports all truth domain interfaces.
 * Location: Core Authority Layer (constitutional, immutable)
 */

export type {
  GeometryTruth,
  GeometrySchema,
  GeometryValidationRule,
  GeometryProvenance,
  PointDefinition,
  VectorDefinition,
  EdgeDefinition,
  FaceDefinition,
  ReferenceFrame
} from './geometry_truth';

export type {
  MaterialTruth,
  MaterialSchema,
  MaterialValidationRule,
  MaterialProvenance,
  MaterialProperties,
  MaterialSpecifications
} from './material_truth';

export type {
  MachineTruth,
  MachineSchema,
  MachineValidationRule,
  MachineProvenance,
  MachineCapabilities,
  MachineLimitations,
  MachineConfiguration,
  ToolConfiguration,
  CalibrationData,
  MaintenanceStatus
} from './machine_truth';

export type {
  ProcessTruth,
  ProcessSchema,
  ProcessValidationRule,
  ProcessProvenance,
  ProcessStep,
  ProcessDependency,
  ProcessTiming,
  ProcessRequirements
} from './process_truth';

export type {
  CertificationTruth,
  CertificationSchema,
  CertificationValidationRule,
  CertificationProvenance,
  CertificationRequirement,
  CertificationValidity
} from './certification_truth';

