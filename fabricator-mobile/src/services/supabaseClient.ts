/**
 * Supabase client configuration for mobile app
 * Uses the same Supabase project as the web app for real-time sync
 */
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase URL from environment or config
const supabaseUrl = 
  Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  Constants.expoConfig?.extra?.supabase?.url ||
  'https://placeholder.supabase.co';

// Get Supabase anon key from environment or config
const supabaseKey = 
  Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  Constants.expoConfig?.extra?.supabase?.anonKey ||
  'placeholder-key';

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn('⚠️ Missing Supabase environment variables!');
  console.warn('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Mobile-optimized Supabase client configuration
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile
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
      'X-Client-Info': 'fabricator-mobile@1.0.0',
      apikey: supabaseKey,
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, supabaseOptions);

/**
 * Helper to check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseKey !== 'placeholder-key';
};

