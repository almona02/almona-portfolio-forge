// NOTE: This file has been slimmed; domain-specific helpers live under src/lib/data/* and
// pricing helpers under src/lib/pricing.ts. Remaining helpers here are legacy/general.
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = (import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Enhanced Supabase client configuration for e-commerce
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce' as const,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'almona-industrial@2.0.0',
    },
  },
}

// Create Supabase client with proper typing
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, supabaseOptions)

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