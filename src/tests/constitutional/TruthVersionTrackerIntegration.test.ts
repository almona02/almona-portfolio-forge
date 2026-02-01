/**
 * TruthVersionTracker Integration Tests
 * 
 * Tests integration of TruthVersionTracker with Truth Domain Services.
 * 
 * AICS-001 Reference: Section 7.5 (Deterministic Replay Guarantee)
 */

import { describe, expect, test, beforeEach } from 'vitest';
import { TruthVersionTracker } from '@/core/authority/certification/TruthVersionTracker';
import {
  getGeometryTruthService,
  resetGeometryTruthService,
} from '@/core/authority/canonical_truth/GeometryTruthService';
import {
  getMaterialTruthService,
  resetMaterialTruthService,
} from '@/core/authority/canonical_truth/MaterialTruthService';
import {
  getMachineTruthService,
  resetMachineTruthService,
} from '@/core/authority/canonical_truth/MachineTruthService';
import {
  getProcessTruthService,
  resetProcessTruthService,
} from '@/core/authority/canonical_truth/ProcessTruthService';
import {
  getCertificationTruthService,
  resetCertificationTruthService,
} from '@/core/authority/canonical_truth/CertificationTruthService';

describe('TruthVersionTracker Integration', () => {
  beforeEach(() => {
    // Reset all services to ensure clean state
    resetGeometryTruthService();
    resetMaterialTruthService();
    resetMachineTruthService();
    resetProcessTruthService();
    resetCertificationTruthService();
  });

  test('Returns default versions when domains are empty', () => {
    // When no entities are registered, domains should return default version
    const versions = TruthVersionTracker.getCurrentTruthVersions();
    
    expect(versions.geometry).toBe('1.0.0');
    expect(versions.material).toBe('1.0.0');
    expect(versions.machine).toBe('1.0.0');
    expect(versions.process).toBe('1.0.0');
    expect(versions.certification).toBe('1.0.0');
    expect(versions.timestamp).toBeInstanceOf(Date);
  });

  test('Returns domain versions from services', () => {
    // Get service instances
    const geometryService = getGeometryTruthService();
    const materialService = getMaterialTruthService();
    const machineService = getMachineTruthService();
    const processService = getProcessTruthService();
    const certificationService = getCertificationTruthService();
    
    // Verify services have getDomainVersion method
    expect(geometryService.getDomainVersion()).toBeDefined();
    expect(materialService.getDomainVersion()).toBeDefined();
    expect(machineService.getDomainVersion()).toBeDefined();
    expect(processService.getDomainVersion()).toBeDefined();
    expect(certificationService.getDomainVersion()).toBeDefined();
    
    // Verify domain versions are deterministic strings
    expect(typeof geometryService.getDomainVersion()).toBe('string');
    expect(typeof materialService.getDomainVersion()).toBe('string');
    expect(typeof machineService.getDomainVersion()).toBe('string');
    expect(typeof processService.getDomainVersion()).toBe('string');
    expect(typeof certificationService.getDomainVersion()).toBe('string');
    
    // Verify versions follow semantic versioning format (major.minor.patch)
    const versionPattern = /^\d+\.\d+\.\d+$/;
    expect(geometryService.getDomainVersion()).toMatch(versionPattern);
    expect(materialService.getDomainVersion()).toMatch(versionPattern);
    expect(machineService.getDomainVersion()).toMatch(versionPattern);
    expect(processService.getDomainVersion()).toMatch(versionPattern);
    expect(certificationService.getDomainVersion()).toMatch(versionPattern);
  });

  test('TruthVersionTracker.getCurrentTruthVersions() connects to services', () => {
    // Get versions from TruthVersionTracker
    const versions = TruthVersionTracker.getCurrentTruthVersions();
    
    // Get versions directly from services
    const geometryService = getGeometryTruthService();
    const materialService = getMaterialTruthService();
    const machineService = getMachineTruthService();
    const processService = getProcessTruthService();
    const certificationService = getCertificationTruthService();
    
    // Verify TruthVersionTracker returns versions from services
    expect(versions.geometry).toBe(geometryService.getDomainVersion());
    expect(versions.material).toBe(materialService.getDomainVersion());
    expect(versions.machine).toBe(machineService.getDomainVersion());
    expect(versions.process).toBe(processService.getDomainVersion());
    expect(versions.certification).toBe(certificationService.getDomainVersion());
  });

  test('Versions are deterministic (same state = same version)', () => {
    // Get versions twice in the same state
    const versions1 = TruthVersionTracker.getCurrentTruthVersions();
    const versions2 = TruthVersionTracker.getCurrentTruthVersions();
    
    // Versions should be identical (deterministic)
    expect(versions1.geometry).toBe(versions2.geometry);
    expect(versions1.material).toBe(versions2.material);
    expect(versions1.machine).toBe(versions2.machine);
    expect(versions1.process).toBe(versions2.process);
    expect(versions1.certification).toBe(versions2.certification);
  });

  test('Version format is consistent (semantic versioning)', () => {
    const versions = TruthVersionTracker.getCurrentTruthVersions();
    
    // Verify semantic versioning format (major.minor.patch)
    const versionPattern = /^\d+\.\d+\.\d+$/;
    
    expect(versions.geometry).toMatch(versionPattern);
    expect(versions.material).toMatch(versionPattern);
    expect(versions.machine).toMatch(versionPattern);
    expect(versions.process).toMatch(versionPattern);
    expect(versions.certification).toMatch(versionPattern);
  });

  test('Timestamp is current', () => {
    const before = new Date();
    const versions = TruthVersionTracker.getCurrentTruthVersions();
    const after = new Date();
    
    // Timestamp should be between before and after
    expect(versions.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(versions.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('Version comparison works correctly', () => {
    const versions1 = TruthVersionTracker.getCurrentTruthVersions();
    const versions2 = TruthVersionTracker.getCurrentTruthVersions();
    
    // Compare versions (should be identical)
    const areEqual = TruthVersionTracker.compareTruthVersions(versions1, versions2);
    expect(areEqual).toBe(true);
  });

  test('Version serialization works correctly', () => {
    const versions = TruthVersionTracker.getCurrentTruthVersions();
    const serialized = TruthVersionTracker.serializeTruthVersions(versions);
    
    // Serialized should be a string
    expect(typeof serialized).toBe('string');
    
    // Should be valid JSON
    const parsed = JSON.parse(serialized);
    expect(parsed.geometry).toBe(versions.geometry);
    expect(parsed.material).toBe(versions.material);
    expect(parsed.machine).toBe(versions.machine);
    expect(parsed.process).toBe(versions.process);
    expect(parsed.certification).toBe(versions.certification);
    
    // Should not include timestamp (for deterministic hashing)
    expect(parsed.timestamp).toBeUndefined();
  });
});


