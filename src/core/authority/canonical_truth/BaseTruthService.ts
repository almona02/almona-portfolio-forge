/**
 * @file BaseTruthService.ts
 * @description Base Truth Service - Common functionality for all truth domains
 * 
 * AICS-001 Reference: Section 6.4 (Truth Representation Rules)
 * 
 * Implements the five non-negotiable principles:
 * - Explicitness: No hidden defaults. No implicit assumptions.
 * - Immutability by Default: Truth is read-only unless explicitly versioned.
 * - Referential Integrity: All derived data must reference its source truth.
 * - Temporal Awareness: Truth exists in time; past truth is preserved.
 * - Human Readability: A qualified engineer must be able to understand it without execution.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

/**
 * Truth Domain Identifier
 */
export type TruthDomain = 'geometry' | 'material' | 'machine' | 'process' | 'certification';

/**
 * Referential Integrity Record
 * 
 * Tracks what references a truth entity (for derived data doctrine enforcement).
 */
export interface ReferenceRecord {
  /**
   * ID of the entity referencing this truth
   */
  entityId: string;
  
  /**
   * Type of referencing entity (e.g., "CutList", "Optimization", "Visualization")
   */
  entityType: string;
  
  /**
   * Domain of the referencing entity
   */
  domain: TruthDomain | 'derived';
  
  /**
   * Timestamp when reference was created
   */
  timestamp: Date;
  
  /**
   * Optional: Hash of the referencing entity for verification
   */
  entityHash?: string;
}

/**
 * Truth Version Record
 * 
 * Represents a versioned truth entity with full metadata.
 */
export interface TruthVersion<T> {
  /**
   * Version identifier (semantic versioning: "1.0.0")
   */
  version: string;
  
  /**
   * The truth data
   */
  data: T;
  
  /**
   * Timestamp when version was created
   */
  createdAt: Date;
  
  /**
   * User/system that created this version
   */
  createdBy: string;
  
  /**
   * Optional: Reason for version creation
   */
  changeReason?: string;
  
  /**
   * Optional: Hash of the data for integrity verification
   */
  dataHash?: string;
  
  /**
   * Whether this is the current active version
   */
  isCurrent: boolean;
}

/**
 * Base Truth Service
 * 
 * Abstract base class implementing common truth domain functionality.
 * 
 * AICS-001 Section 6.4: All truth domains must enforce the five principles.
 */
export abstract class BaseTruthService<T> {
  protected domain: TruthDomain;
  protected store: Map<string, TruthVersion<T>[]> = new Map();
  protected references: Map<string, ReferenceRecord[]> = new Map();

  constructor(domain: TruthDomain) {
    this.domain = domain;
  }

  /**
   * Get current version of a truth entity
   * 
   * AICS-001 Section 6.4: Temporal Awareness - Current version access
   * 
   * @param entityId - Entity identifier
   * @returns Current version or undefined
   */
  getCurrent(entityId: string): T | undefined {
    const versions = this.store.get(entityId);
    if (!versions || versions.length === 0) {
      return undefined;
    }
    
    const current = versions.find(v => v.isCurrent);
    return current?.data;
  }

  /**
   * Get specific version of a truth entity
   * 
   * AICS-001 Section 6.4: Temporal Awareness - Past truth is preserved
   * 
   * @param entityId - Entity identifier
   * @param version - Version identifier
   * @returns Version data or undefined
   */
  getVersion(entityId: string, version: string): T | undefined {
    const versions = this.store.get(entityId);
    if (!versions) {
      return undefined;
    }
    
    const versionRecord = versions.find(v => v.version === version);
    return versionRecord?.data;
  }

  /**
   * Get all versions of a truth entity
   * 
   * AICS-001 Section 6.4: Temporal Awareness - Version history access
   * 
   * @param entityId - Entity identifier
   * @returns Array of version records
   */
  getVersions(entityId: string): TruthVersion<T>[] {
    return this.store.get(entityId) || [];
  }

  /**
   * Register a new version (immutable creation)
   * 
   * AICS-001 Section 6.4: Immutability by Default - New versions create new records
   * 
   * @param entityId - Entity identifier
   * @param data - Truth data
   * @param createdBy - Creator identifier
   * @param changeReason - Optional reason for version creation
   * @returns Created version record
   */
  registerVersion(
    entityId: string,
    data: T,
    createdBy: string,
    changeReason?: string
  ): TruthVersion<T> {
    // Validate explicitness (no hidden defaults)
    this.validateExplicitness(data);
    
    // Create version record
    const versions = this.store.get(entityId) || [];
    const nextVersion = this.computeNextVersion(versions);
    
    // Mark previous versions as not current
    versions.forEach(v => { v.isCurrent = false; });
    
    const newVersion: TruthVersion<T> = {
      version: nextVersion,
      data: this.deepClone(data), // Immutability: clone data
      createdAt: new Date(),
      createdBy,
      changeReason,
      dataHash: this.computeHash(data),
      isCurrent: true,
    };
    
    versions.push(newVersion);
    this.store.set(entityId, versions);
    
    return newVersion;
  }

