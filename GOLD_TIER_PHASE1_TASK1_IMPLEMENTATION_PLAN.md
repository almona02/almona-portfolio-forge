# 🥇 Gold Tier Phase 1, Task 1: FenestrationSystem Schema
## Surgical, Precision Implementation Plan

**Date:** January 2025  
**Status:** Ready for Implementation  
**Priority:** CRITICAL - Foundation for Gold Tier  
**Estimated Duration:** 3-5 days (with full hardening)

---

## 🎯 Executive Summary

**Objective:** Design and implement the `FenestrationSystem` interface - the core data model that will power ApexEngineV2 and enable engineering-grade parametric fenestration design.

**Success Criteria:**
- ✅ Type-safe, auditable, error-free schema
- ✅ Full validation layer with comprehensive error handling
- ✅ Performance-optimized (zero runtime overhead for validation)
- ✅ Migration utilities from `EgyptianPattern` to `FenestrationSystem`
- ✅ 100% test coverage
- ✅ Full audit trail integration
- ✅ Backward compatibility with existing system

**Risk Level:** LOW (additive only, no breaking changes)

---

## 📋 Implementation Checklist

### Phase 1: Core Schema Design (Day 1)
- [ ] Design `FenestrationSystem` interface with full TypeScript types
- [ ] Define supporting interfaces (`ProfileSpec`, `HardwareRule`, `HardwareSpec`)
- [ ] Add JSDoc documentation for all fields
- [ ] Create type guards and validators
- [ ] Add runtime validation with Zod schemas

### Phase 2: Validation & Hardening (Day 2)
- [ ] Implement `FenestrationSystemValidator` class
- [ ] Add comprehensive validation rules (business logic + type safety)
- [ ] Create validation error types with error codes
- [ ] Integrate with existing audit trail system
- [ ] Add performance benchmarks (target: <1ms validation)

### Phase 3: Migration Utilities (Day 3)
- [ ] Create `PatternMigrationService` class
- [ ] Implement `migrateEgyptianPatternToFenestrationSystem()` function
- [ ] Add migration validation and rollback capability
- [ ] Create migration test suite
- [ ] Document migration process

### Phase 4: Testing & Documentation (Day 4-5)
- [ ] Unit tests for schema (100% coverage)
- [ ] Integration tests for migration
- [ ] Performance tests
- [ ] API documentation
- [ ] Migration guide
- [ ] Code review and hardening audit

---

## 🏗️ Technical Architecture

### 1. Core Schema Design

**File:** `src/types/fenestration.ts` (NEW)

```typescript
/**
 * Gold Tier FenestrationSystem - Engineering-Grade Data Model
 * 
 * This is the foundation of the Gold Tier system. It represents a complete
 * fenestration system with manufacturing rules, hardware specifications,
 * and regional physics - enabling parametric, engineering-grade design.
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
  quantityCalculator: (windowUnit: any) => number;
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
```

### 2. Validation Layer

**File:** `src/lib/fabricator/goldTier/FenestrationSystemValidator.ts` (NEW)

