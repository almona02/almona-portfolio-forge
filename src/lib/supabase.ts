// NOTE: This file has been slimmed; domain-specific helpers live under src/lib/data/* and
// pricing helpers under src/lib/pricing.ts. Remaining helpers here are legacy/general.
import { Database } from '@/types/database'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Browser/public only: new publishable key (sb_publishable_...) or legacy anon JWT.
// Never use a secret / service_role key here (sb_secret_... or JWT role=service_role).
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Provide fallback values for development/production to prevent black screen
const fallbackUrl = 'https://placeholder.supabase.co'
const fallbackKey = 'placeholder-key'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Required variables:')
  console.error('  - VITE_SUPABASE_URL (your Supabase project URL)')
  console.error('  - VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY (publishable or legacy anon)')
  console.error('')
  console.error('⚠️ Using fallback configuration. Some features may not work correctly.')
  console.error('Please check your .env file and ensure the public publishable/anon key is set.')
}

const isPublicSupabaseKey =
  !supabaseKey ||
  supabaseKey === fallbackKey ||
  supabaseKey.startsWith('sb_publishable_') ||
  supabaseKey.startsWith('eyJ')

if (supabaseKey && !isPublicSupabaseKey) {
  console.warn('⚠️ Warning: browser Supabase key is not a publishable (sb_publishable_) or legacy anon JWT.')
  console.warn('Do not use sb_secret_ or service_role keys in Vite public env.')
}

// Enhanced Supabase client configuration for e-commerce
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce' as const,
    debug: false, // Disable debug logging to reduce console noise
    // Reduce refresh frequency to improve performance
    refreshTokenRetryInterval: 2000, // 2 seconds instead of default 1 second
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    // WebSocket reconnection is handled automatically by Supabase client
    // Transient connection errors are expected and will retry automatically
  },
  global: {
    headers: {
      'X-Client-Info': 'almona-industrial@2.0.0',
      // Ensure PostgREST sees an API key header for browser requests
      apikey: (supabaseKey || fallbackKey),
    },
  },
  db: {
    schema: 'public' as const,
  },
  // Publishable/secret keys are not JWTs. Auth rejects Authorization: Bearer sb_*.
  // Keep apikey set; only send Authorization when it is a real user session JWT.
  fetch: (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers)
    const authorization = headers.get('Authorization')
    if (authorization && /^Bearer sb_(publishable|secret)_/i.test(authorization)) {
      headers.delete('Authorization')
    }
    if (supabaseKey && !headers.has('apikey')) {
      headers.set('apikey', supabaseKey)
    }
    return fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
      signal: options.signal ?? AbortSignal.timeout(10000),
    });
  },
}

// Create Supabase client with proper typing and fallback values
export const supabase = createClient<Database>(
  supabaseUrl || fallbackUrl, 
  supabaseKey || fallbackKey, 
  supabaseOptions
)

// Utility function to handle auth errors and clear invalid sessions
// Utility function to handle auth errors and clear invalid sessions
export const handleAuthError = async (error: any) => {
  if (error?.message?.includes('refresh_token') || 
      error?.message?.includes('Invalid Refresh Token') ||
      error?.message?.includes('Refresh Token Not Found')) {
    console.warn('[Supabase] Invalid refresh token detected, clearing session');
    try {
      // Force non-blocking signout if it takes too long (2s timeout)
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Sign out timeout')), 2000));
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (signOutError) {
      console.warn('[Supabase] Error during sign out (or timeout), clearing local storage manually:', signOutError);
      // Fallback: Clear local storage manually to unblock user
      // Iterate keys to find supabase auth tokens (usually start with sb- or supabase-)
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
            localStorage.removeItem(key);
        }
      });
    }
  }
}

// Performance monitoring for Supabase calls
export const monitorSupabasePerformance = (operation: string, startTime: number) => {
  const duration = Date.now() - startTime;
  // Slightly stricter threshold for profile reads, looser for everything else
  const isProfileRead = operation.includes('getProfile');
  const thresholdMs = isProfileRead ? 2000 : 3000;

  // Only log detailed performance warnings in development to avoid noisy production consoles
  if (import.meta.env.DEV && duration > thresholdMs) {
    console.warn(`[Supabase] Slow operation detected: ${operation} took ${duration}ms`);
  }
}

// Export types for better TypeScript support
export type { SupabaseClient } from '@supabase/supabase-js'
export type { Database }

// Helper functions for common operations
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Deprecated (moved to domain clients). Re-export for backward compatibility.
export { getUserProfile, updateUserProfile } from './clients/profiles'

// Deprecated product/category helpers (moved). Re-export for backward compatibility.
export { getCategories } from './clients/categories'
export { getProduct, getProductVariants, getProducts } from './clients/products'

// Product reviews helper functions

// Deprecated warranty helpers (moved). Re-export for backward compatibility.
export {
    confirmWarrantySale, createWarrantyRegistration, listMyWarranties,
    listWarranties, validateWarranty
} from './clients/warranties'
export type { ValidatedWarranty } from './clients/warranties'



// Pricing helpers have been moved to src/lib/pricing.ts

// Storage helper functions
export const uploadFileWithProgress = async (
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; upsert?: boolean },
  onProgress?: (progress: number) => void
) => {
  // NOTE: supabase-js storage upload currently does not expose granular progress events in the public API.
  // For now we perform a direct upload; onProgress is unused. Implement resumable/chunked upload later if needed.
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      ...(options || {}),
    });

  if (error) throw error;
  // No granular progress available; report completion
  if (onProgress) {
    try { onProgress(100); } catch { /* no-op */ }
  }
  return data;
};


export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

export const deleteFile = async (bucket: string, paths: string[]) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove(paths)
  
  if (error) throw error
  return data
}