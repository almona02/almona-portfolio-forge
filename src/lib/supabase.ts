// NOTE: This file has been slimmed; domain-specific helpers live under src/lib/data/* and
// pricing helpers under src/lib/pricing.ts. Remaining helpers here are legacy/general.
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
// IMPORTANT: Only use ANON_KEY in browser - never use service role key (VITE_SUPABASE_KEY)
// Service role keys are secret and will cause "Forbidden use of secret API key in browser" error
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Provide fallback values for development/production to prevent black screen
const fallbackUrl = 'https://placeholder.supabase.co'
const fallbackKey = 'placeholder-key'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Required variables:')
  console.error('  - VITE_SUPABASE_URL (your Supabase project URL)')
  console.error('  - VITE_SUPABASE_ANON_KEY (the anon/public key from Supabase Settings > API)')
  console.error('')
  console.error('⚠️ Using fallback configuration. Some features may not work correctly.')
  console.error('Please check your .env file and ensure VITE_SUPABASE_ANON_KEY is set to the PUBLIC anon key.')
}

// Validate key format (anon keys are JWTs that start with 'eyJ')
if (supabaseKey && !supabaseKey.startsWith('eyJ') && supabaseKey !== fallbackKey) {
  console.warn('⚠️ Warning: VITE_SUPABASE_ANON_KEY does not appear to be a valid anon key.')
  console.warn('Anon keys are JWT tokens that start with "eyJ".')
  console.warn('Make sure you are using the "anon" "public" key from Supabase Settings > API, not the service_role key.')
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
  },
  global: {
    headers: {
      'X-Client-Info': 'almona-industrial@2.0.0',
      // Ensure PostgREST sees an API key header for browser requests
      apikey: (supabaseKey || fallbackKey) as string,
    },
  },
  db: {
    schema: 'public' as const,
  },
  // Add connection pooling and timeout settings
  fetch: (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
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
export const handleAuthError = async (error: any) => {
  if (error?.message?.includes('refresh_token') || 
      error?.message?.includes('Invalid Refresh Token') ||
      error?.message?.includes('Refresh Token Not Found')) {
    console.warn('[Supabase] Invalid refresh token detected, clearing session');
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('[Supabase] Error during sign out:', signOutError);
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
export { getUserProfile, updateUserProfile } from './clients/profiles';

// Deprecated product/category helpers (moved). Re-export for backward compatibility.
export { getProducts, getProduct, getProductVariants } from './clients/products';
export { getCategories } from './clients/categories';

// Product reviews helper functions

// Deprecated warranty helpers (moved). Re-export for backward compatibility.
export {
  createWarrantyRegistration,
  confirmWarrantySale,
  validateWarranty,
  listMyWarranties,
  listWarranties,
} from './clients/warranties';
export type { ValidatedWarranty } from './clients/warranties';



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