/**
 * UPVC-Specific Types for Egyptian Market
 * 
 * UPVC fabrication requires fundamentally different calculations than aluminum:
 * - Welding (not crimping): Material melts and shrinks
 * - Steel Reinforcement: Hidden steel inserts for structural strength
 * - Thermal Expansion: Critical in Egyptian summer (10°C to 50°C swings)
 * - Multi-Chamber Profiles: 3, 4, 5 chamber systems for thermal insulation
 */

export interface UPVCWeldingParams {
  /** Material lost per weld (typically 3mm per side, 5mm for thick profiles) */
  burnOffMm: number;
  /** Welding temperature (240-260°C standard) */
  temperature: number;
  /** Welding pressure in bar (typically 3.0 bar) */
  pressure: number;
  /** Cooling time in seconds (typically 180s for standard profiles) */
  coolingTimeSec: number;
  /** Welding method: 'butt' (standard) or 'corner' (specialized) */
  method?: 'butt' | 'corner';
}

export interface SteelReinforcementSpec {
  /** Whether reinforcement is required (mandatory for sashes > 800mm) */
  required: boolean;
  /** Steel profile code (e.g., 'GENERIC_STEEL_U', 'HEAVY_STEEL_1.5') */
  profileCode: string;
  /** Total clearance deduction (typically 10-15mm shorter than UPVC) */
  deductionMm: number;
  /** Steel thickness (1.2mm standard, 1.5mm heavy duty) */
  thicknessMm: number;
  /** Moment of Inertia (Ix) in cm⁴ for structural validation */
  momentOfInertia: number;
  /** Steel grade (typically S235 or S275 for Egyptian market) */
  grade?: 'S235' | 'S275' | 'S355';
}

export interface UPVCSystemSettings {
  /** Material type flag */
  isUPVC: boolean;
  /** Welding parameters */
  welding: UPVCWeldingParams;
  /** Steel reinforcement specification */
  reinforcement: SteelReinforcementSpec;
  /** Egyptian climate profile */
  climateProfile: 'egypt_standard' | 'egypt_coastal' | 'egypt_upper' | 'egypt_desert';
  /** Number of chambers (3, 4, 5 for thermal insulation) */
  chambers: number;
  /** Color class (A = premium, B = standard) */
  colorClass: 'A' | 'B';
  /** UV stabilization (critical for Egyptian sun exposure) */
  uvStabilized: boolean;
  /** Standard bar length for UPVC (typically 5800mm, 5970mm, or 6000mm) */
  barNominalLength: number;
}

/**
 * UPVC Cut Calculation Result
 */
export interface UPVCCutResult {
  /** Original design dimension */
  originalDimension: number;
  /** Required cutting length (including welding loss) */
  cuttingLength: number;
  /** Finished dimension after welding */
  finishedDimension: number;
  /** Steel reinforcement length (if applicable) */
  steelLength?: number;
  /** Welding loss applied */
  weldingLoss: number;
  /** Number of welds */
  weldCount: number;
  /** Expansion gap required for installation */
  expansionGap: number;
}

/**
 * UPVC Window Component
 */
export interface UPVCComponent {
  id: string;
  type: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead';
  /** Width dimension (mm) */
  width: number;
  /** Height dimension (mm) */
  height: number;
  /** UPVC system settings */
  upvcSettings: UPVCSystemSettings;
  /** Whether this component requires steel reinforcement */
  requiresReinforcement: boolean;
}

/**
 * Egyptian Cutting Parameters
 * 
 * Extracted from EMAPEN technical catalogue and Egyptian workshop practices.
 * Critical difference: Egyptian profiles use NON-STANDARD cutting angles (92° not 90°).
 */
export interface EgyptianCuttingParams {
  /** Cutting angle for frame corners (92° not 90° - compensates for welding shrinkage) */
  frameCornerAngle: number;
  /** Cutting angle for sash corners (88° - complementary to frame 92°) */
  sashCornerAngle: number;
  /** Cutting angle for mullion joints (90° exact) */
  mullionAngle: number;
  /** Angle tolerance (±0.3° for frames/sash, ±0.2° for mullions) */
  angleTolerance: number;
  /** Burn-off allowance per side (varies by season: 2.8mm summer, 3.2mm winter) */
  burnOffMm: number;
  /** Seasonal adjustment factor */
  seasonalAdjustment?: {
    summer: number; // -0.2mm
    winter: number; // +0.2mm
  };
  /** Steel reinforcement cutting: PVC length - clearance */
  steelClearance: number; // 10-15mm standard
}

/**
 * Egyptian Welding Machine Settings
 * 
 * Based on actual Egyptian workshop equipment (El-Arabi, Strong, Maksan).
 */
export interface EgyptianWeldingMachine {
  /** Machine type/brand */
  machineType: string;
  /** Common in which regions */
  commonIn: string[];
  /** Temperature settings */
  temperature: {
    set: number;
    actual: number; // Often 5°C offset due to calibration
    calibrationOffset: number;
  };
  /** Pressure settings */
  pressure: {
    set: number;
    actual: number; // Often inaccurate after 6 months
  };
  /** Heating time in seconds */
  heatingTime: number;
  /** Common maintenance issues */
  maintenanceIssues: string[];
}

/**
 * Egyptian Welding Protocol
 * 
 * Complete daily startup and per-window procedure for Egyptian workshops.
 */
export interface EgyptianWeldingProtocol {
  /** Daily startup checklist */
  dailyStartup: string[];
  /** Per-window procedure */
  perWindowProcedure: string[];
  /** Quality checks frequency */
  qualityChecks: {
    everyWindow: string[];
    every10Windows: string[];
    every100Windows: string[];
  };
  /** Allowable adjustments based on ambient conditions */
  allowableAdjustments: {
    temperature: string;
    time: string;
    pressure: string;
  };
}

