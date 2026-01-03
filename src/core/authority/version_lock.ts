/**
 * @file version_lock.ts
 * @description Constitution Version Lock
 * 
 * Provides version information for the constitutional core.
 * 
 * Location: Core Authority Layer (constitutional, immutable)
 */

import versionLock from './version_lock.json';

export interface VersionLock {
  constitutionVersion: string;
  aics001Version: string;
  commitHash: string;
  timestamp: string;
  truthDomains: {
    geometry: { version: string; aics001: string };
    material: { version: string; aics001: string };
    machine: { version: string; aics001: string };
    process: { version: string; aics001: string };
    certification: { version: string; aics001: string };
  };
  separationManifest: {
    coreAuthorityLayer: string;
    consumptionLayer: string;
    principle: string;
  };
  signature: string;
}

export function getConstitutionVersion(): string {
  return versionLock.constitutionVersion;
}

export function getTruthDomainVersion(domain: 'geometry' | 'material' | 'machine' | 'process' | 'certification'): string {
  return versionLock.truthDomains[domain].version;
}

export function getVersionLock(): VersionLock {
  return versionLock as VersionLock;
}

