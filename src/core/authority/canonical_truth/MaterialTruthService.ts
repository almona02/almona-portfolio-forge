/**
 * @file MaterialTruthService.ts
 * @description Material Truth Service - Operational implementation
 * 
 * AICS-001 Reference: Section 6.3.2 (Material Truth)
 * 
 * Operational service for Material Truth domain.
 * 
 * Key Principles:
 * - No inferred material properties
 * - All values must reference supplier, standard, or certification
 * - Defaults must be explicitly declared
 * - Material truth is never learned, only selected
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type {
    MaterialProvenance,
    MaterialSchema,
    MaterialTruth,
    MaterialValidationRule,
} from '../constitution/canonical_truth/material_truth';
import { BaseTruthService, type TruthVersion } from './BaseTruthService';

/**
 * Material Truth Service
 * 
 * Operational service for Material Truth domain.
 * 
 * AICS-001 Section 6.3.2:
 * - No inferred material properties
 * - All values must reference supplier, standard, or certification
 * - Defaults must be explicitly declared
 */
export class MaterialTruthService extends BaseTruthService<MaterialTruth> {
  private validationRules: MaterialValidationRule[] = [];

  constructor() {
    super('material');
    this.initializeDefaultRules();
  }

  /**
   * Register material truth
   * 
   * Registers a new material truth entity with validation.
   * 
   * @param entityId - Material entity identifier
   * @param schema - Material schema
   * @param provenance - Provenance information
   * @param createdBy - Creator identifier
   * @returns Created truth version
   */
  registerMaterial(
    entityId: string,
    schema: MaterialSchema,
    provenance: MaterialProvenance,
    createdBy: string
  ): TruthVersion<MaterialTruth> {
    // Validate schema
    this.validateSchema(schema);
    
    // Create material truth
    const materialTruth: MaterialTruth = {
      version: '1.0.0', // Will be set by registerVersion
      schema,
      validationRules: this.validationRules,
      provenance,
      aics001Reference: 'AICS-001 Section 6.3.2',
    };
    
    return this.registerVersion(entityId, materialTruth, createdBy, 'Initial material registration');
  }

  /**
   * Get material schema
   * 
   * @param entityId - Material entity identifier
   * @param version - Optional version (defaults to current)
   * @returns Material schema or undefined
   */
  getSchema(entityId: string, version?: string): MaterialSchema | undefined {
    const truth = version
      ? this.getVersion(entityId, version)
      : this.getCurrent(entityId);
    
    return truth?.schema;
  }

  /**
   * Validate material explicitness
   * 
   * AICS-001 Section 6.4: Explicitness - No hidden defaults
   * AICS-001 Section 6.3.2: No inferred material properties
   * 
   * @param data - Material truth to validate
   */
  protected validateExplicitness(data: MaterialTruth): void {
    const schema = data.schema;
    
    // All properties must be explicitly defined (no undefined/null)
    if (schema.properties.density === undefined || schema.properties.density === null) {
      throw new Error(`Material ${schema.materialId} missing explicit density (AICS-001 Section 6.3.2)`);
    }
    
    if (schema.properties.thermalExpansion === undefined || schema.properties.thermalExpansion === null) {
      throw new Error(`Material ${schema.materialId} missing explicit thermal expansion (AICS-001 Section 6.3.2)`);
    }
    
    if (!schema.properties.strength?.tensile || !schema.properties.strength?.yield) {
      throw new Error(`Material ${schema.materialId} missing explicit strength properties (AICS-001 Section 6.3.2)`);
    }
    
    if (!schema.properties.modulus?.elastic || !schema.properties.modulus?.shear) {
      throw new Error(`Material ${schema.materialId} missing explicit modulus properties (AICS-001 Section 6.3.2)`);
    }
    
    // All specifications must reference source (supplier, standard, or certification)
    if (!schema.specifications.standard && schema.specifications.certification.length === 0) {
      throw new Error(`Material ${schema.materialId} must reference standard or certification (AICS-001 Section 6.3.2)`);
    }
    
    // Grade must be explicit
    if (!schema.specifications.grade) {
      throw new Error(`Material ${schema.materialId} missing explicit grade (AICS-001 Section 6.3.2)`);
    }
  }

  /**
   * Validate schema structure
   * 
   * @param schema - Schema to validate
   */
  private validateSchema(schema: MaterialSchema): void {
    // Material ID must be unique and explicit
    if (!schema.materialId || schema.materialId.trim() === '') {
      throw new Error('Material schema must have explicit materialId (AICS-001 Section 6.3.2)');
    }
    
    // Material name must be explicit
    if (!schema.name || schema.name.trim() === '') {
      throw new Error('Material schema must have explicit name (AICS-001 Section 6.3.2)');
    }
    
    // Material type must be explicit
    if (!schema.type) {
      throw new Error('Material schema must have explicit type (AICS-001 Section 6.3.2)');
    }
    
    // Properties must be defined
    if (!schema.properties) {
      throw new Error('Material schema must have explicit properties (AICS-001 Section 6.3.2)');
    }
    
    // Specifications must be defined
    if (!schema.specifications) {
      throw new Error('Material schema must have explicit specifications (AICS-001 Section 6.3.2)');
    }
  }

  /**
   * Initialize default validation rules
   * 
   * AICS-001 Section 6.3.2: Validation rules for materials
   */
  private initializeDefaultRules(): void {
    this.validationRules = [
      {
        ruleId: 'MAT-001',
        description: 'All material properties must be explicit',
        deterministic: true,
        source: 'AICS-001',
        property: 'density',
        constraint: (value) => typeof value === 'number' && value > 0,
      },
      {
        ruleId: 'MAT-002',
        description: 'Material specifications must reference standard or certification',
        deterministic: true,
        source: 'AICS-001',
        property: 'standard',
        constraint: (value) => typeof value === 'string' && value.length > 0,
      },
    ];
  }

  /**
   * Get current version identifier
   * 
   * @param entityId - Entity identifier
   * @returns Current version string or undefined
   */
  getCurrentVersion(entityId: string): string | undefined {
    const versions = this.getVersions(entityId);
    const current = versions.find(v => v.isCurrent);
    return current?.version;
  }
}

// Global instance
let globalMaterialTruthService: MaterialTruthService | null = null;

/**
 * Get global Material Truth Service instance
 * 
 * @returns Global service instance
 */
export function getMaterialTruthService(): MaterialTruthService {
  if (!globalMaterialTruthService) {
    globalMaterialTruthService = new MaterialTruthService();
  }
  return globalMaterialTruthService;
}

/**
 * Reset global Material Truth Service (mainly for testing)
 */
export function resetMaterialTruthService(): void {
  globalMaterialTruthService = new MaterialTruthService();
}


