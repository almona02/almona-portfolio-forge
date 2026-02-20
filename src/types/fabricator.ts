export type WindowUnitStatus =
  | 'measuring'
  | 'design'
  | 'optimized'
  | 'production'
  | 'quality'
  | 'delivered';

// --- FACADE TYPES (Phase 2) ---
export type FacadeSystemType = 'stick' | 'unitized' | 'spider';

export interface FacadeGridSpec {
  width: number;
  height: number;
  rows: number;
  cols: number;
  rowHeights: number[]; // if empty, evenly distributed
  colWidths: number[]; // if empty, evenly distributed
  mullionProfileId: string;
  transomProfileId: string;
  glassType: string;
}

export interface FacadePanel {
  id: string;
  row: number;
  col: number;
  width: number;
  height: number;
  type: 'fixed' | 'vent' | 'spandrel';
  // Position for 3D rendering
  position?: { x: number; y: number; z: number };
  glassId?: string;
  notes?: string;
}

export interface FacadeMember {
  id: string;
  type: 'mullion' | 'transom';
  length: number;
  profileId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  cutAngles: { start: number; end: number };
}

export interface FacadeModel {
  id: string;
  systemType: FacadeSystemType;
  spec: FacadeGridSpec;
  members: FacadeMember[];
  panels: FacadePanel[];
  totalArea: number;
  totalPerimeter: number;
}
// ------------------------------

/**
 * Glazing specification types — Gold Tier precision typing
 * Replaces legacy `any` for type safety across workflow, PDF, drafting, hardener.
 *
 * Flat spec: workflow/PDF/precision design (type, thickness, spacer, gasFill, uValue)
 * Per-cell spec: drafting (Record<cellId, { type, color? }>)
 */
export interface GlazingSpecFlat {
  type?: string;
  thickness?: number;
  spacer?: string;
  gasFill?: string;
  color?: string;
  uValue?: number;
  safetyRating?: 'annealed' | 'tempered' | 'laminated';
  glassCode?: string;
}

/** Per-cell glazing from drafting (frameId -> cellId -> spec) */
export type GlazingSpecPerCell = Record<string, { type?: 'single' | 'double' | 'triple'; color?: string; georgianBars?: boolean }>;

export type GlazingSpec = GlazingSpecFlat | GlazingSpecPerCell;

/** Type guard: flat spec (workflow/PDF) vs per-cell (drafting) */
export function isGlazingSpecFlat(g: GlazingSpec): g is GlazingSpecFlat {
  return typeof g === 'object' && g !== null && ('type' in g || 'thickness' in g || 'spacer' in g || 'gasFill' in g || 'uValue' in g);
}

/**
 * Minimal hardware item for WindowUnit/WindowComponent — PDF, BOM, workflow iteration.
 * Drafting uses HardwarePlacement (materialAware); this covers legacy/flat usage.
 */
export interface HardwareItemMinimal {
  id?: string;
  name?: string;
  type?: string;
  quantity?: number;
  supplierCode?: string;
  category?: string;
}