  /**
   * Register a reference to a truth entity
   * 
   * AICS-001 Section 6.4: Referential Integrity - Track derived data references
   * 
   * @param entityId - Truth entity identifier
   * @param reference - Reference record
   */
  registerReference(entityId: string, reference: ReferenceRecord): void {
    const references = this.references.get(entityId) || [];
    references.push(reference);
    this.references.set(entityId, references);
  }

  /**
   * Get all references to a truth entity
   * 
   * AICS-001 Section 6.4: Referential Integrity - Query what references this truth
   * 
   * @param entityId - Truth entity identifier
   * @returns Array of reference records
   */
  getReferences(entityId: string): ReferenceRecord[] {
    return this.references.get(entityId) || [];
  }

  /**
   * Validate that data is explicit (no hidden defaults)
   * 
   * AICS-001 Section 6.4: Explicitness - No hidden defaults, no implicit assumptions
   * 
   * @param data - Data to validate
   * @throws Error if data is not explicit
   */
  protected abstract validateExplicitness(data: T): void;

  /**
   * Serialize data for human readability
   * 
   * AICS-001 Section 6.4: Human Readability - Engineer must understand without execution
   * 
   * @param data - Data to serialize
   * @returns Human-readable string representation
   */
  serialize(data: T): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Deserialize data from human-readable format
   * 
   * @param serialized - Serialized data
   * @returns Deserialized data
   */
  deserialize(serialized: string): T {
    return JSON.parse(serialized) as T;
  }

  /**
   * Compute next version number
   * 
   * Uses semantic versioning (major.minor.patch)
   * 
   * @param versions - Existing versions
   * @returns Next version string
   */
  protected computeNextVersion(versions: TruthVersion<T>[]): string {
    if (versions.length === 0) {
      return '1.0.0';
    }
    
    // Get latest version
    const latest = versions[versions.length - 1];
    const [major, minor, patch] = latest.version.split('.').map(Number);
    
    // Increment patch version (can be overridden for major/minor)
    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Deep clone data for immutability
   * 
   * @param data - Data to clone
   * @returns Cloned data
   */
  protected deepClone(data: T): T {
    return JSON.parse(JSON.stringify(data)) as T;
  }

  /**
   * Compute hash of data for integrity verification
   * 
   * @param data - Data to hash
   * @returns Hash string
   */
  protected computeHash(data: T): string {
    const serialized = JSON.stringify(data);
    // Simple hash (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64);
  }

  /**
   * Get domain identifier
   * 
   * @returns Domain identifier
   */
  getDomain(): TruthDomain {
    return this.domain;
  }

  /**
   * Get domain-level version
   * 
   * Returns a version string representing the current state of the entire domain.
   * Used by TruthVersionTracker for deterministic replay.
   * 
   * AICS-001 Section 7.5: Domain versions must be deterministic and reflect domain state.
   * 
   * Implementation: Returns the highest version across all entities in the domain,
   * or '1.0.0' if the domain is empty. This ensures deterministic versioning.
   * 
   * @returns Domain version string (semantic versioning)
   */
  getDomainVersion(): string {
    // If domain is empty, return default version
    if (this.store.size === 0) {
      return '1.0.0';
    }
    
    // Find the highest version across all entities
    let maxVersion = '0.0.0';
    
    this.store.forEach((versions) => {
      versions.forEach((versionRecord) => {
        if (this.compareVersions(versionRecord.version, maxVersion) > 0) {
          maxVersion = versionRecord.version;
        }
      });
    });
    
    // If no versions found, return default
    return maxVersion === '0.0.0' ? '1.0.0' : maxVersion;
  }

  /**
   * Compare two semantic versions
   * 
   * @param v1 - First version
   * @param v2 - Second version
   * @returns Positive if v1 > v2, negative if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    // Ensure both have 3 parts (major.minor.patch)
    while (parts1.length < 3) parts1.push(0);
    while (parts2.length < 3) parts2.push(0);
    
    // Compare major, minor, patch
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    
    return 0;
  }

  /**
   * Clear all data (mainly for testing)
   */
  clear(): void {
    this.store.clear();
    this.references.clear();
  }
}

