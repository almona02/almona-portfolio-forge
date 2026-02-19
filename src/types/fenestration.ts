/**
 * Gold Tier FenestrationSystem - Engineering-Grade Data Model
 * 
 * This is the foundation of the Gold Tier system. It represents a complete
 * fenestration system with manufacturing rules, hardware specifications,
 * and regional physics - enabling parametric, engineering-grade design.
 * 
 * All dimensions are in microns (μm) for precision, except where noted.
 * 
 * @since Gold Tier Phase 1, Task 1
 * @see ApexEngineV2 for generation engine
 * @see GoldTierOrchestrator for routing
 */

/**
 * Core profile specification for a fenestration system
 */
export interface ProfileSpec {
  /** Profile code (e.g., "RC 6111-8" for ROCK 60 frame) */
  code: string;
  /** Profile name (human-readable) */
  name: string;
  /** Profile role in system */
  role: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazingBead' | 'reinforcement' | 'thermalBreak';
  /** Profile dimensions (mm) */
  dimensions: {
    width: number;      // Profile width (mm)
    height?: number;     // Profile height (mm) - optional
    thickness?: number; // Profile thickness (mm) - optional
  };
  /** Material type */
  material: 'aluminum' | 'upvc' | 'steel';
  /** Standard stock length (mm) */
  standardStockLength: number;
  /** Weight per meter (kg/m) */
  weightPerMeter: number;
  /** Cost per meter (currency units) */
  costPerMeter: number;
  /** Compatible hardware IDs */
  compatibleHardwareIds?: string[];
  /** Technical specifications */
  specifications?: Record<string, any>;
}

/**
 * Hardware rule for automatic hardware selection
 */
export interface HardwareRule {
  /** Hardware category */
  category: 'hinge' | 'lock' | 'handle' | 'roller' | 'corner_key' | 'gasket';
  /** Default hardware ID */
  defaultId: string;
  /** Selection rules (e.g., weight-based, size-based) */
  selectionRules: Array<{
    condition: (width: number, height: number, weight: number) => boolean;
    hardwareId: string;
    notes?: string;
  }>;
  /** Quantity calculation function */
  quantityCalculator: (windowUnit: { grid?: { cells?: Array<{ type?: string }> } }) => number;
  /** Installation specifications */
  installationSpec?: {
    position: string;        // e.g., "200mm from bottom"
    torque?: number;        // Nm
    tooling?: string[];     // Required tools
    notes?: string[];
  };
}

/**
 * Hardware specification
 */
export interface HardwareSpec {
  /** Hardware ID */
  id: string;
  /** Supplier code */
  supplierCode: string;
  /** Name */
  name: string;
  /** Category */
  category: 'hinge' | 'lock' | 'handle' | 'roller' | 'corner_key' | 'gasket' | 'drainage_cap';
  /** Specifications */
  specifications: {
    material?: string;
    finish?: string;
    loadCapacity?: number;  // kg
    dimensions?: { width?: number; height?: number; depth?: number };
    certifications?: string[];
  };
  /** Unit cost */
  unitCost: number;
  /** Supplier link */
  supplierLink?: string;
}

/**
 * FenestrationSystem - The Gold Tier Data Model
 * 
 * This interface represents a complete, engineering-grade fenestration system
 * with all manufacturing rules, hardware specifications, and regional physics.
 * 
 * CRITICAL: This is the foundation for ApexEngineV2. All fields must be
 * validated, auditable, and performance-optimized.
 */
export interface FenestrationSystem {
  // ========== CORE IDENTITY ==========
  /** Unique system identifier (e.g., "FOXY-60-CLASSIC") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Manufacturer name */
  manufacturer: string;
  /** System version */
  version: string;
  /** Region where this system is primarily used */
  region: 'EGY' | 'TUR' | 'GCC' | 'GLOBAL';
  /** Material type */
  material: 'aluminum' | 'upvc' | 'steel';
  /** System category */
  category: 'window' | 'door' | 'curtain_wall' | 'skylight';
  
  // ========== CORE PROFILES (The "DNA") ==========
  /** Profile specifications for all system components */
  profiles: {
    /** Frame profile */
    frame: ProfileSpec;
    /** Sash profile */
    sash: ProfileSpec;
    /** Mullion profile */
    mullion: ProfileSpec;
    /** Transom profile */
    transom: ProfileSpec;
    /** Glazing bead profile */
    glazingBead: ProfileSpec;
    /** Reinforcement profile (UPVC crucial) */
    reinforcement?: ProfileSpec;
    /** Thermal break profile (GCC crucial) */
    thermalBreak?: ProfileSpec;
  };
  