```typescript
/**
 * FenestrationSystemValidator - Gold Tier Validation Engine
 * 
 * Provides comprehensive validation for FenestrationSystem objects with:
 * - Type safety checks
 * - Business rule validation
 * - Performance optimization (cached validators)
 * - Audit trail integration
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { FenestrationSystem } from '@/types/fenestration';
import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  performance: {
    validationTimeMs: number;
  };
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'critical';
  details?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  suggestion?: string;
}

export class FenestrationSystemValidator {
  private static readonly VALIDATION_CACHE = new Map<string, ValidationResult>();
  
  /**
   * Validate a FenestrationSystem with comprehensive checks
   * 
   * Performance: Cached results for identical systems (<1ms after first validation)
   */
  static validate(system: FenestrationSystem): ValidationResult {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(system);
    
    // Check cache
    if (this.VALIDATION_CACHE.has(cacheKey)) {
      return this.VALIDATION_CACHE.get(cacheKey)!;
    }
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // 1. Type safety checks
    this.validateTypeSafety(system, errors);
    
    // 2. Business rule validation
    this.validateBusinessRules(system, errors, warnings);
    
    // 3. Manufacturing rules validation
    this.validateManufacturingRules(system, errors, warnings);
    
    // 4. Hardware kit validation
    this.validateHardwareKit(system, errors, warnings);
    
    // 5. Constraints validation
    this.validateConstraints(system, errors, warnings);
    
    // 6. Regional physics validation
    this.validateRegionalPhysics(system, errors, warnings);
    
    const validationTime = performance.now() - startTime;
    
    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        validationTimeMs: validationTime,
      },
    };
    
    // Cache result
    this.VALIDATION_CACHE.set(cacheKey, result);
    
    // Audit log
    logFabricatorAudit({
      action: 'VALIDATE_FENESTRATION_SYSTEM',
      tableName: 'fenestration_systems',
      recordId: system.id,
      status: result.isValid ? 'success' : 'failed',
      operationDurationMs: validationTime,
      newValues: {
        systemId: system.id,
        validationResult: result,
      },
    });
    
    return result;
  }
  
  private static validateTypeSafety(
    system: FenestrationSystem,
    errors: ValidationError[]
  ): void {
    // ID validation
    if (!system.id || typeof system.id !== 'string') {
      errors.push({
        code: 'VAL-001',
        field: 'id',
        message: 'System ID is required and must be a string',
        severity: 'critical',
      });
    }
    
    // Name validation
    if (!system.name || typeof system.name !== 'string' || system.name.length < 3) {
      errors.push({
        code: 'VAL-002',
        field: 'name',
        message: 'System name is required and must be at least 3 characters',
        severity: 'error',
      });
    }
    
    // Region validation
    const validRegions = ['EGY', 'TUR', 'GCC', 'GLOBAL'];
    if (!validRegions.includes(system.region)) {
      errors.push({
        code: 'VAL-003',
        field: 'region',
        message: `Region must be one of: ${validRegions.join(', ')}`,
        severity: 'error',
      });
    }
    
    // Material validation
    const validMaterials = ['aluminum', 'upvc', 'steel'];
    if (!validMaterials.includes(system.material)) {
      errors.push({
        code: 'VAL-004',
        field: 'material',
        message: `Material must be one of: ${validMaterials.join(', ')}`,
        severity: 'error',
      });
    }
    
    // Profiles validation
    this.validateProfiles(system.profiles, errors);
    
    // Fabrication rules validation
    this.validateFabricationRulesStructure(system.fabricationRules, errors);
    
    // Hardware kit validation
    this.validateHardwareKitStructure(system.hardwareKit, errors);
    
    // Constraints validation
    this.validateConstraintsStructure(system.constraints, errors);
    
    // Regional physics validation
    this.validateRegionalPhysicsStructure(system.regionalPhysics, errors);
  }
  
  private static validateBusinessRules(
    system: FenestrationSystem,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // UPVC must have welding rules
    if (system.material === 'upvc' && !system.fabricationRules.welding) {
      errors.push({
        code: 'VAL-101',
        field: 'fabricationRules.welding',
        message: 'UPVC systems must include welding parameters',
        severity: 'error',
      });
    }
    
    // GCC must have thermal break
    if (system.region === 'GCC' && !system.profiles.thermalBreak) {
      warnings.push({
        code: 'VAL-102',
        field: 'profiles.thermalBreak',
        message: 'GCC systems should include thermal break profile',
        suggestion: 'Consider adding thermal break profile for better thermal performance',
      });
    }
    
    // Constraints must be consistent
    if (system.constraints.maxWidth < system.constraints.minSashWidth) {
      errors.push({
        code: 'VAL-103',
        field: 'constraints',
        message: 'maxWidth must be greater than minSashWidth',
        severity: 'error',
      });
    }
    
    // Aspect ratio must be valid
    if (system.constraints.aspectRatio.min >= system.constraints.aspectRatio.max) {
      errors.push({
        code: 'VAL-104',
        field: 'constraints.aspectRatio',
        message: 'aspectRatio.min must be less than aspectRatio.max',
        severity: 'error',
      });
    }
  }
  
  private static validateManufacturingRules(
    system: FenestrationSystem,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const { cutting, welding, assembly } = system.fabricationRules;
    
    // Cutting rules validation
    if (cutting.sawKerf <= 0 || cutting.sawKerf > 5000) {
      errors.push({
        code: 'VAL-201',
        field: 'fabricationRules.cutting.sawKerf',
        message: 'sawKerf must be between 0 and 5000 microns (0-5mm)',
        severity: 'error',
      });
    }
    
    if (cutting.miterAllowance < 0 || cutting.miterAllowance > 10000) {
      errors.push({
        code: 'VAL-202',
        field: 'fabricationRules.cutting.miterAllowance',
        message: 'miterAllowance must be between 0 and 10000 microns (0-10mm)',
        severity: 'error',
      });
    }
    
    // Welding rules validation (UPVC)
    if (welding) {
      if (welding.burnOff <= 0 || welding.burnOff > 10000) {
        errors.push({
          code: 'VAL-203',
          field: 'fabricationRules.welding.burnOff',
          message: 'burnOff must be between 0 and 10000 microns (0-10mm)',
          severity: 'error',
        });
      }
      
      if (welding.coolingFactor < 0 || welding.coolingFactor > 100) {
        errors.push({
          code: 'VAL-204',
          field: 'fabricationRules.welding.coolingFactor',
          message: 'coolingFactor must be between 0 and 100%',
          severity: 'error',
        });
      }
    }
    
    // Assembly rules validation
    if (assembly.frameClearance < 0) {
      errors.push({
        code: 'VAL-205',
        field: 'fabricationRules.assembly.frameClearance',
        message: 'frameClearance must be non-negative',
        severity: 'error',
      });
    }
  }
  
  private static validateProfiles(
    profiles: FenestrationSystem['profiles'],
    errors: ValidationError[]
  ): void {
    const requiredProfiles = ['frame', 'sash', 'mullion', 'transom', 'glazingBead'];
    
    for (const role of requiredProfiles) {
      const profile = profiles[role as keyof typeof profiles];
      if (!profile) {
        errors.push({
          code: 'VAL-301',
          field: `profiles.${role}`,
          message: `${role} profile is required`,
          severity: 'critical',
        });
      } else {
        this.validateProfileSpec(profile, `profiles.${role}`, errors);
      }
    }
  }
  
  private static validateProfileSpec(
    profile: any,
    fieldPath: string,
    errors: ValidationError[]
  ): void {
    if (!profile.code || typeof profile.code !== 'string') {
      errors.push({
        code: 'VAL-302',
        field: `${fieldPath}.code`,
        message: 'Profile code is required',
        severity: 'error',
      });
    }
    
    if (!profile.dimensions || typeof profile.dimensions.width !== 'number') {
      errors.push({
        code: 'VAL-303',
        field: `${fieldPath}.dimensions.width`,
        message: 'Profile width is required and must be a number',
        severity: 'error',
      });
    }
    
    if (profile.standardStockLength <= 0) {
      errors.push({
        code: 'VAL-304',
        field: `${fieldPath}.standardStockLength`,
        message: 'standardStockLength must be positive',
        severity: 'error',
      });
    }
  }
  
  private static validateHardwareKit(
    system: FenestrationSystem,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate required hardware
    if (!system.hardwareKit.hinges) {
      errors.push({
        code: 'VAL-401',
        field: 'hardwareKit.hinges',
        message: 'Hinges rule is required',
        severity: 'error',
      });
    }
    
    if (!system.hardwareKit.lockingSystem) {
      errors.push({
        code: 'VAL-402',
        field: 'hardwareKit.lockingSystem',
        message: 'Locking system rule is required',
        severity: 'error',
      });
    }
    
    if (!system.hardwareKit.handle) {
      errors.push({
        code: 'VAL-403',
        field: 'hardwareKit.handle',
        message: 'Handle rule is required',
        severity: 'error',
      });
    }
    
    // Validate gaskets
    if (!system.hardwareKit.gaskets.glazingGasket) {
      errors.push({
        code: 'VAL-404',
        field: 'hardwareKit.gaskets.glazingGasket',
        message: 'Glazing gasket is required',
        severity: 'error',
      });
    }
    
    if (!system.hardwareKit.gaskets.weatherSeal) {
      errors.push({
        code: 'VAL-405',
        field: 'hardwareKit.gaskets.weatherSeal',
        message: 'Weather seal is required',
        severity: 'error',
      });
    }
    
    // GCC should have dust seal
    if (system.region === 'GCC' && !system.hardwareKit.gaskets.dustSeal_GCC) {
      warnings.push({
        code: 'VAL-406',
        field: 'hardwareKit.gaskets.dustSeal_GCC',
        message: 'GCC systems should include dust seal',
        suggestion: 'Consider adding dust seal for better performance in dusty environments',
      });
    }
  }
  
  private static validateConstraints(
    system: FenestrationSystem,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Validate constraint values
    if (system.constraints.maxWidth <= 0) {
      errors.push({
        code: 'VAL-501',
        field: 'constraints.maxWidth',
        message: 'maxWidth must be positive',
        severity: 'error',
      });
    }
    
    if (system.constraints.maxHeight <= 0) {
      errors.push({
        code: 'VAL-502',
        field: 'constraints.maxHeight',
        message: 'maxHeight must be positive',
        severity: 'error',
      });
    }
    
    if (system.constraints.maxSashArea <= 0) {
      errors.push({
        code: 'VAL-503',
        field: 'constraints.maxSashArea',
        message: 'maxSashArea must be positive',
        severity: 'error',
      });
    }
    
    // Validate requiresReinforcement function
    try {
      const testResult = system.constraints.requiresReinforcement(1000, 2000);
      if (typeof testResult !== 'boolean') {
        errors.push({
          code: 'VAL-504',
          field: 'constraints.requiresReinforcement',
          message: 'requiresReinforcement must return a boolean',
          severity: 'error',
        });
      }
    } catch (error) {
      errors.push({
        code: 'VAL-505',
        field: 'constraints.requiresReinforcement',
        message: `requiresReinforcement function threw an error: ${error}`,
        severity: 'error',
      });
    }
  }
  
  private static validateRegionalPhysics(
    system: FenestrationSystem,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Thermal expansion coefficient validation
    if (system.regionalPhysics.thermalExpansionCoefficient < 0) {
      errors.push({
        code: 'VAL-601',
        field: 'regionalPhysics.thermalExpansionCoefficient',
        message: 'thermalExpansionCoefficient must be non-negative',
        severity: 'error',
      });
    }
    
    // GCC should have reasonable thermal expansion coefficient
    if (system.region === 'GCC' && system.regionalPhysics.thermalExpansionCoefficient === 0) {
      warnings.push({
        code: 'VAL-602',
        field: 'regionalPhysics.thermalExpansionCoefficient',
        message: 'GCC systems should have non-zero thermal expansion coefficient',
        suggestion: 'Consider setting thermal expansion coefficient for GCC climate',
      });
    }
    
    // Turkish systems should have seismic rating
    if (system.region === 'TUR' && !system.regionalPhysics.seismicRating) {
      warnings.push({
        code: 'VAL-603',
        field: 'regionalPhysics.seismicRating',
        message: 'Turkish systems should include seismic rating',
        suggestion: 'Consider adding seismic rating for Turkish building codes',
      });
    }
  }
  
  // Helper methods for structure validation
  private static validateFabricationRulesStructure(
    rules: FenestrationSystem['fabricationRules'],
    errors: ValidationError[]
  ): void {
    // Implementation details...
  }
  
  private static validateHardwareKitStructure(
    kit: FenestrationSystem['hardwareKit'],
    errors: ValidationError[]
  ): void {
    // Implementation details...
  }
  
  private static validateConstraintsStructure(
    constraints: FenestrationSystem['constraints'],
    errors: ValidationError[]
  ): void {
    // Implementation details...
  }
  
  private static validateRegionalPhysicsStructure(
    physics: FenestrationSystem['regionalPhysics'],
    errors: ValidationError[]
  ): void {
    // Implementation details...
  }
  
  private static getCacheKey(system: FenestrationSystem): string {
    return `${system.id}-${system.version}-${system.metadata.updatedAt}`;
  }
  
  /**
   * Clear validation cache (useful for testing)
   */
  static clearCache(): void {
    this.VALIDATION_CACHE.clear();
  }
}
```

