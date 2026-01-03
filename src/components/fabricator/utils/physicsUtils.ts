/**
 * Physics System Utilities
 * 
 * Handles graceful degradation when physics engine (Ammo.js) is unavailable.
 * Constitutional: Pure detection logic, no ML/AI.
 */

import { useMemo } from 'react';

export interface PhysicsStatus {
  enabled: boolean;
  error: string | null;
  fallbackMode: 'manual' | 'physics';
}

/**
 * Check if physics engine (Ammo.js) is available and working
 * 
 * @returns Physics status with graceful fallback
 */
export function usePhysicsStatus(): PhysicsStatus {
  const status = useMemo(() => {
    try {
      // Check if Ammo.js is available
      if (typeof window === 'undefined') {
        return {
          enabled: false,
          error: 'Server-side rendering - physics disabled',
          fallbackMode: 'manual' as const
        };
      }
      
      if (!(window as any).Ammo) {
        return {
          enabled: false,
          error: 'Ammo.js not loaded - using manual animation',
          fallbackMode: 'manual' as const
        };
      }
      
      // Try to initialize Ammo.js (if needed)
      // Note: Actual initialization happens in useWindowPhysics hook
      return {
        enabled: true,
        error: null,
        fallbackMode: 'physics' as const
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Physics initialization failed';
      return {
        enabled: false,
        error: errorMessage,
        fallbackMode: 'manual' as const
      };
    }
  }, []);
  
  return status;
}