  // ========== MANUFACTURING RULES (The "Physics Engine") ==========
  /** Fabrication rules that govern manufacturing calculations */
  fabricationRules: {
    /** Connection type for corners */
    connectionType: 'miter' | 'butt' | 'crimp' | 'screw';
    /** Cutting parameters (all in microns for precision) */
    cutting: {
      /** Saw kerf width (microns) - typically 1000-1500 (1-1.5mm) */
      sawKerf: number;
      /** Miter allowance (microns) - extra material for 45° cuts */
      miterAllowance: number;
      /** Bar end trim (microns) - cleanup allowance */
      barEndTrim: number;
      /** Cutting tolerance (microns) - acceptable deviation */
      cuttingTolerance: number;
    };
    /** Welding parameters (UPVC specific) */
    welding?: {
      /** Burn-off per side (microns) - typically 3000 (3mm) */
      burnOff: number;
      /** Cooling shrinkage factor (percentage) */
      coolingFactor: number;
      /** Welding temperature (°C) */
      temperature?: number;
    };
    /** Assembly parameters */
    assembly: {
      /** Frame clearance (microns) - space between frame and sash */
      frameClearance: number;
      /** Mullion deduction (microns) - width reduction for mullions */
      mullionDeduction: number;
      /** Glazing clearance (microns) - space for glass insertion */
      glazingClearance: number;
    };
  };
  
  // ========== HARDWARE & ACCESSORIES ==========
  /** Hardware kit specifications */
  hardwareKit: {
    /** Hinge rules */
    hinges: HardwareRule;
    /** Locking system rules */
    lockingSystem: HardwareRule;
    /** Handle rules */
    handle: HardwareRule;
    /** Roller rules (sliding systems) */
    rollers?: HardwareRule;
    /** Gasket specifications */
    gaskets: {
      /** Glazing gasket */
      glazingGasket: HardwareSpec;
      /** Weather seal */
      weatherSeal: HardwareSpec;
      /** Dust seal (GCC specific) */
      dustSeal_GCC?: HardwareSpec;
    };
    /** Corner keys */
    cornerKeys: HardwareSpec[];
    /** Drainage caps */
    drainageCaps: HardwareSpec[];
  };
  
  // ========== ENGINEERING CONSTRAINTS ==========
  /** Engineering constraints for validation */
  constraints: {
    /** Maximum width (mm) */
    maxWidth: number;
    /** Maximum height (mm) */
    maxHeight: number;
    /** Maximum sash area (m²) */
    maxSashArea: number;
    /** Maximum sash weight (kg) */
    maxSashWeight: number;
    /** Minimum sash width (mm) */
    minSashWidth: number;
    /** Aspect ratio constraints */
    aspectRatio: {
      min: number;  // e.g., 0.3
      max: number;  // e.g., 3.0
    };
    /** Wind load class */
    windLoadClass: 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
    /** Reinforcement requirement function */
    requiresReinforcement: (width: number, height: number) => boolean;
  };
  
  // ========== REGION-SPECIFIC PHYSICS ==========
  /** Regional physics and environmental factors */
  regionalPhysics: {
    /** Thermal expansion coefficient (mm/°C/m) - for GCC */
    thermalExpansionCoefficient: number;
    /** Seismic rating (for Turkey) */
    seismicRating?: 'A' | 'B' | 'C';
    /** Temperature range (°C) */
    operatingTemperatureRange?: {
      min: number;
      max: number;
    };
  };
  
  // ========== METADATA & AUDIT ==========
  /** System metadata */
  metadata: {
    /** Creation timestamp */
    createdAt: string;
    /** Last modification timestamp */
    updatedAt: string;
    /** Created by (user ID) */
    createdBy?: string;
    /** Last modified by (user ID) */
    modifiedBy?: string;
    /** Version history */
    versionHistory?: Array<{
      version: string;
      changes: string[];
      date: string;
    }>;
    /** Validation status */
    validationStatus: 'draft' | 'validated' | 'certified';
    /** Certification information */
    certifications?: Array<{
      standard: string;  // e.g., "TS EN 14351-1"
      certificateNumber?: string;
      issuedBy?: string;
      validUntil?: string;
    }>;
  };
}

/**
 * Type guard to check if an object is a FenestrationSystem
 */
export function isFenestrationSystem(obj: any): obj is FenestrationSystem {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.manufacturer === 'string' &&
    typeof obj.version === 'string' &&
    ['EGY', 'TUR', 'GCC', 'GLOBAL'].includes(obj.region) &&
    ['aluminum', 'upvc', 'steel'].includes(obj.material) &&
    typeof obj.profiles === 'object' &&
    typeof obj.fabricationRules === 'object' &&
    typeof obj.hardwareKit === 'object' &&
    typeof obj.constraints === 'object' &&
    typeof obj.regionalPhysics === 'object' &&
    typeof obj.metadata === 'object'
  );
}

