/**
 * @file ProcessTruthService.ts
 * @description Process Truth Service - Operational implementation
 * 
 * AICS-001 Reference: Section 6.3.4 (Process Truth)
 * 
 * Operational service for Process Truth domain.
 * 
 * Key Principles:
 * - Order is authoritative
 * - Parallelism must be explicit
 * - Skipped steps invalidate execution
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type {
    ProcessProvenance,
    ProcessSchema,
    ProcessTruth,
    ProcessValidationRule,
} from '../constitution/canonical_truth/process_truth';
import { BaseTruthService, type TruthVersion } from './BaseTruthService';

/**
 * Process Truth Service
 * 
 * Operational service for Process Truth domain.
 * 
 * AICS-001 Section 6.3.4:
 * - Order is authoritative
 * - Parallelism must be explicit
 * - Skipped steps invalidate execution
 */
export class ProcessTruthService extends BaseTruthService<ProcessTruth> {
  private validationRules: ProcessValidationRule[] = [];

  constructor() {
    super('process');
    this.initializeDefaultRules();
  }

  /**
   * Register process truth
   * 
   * Registers a new process truth entity with validation.
   * 
   * @param entityId - Process entity identifier
   * @param schema - Process schema
   * @param provenance - Provenance information
   * @param createdBy - Creator identifier
   * @returns Created truth version
   */
  registerProcess(
    entityId: string,
    schema: ProcessSchema,
    provenance: ProcessProvenance,
    createdBy: string
  ): TruthVersion<ProcessTruth> {
    // Validate schema
    this.validateSchema(schema);
    
    // Create process truth
    const processTruth: ProcessTruth = {
      version: '1.0.0', // Will be set by registerVersion
      schema,
      validationRules: this.validationRules,
      provenance,
      aics001Reference: 'AICS-001 Section 6.3.4',
    };
    
    return this.registerVersion(entityId, processTruth, createdBy, 'Initial process registration');
  }

  /**
   * Get process schema
   * 
   * @param entityId - Process entity identifier
   * @param version - Optional version (defaults to current)
   * @returns Process schema or undefined
   */
  getSchema(entityId: string, version?: string): ProcessSchema | undefined {
    const truth = version
      ? this.getVersion(entityId, version)
      : this.getCurrent(entityId);
    
    return truth?.schema;
  }

  /**
   * Validate process explicitness
   * 
   * AICS-001 Section 6.4: Explicitness - No hidden defaults
   * AICS-001 Section 6.3.4: Order is authoritative, parallelism must be explicit
   * 
   * @param data - Process truth to validate
   */
  protected validateExplicitness(data: ProcessTruth): void {
    const schema = data.schema;
    
    // All steps must have explicit order
    schema.sequence.forEach(step => {
      if (step.order === undefined || step.order === null) {
        throw new Error(`Process ${schema.processId} step ${step.stepId} missing explicit order (AICS-001 Section 6.3.4)`);
      }
      
      // Parallelism must be explicit
      if (step.parallelizable === undefined || step.parallelizable === null) {
        throw new Error(`Process ${schema.processId} step ${step.stepId} missing explicit parallelizable flag (AICS-001 Section 6.3.4)`);
      }
      
      // Duration must be explicit
      if (step.duration === undefined || step.duration === null) {
        throw new Error(`Process ${schema.processId} step ${step.stepId} missing explicit duration (AICS-001 Section 6.3.4)`);
      }
      
      // Required flag must be explicit
      if (step.required === undefined || step.required === null) {
        throw new Error(`Process ${schema.processId} step ${step.stepId} missing explicit required flag (AICS-001 Section 6.3.4)`);
      }
    });
    
    // Dependencies must reference existing steps
    const stepIds = new Set(schema.sequence.map(s => s.stepId));
    schema.dependencies.forEach(dep => {
      if (!stepIds.has(dep.from)) {
        throw new Error(`Process ${schema.processId} dependency references non-existent step ${dep.from}`);
      }
      if (!stepIds.has(dep.to)) {
        throw new Error(`Process ${schema.processId} dependency references non-existent step ${dep.to}`);
      }
    });
    
    // Timing must be explicit
    if (!schema.timing) {
      throw new Error(`Process ${schema.processId} missing explicit timing (AICS-001 Section 6.3.4)`);
    }
    
    // Requirements must be explicit
    if (!schema.requirements) {
      throw new Error(`Process ${schema.processId} missing explicit requirements (AICS-001 Section 6.3.4)`);
    }
  }

  /**
   * Validate schema structure
   * 
   * @param schema - Schema to validate
   */
  private validateSchema(schema: ProcessSchema): void {
    // Process ID must be unique and explicit
    if (!schema.processId || schema.processId.trim() === '') {
      throw new Error('Process schema must have explicit processId (AICS-001 Section 6.3.4)');
    }
    
    // Process name must be explicit
    if (!schema.name || schema.name.trim() === '') {
      throw new Error('Process schema must have explicit name (AICS-001 Section 6.3.4)');
    }
    
    // Sequence must be defined and non-empty
    if (!schema.sequence || schema.sequence.length === 0) {
      throw new Error('Process schema must have explicit sequence (AICS-001 Section 6.3.4)');
    }
    
    // Step IDs must be unique
    const stepIds = new Set(schema.sequence.map(s => s.stepId));
    if (stepIds.size !== schema.sequence.length) {
      throw new Error('Process schema contains duplicate step IDs');
    }
    
    // Step orders must be unique
    const stepOrders = new Set(schema.sequence.map(s => s.order));
    if (stepOrders.size !== schema.sequence.length) {
      throw new Error('Process schema contains duplicate step orders (AICS-001 Section 6.3.4: Order is authoritative)');
    }
  }

  /**
   * Initialize default validation rules
   * 
   * AICS-001 Section 6.3.4: Validation rules for processes
   */
  private initializeDefaultRules(): void {
    this.validationRules = [
      {
        ruleId: 'PROC-001',
        description: 'Process steps must have explicit order',
        deterministic: true,
        source: 'AICS-001',
        constraint: (process) => {
          return process.sequence.every(step => step.order !== undefined && step.order >= 0);
        },
      },
      {
        ruleId: 'PROC-002',
        description: 'Process dependencies must reference existing steps',
        deterministic: true,
        source: 'AICS-001',
        constraint: (process) => {
          const stepIds = new Set(process.sequence.map(s => s.stepId));
          return process.dependencies.every(dep => stepIds.has(dep.from) && stepIds.has(dep.to));
        },
      },
      {
        ruleId: 'PROC-003',
        description: 'Parallelism must be explicit for all steps',
        deterministic: true,
        source: 'AICS-001',
        constraint: (process) => {
          return process.sequence.every(step => step.parallelizable !== undefined);
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
let globalProcessTruthService: ProcessTruthService | null = null;

/**
 * Get global Process Truth Service instance
 * 
 * @returns Global service instance
 */
export function getProcessTruthService(): ProcessTruthService {
  if (!globalProcessTruthService) {
    globalProcessTruthService = new ProcessTruthService();
  }
  return globalProcessTruthService;
}

/**
 * Reset global Process Truth Service (mainly for testing)
 */
export function resetProcessTruthService(): void {
  globalProcessTruthService = new ProcessTruthService();
}


