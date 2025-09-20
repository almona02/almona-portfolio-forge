// Core thin wrappers around the shared Supabase client with constrained table helpers.
// Incrementally reintroducing strict typing (this file has types ON).
import { supabase } from '../supabase';
import type { Database } from '@/types/database';

// Generic typed table accessor (narrowed) to avoid deep instantiation across whole DB.
export function table<K extends keyof Database['public']['Tables']>(name: K) {
  return supabase.from(name as string);
}

// RPC wrapper with constrained name + args mapping for known functions.
export function rpc<Name extends keyof Database['public']['Functions']>(
  fn: Name,
  args: Database['public']['Functions'][Name]['Args']
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).rpc(fn as string, args);
}
