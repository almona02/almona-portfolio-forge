export type WindowUnitStatus =
  | 'measuring'
  | 'design'
  | 'optimized'
  | 'production'
  | 'quality'
  | 'delivered';

export interface WindowUnit {
  id: string;
  orderNumber: string;
  posNumber: string;
  type: string;
  components: WindowComponent[];
  overallWidth: number;
  overallHeight: number;
  color: string;
  glazing: any;
  hardware: any[];
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
  machiningOperations: any[];
  glazingType: string;
  hardware: any[];
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
  grainDirection?: 'horizontal' | 'vertical' | null;
  /** Category of profile: window, door, curtain_wall, structural, accessory */
  category?: 'window' | 'door' | 'curtain_wall' | 'structural' | 'accessory';
  /** System type: casement, sliding, tilt_turn, fixed, facade, commercial */
  systemType?: 'casement' | 'sliding' | 'tilt_turn' | 'fixed' | 'facade' | 'commercial';
  /** Profile role in system: frame, sash, mullion, transom, glazing_bead, interlock, accessory */
  profileRole?: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazing_bead' | 'interlock' | 'accessory';
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
    [key: string]: any; // ... other specifications
  };
  /** Optional calibrations for this profile */
  calibrations?: CuttingCalibration[];
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  specifications?: Record<string, any>;
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
  type: 'hinge' | 'handle' | 'lock' | 'corner_connector' | 'bracket' | 'seal' | 'screw';
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
  [key: string]: any;
}

/**
 * System Pack for window/door systems
 */
export interface SystemPack {
  id: string;
  name: string;
  category: 'aluminum_windows' | 'aluminum_doors' | 'curtain_walls' | 'upvc_windows' | 'upvc_doors';
  brand: string;
  compatibleProfiles: string[];
  compatibleAccessories: string[];
  description: string;
  technicalData: SystemTechnicalData;
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
  [key: string]: any;
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
  items?: any[];
  validUntil?: Date;
  payload: Record<string, any>;
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
  payload: Record<string, any>;
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
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
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
  snapshotData: Record<string, any[]>;
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
  queryParams?: Record<string, any>;
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
  specifications: Record<string, any>;
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
  specifications: Record<string, any>;
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

