/**
 * FenestrationSystemValidator - Gold Tier Validation Engine
 * 
 * Provides comprehensive validation for FenestrationSystem objects with:
 * - Type safety checks
 * - Business rule validation
 * - Performance optimization (cached validators)
 * - Audit trail integration
 * - Error recovery suggestions
 * 
 * Performance: Cached results for identical systems (<1ms after first validation)
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';
import { FenestrationSystem } from '@/types/fenestration';
import { GoldTierPerformanceMonitor } from './PerformanceMonitor';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  performance: {
    validationTimeMs: number;
    cacheHit: boolean;
    validationSteps: number;
  };
  recovery?: {
    suggestions: string[];
    autoFixable: boolean;
  };
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'critical';
  details?: Record<string, unknown>;
  recovery?: {
    action: string;
    suggestion: string;
  };
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  suggestion?: string;
  severity?: 'low' | 'medium' | 'high';
}

export class FenestrationSystemValidator {
  private static readonly VALIDATION_CACHE = new Map<string, {
    result: ValidationResult;
    timestamp: number;
  }>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 1000; // Prevent memory leaks
  
  /**
   * Validate a FenestrationSystem with comprehensive checks
   * 
   * Performance: Cached results for identical systems (<1ms after first validation)
   * Error Recovery: Provides suggestions for common errors
   * 
   * @param system - FenestrationSystem to validate
   * @returns ValidationResult with errors, warnings, and performance metrics
   */
  static validate(system: FenestrationSystem): ValidationResult {
    const startTime = performance.now();
    const cacheKey = this.getCacheKey(system);
    
    // Check cache
    const cached = this.VALIDATION_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
      GoldTierPerformanceMonitor.recordCacheHit();
      return {
        ...cached.result,
        performance: {
          ...cached.result.performance,
          cacheHit: true,
        },
      };
    }
    
    GoldTierPerformanceMonitor.recordCacheMiss();
    
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let validationSteps = 0;
    
    // 1. Type safety checks
    validationSteps++;
    this.validateTypeSafety(system, errors);
    
    // 2. Business rule validation
    validationSteps++;
    this.validateBusinessRules(system, errors, warnings);
    
    // 3. Manufacturing rules validation
    validationSteps++;
    this.validateManufacturingRules(system, errors, warnings);
    
    // 4. Hardware kit validation
    validationSteps++;
    this.validateHardwareKit(system, errors, warnings);
    
    // 5. Constraints validation
    validationSteps++;
    this.validateConstraints(system, errors, warnings);
    
    // 6. Regional physics validation
    validationSteps++;
    this.validateRegionalPhysics(system, errors, warnings);
    
    const validationTime = performance.now() - startTime;
    
    // Generate recovery suggestions
    const recovery = this.generateRecoverySuggestions(errors, warnings);
    
    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      performance: {
        validationTimeMs: validationTime,
        cacheHit: false,
        validationSteps,
      },
      recovery: recovery.suggestions.length > 0 ? recovery : undefined,
    };
    
    // Cache result (with size limit)
    if (this.VALIDATION_CACHE.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry (FIFO)
      const firstKey = this.VALIDATION_CACHE.keys().next().value;
      this.VALIDATION_CACHE.delete(firstKey);
    }
    this.VALIDATION_CACHE.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
    
    // Record performance metric
    GoldTierPerformanceMonitor.record(
      'validate',
      validationTime,
      {
        systemId: system.id,
        errorCount: errors.length,
        warningCount: warnings.length,
      },
      result.isValid
    );
    
    // Audit log (non-blocking)
    logFabricatorAudit({
      action: 'VALIDATE',
      tableName: 'fenestration_systems',
      recordId: system.id,
      status: result.isValid ? 'success' : 'failed',
      operationDurationMs: validationTime,
      operationType: 'fenestration_system_validation',
      newValues: {
        systemId: system.id,
        validationResult: {
          isValid: result.isValid,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          performance: result.performance,
        },
      },
      errorMessage: result.errors.length > 0 ? result.errors[0].message : undefined,
      errorCode: result.errors.length > 0 ? result.errors[0].code : undefined,
    }).catch(error => {
      console.error('[FenestrationSystemValidator] Audit logging failed:', error);
      // Don't throw - audit failure shouldn't break validation
    });
    
    return result;
  }
  
  /**
   * Generate recovery suggestions for errors
   */
  private static generateRecoverySuggestions(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): { suggestions: string[]; autoFixable: boolean } {
    const suggestions: string[] = [];
    let autoFixable = true;
    
    for (const error of errors) {
      if (error.recovery) {
        suggestions.push(error.recovery.suggestion);
      } else {
        // Generate generic suggestions based on error code
        switch (error.code) {
          case 'VAL-001':
            suggestions.push('Ensure system ID is a non-empty string');
            break;
          case 'VAL-002':
            suggestions.push('System name must be at least 3 characters');
            break;
          case 'VAL-101':
            suggestions.push('UPVC systems require welding parameters in fabricationRules.welding');
            autoFixable = false;
            break;
          case 'VAL-201':
            suggestions.push('sawKerf must be between 0 and 5000 microns (0-5mm)');
            break;
          default:
            suggestions.push(`Fix ${error.field}: ${error.message}`);
            autoFixable = false;
        }
      }
    }
    
    for (const warning of warnings) {
      if (warning.suggestion) {
        suggestions.push(`Warning: ${warning.suggestion}`);
      }
    }
    
    return { suggestions, autoFixable };
  }
  
  /**
   * Validate type safety
   */
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
        recovery: {
          action: 'Set a valid string ID',
          suggestion: 'Ensure system ID is a non-empty string',
        },
      });
    }
    
    // Name validation
    if (!system.name || typeof system.name !== 'string' || system.name.length < 3) {
      errors.push({
        code: 'VAL-002',
        field: 'name',
        message: 'System name is required and must be at least 3 characters',
        severity: 'error',
        recovery: {
          action: 'Set a valid name with at least 3 characters',
          suggestion: 'System name must be at least 3 characters',
        },
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
  
  /**
   * Validate business rules
   */
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
        recovery: {
          action: 'Add welding parameters',
          suggestion: 'UPVC systems require welding parameters in fabricationRules.welding',
        },
      });
    }
    
    // GCC must have thermal break
    if (system.region === 'GCC' && !system.profiles.thermalBreak) {
      warnings.push({
        code: 'VAL-102',
        field: 'profiles.thermalBreak',
        message: 'GCC systems should include thermal break profile',
        suggestion: 'Consider adding thermal break profile for better thermal performance',
        severity: 'medium',
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
  
  /**
   * Validate manufacturing rules
   */
  private static validateManufacturingRules(
    system: FenestrationSystem,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
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
  
  /**
   * Validate profiles
   */
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
  
  /**
   * Validate profile specification
   */
  private static validateProfileSpec(
    profile: { code?: unknown; dimensions?: { width?: number }; standardStockLength?: number },
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
  
  /**
   * Validate hardware kit
   */
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
        severity: 'medium',
      });
    }
  }
  
  /**
   * Validate constraints
   */
  private static validateConstraints(
    system: FenestrationSystem,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
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
        message: `requiresReinforcement function threw an error: ${String(error)}`,
        severity: 'error',
      });
    }
  }
  
  /**
   * Validate regional physics
   */
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
        severity: 'medium',
      });
    }
    
    // Turkish systems should have seismic rating
    if (system.region === 'TUR' && !system.regionalPhysics.seismicRating) {
      warnings.push({
        code: 'VAL-603',
        field: 'regionalPhysics.seismicRating',
        message: 'Turkish systems should include seismic rating',
        suggestion: 'Consider adding seismic rating for Turkish building codes',
        severity: 'medium',
      });
    }
  }
  
  /**
   * Validate fabrication rules structure
   */
  private static validateFabricationRulesStructure(
    rules: FenestrationSystem['fabricationRules'],
    errors: ValidationError[]
  ): void {
    if (!rules) {
      errors.push({
        code: 'VAL-206',
        field: 'fabricationRules',
        message: 'fabricationRules is required',
        severity: 'critical',
      });
      return;
    }
    
    if (!rules.connectionType) {
      errors.push({
        code: 'VAL-207',
        field: 'fabricationRules.connectionType',
        message: 'connectionType is required',
        severity: 'error',
      });
    }
    
    if (!rules.cutting) {
      errors.push({
        code: 'VAL-208',
        field: 'fabricationRules.cutting',
        message: 'cutting parameters are required',
        severity: 'critical',
      });
    }
    
    if (!rules.assembly) {
      errors.push({
        code: 'VAL-209',
        field: 'fabricationRules.assembly',
        message: 'assembly parameters are required',
        severity: 'critical',
      });
    }
  }
  
  /**
   * Validate hardware kit structure
   */
  private static validateHardwareKitStructure(
    kit: FenestrationSystem['hardwareKit'],
    errors: ValidationError[]
  ): void {
    if (!kit) {
      errors.push({
        code: 'VAL-407',
        field: 'hardwareKit',
        message: 'hardwareKit is required',
        severity: 'critical',
      });
      return;
    }
    
    if (!kit.gaskets) {
      errors.push({
        code: 'VAL-408',
        field: 'hardwareKit.gaskets',
        message: 'gaskets are required',
        severity: 'error',
      });
    }
    
    if (!Array.isArray(kit.cornerKeys)) {
      errors.push({
        code: 'VAL-409',
        field: 'hardwareKit.cornerKeys',
        message: 'cornerKeys must be an array',
        severity: 'error',
      });
    }
    
    if (!Array.isArray(kit.drainageCaps)) {
      errors.push({
        code: 'VAL-410',
        field: 'hardwareKit.drainageCaps',
        message: 'drainageCaps must be an array',
        severity: 'error',
      });
    }
  }
  
  /**
   * Validate constraints structure
   */
  private static validateConstraintsStructure(
    constraints: FenestrationSystem['constraints'],
    errors: ValidationError[]
  ): void {
    if (!constraints) {
      errors.push({
        code: 'VAL-506',
        field: 'constraints',
        message: 'constraints are required',
        severity: 'critical',
      });
      return;
    }
    
    if (typeof constraints.maxWidth !== 'number' || constraints.maxWidth <= 0) {
      errors.push({
        code: 'VAL-507',
        field: 'constraints.maxWidth',
        message: 'maxWidth must be a positive number',
        severity: 'error',
      });
    }
    
    if (typeof constraints.maxHeight !== 'number' || constraints.maxHeight <= 0) {
      errors.push({
        code: 'VAL-508',
        field: 'constraints.maxHeight',
        message: 'maxHeight must be a positive number',
        severity: 'error',
      });
    }
    
    if (!constraints.aspectRatio) {
      errors.push({
        code: 'VAL-509',
        field: 'constraints.aspectRatio',
        message: 'aspectRatio is required',
        severity: 'error',
      });
    }
    
    if (typeof constraints.requiresReinforcement !== 'function') {
      errors.push({
        code: 'VAL-510',
        field: 'constraints.requiresReinforcement',
        message: 'requiresReinforcement must be a function',
        severity: 'error',
      });
    }
  }
  
  /**
   * Validate regional physics structure
   */
  private static validateRegionalPhysicsStructure(
    physics: FenestrationSystem['regionalPhysics'],
    errors: ValidationError[]
  ): void {
    if (!physics) {
      errors.push({
        code: 'VAL-604',
        field: 'regionalPhysics',
        message: 'regionalPhysics is required',
        severity: 'critical',
      });
      return;
    }
    
    if (typeof physics.thermalExpansionCoefficient !== 'number') {
      errors.push({
        code: 'VAL-605',
        field: 'regionalPhysics.thermalExpansionCoefficient',
        message: 'thermalExpansionCoefficient must be a number',
        severity: 'error',
      });
    }
  }
  
  /**
   * Get cache key for system
   */
  private static getCacheKey(system: FenestrationSystem): string {
    return `${system.id}-${system.version}-${system.metadata.updatedAt}`;
  }
  
  /**
   * Clear validation cache (useful for testing)
   */
  static clearCache(): void {
    this.VALIDATION_CACHE.clear();
  }
  
  /**
   * Invalidate cache for specific system
   */
  static invalidateCache(systemId: string): void {
    for (const [key] of this.VALIDATION_CACHE) {
      if (key.startsWith(`${systemId}-`)) {
        this.VALIDATION_CACHE.delete(key);
      }
    }
  }
  
  /**
   * Get cache statistics (for monitoring)
   */
  static getCacheStats(): {
    size: number;
    maxSize: number;
  } {
    return {
      size: this.VALIDATION_CACHE.size,
      maxSize: this.MAX_CACHE_SIZE,
    };
  }
}