### 3. Migration Service

**File:** `src/lib/fabricator/goldTier/PatternMigrationService.ts` (NEW)

```typescript
/**
 * PatternMigrationService - Migrate EgyptianPattern to FenestrationSystem
 * 
 * Provides safe, validated migration from existing EgyptianPattern
 * to new FenestrationSystem schema with full rollback capability.
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { SystemPack } from '@/types/fabricator';
import { FenestrationSystem } from '@/types/fenestration';
import { FenestrationSystemValidator } from './FenestrationSystemValidator';
import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';

export interface MigrationResult {
  success: boolean;
  system?: FenestrationSystem;
  errors: string[];
  warnings: string[];
  rollbackData?: EgyptianPattern;
}

export class PatternMigrationService {
  /**
   * Migrate EgyptianPattern to FenestrationSystem
   * 
   * @param pattern - Source EgyptianPattern
   * @param systemPack - SystemPack for manufacturing rules
   * @returns MigrationResult with validated system or errors
   */
  static migrate(
    pattern: EgyptianPattern,
    systemPack: SystemPack
  ): MigrationResult {
    const startTime = performance.now();
    const rollbackData = JSON.parse(JSON.stringify(pattern)); // Deep clone for rollback
    
    try {
      // 1. Extract profile specifications from systemPack
      const profiles = this.extractProfiles(systemPack);
      
      // 2. Extract manufacturing rules from systemPack
      const fabricationRules = this.extractFabricationRules(systemPack, pattern);
      
      // 3. Extract hardware kit from pattern
      const hardwareKit = this.extractHardwareKit(pattern, systemPack);
      
      // 4. Extract constraints from pattern
      const constraints = this.extractConstraints(pattern);
      
      // 5. Extract regional physics
      const regionalPhysics = this.extractRegionalPhysics(systemPack, pattern);
      
      // 6. Build FenestrationSystem
      const system: FenestrationSystem = {
        id: `MIGRATED-${pattern.id}`,
        name: pattern.name,
        manufacturer: this.inferManufacturer(systemPack),
        version: '1.0.0',
        region: this.inferRegion(systemPack),
        material: this.inferMaterial(systemPack),
        category: this.inferCategory(pattern),
        profiles,
        fabricationRules,
        hardwareKit,
        constraints,
        regionalPhysics,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          validationStatus: 'draft',
        },
      };
      
      // 7. Validate migrated system
      const validation = FenestrationSystemValidator.validate(system);
      
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors.map(e => `${e.code}: ${e.message}`),
          warnings: validation.warnings.map(w => `${w.code}: ${w.message}`),
          rollbackData,
        };
      }
      
      const migrationTime = performance.now() - startTime;
      
      // Audit log
      logFabricatorAudit({
        action: 'MIGRATE_PATTERN_TO_FENESTRATION',
        tableName: 'fenestration_systems',
        recordId: system.id,
        status: 'success',
        operationDurationMs: migrationTime,
        newValues: {
          sourcePatternId: pattern.id,
          targetSystemId: system.id,
          migrationTime,
        },
      });
      
      return {
        success: true,
        system,
        errors: [],
        warnings: validation.warnings.map(w => `${w.code}: ${w.message}`),
        rollbackData,
      };
    } catch (error) {
      const migrationTime = performance.now() - startTime;
      
      // Audit log
      logFabricatorAudit({
        action: 'MIGRATE_PATTERN_TO_FENESTRATION',
        tableName: 'fenestration_systems',
        recordId: pattern.id,
        status: 'failed',
        operationDurationMs: migrationTime,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: 'MIGRATION_ERROR',
      });
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        rollbackData,
      };
    }
  }
  
  // Helper methods for extraction
  private static extractProfiles(systemPack: SystemPack): FenestrationSystem['profiles'] {
    // Implementation: Extract from systemPack.profiles or systemPack.windowSystemSpec
    // This is a placeholder - actual implementation will parse systemPack structure
    throw new Error('Not implemented - requires systemPack structure analysis');
  }
  
  private static extractFabricationRules(
    systemPack: SystemPack,
    pattern: EgyptianPattern
  ): FenestrationSystem['fabricationRules'] {
    // Implementation: Extract from systemPack.windowSystemSpec
    // Default values for now
    return {
      connectionType: 'miter',
      cutting: {
        sawKerf: 1500,      // 1.5mm default
        miterAllowance: 2000, // 2mm default
        barEndTrim: 500,      // 0.5mm default
        cuttingTolerance: 100, // 0.1mm default
      },
      assembly: {
        frameClearance: 3000,  // 3mm default
        mullionDeduction: 0,
        glazingClearance: 5000, // 5mm default
      },
    };
  }
  
  private static extractHardwareKit(
    pattern: EgyptianPattern,
    systemPack: SystemPack
  ): FenestrationSystem['hardwareKit'] {
    // Implementation: Extract from pattern.accessories and systemPack
    // This is a placeholder
    throw new Error('Not implemented - requires hardware database integration');
  }
  
  private static extractConstraints(
    pattern: EgyptianPattern
  ): FenestrationSystem['constraints'] {
    return {
      maxWidth: pattern.constraints?.maxSashWidth || 3000,
      maxHeight: pattern.typicalHeightMm[1] || 2600,
      maxSashArea: pattern.constraints?.maxSashArea || 6,
      maxSashWeight: 150, // Default 150kg
      minSashWidth: pattern.constraints?.minSashWidth || 400,
      aspectRatio: {
        min: 0.3,
        max: 3.0,
      },
      windLoadClass: pattern.constraints?.windLoadCategory === 'high' ? 'C5' : 'C3',
      requiresReinforcement: (width: number, height: number) => {
        const area = (width * height) / 1000000; // Convert to m²
        return area > (pattern.constraints?.maxSashArea || 6) * 0.8;
      },
    };
  }
  
  private static extractRegionalPhysics(
    systemPack: SystemPack,
    pattern: EgyptianPattern
  ): FenestrationSystem['regionalPhysics'] {
    const region = this.inferRegion(systemPack);
    
    return {
      thermalExpansionCoefficient: region === 'GCC' ? 0.023 : 0.021, // mm/°C/m
      seismicRating: region === 'TUR' ? 'B' : undefined,
      operatingTemperatureRange: region === 'GCC' ? {
        min: 0,
        max: 55,
      } : {
        min: -10,
        max: 45,
      },
    };
  }
  
  private static inferManufacturer(systemPack: SystemPack): string {
    return systemPack.meta.brands[0] || 'Unknown';
  }
  
  private static inferRegion(systemPack: SystemPack): FenestrationSystem['region'] {
    const regions = systemPack.meta.regions;
    if (regions.includes('egypt')) return 'EGY';
    if (regions.includes('turkey')) return 'TUR';
    if (regions.includes('gulf') || regions.includes('gcc')) return 'GCC';
    return 'GLOBAL';
  }
  
  private static inferMaterial(systemPack: SystemPack): FenestrationSystem['material'] {
    const category = systemPack.meta.category || '';
    if (category.includes('upvc')) return 'upvc';
    if (category.includes('steel')) return 'steel';
    return 'aluminum';
  }
  
  private static inferCategory(pattern: EgyptianPattern): FenestrationSystem['category'] {
    if (pattern.type === 'curtain_wall') return 'curtain_wall';
    if (pattern.type === 'door') return 'door';
    if (pattern.type === 'skylight') return 'skylight';
    return 'window';
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

**File:** `src/lib/fabricator/goldTier/__tests__/FenestrationSystemValidator.test.ts`

```typescript
describe('FenestrationSystemValidator', () => {
  describe('validate', () => {
    it('should validate a correct system', () => {
      const system = createValidSystem();
      const result = FenestrationSystemValidator.validate(system);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject system with missing ID', () => {
      const system = createValidSystem();
      delete (system as any).id;
      const result = FenestrationSystemValidator.validate(system);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'VAL-001')).toBe(true);
    });
    
    // ... more test cases
  });
  
  describe('performance', () => {
    it('should validate in <1ms after first validation (caching)', () => {
      const system = createValidSystem();
      
      // First validation (may be slower)
      const first = FenestrationSystemValidator.validate(system);
      expect(first.performance.validationTimeMs).toBeLessThan(10);
      
      // Second validation (should be cached)
      const second = FenestrationSystemValidator.validate(system);
      expect(second.performance.validationTimeMs).toBeLessThan(1);
    });
  });
});
```

### Integration Tests

**File:** `src/lib/fabricator/goldTier/__tests__/PatternMigrationService.test.ts`

```typescript
describe('PatternMigrationService', () => {
  it('should migrate EgyptianPattern to FenestrationSystem', () => {
    const pattern = getTestPattern();
    const systemPack = getTestSystemPack();
    
    const result = PatternMigrationService.migrate(pattern, systemPack);
    
    expect(result.success).toBe(true);
    expect(result.system).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });
  
  it('should provide rollback data', () => {
    const pattern = getTestPattern();
    const systemPack = getTestSystemPack();
    
    const result = PatternMigrationService.migrate(pattern, systemPack);
    
    expect(result.rollbackData).toBeDefined();
    expect(result.rollbackData?.id).toBe(pattern.id);
  });
});
```

---

## 📊 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Validation Time (first) | <10ms | Performance.now() |
| Validation Time (cached) | <1ms | Performance.now() |
| Migration Time | <50ms | Performance.now() |
| Memory Overhead | <1MB per system | Chrome DevTools |
| Type Safety | 100% | TypeScript strict mode |

---

## 🔒 Security & Hardening

1. **Input Validation:** All inputs validated before processing
2. **Type Safety:** Full TypeScript strict mode
3. **Error Handling:** Comprehensive error handling with error codes
4. **Audit Trail:** All operations logged to audit system
5. **Rollback Capability:** Migration supports rollback
6. **Cache Invalidation:** Validation cache cleared on system updates

---

## 📝 Documentation Requirements

1. **API Documentation:** JSDoc for all public methods
2. **Migration Guide:** Step-by-step migration instructions
3. **Validation Guide:** Explanation of validation rules
4. **Performance Guide:** Optimization recommendations
5. **Error Codes Reference:** Complete error code documentation

---

## ✅ Acceptance Criteria

- [ ] `FenestrationSystem` interface defined with full TypeScript types
- [ ] `FenestrationSystemValidator` implemented with <1ms cached validation
- [ ] `PatternMigrationService` implemented with rollback capability
- [ ] 100% test coverage for validation and migration
- [ ] All operations logged to audit trail
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Code review passed
- [ ] Zero breaking changes to existing system

---

## 🚀 Next Steps After Completion

1. **Task 1.2:** Create migration script for top 5 patterns per region
2. **Task 1.3:** Migrate and validate 8-10 systems
3. **Task 2.1:** Begin ApexEngineV2 implementation using FenestrationSystem

---

**Status:** Ready for Implementation  
**Owner:** Lead Engineer  
**Reviewer:** CTO + Domain Expert  
**Estimated Completion:** 3-5 days

