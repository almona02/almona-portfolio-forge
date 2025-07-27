import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Create a mock client if environment variables are missing
const createMockClient = () => {
  console.warn('Supabase environment variables not found. Using mock client.');
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      signInWithPassword: () => Promise.reject(new Error('Supabase not configured')),
      signUp: () => Promise.reject(new Error('Supabase not configured')),
      signOut: () => Promise.resolve(),
      signInWithOAuth: () => Promise.reject(new Error('Supabase not configured')),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ data: null, error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null })
    })
  };
};

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : createMockClient();
