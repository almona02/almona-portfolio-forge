/**
 * @file GeometryTruthService.ts
 * @description Geometry Truth Service - Operational implementation
 * 
 * AICS-001 Reference: Section 6.3.1 (Geometry Truth)
 * 
 * Operational service for Geometry Truth domain.
 * 
 * Key Principle: "Geometry is exact, not approximate" (AICS-001)
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import type {
    GeometryProvenance,
    GeometrySchema,
    GeometryTruth,
    GeometryValidationRule,
} from '../constitution/canonical_truth/geometry_truth';
import { BaseTruthService, type TruthVersion } from './BaseTruthService';

/**
 * Geometry Truth Service
 * 
 * Operational service for Geometry Truth domain.
 * 
 * AICS-001 Section 6.3.1:
 * - Geometry is exact, not approximate
 * - Units are explicit and immutable
 * - Derived geometry must reference source primitives
 */
export class GeometryTruthService extends BaseTruthService<GeometryTruth> {
  private validationRules: GeometryValidationRule[] = [];

  constructor() {
    super('geometry');
    this.initializeDefaultRules();
  }

  /**
   * Register geometry truth
   * 
   * Registers a new geometry truth entity with validation.
   * 
   * @param entityId - Geometry entity identifier
   * @param schema - Geometry schema
   * @param provenance - Provenance information
   * @param createdBy - Creator identifier
   * @returns Created truth version
   */
  registerGeometry(
    entityId: string,
    schema: GeometrySchema,
    provenance: GeometryProvenance,
    createdBy: string
  ): TruthVersion<GeometryTruth> {
    // Validate schema
    this.validateSchema(schema);
    
    // Create geometry truth
    const geometryTruth: GeometryTruth = {
      version: '1.0.0', // Will be set by registerVersion
      schema,
      validationRules: this.validationRules,
      provenance,
      units: schema.points?.[0]?.units || 'mm',
      precision: schema.points?.[0]?.precision || 0.01,
      aics001Reference: 'AICS-001 Section 6.3.1',
    };
    
    return this.registerVersion(entityId, geometryTruth, createdBy, 'Initial geometry registration');
  }

  /**
   * Get geometry schema
   * 
   * @param entityId - Geometry entity identifier
   * @param version - Optional version (defaults to current)
   * @returns Geometry schema or undefined
   */
  getSchema(entityId: string, version?: string): GeometrySchema | undefined {
    const truth = version
      ? this.getVersion(entityId, version)
      : this.getCurrent(entityId);
    
    return truth?.schema;
  }

  /**
   * Validate schema explicitness
   * 
   * AICS-001 Section 6.4: Explicitness - No hidden defaults
   * 
   * @param schema - Schema to validate
   */
  protected validateExplicitness(data: GeometryTruth): void {
    const schema = data.schema;
    
    // All points must have explicit units
    schema.points.forEach(point => {
      if (!point.units) {
        throw new Error(`Point ${point.id} missing explicit units (AICS-001 Section 6.3.1)`);
      }
      if (point.precision === undefined) {
        throw new Error(`Point ${point.id} missing explicit precision (AICS-001 Section 6.3.1)`);
      }
    });
    
    // All edges must reference existing points
    schema.edges.forEach(edge => {
      if (!schema.points.find(p => p.id === edge.start)) {
        throw new Error(`Edge ${edge.id} references non-existent point ${edge.start}`);
      }
      if (!schema.points.find(p => p.id === edge.end)) {
        throw new Error(`Edge ${edge.id} references non-existent point ${edge.end}`);
      }
    });
    
    // All faces must reference existing edges
    schema.faces.forEach(face => {
      face.edges.forEach(edgeId => {
        if (!schema.edges.find(e => e.id === edgeId)) {
          throw new Error(`Face ${face.id} references non-existent edge ${edgeId}`);
        }
      });
    });
  }

  /**
   * Validate schema structure
   * 
   * @param schema - Schema to validate
   */
  private validateSchema(schema: GeometrySchema): void {
    // Ensure schema is not empty
    if (!schema.points || schema.points.length === 0) {
      throw new Error('Geometry schema must contain at least one point (AICS-001 Section 6.3.1)');
    }
    
    // Validate point uniqueness
    const pointIds = new Set(schema.points.map(p => p.id));
    if (pointIds.size !== schema.points.length) {
      throw new Error('Geometry schema contains duplicate point IDs');
    }
    
    // Validate edge uniqueness
    if (schema.edges) {
      const edgeIds = new Set(schema.edges.map(e => e.id));
      if (edgeIds.size !== schema.edges.length) {
        throw new Error('Geometry schema contains duplicate edge IDs');
      }
    }
    
    // Validate face uniqueness
    if (schema.faces) {
      const faceIds = new Set(schema.faces.map(f => f.id));
      if (faceIds.size !== schema.faces.length) {
        throw new Error('Geometry schema contains duplicate face IDs');
      }
    }
  }

  /**
   * Initialize default validation rules
   * 
   * AICS-001 Section 6.3.1: Validation rules for geometry
   */
  private initializeDefaultRules(): void {
    this.validationRules = [
      {
        ruleId: 'GEOM-001',
        description: 'All points must have explicit units',
        deterministic: true,
        source: 'AICS-001',
        validationFn: (schema) => {
          return schema.points.every(p => p.units !== undefined);
        },
      },
      {
        ruleId: 'GEOM-002',
        description: 'All edges must reference existing points',
        deterministic: true,
        source: 'AICS-001',
        validationFn: (schema) => {
          const pointIds = new Set(schema.points.map(p => p.id));
          return schema.edges.every(e => pointIds.has(e.start) && pointIds.has(e.end));
        },
      },
      {
        ruleId: 'GEOM-003',
        description: 'All faces must reference existing edges',
        deterministic: true,
        source: 'AICS-001',
        validationFn: (schema) => {
          const edgeIds = new Set(schema.edges.map(e => e.id));
          return schema.faces.every(f => f.edges.every(eid => edgeIds.has(eid)));
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
let globalGeometryTruthService: GeometryTruthService | null = null;

/**
 * Get global Geometry Truth Service instance
 * 
 * @returns Global service instance
 */
export function getGeometryTruthService(): GeometryTruthService {
  if (!globalGeometryTruthService) {
    globalGeometryTruthService = new GeometryTruthService();
  }
  return globalGeometryTruthService;
}

/**
 * Reset global Geometry Truth Service (mainly for testing)
 */
export function resetGeometryTruthService(): void {
  globalGeometryTruthService = new GeometryTruthService();
}


