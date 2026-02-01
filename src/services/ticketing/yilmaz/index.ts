/**
 * YILMAZ Service Ticketing System (Wave 3)
 * 
 * A constitutionally-governed service analytics system for YILMAZ machines in Egypt.
 * Implements "Human-as-a-Sensor" methodology with $0 hardware budget.
 * 
 * Architecture:
 * - Tier 3 (Deterministic): YilmazEgyptRulesEngine - 24 years of Egypt experience
 * - Tier 2 (Advisory): YilmazExpertAdvisor - Bilingual expert system
 * - Tier 1 (Presentation): TechChecklist - Mobile-optimized data collection
 * 
 * Constitutional Compliance: AICS-001 §5.6, §6.1, §7
 */

// Tier 3 Deterministic Rules
export {
  yilmazEgyptRulesEngine,
  YilmazEgyptRulesEngine,
  YILMAZ_EGYPT_PARTS,
  EGYPT_ENV_CONSTANTS
} from './rules/YilmazEgyptRules';

export type {
  YilmazMachineModel,
  YilmazIssueCategory,
  YilmazPartNumber,
  YilmazDeterministicRule,
  YilmazTechnicianInput,
  YilmazRuleResult
} from './rules/YilmazEgyptRules';

// Tier 2 Advisory
export {
  yilmazExpertAdvisor,
  YilmazExpertAdvisor
} from './advisory/YilmazExpertAdvisor';

export type {
  YilmazExpertAdvisory
} from './advisory/YilmazExpertAdvisor';

// Tier 1 Presentation
export { TechChecklist } from '../../components/ticketing/yilmaz/mobile/TechChecklist';

// Testing & Simulation (Tier 1 - Infrastructure)
export {
  YilmazTelemetrySimulator,
  yilmazTelemetrySimulator
} from './core/YilmazTelemetrySimulator';

export type {
  YilmazSimulatedTelemetry
} from './core/YilmazTelemetrySimulator';

export {
  runYilmazSimulationDemo,
  demoKhamsinSeason,
  demoVoltageFluctuation,
  demoSummerOverheating,
  demoFleetWide
} from './core/YilmazSimulationDemo';
