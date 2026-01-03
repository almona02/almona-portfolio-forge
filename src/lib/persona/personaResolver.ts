/**
 * @file personaResolver.ts
 * @description Cached persona resolution service with explicit invalidation.
 * Resolves user persona from database roles with 5-minute TTL cache.
 */

import { supabase } from '@/lib/supabase';
import { detectPersona, getPersonaConfig } from './roleMapper';
import type { PersonaResolution } from './types';

const CACHE_KEY = 'almona_persona_resolution';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedResolution {
  resolution: PersonaResolution;
  timestamp: number;
  userId: string;
}

const cacheInvalidationListeners: Set<() => void> = new Set();

/**
 * Invalidates persona cache. Call on:
 * - Role update (profile.role changed)
 * - Workshop ownership change (workshop.owner_id changed)
 * - User logout
 * - Auth refresh
 */
export function invalidatePersonaCache(userId?: string): void {
  if (userId) {
    // Invalidate specific user's cache
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedResolution = JSON.parse(cached);
      if (parsed.userId === userId) {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  } else {
    // Invalidate all caches
    localStorage.removeItem(CACHE_KEY);
  }

  // Notify listeners
  cacheInvalidationListeners.forEach(listener => listener());
}

/**
 * Subscribe to cache invalidation events.
 */
export function onPersonaCacheInvalidate(callback: () => void): () => void {
  cacheInvalidationListeners.add(callback);
  return () => {
    cacheInvalidationListeners.delete(callback);
  };
}

/**
 * Resolves persona for current user with caching.
 */
export async function resolvePersona(userId: string): Promise<PersonaResolution> {
  // 1. Check cache
  const cachedRaw = localStorage.getItem(CACHE_KEY);
  if (cachedRaw) {
    try {
      const cached: CachedResolution = JSON.parse(cachedRaw);
      if (cached.userId === userId && Date.now() - cached.timestamp < CACHE_TTL) {
        return {
          ...cached.resolution,
          source: 'cache',
        };
      }
    } catch {
      // Invalid cache, continue to fetch
    }
  }

  // 2. Fetch from database (parallel queries)
  const [profileResult, workshopsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, workshop_id')
      .eq('id', userId)
      .single(),
    supabase
      .from('workshops')
      .select('id, owner_id')
      .eq('owner_id', userId),
  ]);

  if (profileResult.error) {
    console.error('Persona resolution error (profile):', profileResult.error);
    // Fallback to operator
    const operatorConfig = getPersonaConfig('operator');
    return {
      persona: 'operator',
      visibleTabs: [...operatorConfig.visibleTabs],
      permissions: { ...operatorConfig.permissions },
      confidence: 'low',
      source: 'fallback',
    };
  }

  const profile = profileResult.data;
  if (!profile) {
    const operatorConfig = getPersonaConfig('operator');
    return {
      persona: 'operator',
      visibleTabs: [...operatorConfig.visibleTabs],
      permissions: { ...operatorConfig.permissions },
      confidence: 'low',
      source: 'fallback',
    };
  }
  const dbRole = (profile as { id: string; role: string | null; workshop_id: string | null }).role || null;

  // Check workshop ownership
  const hasWorkshopOwnership = workshopsResult.data && workshopsResult.data.length > 0;

  // 3. Detect persona
  const persona = detectPersona(dbRole, hasWorkshopOwnership);
  const config = getPersonaConfig(persona);

  const resolution: PersonaResolution = {
    persona,
    visibleTabs: [...config.visibleTabs],
    permissions: { ...config.permissions },
    confidence: 'high',
    source: 'database',
  };

  // 4. Cache result
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      resolution,
      timestamp: Date.now(),
      userId,
    } as CachedResolution)
  );

  return resolution;
}












