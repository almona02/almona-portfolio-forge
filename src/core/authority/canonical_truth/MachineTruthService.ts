/**
 * @file MachineTruthService.ts
 * @description Machine Truth Service - Operational implementation
 * 
 * AICS-001 Reference: Section 6.3.3 (Machine Truth)
 * 
 * Operational service for Machine Truth domain.
 * 
 * Key Principles:
 * - Machine truth overrides optimization preferences
 * - Unsupported operations are non-existent
 * - Machine truth is versioned per machine instance
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type {
    MachineProvenance,
    MachineSchema,
    MachineTruth,
    MachineValidationRule,
} from '../constitution/canonical_truth/machine_truth';
import { BaseTruthService, type TruthVersion } from './BaseTruthService';

/**
 * Machine Truth Service
 * 
 * Operational service for Machine Truth domain.
 * 
 * AICS-001 Section 6.3.3:
 * - Machine truth overrides optimization preferences
 * - Unsupported operations are non-existent
 * - Machine truth is versioned per machine instance
 */
export class MachineTruthService extends BaseTruthService<MachineTruth> {
  private validationRules: MachineValidationRule[] = [];

  constructor() {
    super('machine');
    this.initializeDefaultRules();
  }

  /**
   * Register machine truth
   * 
   * Registers a new machine truth entity with validation.
   * 
   * @param entityId - Machine entity identifier
   * @param schema - Machine schema
   * @param provenance - Provenance information
   * @param createdBy - Creator identifier
   * @returns Created truth version
   */
  registerMachine(
    entityId: string,
    schema: MachineSchema,
    provenance: MachineProvenance,
    createdBy: string
  ): TruthVersion<MachineTruth> {
    // Validate schema
    this.validateSchema(schema);
    
    // Create machine truth
    const machineTruth: MachineTruth = {
      version: '1.0.0', // Will be set by registerVersion
      schema,
      validationRules: this.validationRules,
      provenance,
      aics001Reference: 'AICS-001 Section 6.3.3',
    };
    
    return this.registerVersion(entityId, machineTruth, createdBy, 'Initial machine registration');
  }

  /**
   * Get machine schema
   * 
   * @param entityId - Machine entity identifier
   * @param version - Optional version (defaults to current)
   * @returns Machine schema or undefined
   */
  getSchema(entityId: string, version?: string): MachineSchema | undefined {
    const truth = version
      ? this.getVersion(entityId, version)
      : this.getCurrent(entityId);
    
    return truth?.schema;
  }

  /**
   * Validate machine explicitness
   * 
   * AICS-001 Section 6.4: Explicitness - No hidden defaults
   * AICS-001 Section 6.3.3: Machine truth must be explicit
   * 
   * @param data - Machine truth to validate
   */
  protected validateExplicitness(data: MachineTruth): void {
    const schema = data.schema;
    
    // Capabilities must be explicit
    if (schema.capabilities.maxWidth === undefined || schema.capabilities.maxWidth === null) {
      throw new Error(`Machine ${schema.machineId} missing explicit maxWidth (AICS-001 Section 6.3.3)`);
    }
    
    if (schema.capabilities.maxHeight === undefined || schema.capabilities.maxHeight === null) {
      throw new Error(`Machine ${schema.machineId} missing explicit maxHeight (AICS-001 Section 6.3.3)`);
    }
    
    if (schema.capabilities.maxDepth === undefined || schema.capabilities.maxDepth === null) {
      throw new Error(`Machine ${schema.machineId} missing explicit maxDepth (AICS-001 Section 6.3.3)`);
    }
    
    if (schema.capabilities.precision === undefined || schema.capabilities.precision === null) {
      throw new Error(`Machine ${schema.machineId} missing explicit precision (AICS-001 Section 6.3.3)`);
    }
    
    // Limitations must be explicit
    if (schema.limitations.minCutLength === undefined || schema.limitations.minCutLength === null) {
      throw new Error(`Machine ${schema.machineId} missing explicit minCutLength (AICS-001 Section 6.3.3)`);
    }
    
    if (schema.limitations.maxCutLength === undefined || schema.limitations.maxCutLength === null) {
      throw new Error(`Machine ${schema.machineId} missing explicit maxCutLength (AICS-001 Section 6.3.3)`);
    }
    
    // Configuration must be explicit
    if (!schema.configuration) {
      throw new Error(`Machine ${schema.machineId} missing explicit configuration (AICS-001 Section 6.3.3)`);
    }
  }

  /**
   * Validate schema structure
   * 
   * @param schema - Schema to validate
   */
  private validateSchema(schema: MachineSchema): void {
    // Machine ID must be unique and explicit
    if (!schema.machineId || schema.machineId.trim() === '') {
      throw new Error('Machine schema must have explicit machineId (AICS-001 Section 6.3.3)');
    }
    
    // Machine name must be explicit
    if (!schema.name || schema.name.trim() === '') {
      throw new Error('Machine schema must have explicit name (AICS-001 Section 6.3.3)');
    }
    
    // Manufacturer must be explicit
    if (!schema.manufacturer || schema.manufacturer.trim() === '') {
      throw new Error('Machine schema must have explicit manufacturer (AICS-001 Section 6.3.3)');
    }
    
    // Model must be explicit
    if (!schema.model || schema.model.trim() === '') {
      throw new Error('Machine schema must have explicit model (AICS-001 Section 6.3.3)');
    }
    
    // Capabilities must be defined
    if (!schema.capabilities) {
      throw new Error('Machine schema must have explicit capabilities (AICS-001 Section 6.3.3)');
    }
    
    // Limitations must be defined
    if (!schema.limitations) {
      throw new Error('Machine schema must have explicit limitations (AICS-001 Section 6.3.3)');
    }
  }

  /**
   * Initialize default validation rules
   * 
   * AICS-001 Section 6.3.3: Validation rules for machines
   */
  private initializeDefaultRules(): void {
    this.validationRules = [
      {
        ruleId: 'MACH-001',
        description: 'All machine capabilities must be explicit',
        deterministic: true,
        source: 'AICS-001',
        constraint: (machine, _input) => {
          return machine.capabilities.maxWidth > 0 && machine.capabilities.maxHeight > 0;
        },
      },
      {
        ruleId: 'MACH-002',
        description: 'Machine limitations must be explicit',
        deterministic: true,
        source: 'AICS-001',
        constraint: (machine, _input) => {
          return machine.limitations.minCutLength >= 0 && machine.limitations.maxCutLength > machine.limitations.minCutLength;
        },
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
let globalMachineTruthService: MachineTruthService | null = null;

/**
 * Get global Machine Truth Service instance
 * 
 * @returns Global service instance
 */
export function getMachineTruthService(): MachineTruthService {
  if (!globalMachineTruthService) {
    globalMachineTruthService = new MachineTruthService();
  }
  return globalMachineTruthService;
}

/**
 * Reset global Machine Truth Service (mainly for testing)
 */
export function resetMachineTruthService(): void {
  globalMachineTruthService = new MachineTruthService();
}


