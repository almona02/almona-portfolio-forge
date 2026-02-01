/**
 * PatternMigrationService - Migrate EgyptianPattern to FenestrationSystem
 * 
 * Provides safe, validated migration from existing EgyptianPattern
 * to new FenestrationSystem schema with full rollback capability.
 * 
 * Based on actual SystemPack.windowSystemSpec structure:
 * - profiles_cutting_list: Profile cutting formulas
 * - rock60_45_degree_config: Detailed cutting configurations
 * - accessories_list: Hardware specifications
 * - constraints: Dimension limits
 * 
 * @since Gold Tier Phase 1, Task 1
 */

import { EgyptianPattern } from '@/data/egyptian-window-patterns';
import { SystemPack } from '@/data/systemPacks';
import { logFabricatorAudit } from '@/lib/audit/fabricatorAudit';
import { FenestrationSystem, HardwareRule, HardwareSpec, ProfileSpec } from '@/types/fenestration';
import { FenestrationSystemValidator } from './FenestrationSystemValidator';
import { GoldTierPerformanceMonitor } from './PerformanceMonitor';

export interface MigrationResult {
  success: boolean;
  system?: FenestrationSystem;
  errors: string[];
  warnings: string[];
  rollbackData?: EgyptianPattern;
  performance: {
    migrationTimeMs: number;
  };
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
        const migrationTime = performance.now() - startTime;
        
        GoldTierPerformanceMonitor.record(
          'migrate',
          migrationTime,
          { patternId: pattern.id, success: false },
          false,
          validation.errors[0]?.message
        );
        
