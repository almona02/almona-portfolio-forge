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

