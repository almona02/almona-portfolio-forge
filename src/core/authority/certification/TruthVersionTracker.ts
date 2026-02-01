/**
 * @file TruthVersionTracker.ts
 * @description Truth Version Tracker - Track Canonical Truth Versions
 * 
 * AICS-001 Reference: Section 7.5 (Deterministic Replay Guarantee)
 * 
 * Tracks versions of canonical truth domains used in computations.
 * 
 * Key Principle: "Same inputs + same truth versions = same result"
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import {
    getCertificationTruthService,
    getGeometryTruthService,
    getMachineTruthService,
    getMaterialTruthService,
    getProcessTruthService,
} from '@/core/authority/canonical_truth';
import { getTruthDomainVersion } from '@/core/authority/version_lock';

/**
 * Truth Domain Identifier
 */
export type TruthDomain = 'geometry' | 'material' | 'machine' | 'process' | 'certification';

/**
 * Truth Version Record
 * 
 * Records the version of a truth domain used in a computation.
 */
export interface TruthVersionRecord {
  domain: TruthDomain;
  version: string;
  timestamp: Date;
  source?: string; // Optional source identifier
}

/**
 * Truth Version Set
 * 
 * Complete set of truth versions used in a computation.
 * 
 * AICS-001 Section 7.5: "Same inputs + same truth versions = same result"
 */
export interface TruthVersionSet {
  /**
   * Geometry Truth version
   * AICS-001 Section 6.3.1
   */
  geometry: string;
  
  /**
   * Material Truth version
   * AICS-001 Section 6.3.2
   */
  material: string;
  
  /**
   * Machine Truth version
   * AICS-001 Section 6.3.3
   */
  machine: string;
  
  /**
   * Process Truth version
   * AICS-001 Section 6.3.4
   */
  process: string;
  
  /**
   * Certification Truth version
   * AICS-001 Section 6.3.5
   */
  certification: string;
  
  /**
   * Timestamp when versions were captured
   */
  timestamp: Date;
  
  /**
   * Optional source identifiers
   */
  sources?: Partial<Record<TruthDomain, string>>;
}

/**
 * Truth Version Tracker
 * 
 * Tracks versions of canonical truth domains used in computations.
 * 
 * AICS-001 Section 7.5: Truth versions must be recorded for deterministic replay.
 */
export class TruthVersionTracker {
  /**
   * Get current truth version set
   * 
   * Retrieves current versions of all truth domains.
   * 
   * @returns Current truth version set
   */
  static getCurrentTruthVersions(): TruthVersionSet {
    // Default versions (in production, these would come from truth domain services)
    const defaultVersion = '1.0.0';
    
    return {
      geometry: this.getGeometryTruthVersion() || defaultVersion,
      material: this.getMaterialTruthVersion() || defaultVersion,
      machine: this.getMachineTruthVersion() || defaultVersion,
      process: this.getProcessTruthVersion() || defaultVersion,
      certification: this.getCertificationTruthVersion() || defaultVersion,
      timestamp: new Date(),
    };
  }

  /**
   * Get Geometry Truth version
   * 
   * AICS-001 Section 6.3.1
   * 
   * Uses GeometryTruthService for operational version tracking
   */
  private static getGeometryTruthVersion(): string | null {
    try {
      // Use GeometryTruthService for operational version tracking
      const service = getGeometryTruthService();
      return service.getDomainVersion();
    } catch {
      // Fallback: try version_lock for compatibility
      try {
        return getTruthDomainVersion('geometry');
      } catch {
        return null; // Will use default version
      }
    }
  }

  /**
   * Get Material Truth version
   * 
   * AICS-001 Section 6.3.2
   * 
   * Uses MaterialTruthService for operational version tracking
   */
  private static getMaterialTruthVersion(): string | null {
    try {
      // Use MaterialTruthService for operational version tracking
      const service = getMaterialTruthService();
      return service.getDomainVersion();
    } catch {
      // Fallback: try version_lock for compatibility
      try {
        return getTruthDomainVersion('material');
      } catch {
        return null; // Will use default version
      }
    }
  }

  /**
   * Get Machine Truth version
   * 
   * AICS-001 Section 6.3.3
   * 
   * Uses MachineTruthService for operational version tracking
   */
  private static getMachineTruthVersion(): string | null {
    try {
      // Use MachineTruthService for operational version tracking
      const service = getMachineTruthService();
      return service.getDomainVersion();
    } catch {
      // Fallback: try version_lock for compatibility
      try {
        return getTruthDomainVersion('machine');
      } catch {
        return null; // Will use default version
      }
    }
  }

  /**
   * Get Process Truth version
   * 
   * AICS-001 Section 6.3.4
   * 
   * Uses ProcessTruthService for operational version tracking
   */
  private static getProcessTruthVersion(): string | null {
    try {
      // Use ProcessTruthService for operational version tracking
      const service = getProcessTruthService();
      return service.getDomainVersion();
    } catch {
      // Fallback: try version_lock for compatibility
      try {
        return getTruthDomainVersion('process');
      } catch {
        return null; // Will use default version
      }
    }
  }

  /**
   * Get Certification Truth version
   * 
   * AICS-001 Section 6.3.5
   * 
   * Uses CertificationTruthService for operational version tracking
   */
  private static getCertificationTruthVersion(): string | null {
    try {
      // Use CertificationTruthService for operational version tracking
      const service = getCertificationTruthService();
      return service.getDomainVersion();
    } catch {
      // Fallback: try version_lock for compatibility
      try {
        return getTruthDomainVersion('certification');
      } catch {
        return null; // Will use default version
      }
    }
  }

  /**
   * Create truth version set from explicit versions
   * 
   * Creates a truth version set from explicitly provided versions.
   * 
   * @param versions - Partial truth version record
   * @returns Truth version set
   */
  static createTruthVersionSet(versions: Partial<Record<TruthDomain, string>>): TruthVersionSet {
    const current = this.getCurrentTruthVersions();
    
    return {
      geometry: versions.geometry || current.geometry,
      material: versions.material || current.material,
      machine: versions.machine || current.machine,
      process: versions.process || current.process,
      certification: versions.certification || current.certification,
      timestamp: new Date(),
      sources: versions,
    };
  }

  /**
   * Serialize truth version set to string
   * 
   * Creates canonical string representation for hashing.
   * 
   * @param versionSet - Truth version set
   * @returns Canonical string representation
   */
  static serializeTruthVersions(versionSet: TruthVersionSet): string {
    // Create canonical JSON representation (sorted keys)
    const canonical = {
      geometry: versionSet.geometry,
      material: versionSet.material,
      machine: versionSet.machine,
      process: versionSet.process,
      certification: versionSet.certification,
      // Exclude timestamp for deterministic hashing (versions are what matter)
    };
    
    return JSON.stringify(canonical);
  }

  /**
   * Compare truth version sets
   * 
   * Checks if two truth version sets are identical.
   * 
   * @param set1 - First truth version set
   * @param set2 - Second truth version set
   * @returns True if versions match
   */
  static compareTruthVersions(set1: TruthVersionSet, set2: TruthVersionSet): boolean {
    return (
      set1.geometry === set2.geometry &&
      set1.material === set2.material &&
      set1.machine === set2.machine &&
      set1.process === set2.process &&
      set1.certification === set2.certification
    );
  }
}