        return {
          success: false,
          errors: validation.errors.map(e => `${e.code}: ${e.message}`),
          warnings: validation.warnings.map(w => `${w.code}: ${w.message}`),
          rollbackData,
          performance: {
            migrationTimeMs: migrationTime,
          },
        };
      }
      
      const migrationTime = performance.now() - startTime;
      
      GoldTierPerformanceMonitor.record(
        'migrate',
        migrationTime,
        { patternId: pattern.id, success: true },
        true
      );
      
      // Audit log
      logFabricatorAudit({
        action: 'MIGRATE',
        tableName: 'fenestration_systems',
        recordId: system.id,
        status: 'success',
        operationDurationMs: migrationTime,
        operationType: 'pattern_migration',
        newValues: {
          sourcePatternId: pattern.id,
          targetSystemId: system.id,
          migrationTime,
        },
      }).catch(error => {
        console.error('[PatternMigrationService] Audit logging failed:', error);
      });
      
      return {
        success: true,
        system,
        errors: [],
        warnings: validation.warnings.map(w => `${w.code}: ${w.message}`),
        rollbackData,
        performance: {
          migrationTimeMs: migrationTime,
        },
      };
    } catch (error) {
      const migrationTime = performance.now() - startTime;
      
      GoldTierPerformanceMonitor.record(
        'migrate',
        migrationTime,
        { patternId: pattern.id, success: false },
        false,
        error instanceof Error ? error.message : String(error)
      );
      
      // Audit log
      logFabricatorAudit({
        action: 'MIGRATE',
        tableName: 'fenestration_systems',
        recordId: pattern.id,
        status: 'failed',
        operationDurationMs: migrationTime,
        operationType: 'pattern_migration',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: 'MIGRATION_ERROR',
      }).catch(auditError => {
        console.error('[PatternMigrationService] Audit logging failed:', auditError);
      });
      
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        rollbackData,
        performance: {
          migrationTimeMs: migrationTime,
        },
      };
    }
  }
  
  /**
   * Extract profiles from SystemPack using multiple methods
   */
  private static extractProfiles(systemPack: SystemPack): FenestrationSystem['profiles'] {
    const spec = systemPack.windowSystemSpec;
    const profiles: Partial<FenestrationSystem['profiles']> = {};
    
    // Method 1: Extract from profiles_cutting_list
    if (spec.profiles_cutting_list && Array.isArray(spec.profiles_cutting_list)) {
      for (const item of spec.profiles_cutting_list) {
        const profileCode = item.profile_number;
        const description = item.description || '';
        
        // Infer role from description
        let role: 'frame' | 'sash' | 'mullion' | 'transom' | 'glazingBead' | undefined;
        const descLower = description.toLowerCase();
        if (descLower.includes('frame')) {
          role = 'frame';
        } else if (descLower.includes('sash')) {
          role = 'sash';
        } else if (descLower.includes('mullion')) {
          role = 'mullion';
        } else if (descLower.includes('transom')) {
          role = 'transom';
        } else if (descLower.includes('bead') || descLower.includes('glazing')) {
          role = 'glazingBead';
        }
        
        if (role && !profiles[role]) {
          profiles[role] = {
            code: profileCode,
            name: `${profileCode} - ${description}`,
            role,
            dimensions: {
              width: this.extractProfileWidth(profileCode, systemPack),
            },
            material: this.inferMaterial(systemPack),
            standardStockLength: spec.stockLengthMm || 6000,
            weightPerMeter: this.extractWeightPerMeter(profileCode, spec),
            costPerMeter: 0, // Will be filled from profile database
          };
        }
      }
    }
    
    // Method 2: Extract from rock60_45_degree_config (if available)
    if (spec.rock60_45_degree_config) {
      const config = spec.rock60_45_degree_config;
      
      // Frame profiles
      if (config.frame_profiles?.main_frame && !profiles.frame) {
        const frame = config.frame_profiles.main_frame;
        profiles.frame = {
          code: frame.profile_code,
          name: `Frame - ${frame.profile_code}`,
          role: 'frame',
          dimensions: {
            width: this.extractProfileWidth(frame.profile_code, systemPack),
          },
          material: this.inferMaterial(systemPack),
          standardStockLength: spec.stockLengthMm || 6000,
          weightPerMeter: frame.weight_kg_m || 0,
          costPerMeter: 0,
        };
      }
      
      // Sash profiles
      if (config.sash_profiles?.main_sash && !profiles.sash) {
        const sash = config.sash_profiles.main_sash;
        profiles.sash = {
          code: sash.profile_code,
          name: `Sash - ${sash.profile_code}`,
          role: 'sash',
          dimensions: {
            width: this.extractProfileWidth(sash.profile_code, systemPack),
          },
          material: this.inferMaterial(systemPack),
          standardStockLength: spec.stockLengthMm || 6000,
          weightPerMeter: sash.weight_kg_m || 0,
          costPerMeter: 0,
        };
      }
      
      // Glazing beads
      if (config.glazing_beads?.bead_profile && !profiles.glazingBead) {
        const bead = config.glazing_beads.bead_profile;
        profiles.glazingBead = {
          code: bead.profile_code,
          name: `Glazing Bead - ${bead.profile_code}`,
          role: 'glazingBead',
          dimensions: {
            width: this.extractProfileWidth(bead.profile_code, systemPack),
          },
          material: this.inferMaterial(systemPack),
          standardStockLength: spec.stockLengthMm || 6000,
          weightPerMeter: bead.weight_kg_m || 0,
          costPerMeter: 0,
        };
      }
    }
    
    // Method 3: Extract from systemPack.profiles array (if available)
    if (systemPack.profiles && Array.isArray(systemPack.profiles)) {
      for (const profile of systemPack.profiles) {
        const role = profile.profileRole || this.inferRoleFromProfile(profile);
        if (role && !(profiles as any)[role]) {
          (profiles as any)[role] = {
            code: profile.id || profile.name,
            name: profile.name,
            role,
            dimensions: {
              width: profile.width || 0,
              height: profile.height,
              thickness: profile.thickness,
            },
            material: profile.material || this.inferMaterial(systemPack),
            standardStockLength: profile.barLength || spec.stockLengthMm || 6000,
            weightPerMeter: profile.weightPerMeter || profile.unitWeight || 0,
            costPerMeter: profile.costPerMeter || 0,
            compatibleHardwareIds: profile.compatibleAccessories,
            specifications: profile.specifications,
          };
        }
      }
    }
    
    // Validate required profiles
    if (!profiles.frame || !profiles.sash || !profiles.glazingBead) {
      throw new Error('Missing required profiles: frame, sash, or glazingBead');
    }
    
    // Set defaults for optional profiles
    if (!profiles.mullion) {
      profiles.mullion = {
        code: 'DEFAULT-MULLION',
        name: 'Default Mullion',
        role: 'mullion',
        dimensions: { width: profiles.frame.dimensions.width },
        material: profiles.frame.material,
        standardStockLength: profiles.frame.standardStockLength,
        weightPerMeter: profiles.frame.weightPerMeter * 0.8,
        costPerMeter: profiles.frame.costPerMeter * 0.8,
      };
    }
    
    if (!profiles.transom) {
      profiles.transom = {
        code: 'DEFAULT-TRANSOM',
        name: 'Default Transom',
        role: 'transom',
        dimensions: { width: profiles.frame.dimensions.width },
        material: profiles.frame.material,
        standardStockLength: profiles.frame.standardStockLength,
        weightPerMeter: profiles.frame.weightPerMeter * 0.8,
        costPerMeter: profiles.frame.costPerMeter * 0.8,
      };
    }
    
    return profiles as FenestrationSystem['profiles'];
  }
  
  /**
   * Extract manufacturing rules from SystemPack
   */
  private static extractFabricationRules(
    systemPack: SystemPack,
    _pattern: EgyptianPattern
  ): FenestrationSystem['fabricationRules'] {
    const spec = systemPack.windowSystemSpec;
    
    // Extract from cutting formulas (e.g., "L + 60" means 60mm miter allowance)
    let miterAllowance = 2000; // Default 2mm in microns
    const sawKerf = 1500; // Default 1.5mm in microns
    
    if (spec.profiles_cutting_list) {
      for (const item of spec.profiles_cutting_list) {
        const formula = item.cutting_length;
        if (typeof formula === 'string') {
          // Parse formulas like "L + 60" or "H - 44"
          const match = formula.match(/([+\-])\s*(\d+)/);
          if (match) {
            const value = parseInt(match[2], 10) * 1000; // Convert mm to microns
            if (match[1] === '+') {
              miterAllowance = Math.max(miterAllowance, value);
            }
          }
        }
      }
    }
    
    // Determine connection type from system
    let connectionType: 'miter' | 'butt' | 'crimp' | 'screw' = 'miter';
    if (spec.rock60_45_degree_config?.cut_angle === '45°') {
      connectionType = 'miter';
    } else if (spec.accessories_list?.some((a: any) => a.description?.toLowerCase().includes('corner joint'))) {
      connectionType = 'crimp';
    }
    
    // UPVC welding rules (if material is UPVC)
    const material = this.inferMaterial(systemPack);
    const welding = material === 'upvc' ? {
      burnOff: 3000, // 3mm default
      coolingFactor: 2.5, // 2.5% default
      temperature: 250, // 250°C default
    } : undefined;
    
    return {
      connectionType,
      cutting: {
        sawKerf,
        miterAllowance,
        barEndTrim: 500, // 0.5mm default
        cuttingTolerance: 100, // 0.1mm default
      },
      welding,
      assembly: {
        frameClearance: 3000, // 3mm default (from "L - 44" = 44mm total, ~3mm per side)
        mullionDeduction: 0, // Will be calculated from actual mullion width
        glazingClearance: 5000, // 5mm default
      },
    };
  }
  
  /**
   * Extract hardware kit from pattern and systemPack
   */
  private static extractHardwareKit(
    _pattern: EgyptianPattern,
    systemPack: SystemPack
  ): FenestrationSystem['hardwareKit'] {
    const spec = systemPack.windowSystemSpec;
    const accessories = spec.accessories_list || [];
    
    // Extract hinges
    const hingeAccessories = accessories.filter((a: any) => 
      a.description?.toLowerCase().includes('hinge') ||
      a.accessory_number?.match(/^0[0-9]{3}$/) // Common hinge numbering
    );
    
    const hinges: HardwareRule = {
      category: 'hinge',
      defaultId: hingeAccessories[0]?.accessory_number || 'DEFAULT-HINGE',
      selectionRules: [],
      quantityCalculator: (windowUnit: any) => {
        // Standard: 2 hinges per sash
        const sashCount = windowUnit.grid?.cells.filter((c: any) => c.type === 'sash').length || 1;
        return sashCount * 2;
      },
      installationSpec: {
        position: '200mm from bottom, 200mm from top',
        torque: 8, // Nm
        tooling: ['Drill', 'Screwdriver'],
      },
    };
    
    // Extract locking system
    const lockAccessories = accessories.filter((a: any) =>
      a.description?.toLowerCase().includes('lock') ||
      a.description?.toLowerCase().includes('locking kit')
    );
    
    const lockingSystem: HardwareRule = {
      category: 'lock',
      defaultId: lockAccessories[0]?.accessory_number || 'DEFAULT-LOCK',
      selectionRules: [],
      quantityCalculator: () => 1, // One locking system per window
      installationSpec: {
        position: 'Center of sash',
        tooling: ['Drill', 'Router'],
      },
    };
    
    // Extract handle
    const handleAccessories = accessories.filter((a: any) =>
      a.description?.toLowerCase().includes('handle')
    );
    
    const handle: HardwareRule = {
      category: 'handle',
      defaultId: handleAccessories[0]?.accessory_number || 'DEFAULT-HANDLE',
      selectionRules: [],
      quantityCalculator: () => 1, // One handle per window
      installationSpec: {
        position: 'Center of sash',
        tooling: ['Drill'],
      },
    };
    
    // Extract gaskets
    const gasketAccessories = accessories.filter((a: any) =>
      a.description?.toLowerCase().includes('gasket') ||
      a.accessory_number?.startsWith('GT ')
    );
    
    const glazingGasket = gasketAccessories.find((a: any) =>
      a.description?.toLowerCase().includes('glass gasket')
    ) || gasketAccessories[0];
    
    const weatherSeal = gasketAccessories.find((a: any) =>
      a.description?.toLowerCase().includes('weather') ||
      a.description?.toLowerCase().includes('striker')
    ) || gasketAccessories[1] || gasketAccessories[0];
    
    // Extract corner keys
    const cornerKeys = accessories
      .filter((a: any) => a.description?.toLowerCase().includes('corner'))
      .map((a: any): HardwareSpec => ({
        id: a.accessory_number || 'DEFAULT-CORNER-KEY',
        supplierCode: a.accessory_number || '',
        name: a.description || 'Corner Key',
        category: 'corner_key',
        specifications: {},
        unitCost: 0, // Will be filled from hardware database
      }));
    
    return {
      hinges,
      lockingSystem,
      handle,
      gaskets: {
        glazingGasket: {
          id: glazingGasket?.accessory_number || 'DEFAULT-GLAZING-GASKET',
          supplierCode: glazingGasket?.accessory_number || '',
          name: glazingGasket?.description || 'Glazing Gasket',
          category: 'gasket',
          specifications: {},
          unitCost: 0,
        },
        weatherSeal: {
          id: weatherSeal?.accessory_number || 'DEFAULT-WEATHER-SEAL',
          supplierCode: weatherSeal?.accessory_number || '',
          name: weatherSeal?.description || 'Weather Seal',
          category: 'gasket',
          specifications: {},
          unitCost: 0,
        },
      },
      cornerKeys,
      drainageCaps: [], // Will be extracted if available
    };
  }
  
  /**
   * Extract constraints from pattern
   */
  private static extractConstraints(
    pattern: EgyptianPattern
  ): FenestrationSystem['constraints'] {
    return {
      maxWidth: pattern.constraints?.maxSashWidth || pattern.typicalWidthMm[1] || 3000,
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
  
  /**
   * Extract regional physics
   */
  private static extractRegionalPhysics(
    systemPack: SystemPack,
    _pattern: EgyptianPattern
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
  
  // Helper methods
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
    const category = (systemPack.meta as any).category || '';
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
  
  private static extractProfileWidth(profileCode: string, systemPack: SystemPack): number {
    // Try to extract from systemPack.profiles
    if (systemPack.profiles) {
      const profile = systemPack.profiles.find(p => p.id === profileCode || p.name === profileCode);
      if (profile?.width) return profile.width;
    }
    
    // Default fallback
    return 60; // Default 60mm width
  }
  
  private static extractWeightPerMeter(profileCode: string, spec: any): number {
    // Try to extract from rock60_45_degree_config
    if (spec.rock60_45_degree_config) {
      const config = spec.rock60_45_degree_config;
      if (config.frame_profiles?.main_frame?.profile_code === profileCode) {
        return config.frame_profiles.main_frame.weight_kg_m || 0;
      }
      if (config.sash_profiles?.main_sash?.profile_code === profileCode) {
        return config.sash_profiles.main_sash.weight_kg_m || 0;
      }
      if (config.glazing_beads?.bead_profile?.profile_code === profileCode) {
        return config.glazing_beads.bead_profile.weight_kg_m || 0;
      }
    }
    
    return 0; // Will be filled from profile database
  }
  
  private static inferRoleFromProfile(profile: any): ProfileSpec['role'] | undefined {
    const role = profile.profileRole;
    if (role && ['frame', 'sash', 'mullion', 'transom', 'glazingBead', 'reinforcement', 'thermalBreak'].includes(role)) {
      return role as ProfileSpec['role'];
    }
    return undefined;
  }
}

