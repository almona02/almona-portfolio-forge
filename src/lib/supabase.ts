import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string

// Browser-only Supabase client configuration
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    // Disable realtime to avoid Node.js module issues
    params: {
      eventsPerSecond: 2,
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'almona-portfolio@1.0.0',
    },
  },
}

// Create a mock client if environment variables are missing
const createMockClient = () => {
  console.warn('Supabase environment variables not found. Using mock client.');
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.reject(new Error('Supabase not configured')),
      signUp: () => Promise.reject(new Error('Supabase not configured')),
      signOut: () => Promise.resolve({ error: null }),
      signInWithOAuth: () => Promise.reject(new Error('Supabase not configured')),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {} 
          } 
        } 
      }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      updateUser: () => Promise.reject(new Error('Supabase not configured')),
      resetPasswordForEmail: () => Promise.reject(new Error('Supabase not configured')),
      refreshSession: () => Promise.reject(new Error('Supabase not configured')),
    },
    from: () => ({
      select: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.reject(new Error('Supabase not configured')),
        download: () => Promise.reject(new Error('Supabase not configured')),
        remove: () => Promise.reject(new Error('Supabase not configured')),
        list: () => Promise.reject(new Error('Supabase not configured')),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    rpc: () => Promise.reject(new Error('Supabase not configured')),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => Promise.resolve('ok'),
    }),
    removeChannel: () => Promise.resolve('ok'),
    removeAllChannels: () => Promise.resolve([]),
    getChannels: () => [],
  };
};

// Validate environment variables and create client
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Supabase environment variables missing. Using mock client for development.');
    }
    return createMockClient();
  }

  try {
    return createClient(supabaseUrl, supabaseKey, supabaseOptions);
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return createMockClient();
  }
};

export const supabase = createSupabaseClient();

// Export types for better TypeScript support
export type { SupabaseClient } from '@supabase/supabase-js';