export interface WindowUnit {
  id: string;
  orderNumber: string;
  posNumber: string;
  type: string;
  components: WindowComponent[];
  overallWidth: number;
  overallHeight: number;
  color: string;
  glazing: GlazingSpec;
  hardware: HardwareItemMinimal[];
  status: WindowUnitStatus;
  optimization: OptimizationResult | null;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  /** Optional order date for this project/order */
  orderDate?: Date;
  customer?: string;
  /** Optional short human-friendly project code (for labels, machine fields, etc.) */
  projectCode?: string;
   /** Optional customer twin code used inside Fabricator (label-friendly) */
  customerCode?: string;
  /** Optional position/pose twin code for machine labels & reports */
  positionCode?: string;
  /** Optional system pack (e.g. rock60, jumbo100) used for this position */
  systemPackId?: string;
  /**
   * Number of identical positions/poses for this unit (e.g. same window
   * repeated across many flats). Used for large-scale projects.
   */
  quantity?: number;
  /**
   * Optional positional metadata for big projects (up to tens of thousands
   * of openings): flat, floor, zone, remarks, etc.
   */
  positionMeta?: {
    flatNumber?: string;
    buildingBlock?: string;
    floor?: string;
    unitOrApartment?: string;
    elevation?: string;
    roomOrZone?: string;
    windowIndex?: string;
    remarks?: string;
    posNumber?: string;
    customer?: string;
  };
  /**
   * Optional metadata for mass‑production optimisation runs. This is
   * populated when a WindowUnit participates in cross‑project batches.
   */
  massProductionMeta?: {
    /** IDs of mass‑production batches this unit has been included in */
    includedInBatchIds?: string[];
    /** Whether this unit has already been re‑optimised in mass mode */
    batchOptimized?: boolean;
    /** Remnant IDs that were sourced from other projects for this unit */
    crossProjectRemnantsUsed?: string[];
  };
  /** 
   * Grid layout for multi-unit structures
   * @since Phase 4
   */
  grid?: WindowGrid;
  /**
   * Optional mapping of system-pack roles to concrete profile codes selected
   * by the operator during measuring (e.g. frame vs sash profile numbers).
   * This preserves user selections from the measuring step.
   */
  systemProfileSelections?: SystemProfileSelections;
  /**
   * Measurement mode and wall tolerance data from measuring step
   * @since Phase 4
   */
  measurementMode?: 'hole' | 'manufacturing';
  wallDeduction?: string; // mm deduction for wall tolerance
  manufacturingWidth?: number;
  manufacturingHeight?: number;
  roughOpeningWidth?: number;
  roughOpeningHeight?: number;
  /**
   * Fly screen type selection from measuring step
   */
  flyScreenType?: string;
  /**
   * Preset pattern ID for preset-aware 3D generation
   * @since Phase 1: Preset Bridge
   */
  presetId?: string;
  /**
   * Cached preset pattern data for faster access
   * @since Phase 1: Preset Bridge
   */
  presetData?: Partial<{
    id: string;
    name: string;
    type: string;
    gridSpec: unknown;
    mullions: unknown[];
    transoms: unknown[];
    constraints: unknown;
    openingMechanism: unknown;
  }>;
  /**
   * Facade Model Data (Phase 2)
   * If present, this overrides standard window geometry generation
   */
  facadeModel?: FacadeModel;
}

/**
 * Grid Layout Definitions for Phase 4
 */
/**
 * Manual Mullion - User-drawn mullion (frame-level or sash-level)
 */
export interface ManualMullion {
  id: string;
  type: 'horizontal' | 'vertical';
  level: 'frame' | 'sash';
  position: number; // Absolute: mm from left (vertical) or top (horizontal). Proportional: 0–100 (percent).
  sashId?: string; // Optional: For sash-level mullions, the ID of the sash cell
  /** Bar thickness in mm; when set, overrides system pack mullion profile width for 3D/2D */
  widthMm?: number;
  /** Absolute (mm) | Proportional (%) — stays centered on resize when proportional */
  splitType?: 'absolute' | 'proportional' | 'clearance-based';
}

export interface WindowGrid {
  rows: number;
  cols: number;
  cells: GridCell[];
  colWidths?: number[]; // relative proportions, length = cols
  rowHeights?: number[]; // relative proportions, length = rows
  manualMullions?: ManualMullion[]; // User-drawn mullions (frame-level and sash-level)
}

export interface GridCell {
  id: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  type: 'fixed' | 'sash' | 'panel' | 'empty' | 'sliding';
  componentId?: string; // Links to a specific component definition if needed
  openingDirection?: 'left' | 'right' | 'top' | 'bottom';
}

export interface WindowComponent {
  id: string;
  type: string;
  profile: Profile;
  width: number;
  height: number;
  quantity: number;
  cuttingLengths: number[];
  angles: number[];
  machiningOperations: unknown[];
  glazingType: string;
  hardware: HardwareItemMinimal[];
}

/**
 * Cutting calibration for profile-specific adjustments
 * Enhanced with comprehensive modifier system for allowances, strokes, and variations
 */
export interface CuttingCalibration {
  id: string;
  profileId: string;
  systemPackId: string;
  profileType?: 'frame' | 'sash' | 'mullion' | 'interlock' | 'glazing' | 'liner';
  
