/**
 * @file usePersona.ts
 * @description React hook for persona detection with caching and error handling.
 */

import { useAuth } from '@/context/AuthContext';
import { invalidatePersonaCache, onPersonaCacheInvalidate, resolvePersona } from '@/lib/persona/personaResolver';
import { getPersonaConfig } from '@/lib/persona/roleMapper';
import type { PersonaResolution } from '@/lib/persona/types';
import { useCallback, useEffect, useState } from 'react';

export interface UsePersonaResult {
  persona: PersonaResolution['persona'];
  visibleTabs: string[];
  permissions: PersonaResolution['permissions'];
  isLoading: boolean;
  error: Error | null;
  confidence: PersonaResolution['confidence'];
  source: PersonaResolution['source'];
}

export const usePersona = (): UsePersonaResult => {
  const { user } = useAuth();
  const [resolution, setResolution] = useState<PersonaResolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPersona = useCallback(async () => {
    // TESTING OVERRIDE: Check for ?role= query param first
    const urlParams = new URLSearchParams(window.location.search);
    const roleOverride = urlParams.get('role') as PersonaResolution['persona'] | null;
    
    if (roleOverride && ['operator', 'fabricator', 'accountant', 'owner'].includes(roleOverride)) {
      console.log(`[PERSONA OVERRIDE] Using URL parameter: role=${roleOverride}`);
      const config = getPersonaConfig(roleOverride);
      setResolution({
        persona: roleOverride,
        visibleTabs: [...config.visibleTabs],
        permissions: { ...config.permissions },
        confidence: 'high',
        source: 'url_override', // New source type for testing
      });
      setIsLoading(false);
      return;
    }

    if (!user?.id) {
      // No user - default to operator
      const operatorConfig = getPersonaConfig('operator');
      setResolution({
        persona: 'operator',
        visibleTabs: [...operatorConfig.visibleTabs],
        permissions: { ...operatorConfig.permissions },
        confidence: 'low',
        source: 'fallback',
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await resolvePersona(user.id);
      setResolution(result);
      setError(null);
    } catch (err) {
      console.error('Persona resolution failed:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Fallback to operator
      const operatorConfig = getPersonaConfig('operator');
      setResolution({
        persona: 'operator',
        visibleTabs: [...operatorConfig.visibleTabs],
        permissions: { ...operatorConfig.permissions },
        confidence: 'low',
        source: 'fallback',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPersona();

    // Subscribe to cache invalidation
    const unsubscribe = onPersonaCacheInvalidate(() => {
      fetchPersona();
    });

    return unsubscribe;
  }, [fetchPersona]);

  // Expose invalidation function for manual refresh
  useEffect(() => {
    if (user?.id) {
      // Invalidate on logout
      const handleLogout = () => {
        invalidatePersonaCache(user.id);
      };

      // Listen for auth changes
      window.addEventListener('beforeunload', handleLogout);
      return () => {
        window.removeEventListener('beforeunload', handleLogout);
      };
    }
  }, [user?.id]);

  if (!resolution) {
    // Still loading or no resolution
    const operatorConfig = getPersonaConfig('operator');
    return {
      persona: 'operator',
      visibleTabs: [...operatorConfig.visibleTabs],
      permissions: { ...operatorConfig.permissions },
      isLoading,
      error,
      confidence: 'low',
      source: 'fallback',
    };
  }

  return {
    persona: resolution.persona,
    visibleTabs: resolution.visibleTabs,
    permissions: resolution.permissions,
    isLoading,
    error,
    confidence: resolution.confidence,
    source: resolution.source,
  };
};












