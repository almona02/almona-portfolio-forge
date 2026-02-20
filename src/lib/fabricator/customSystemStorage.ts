import type { SystemPack } from '@/types/fabricator';
import {
    archiveSystemPackInSupabase,
    deleteSystemPackFromSupabase,
    loadCustomSystemsFromSupabase,
    saveSystemPackToSupabase,
} from './systemPackSupabase';

const STORAGE_KEY = 'almona_custom_systems_v2';
const USE_SUPABASE = true; // Toggle to enable/disable Supabase sync

export type StoredSystemPack = SystemPack & {
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  isArchived?: boolean;
};

const migrate = (systems: unknown[]): StoredSystemPack[] => {
  if (!Array.isArray(systems)) return [];
  return systems.map((s) => {
    const sys = s as Record<string, unknown>;
    return {
    ...sys,
    version: sys.version || 2,
    createdAt: sys.createdAt || new Date().toISOString(),
    updatedAt: sys.updatedAt || new Date().toISOString(),
  };
  });
};

// Synchronous version (for backward compatibility)
export const loadCustomSystems = (): StoredSystemPack[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data) as unknown;
    return migrate(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    console.error('Failed to load custom systems:', e);
    return [];
  }
};

// Async version with Supabase sync
export const loadCustomSystemsAsync = async (userId?: string | null): Promise<StoredSystemPack[]> => {
  // Try Supabase first if enabled
  if (USE_SUPABASE && userId) {
    try {
      const supabaseSystems = await loadCustomSystemsFromSupabase(userId);
      if (supabaseSystems.length > 0) {
        // Also sync to localStorage as backup
        saveCustomSystems(supabaseSystems);
        return supabaseSystems;
      }
    } catch (e) {
      console.warn('Failed to load from Supabase, falling back to localStorage:', e);
    }
  }

  // Fallback to localStorage
  return loadCustomSystems();
};

export const saveCustomSystems = (systems: StoredSystemPack[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(systems));
  } catch (e) {
    console.error('Failed to save custom systems:', e);
  }
};

// Synchronous version (for backward compatibility)
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

// Async version with Supabase sync
export const addCustomSystemAsync = async (
  system: SystemPack,
  userId?: string | null
): Promise<StoredSystemPack[]> => {
  await Promise.resolve(); // Satisfy require-await; sync logic with fire-and-forget Supabase
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
  
  // Save to localStorage
  saveCustomSystems(updated);
  
  // Sync to Supabase if enabled (fire and forget)
  if (USE_SUPABASE && userId) {
    saveSystemPackToSupabase(newSystem, userId).catch((e) => {
      console.warn('Failed to sync to Supabase, saved to localStorage only:', e);
    });
  }
  
  return updated;
};

// Synchronous version (for backward compatibility)
export const deleteCustomSystem = (id: string): StoredSystemPack[] => {
  const existing = loadCustomSystems();
  const updated = existing.filter((s) => s.meta.id !== id);
  saveCustomSystems(updated);
  return updated;
};

// Async version with Supabase sync
export const deleteCustomSystemAsync = async (
  id: string,
  userId?: string | null
): Promise<StoredSystemPack[]> => {
  await Promise.resolve(); // Satisfy require-await; sync logic with fire-and-forget Supabase
  const existing = loadCustomSystems();
  const updated = existing.filter((s) => s.meta.id !== id);
  saveCustomSystems(updated);
  
  // Delete from Supabase if enabled (fire and forget)
  if (USE_SUPABASE && userId) {
    deleteSystemPackFromSupabase(id, userId).catch((e) => {
      console.warn('Failed to delete from Supabase:', e);
    });
  }
  
  return updated;
};

// Synchronous version (for backward compatibility)
export const archiveCustomSystem = (id: string): StoredSystemPack[] => {
  const existing = loadCustomSystems();
  const updated = existing.map((s) =>
    s.meta.id === id ? { ...s, isArchived: true, updatedAt: new Date().toISOString() } : s,
  );
  saveCustomSystems(updated);
  return updated;
};

// Async version with Supabase sync
export const archiveCustomSystemAsync = async (
  id: string,
  userId?: string | null
): Promise<StoredSystemPack[]> => {
  await Promise.resolve(); // Satisfy require-await; sync logic with fire-and-forget Supabase
  const existing = loadCustomSystems();
  const updated = existing.map((s) =>
    s.meta.id === id ? { ...s, isArchived: true, updatedAt: new Date().toISOString() } : s,
  );
  saveCustomSystems(updated);
  
  // Archive in Supabase if enabled (fire and forget)
  if (USE_SUPABASE && userId) {
    archiveSystemPackInSupabase(id, userId).catch((e) => {
      console.warn('Failed to archive in Supabase:', e);
    });
  }
  
  return updated;
};

// Synchronous version (for backward compatibility)
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

// Async version with Supabase sync
export const duplicateCustomSystemAsync = async (
  id: string,
  userId?: string | null
): Promise<StoredSystemPack[]> => {
  await Promise.resolve(); // Satisfy require-await; sync logic with fire-and-forget Supabase
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
  
  // Sync to Supabase if enabled (fire and forget)
  if (USE_SUPABASE && userId) {
    saveSystemPackToSupabase(copy, userId).catch((e) => {
      console.warn('Failed to sync duplicate to Supabase:', e);
    });
  }
  
  return updated;
};