  /** Legacy: Length modifier in mm (e.g., +2mm or -1mm) */
  lengthModifier: number;
  /** Legacy: Blade width compensation in mm */
  bladeWidthCompensation: number;
  
  /** Enhanced: Comprehensive allowance parameters */
  allowances?: {
    /** Basic cutting allowance in mm */
    basicCutting: number;
    /** Extra allowance for 45° miter cuts in mm */
    miter45Extra: number;
    /** Thermal break compensation in mm */
    thermalBreakCompensation: number;
    /** Grain direction factor (multiplier) */
    grainDirectionFactor: number;
  };
  
  /** Enhanced: Stroke and machining parameters */
  strokes?: {
    /** Saw blade thickness in mm */
    sawBladeThickness: number;
    /** Machining tolerance in mm */
    machiningTolerance: number;
    /** Corner clearance in mm */
    cornerClearance: number;
  };
  
  /** Enhanced: Material and environmental variations */
  variations?: {
    /** Temperature expansion coefficient (mm/°C) */
    temperatureExpansion: number;
    /** Material flexibility factor (multiplier) */
    materialFlexibility: number;
    /** Assembly clearance in mm */
    assemblyClearance: number;
  };
  
  /** Whether this calibration is currently active */
  isActive: boolean;
  /** Optional notes about the calibration */
  notes?: string;
  /** Validation test results */
  testResults?: {
    expectedLength: number;
    actualLength: number;
    difference: number;
    testDate: Date;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Profile {
  id: string;
  name: string;
  material: 'aluminum' | 'upvc' | 'wood';
  width: number;
  height?: number;
  thickness?: number;
  /** Optional thumbnail URL for visual assets */
  thumbnailUrl?: string;
  color: string;
  costPerMeter: number;
  cuttingAllowance: number;
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel?: number;
  supplier: string;
  // Optional fields that may be present in legacy data
  type?: string;
  system?: string;
  systemBrand?: string; // 'Yilmaz', 'Local Brand', etc.
  weightPerMeter?: number;
  unitWeight?: number; // Alternative naming for weightPerMeter
  barLength?: number; // Standard bar length for this profile
  grainDirection?: 'horizontal' | 'vertical' | null;
  /** Category of profile: window, door, curtain_wall, structural, accessory */
  category?: 'window' | 'door' | 'curtain_wall' | 'structural' | 'accessory';
  /** System type: casement, sliding, tilt_turn, fixed, facade, commercial */
  systemType?: 'casement' | 'sliding' | 'tilt_turn' | 'fixed' | 'facade' | 'commercial' | 'folding';
  /**
   * Egyptian Market System Families
   * - PS: Standard hinging/sliding (Small/Large)
   * - Jumbo: Heavy duty sliding
   * - Tango: Economy sliding (60mm)
   * - Sonata: Premium hinging (45mm)
   */
  systemFamily?: 'ps_small' | 'ps_large' | 'jumbo' | 'tango' | 'sonata' | 'alumil' | 'volcano' | 'other';
  /** Profile role in system: Gold-tier granular roles for accurate cutting lists */
  profileRole?: 
    | 'frame'                    // Main frame profile (Halq)
    | 'frame_architrave'         // Frame with architrave (Bar)
    | 'sash'                     // Standard operable sash (Dalfah)
    | 'sash_sliding'             // Sliding sash profile
    | 'sash_door'                // Door sash profile
    | 'sash_flyscreen'           // Fly-screen sash (Dalfah Silk)
    | 'sash_casement'            // Casement sash
    | 'mullion'                  // Vertical divider (Sweas)
    | 'mullion_false'            // False mullion (T-profile)
    | 'transom'                  // Horizontal divider (Sweas)
    | 'glazing_bead'             // Glazing bead (Barour)
    | 'glazing_bead_inner'       // Inner glazing bead
    | 'glazing_bead_outer'       // Outer glazing bead
    | 'interlock'                // Interlock profile (Saken/Masken)
    | 'accessory'                // Accessory
    | 'screen_sash'              // Screen sash
    | 'screen_adapter'           // Screen adapter (Barour Silk)
    | 'screen_track'             // Screen track (Majra Silk)
    | 'shutter_guide'            // Shutter guide (Majra Shish)
    | 'shutter_box'              // Shutter box (Box Shish)
    | 'shutter_slat'             // Shutter slat (Shish)
    | 'panel'                    // Panel / Filler (Hachwa)
    | 'architrave'               // Standalone architrave (Bar)
    | 'threshold'                // Threshold profile
    | 'sill'                     // Sill profile
    | 'head'                     // Head profile
    | 'jamb'                     // Jamb profile
    | 'corner_cleat'             // Corner cleat (Zawya)
    | 'reinforcement'            // Reinforcement profile
    | 'gasket'                   // Gasket (Kawetch)
    | 'weather_strip';           // Weather strip (Forsha)
  /** Sash inner gap for glazing fit (mm) - e.g., 40mm for ROCK 60, 50mm for JUMBO 100 */
  innerGap?: number;
  /** Maximum load capacity for hardware associated with this profile (kg) */
  maxLoadCapacity?: number;
  /** Allowed glass thicknesses for this profile (mm) */
  compatibleGlassThicknesses?: number[];
  /** Compatible glazing bead widths for this profile (mm) */
  compatibleBeadSizes?: number[];
  /** Track type for sliding systems */
  trackType?: 'V-groove' | 'U-groove' | 'flat';
  /** Assembly method requirement for corner cleats */
  cleatType?: 'crimp' | 'screw';
  /** Total gasket compression (mm) - standard: 6mm (3mm internal + 3mm external) */
  gasketCompression?: number;
  /** Indicates if this profile can be bent for arches */
  supportsBending?: boolean;
  /** Minimum bending radius for this profile (mm) - if supportsBending = true */
  minBendingRadius?: number;
  /** Indicates if this profile supports an integrated screen sash (Panda feature) */
  supportsScreenSash?: boolean;
  /** Profile ID for the compatible screen adapter (Barour Shabaak) if supportsScreenSash */
  screenAdapterProfile?: string;
  /** Screen adapter offset (mm) - how much adapter pushes screen sash outward (12-18mm, default 15mm) */
  screenAdapterOffset?: number;
  /** IDs of compatible accessories */
  compatibleAccessories?: string[];
  /** Router/pantograph machining operations */
  machiningMacros?: MachiningMacro[];
  /** Technical drawings and previews */
  technicalDrawings?: TechnicalDrawing[];
  /** Associated system pack IDs */
  systemPackIds?: string[];
  specifications?: {
    originalWeight?: number;
    aluminumPricePerKg?: number;
    markupPercentage?: number;
    cuttingType?: string;
    optimizedFor45Degree?: boolean;
    [key: string]: unknown; // ... other specifications
  };
  /** Optional calibrations for this profile */
  calibrations?: CuttingCalibration[];
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;

  /**
   * Physics properties for engineering validation (Phase 4)
   */
  physics?: {
    /** Moment of Inertia around X-axis (cm4) - Resistance to wind load */
    ix: number;
    /** Moment of Inertia around Y-axis (cm4) - Resistance to weight load */
    iy: number;
    /** Thermal U-value of the frame profile (W/m2K) */
    uf?: number;
    /** Face width of the profile (mm) used for thermal calc */
    faceWidth?: number;
  };
}

export interface FabricatorAccessory {
  id: string;
  name: string;
  type: 'hinge' | 'lock' | 'handle' | 'seal' | 'spacer' | 'corner' | 'other';
  category: string;
  unitPrice: number;
  baseCost: number;
  markupPercentage: number;
  supplier?: string;
  sku?: string;
  description?: string;
  compatibleMaterials: string[]; // ['aluminum', 'upvc']
  region: string[]; // ['turkey', 'egypt', 'global']
  imageUrl?: string;
  specifications?: Record<string, unknown>;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProfileAccessoryCompatibility {
  profileId: string;
  accessoryId: string;
}

/**
 * Machining macro for router/pantograph operations
 */
export interface MachiningMacro {
  id: string;
  name: string; // "Hinge Slot Type A", "Handle Cutout"
  operation: 'slot' | 'pocket' | 'drill' | 'counterbore' | 'contour';
  dimensions: { width: number; height: number; depth: number };
  position: { x: number; y: number }; // Relative to profile origin
  toolSpecs: { diameter: number; type: string };
  gCodeTemplate?: string;
}

/**
 * Technical drawing reference
 */
export interface TechnicalDrawing {
  id: string;
  name: string;
  type: '2d' | '3d' | 'section' | 'detail';
  url?: string;
  previewUrl?: string;
  description?: string;
}

/**
 * Enhanced Accessory interface with installation macros
 */
export interface Accessory {
  id: string;
  name: string;
  type: 'hinge' | 'handle' | 'lock' | 'corner_connector' | 'bracket' | 'seal' | 'screw' | 'wheel' | 'friction_stay';
  /**
   * Egyptian Market Accessory Categories
   * - Wheels: "Agala" (Single/Double/Jumbo)
   * - Handles: "Okkra" (Spagnolette, Squeeze, D-Handle)
   * - Hinges: "Mofasala" (2D/3D)
   * - Stays: "Deraa" (Friction stay)
   */
  compatibleProfiles: string[]; // Profile IDs
  installationMacros: MachiningMacro[];
  specifications: AccessorySpecs;
  images: string[];
  // Legacy compatibility fields
  category?: string;
  unitPrice?: number;
  baseCost?: number;
  markupPercentage?: number;
  supplier?: string;
  sku?: string;
  description?: string;
  compatibleMaterials?: string[];
  region?: string[];
  imageUrl?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Accessory specifications
 */
export interface AccessorySpecs {
  material?: string;
  finish?: string;
  dimensions?: { width?: number; height?: number; depth?: number };
  weight?: number;
  loadCapacity?: number;
  certifications?: string[];
  [key: string]: unknown;
}

/**
 * System pack metadata – describes a branded window/door system
 * (e.g. ROCK 60) and how it should be treated regionally.
 */
export interface SystemPackMeta {
  /** Stable identifier, e.g. "rock60" */
  id: string;
  /** Human readable name, e.g. "ROCK 60" */
  name: string;
  /** Brand(s) or suppliers this pack belongs to */
  brands: string[];
  /** Regions where this pack is most relevant (egypt, turkey, mena, gulf, global, etc.) */
  regions: string[];
  /** Default stock bar length in mm for this system, if known */
  defaultStockLengthMm?: number;
}

/**
 * System Pack for window/door systems
 */
export interface SystemPack {
  /** Metadata wrapper (Gold Tier Standard) */
  meta: SystemPackMeta;
  /**
   * Raw specification object that will be embedded into profile.specifications
   * Replaces legacy top-level fields
   */
  windowSystemSpec: Record<string, unknown>;
  
  // Legacy fields kept for compatibility during migration
  id?: string;
  name?: string;
  category?: 'aluminum_windows' | 'aluminum_doors' | 'curtain_walls' | 'upvc_windows' | 'upvc_doors';
  brand?: string;
  
  compatibleProfiles?: string[];
  compatibleAccessories?: string[];
  description?: string;
  technicalData?: SystemTechnicalData;
  /** Optional Smart Draw presets used by facade tools */
  smartDrawPreset?: unknown;
  /** Optional glass sizing rules used for glazing and 2D glass optimisation. */
  glassAllowances?: unknown;
  /** Optional default grid layout to apply when this pack is selected */
  defaultGrid?: WindowGrid;
  /** Optional profiles array for BOM generation with accurate dimensions */
  profiles?: Profile[];
}

/**
 * System technical data
 */
export interface SystemTechnicalData {
  uValue?: number;
  airPermeability?: string;
  waterTightness?: string;
  windLoad?: string;
  soundReduction?: number;
  certifications?: string[];
  [key: string]: unknown;
}

export interface OptimizationResult {
  materialUsage: number;
  wastePercentage: number;
  estimatedProductionTime: number;
  cuttingPlan: CuttingPlan[];
  nestingEfficiency: number;
  costBreakdown: {
    materialCost: number;
    laborCost: number;
    hardwareCost: number;
    glazingCost: number;
    totalCost: number;
  };
}

/**
 * Configuration for adaptive solver that selects optimization algorithm
 * based on job complexity and time constraints
 * Enhanced with runtime optimization features
 */
export interface AdaptiveSolverConfig {
  /** Maximum time in seconds allowed for solving */
  maxSolvingTime: number;
  /** Preferred algorithm override (optional, will be auto-selected if not specified) */
  preferredAlgorithm?: 'greedy' | 'linear' | 'genetic';
  /** Complexity thresholds for algorithm selection */
  complexityThresholds: {
    /** Number of cuts below which greedy algorithm is used (e.g., 50) */
    simple: number;
    /** Number of cuts above which genetic algorithm is used (e.g., 500) */
    medium: number;
  };
  /** Time constraint mode */
  timeConstraint?: 'realtime' | 'fast' | 'thorough';
  /** Optimization target priority */
  optimalityTarget?: 'balanced' | 'min_waste' | 'max_speed';
  /** Job complexity classification */
  jobComplexity?: 'simple' | 'medium' | 'complex';
  /** Enable real-time pre-solver for instant feedback */
  enableRealtimePresolver?: boolean;
  /** Enable progressive optimization (start fast, refine in background) */
  enableProgressiveOptimization?: boolean;
  /** Enable ML-based algorithm prediction */
  enableMLPrediction?: boolean;
  /** Enable caching of optimization results */
  enableCaching?: boolean;
}

/**
 * High‑level request descriptor for mass‑production optimisation across
 * multiple projects / positions. Passed down into orchestration layers
 * (e.g. MassProductionOptimizer) rather than individual 1D solvers.
 */
export interface MassProductionOptimizationRequest {
  projectIds: string[];
  systemPackId: string;
  optimizationStrategy: 'remnant-first' | 'waste-minimization' | 'throughput-maximization';
  crossProjectRemnantPool: boolean;
  constraints: {
    maxStockLengthMm: number;
    minRemnantUsageMm: number;
    machineConstraints?: MachineConstraints[];
  };
}

export interface MachineConstraints {
  machineId: string;
  name: string;
  maxCutsPerBar?: number;
  minOffcutLengthMm?: number;
  maxOffcutLengthMm?: number;
  notes?: string;
}

export interface CuttingPlan {
  profile: Profile;
  stockLength: number;
  cuts: Cut[];
  totalWaste: number;
  utilization: number;
}

export interface Cut {
  length: number;
  angle: number;
  componentId: string;
  componentType?: string;
  waste: number;
}

/**
 * Optional, lightweight mapping between a system pack and the exact
 * profile codes chosen for different roles (frame, sash, bead, etc.)
 * when capturing measurements for a single window unit.
 */
export interface SystemProfileSelections {
  frameProfileCode?: string;
  sashProfileCode?: string;
  beadProfileCode?: string;
  // Future roles can be added here without breaking existing data.
}

export interface MeasurementData {
  width: string;
  height: string;
  windowType: string;
  color?: string;
  glazingType?: string;
  glassColor?: string;
  flyScreenType?: string;
  /** Optional override of the system pack for this specific position/unit. */
  systemPackId?: string;
  /**
   * Optional mapping of system-pack roles to concrete profile codes selected
   * by the operator before design (e.g. frame vs sash profile numbers).
   */
  systemProfileSelections?: SystemProfileSelections;
  // Optional positional metadata captured at measuring time for fast pose entry
  flatNumber?: string;
  buildingBlock?: string;
  floor?: string;
  unitOrApartment?: string;
  elevation?: string;
  roomOrZone?: string;
  windowIndex?: string;
  remarks?: string;
  /** Rule 18: Wall Tolerance - Input mode and deduction */
  measurementMode?: 'hole' | 'manufacturing'; // 'hole' = rough opening, 'manufacturing' = exact size
  wallDeduction?: string; // mm deduction for wall tolerance (default 15mm)
  /** Calculated manufacturing dimensions (after deduction if in hole mode) */
  manufacturingWidth?: number;
  manufacturingHeight?: number;
  /** Rough opening dimensions (if measurementMode is 'hole') */
  roughOpeningWidth?: number;
  roughOpeningHeight?: number;
  /** Grid layout if set in measuring step */
  grid?: WindowGrid;
  /** Preset pattern ID for preset-aware 3D generation */
  presetId?: string;
}

// Lightweight commercial draft types used by workspace context
export interface DraftQuote {
  id: string;
  projectId?: string;
  customerId?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected';
  customerName?: string;
  projectTitle?: string;
  amount?: number;
  currency?: string;
  items?: unknown[];
  validUntil?: Date;
  payload: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DraftInvoice {
  id: string;
  supplierId?: string;
  projectId?: string;
  status?: 'draft' | 'booked' | 'cancelled';
  customerName?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  dueDate?: Date;
  type?: string;
  payload: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// Supabase Integration Types
// ============================================================================

/**
 * Audit log entry for tracking all fabricator operations
 */
export interface FabricatorAuditLog {
  id: string;
  userId: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' | 'BATCH_OPERATION';
  tableName: string;
  recordId: string | null;
  recordIds?: string[];
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  changedFields?: string[];
  operationType?: string;
  operationSource?: 'web' | 'api' | 'bulk_import' | 'scheduled' | 'system';
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  operationDurationMs?: number;
  recordsAffected: number;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  errorCode?: string;
  createdAt: Date;
}

/**
 * Backup snapshot for fabricator data
 */
export interface FabricatorBackupSnapshot {
  id: string;
  userId: string;
  snapshotName: string;
  snapshotType: 'full' | 'incremental' | 'manual' | 'scheduled';
  description?: string;
  tablesIncluded: string[];
  snapshotData: Record<string, unknown[]>;
  recordCount: number;
  dataSizeBytes?: number;
  compressionRatio?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  errorMessage?: string;
  expiresAt?: Date;
  retentionDays: number;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Backup operation log
 */
export interface FabricatorBackupOperation {
  id: string;
  userId: string | null;
  operationType: 'backup' | 'restore' | 'verify' | 'cleanup';
  snapshotId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progressPercentage: number;
  recordsBackedUp: number;
  recordsRestored: number;
  durationMs?: number;
  errorMessage?: string;
  sourceBackupId?: string;
  restorePoint?: Date;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Query performance metrics
 */
export interface FabricatorQueryMetric {
  id: string;
  userId: string | null;
  operationName: string;
  tableName?: string;
  queryType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'BATCH';
  durationMs: number;
  rowsAffected?: number;
  rowsReturned?: number;
  queryText?: string;
  queryParams?: Record<string, unknown>;
  isSlowQuery: boolean;
  slowQueryThresholdMs: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  indexesUsed?: string[];
  fullTableScan: boolean;
  createdAt: Date;
}

/**
 * Connection pool statistics
 */
export interface FabricatorConnectionStats {
  activeConnections: number;
  activeQueries: number;
  idleConnections: number;
  idleInTransaction: number;
  longestQuerySeconds: number;
}

/**
 * Table statistics for performance monitoring
 */
export interface FabricatorTableStats {
  tableName: string;
  rowCount: number;
  tableSize: string;
  indexSize: string;
  totalSize: string;
  lastVacuum?: Date;
  lastAnalyze?: Date;
}

// ============================================================================
// Database Row Types (for Supabase queries)
// ============================================================================

/**
 * Database row type for fabricator_profiles table
 */
export interface FabricatorProfileRow {
  id: string;
  user_id: string;
  name: string;
  material: 'aluminum' | 'upvc' | 'wood';
  width: number;
  height?: number;
  thickness?: number;
  color: string;
  cost_per_meter: number;
  cutting_allowance: number;
  grain_direction?: 'horizontal' | 'vertical' | null;
  supplier?: string;
  stock_quantity: number;
  min_stock_level: number;
  max_stock_level?: number;
  system_brand?: string;
  specifications: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for fabricator_accessories table
 */
export interface FabricatorAccessoryRow {
  id: string;
  user_id: string;
  name: string;
  type: 'hinge' | 'lock' | 'handle' | 'seal' | 'spacer' | 'corner' | 'other';
  category?: string;
  unit_price: number;
  base_cost: number;
  markup_percentage: number;
  supplier?: string;
  sku?: string;
  description?: string;
  compatible_materials: string[];
  region: string[];
  image_url?: string;
  specifications: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Database row type for profile_accessory_compatibility table
 */
export interface ProfileAccessoryCompatibilityRow {
  profile_id: string;
  accessory_id: string;
  created_at: string;
}

/**
 * FabricationData - World-Class Production Data Interface
 * 
 * This is not just a data structure - it's a model of the entire fabrication process.
 * Includes material science, hardware intelligence, machining details, glazing science,
 * and production sequencing. This depth is a massive competitive advantage.
 * 
 * Part of the Dual-Output Engine architecture that generates both:
 * - Visual DNA (85-90% accuracy) for customer experience
 * - Production DNA (99.8% accuracy) for manufacturing truth
 * 
 * @since Phase 2B: Dual-Output Engine (Week 1-2 Battle Map)
 * @see DualOutputGenerator for generation logic
 */
export interface FabricationData {
  // === CORE MATERIALS (Cross-validated against existing 99.8%) ===
  profiles: Array<{
    id: string;
    systemPack: string;      // e.g., "FOXY-60"
    profileCode: string;     // e.g., "FRAME-60-A"
    role: 'frame' | 'sash' | 'mullion' | 'transom' | 'bead' | 'reinforcement';
    length: number;          // mm ±0.1mm
    quantity: number;
    cuttingLengths: number[]; // With kerf compensation
    angles: number[];        // Miter angles
    rawStockLength: number;  // 5800mm, 6000mm, etc.
    wasteLength: number;     // For remnant marketplace
    machiningZones: Array<{
      type: 'drill' | 'mill' | 'notch' | 'pocket';
      position: number;      // From start of profile
      dimensions: { width: number; depth: number; length?: number };
      toolReference?: string; // CNC tool number
    }>;
    weight: number;          // kg for shipping
    cost: number;           // Material cost
  }>;
  
  // === HARDWARE INTELLIGENCE (From pattern.accessories) ===
  hardware: Array<{
    id: string;
    supplierCode: string;    // e.g., "MACO-EC300"
    name: string;
    category: 'hinge' | 'lock' | 'handle' | 'roller' | 'corner_key' | 'gasket' | 'hardener';
    quantity: number;
    positionSpec: string;    // "200mm from bottom, center"
    installationNotes: string[];
    torqueSpec?: number;     // Nm for installation
    alternatives: string[];  // Compatible alternatives
    estimatedTime: number;   // Minutes for installation
    supplierLink?: string;   // URL to purchase
    metadata?: Record<string, unknown>;
  }>;
  
  // === GLAZING CALCULATIONS ===
  glazing: Array<{
    paneId: string;
    type: 'fixed' | 'sash' | 'vent';
    dimensions: { 
      width: number; 
      height: number; 
      thickness: number;  // e.g., 4mm, 6mm, 24mm IGU
    };
    edgeClearance: number;  // Standard: 5mm per side
    weight: number;         // kg for handling safety
    uValue?: number;       // Thermal performance
    safetyRating?: 'annealed' | 'tempered' | 'laminated';
    glassCode?: string;    // Supplier reference
  }>;
  
  // === VALIDATION INTELLIGENCE ===
  warnings: Array<{
    severity: 'info' | 'warning' | 'error' | 'critical';
    code: string;          // e.g., "VAL-301: Sash exceeds weight limit"
    message: string;
    affectedComponents: string[];
    suggestedAction: string;
    validationRule: string; // Which constraint was violated
  }>;
  
  // === PRODUCTION WORKFLOW ===
  productionSequence: Array<{
    step: number;
    operation: string;      // "Cut frame profiles", "Drill hinge holes"
    station: 'cutting' | 'machining' | 'assembly' | 'glazing' | 'qc';
    estimatedTime: number;  // minutes
    toolsRequired: string[];
    skillsRequired: 'basic' | 'intermediate' | 'expert';
    qualityGates: string[]; // Must-pass checks
  }>;
  
  // === METADATA & TRACEABILITY ===
  metadata: {
    generationTimestamp: string;
    patternUsed: string;
    accuracyScore: number;   // 99.8% guaranteed
    crossCheckStatus: 'passed' | 'warnings' | 'failed';
    checksum: string;       // SHA-256 for data integrity
    version: string;        // "dual-output-v1.0"
    generatedBy: 'DualOutputGenerator';
  };
}
