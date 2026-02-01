/**
 * Hardener Module - Main Export
 * 
 * Exports all hardener selection functionality.
 * 
 * @since Phase 1: Precision Upgrade Plan (January 2026)
 */

export { HardenerAuditLogger, hardenerAuditLogger } from './HardenerAuditRecord';
export { HARDENER_CATALOG, getHardenerByCode, getHardenerCodesByMaterial, getHardenerCodesByOpeningType } from './HardenerCatalog';
export { HardenerRuleEngine } from './HardenerRuleEngine';
export {
  HardenerSelectionProfiler,
  OptimizedHardenerRuleEngine,
  optimizedHardenerRuleEngine,
  performanceTest1000Selections,
  type HardenerSelectionMetrics
} from './HardenerRuleEnginePerformance';
export { HardenerSelectionRepository } from './HardenerSelectionRepository';
export { HardenerSelector, hardenerSelector } from './HardenerSelector';
export {
  EGYPTIAN_CODE_2020_STANDARDS,
  GCC_STANDARDS, calculateSashArea,
  getThicknessCategory,
  validateGlassThickness,
  validateSashSize
} from './HardenerStandards';
export { HardenerValidationGate } from './HardenerValidationGate';
export { debounceHardenerSelection, hardenerSelectionCache, useMemoizedHardenerSelection } from './performance';

export type {
  HardenerCode,
  HardenerCodeSpec, HardenerRule, HardenerSelectionContext,
  HardenerSelectionResult, MaterialType,
  OpeningType,
  Region, ValidationResult
} from './types';

export type { HardenerAuditRecord } from './HardenerAuditRecord';
export type { HardenerAuditLogRow, HardenerSelectionRow } from './HardenerSelectionRepository';

