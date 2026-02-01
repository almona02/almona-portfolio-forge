/**
 * @file CertificationTruthService.ts
 * @description Certification Truth Service - Operational implementation
 * 
 * AICS-001 Reference: Section 6.3.5 (Certification Truth)
 * 
 * Operational service for Certification Truth domain.
 * 
 * Key Principles:
 * - External authority supersedes internal preference
 * - Certification scope must be explicit
 * - Jurisdiction is part of truth
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type {
    CertificationProvenance,
    CertificationSchema,
    CertificationTruth,
    CertificationValidationRule,
} from '../constitution/canonical_truth/certification_truth';
import { BaseTruthService, type TruthVersion } from './BaseTruthService';

/**
 * Certification Truth Service
 * 
 * Operational service for Certification Truth domain.
 * 
 * AICS-001 Section 6.3.5:
 * - External authority supersedes internal preference
 * - Certification scope must be explicit
 * - Jurisdiction is part of truth
 */
export class CertificationTruthService extends BaseTruthService<CertificationTruth> {
  private validationRules: CertificationValidationRule[] = [];

  constructor() {
    super('certification');
    this.initializeDefaultRules();
  }

  /**
   * Register certification truth
   * 
   * Registers a new certification truth entity with validation.
   * 
   * @param entityId - Certification entity identifier
   * @param schema - Certification schema
   * @param provenance - Provenance information
   * @param createdBy - Creator identifier
   * @returns Created truth version
   */
  registerCertification(
    entityId: string,
    schema: CertificationSchema,
    provenance: CertificationProvenance,
    createdBy: string
  ): TruthVersion<CertificationTruth> {
    // Validate schema
    this.validateSchema(schema);
    
    // Create certification truth
    const certificationTruth: CertificationTruth = {
      version: '1.0.0', // Will be set by registerVersion
      schema,
      validationRules: this.validationRules,
      provenance,
      aics001Reference: 'AICS-001 Section 6.3.5',
    };
    
    return this.registerVersion(entityId, certificationTruth, createdBy, 'Initial certification registration');
  }

  /**
   * Get certification schema
   * 
   * @param entityId - Certification entity identifier
   * @param version - Optional version (defaults to current)
   * @returns Certification schema or undefined
   */
  getSchema(entityId: string, version?: string): CertificationSchema | undefined {
    const truth = version
      ? this.getVersion(entityId, version)
      : this.getCurrent(entityId);
    
    return truth?.schema;
  }

  /**
   * Validate certification explicitness
   * 
   * AICS-001 Section 6.4: Explicitness - No hidden defaults
   * AICS-001 Section 6.3.5: Certification scope must be explicit, jurisdiction is part of truth
   * 
   * @param data - Certification truth to validate
   */
  protected validateExplicitness(data: CertificationTruth): void {
    const schema = data.schema;
    
    // Jurisdiction must be explicit (AICS-001 Section 6.3.5)
    if (!schema.jurisdiction || schema.jurisdiction.length === 0) {
      throw new Error(`Certification ${schema.certificationId} missing explicit jurisdiction (AICS-001 Section 6.3.5)`);
    }
    
    // Requirements must be explicit
    schema.requirements.forEach(req => {
      if (!req.description || req.description.trim() === '') {
        throw new Error(`Certification ${schema.certificationId} requirement ${req.requirementId} missing explicit description (AICS-001 Section 6.3.5)`);
      }
      
      // Mandatory flag must be explicit
      if (req.mandatory === undefined || req.mandatory === null) {
        throw new Error(`Certification ${schema.certificationId} requirement ${req.requirementId} missing explicit mandatory flag (AICS-001 Section 6.3.5)`);
      }
      
      // Standard must be explicit if provided
      if (req.standard !== undefined && (!req.standard || req.standard.trim() === '')) {
        throw new Error(`Certification ${schema.certificationId} requirement ${req.requirementId} has empty standard reference (AICS-001 Section 6.3.5)`);
      }
    });
    
    // Validity must be explicit
    if (!schema.validity) {
      throw new Error(`Certification ${schema.certificationId} missing explicit validity (AICS-001 Section 6.3.5)`);
    }
    
    if (!schema.validity.startDate) {
      throw new Error(`Certification ${schema.certificationId} missing explicit validity startDate (AICS-001 Section 6.3.5)`);
    }
    
    // Renewable flag must be explicit
    if (schema.validity.renewable === undefined || schema.validity.renewable === null) {
      throw new Error(`Certification ${schema.certificationId} missing explicit validity renewable flag (AICS-001 Section 6.3.5)`);
    }
  }

  /**
   * Validate schema structure
   * 
   * @param schema - Schema to validate
   */
  private validateSchema(schema: CertificationSchema): void {
    // Certification ID must be unique and explicit
    if (!schema.certificationId || schema.certificationId.trim() === '') {
      throw new Error('Certification schema must have explicit certificationId (AICS-001 Section 6.3.5)');
    }
    
    // Certification name must be explicit
    if (!schema.name || schema.name.trim() === '') {
      throw new Error('Certification schema must have explicit name (AICS-001 Section 6.3.5)');
    }
    
    // Certification type must be explicit
    if (!schema.type) {
      throw new Error('Certification schema must have explicit type (AICS-001 Section 6.3.5)');
    }
    
    // Requirements must be defined (can be empty array)
    if (!schema.requirements) {
      throw new Error('Certification schema must have explicit requirements array (AICS-001 Section 6.3.5)');
    }
    
    // Requirement IDs must be unique
    const reqIds = new Set(schema.requirements.map(r => r.requirementId));
    if (reqIds.size !== schema.requirements.length) {
      throw new Error('Certification schema contains duplicate requirement IDs');
    }
  }

  /**
   * Initialize default validation rules
   * 
   * AICS-001 Section 6.3.5: Validation rules for certifications
   */
  private initializeDefaultRules(): void {
    this.validationRules = [
      {
        ruleId: 'CERT-001',
        description: 'Certification jurisdiction must be explicit',
        deterministic: true,
        source: 'AICS-001',
        constraint: (certification, _input) => {
          return certification.jurisdiction.length > 0;
        },
      },
      {
        ruleId: 'CERT-002',
        description: 'Certification validity must be explicit',
        deterministic: true,
        source: 'AICS-001',
        constraint: (certification, _input) => {
          return certification.validity.startDate !== undefined;
        },
      },
      {
        ruleId: 'CERT-003',
        description: 'All certification requirements must have explicit mandatory flag',
        deterministic: true,
        source: 'AICS-001',
        constraint: (certification, _input) => {
          return certification.requirements.every(req => req.mandatory !== undefined);
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
let globalCertificationTruthService: CertificationTruthService | null = null;

/**
 * Get global Certification Truth Service instance
 * 
 * @returns Global service instance
 */
export function getCertificationTruthService(): CertificationTruthService {
  if (!globalCertificationTruthService) {
    globalCertificationTruthService = new CertificationTruthService();
  }
  return globalCertificationTruthService;
}

/**
 * Reset global Certification Truth Service (mainly for testing)
 */
export function resetCertificationTruthService(): void {
  globalCertificationTruthService = new CertificationTruthService();
}


