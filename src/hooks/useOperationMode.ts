/**
 * @file useOperationMode.ts
 * @description Hook to fetch and cache operation mode from Supabase.
 * Includes 5-minute cache, fallback logic, and proper error handling.
 */

import type { AuthorityState, OperationMode } from '@/lib/authority/AuthorityContext';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

const CACHE_KEY = 'almona_authority_state';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  state: AuthorityState;
  timestamp: number;
}

export const useOperationMode = (): AuthorityState & { 
  isLoading: boolean; 
  error: Error | null;
  refresh: () => Promise<void>;
} => {
  const [data, setData] = useState<AuthorityState>({
    mode: 'production',
    isLocked: false,
    policies: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMode = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Check Cache
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        try {
          const cached: CachedData = JSON.parse(cachedRaw);
          if (Date.now() - cached.timestamp < CACHE_TTL) {
            setData(cached.state);
            setIsLoading(false);
            return;
          }
        } catch {
          // Invalid cache, continue to fetch
        }
      }

      // 2. Get User Session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        // Guest / Logged out -> Sandbox (safe default)
        const sandboxState: AuthorityState = { 
          mode: 'sandbox', 
          isLocked: false, 
          policies: [] 
        };
        setData(sandboxState);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          state: sandboxState,
          timestamp: Date.now()
        }));
        setIsLoading(false);
        return;
      }

      // 3. Get Profile -> Workshop
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('workshop_id')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is OK
        throw profileError;
      }

      if (!profile?.workshop_id) {
        // No workshop attached -> Production (Safe default)
        const prodState: AuthorityState = {
          mode: 'production',
          isLocked: false,
          policies: ['basic_validation']
        };
        setData(prodState);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          state: prodState,
          timestamp: Date.now()
        }));
        setIsLoading(false);
        return;
      }

      // 4. Get Workshop Mode
      const { data: workshop, error: wsError } = await supabase
        .from('workshops')
        .select('id, operation_mode')
        .eq('id', profile.workshop_id)
        .single();

      if (wsError) throw wsError;

      const dbMode = (workshop?.operation_mode as OperationMode) || 'production';
      
      const newState: AuthorityState = {
        mode: dbMode,
        workshopId: workshop?.id,
        isLocked: dbMode === 'certified',
        policies: dbMode === 'certified' 
          ? Object.freeze(['no_overrides', 'audit_trail', 'strict_compliance'])
          : Object.freeze(['basic_validation'])
      };

      // 5. Update State & Cache
      setData(newState);
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        state: newState,
        timestamp: Date.now()
      }));

    } catch (err) {
      console.error('[useOperationMode] Fetch failed:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Fail Safe: Production (most restrictive safe default)
      const fallbackState: AuthorityState = {
        mode: 'production',
        isLocked: false,
        policies: ['basic_validation']
      };
      setData(fallbackState);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMode();

    // Listen for auth state changes to invalidate cache
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      localStorage.removeItem(CACHE_KEY);
      fetchMode();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchMode]);

  return { 
    ...data, 
    isLoading, 
    error,
    refresh: fetchMode
  };
};

