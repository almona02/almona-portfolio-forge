import type { SystemPack } from '@/types/fabricator';

const STORAGE_KEY = 'almona_custom_systems_v2';

export type StoredSystemPack = SystemPack & {
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  isArchived?: boolean;
};

const migrate = (systems: any[]): StoredSystemPack[] => {
  if (!Array.isArray(systems)) return [];
  return systems.map((s) => ({
    ...s,
    version: s.version || 2,
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString(),
  }));
};

export const loadCustomSystems = (): StoredSystemPack[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return migrate(parsed);
  } catch (e) {
    console.error('Failed to load custom systems:', e);
    return [];
  }
};

export const saveCustomSystems = (systems: StoredSystemPack[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
  } catch (e) {
    console.error('Failed to save custom systems:', e);
  }
};

export const addCustomSystem = (system: SystemPack): StoredSystemPack[] => {
  const existing = loadCustomSystems();
  const newSystem: StoredSystemPack = {
    ...system,
    meta: {
      ...system.meta,
      id: system.meta.id || `custom_${Date.now()}`,
    },
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = [...existing.filter((s) => s.meta.id !== newSystem.meta.id), newSystem];
  saveCustomSystems(updated);
  return updated;
};

export const deleteCustomSystem = (id: string): StoredSystemPack[] => {
  const existing = loadCustomSystems();
  const updated = existing.filter((s) => s.meta.id !== id);
  saveCustomSystems(updated);
  return updated;
};

export const archiveCustomSystem = (id: string): StoredSystemPack[] => {
  const existing = loadCustomSystems();
  const updated = existing.map((s) =>
    s.meta.id === id ? { ...s, isArchived: true, updatedAt: new Date().toISOString() } : s,
  );
  saveCustomSystems(updated);
  return updated;
};

export const duplicateCustomSystem = (id: string): StoredSystemPack[] => {
  const existing = loadCustomSystems();
  const source = existing.find((s) => s.meta.id === id);
  if (!source) return existing;
  const copy: StoredSystemPack = {
    ...source,
    meta: {
      ...source.meta,
      id: `custom_${Date.now()}`,
      name: `${source.meta.name || 'Custom System'} (Copy)`,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const updated = [...existing, copy];
  saveCustomSystems(updated);
  return updated;
};

