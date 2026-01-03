// Domain: Profiles (strict typing enabled)
import type { Database, SectorType, UserRole } from '@/types/database';
import { z } from 'zod';
import { monitorSupabasePerformance } from '../supabase';
import { table } from './clientCore';

const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  postal_code: z.string().optional(),
  country: z.string().min(1),
  governorate: z.string().optional(),
});

const preferencesSchema = z.object({
  language: z.enum(['ar','en']),
  currency: z.string(),
  notifications: z.object({ email: z.boolean(), sms: z.boolean(), push: z.boolean() }),
  theme: z.enum(['light','dark','auto'])
});

export const profileUpdateSchema = z.object({
  username: z.string().min(3).max(32).optional().nullable(),
  full_name: z.string().min(2).max(120).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  company_name: z.string().max(120).optional().nullable(),
  phone: z.string().regex(/^[0-9+\-()\s]{6,20}$/).optional().nullable(),
  sector: z.custom<SectorType>().optional().nullable(),
  workshop_location: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  address: addressSchema.optional().nullable(),
  tax_number: z.string().optional().nullable(),
  commercial_register: z.string().optional().nullable(),
  role: z.custom<UserRole>().optional(),
  is_verified: z.boolean().optional(),
  preferences: preferencesSchema.optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type ProfileUpdateDB = Database['public']['Tables']['profiles']['Update'];

// Lightweight in-memory cache + in-flight de-duplication for profile lookups
const PROFILE_CACHE_TTL_MS = 60_000; // 60 seconds
const profileCache = new Map<string, { data: ProfileRow | null; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<ProfileRow | null>>();

// Public helpers for cache maintenance / debugging
export function invalidateProfileCache(id: string) {
  profileCache.delete(id);
}

export function getProfileCacheStats() {
  return {
    cachedProfiles: profileCache.size,
    activeRequests: inFlightRequests.size,
  };
}

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const now = Date.now();

  // Fast path: return from memory cache if still fresh
  const cached = profileCache.get(id);
  if (cached && now - cached.timestamp < PROFILE_CACHE_TTL_MS) {
    return cached.data;
  }

  // If there's already an in-flight request for this id, reuse it
  const existingRequest = inFlightRequests.get(id);
  if (existingRequest) {
    return existingRequest;
  }

  const startTime = now;

  const requestPromise = (async () => {
    try {
      const { data, error } = await table('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      // Monitor performance
      monitorSupabasePerformance(`getProfileById(${id})`, startTime);

      if (error) {
        // Handle RLS infinite recursion error specifically
        if (error.code === '42P17') {
          console.error(
            'RLS Policy Error: Infinite recursion detected in profiles table policy.',
            'This is a database configuration issue. Please check Supabase RLS policies.',
            { profileId: id, error }
          );
          // Cache the error to prevent retries for this profile
          profileCache.set(id, { data: null, timestamp: Date.now() });
          return null;
        }
        console.error('Profile fetch error:', error);
        throw error;
      }

      // Cache successful result (including null) for a short period
      profileCache.set(id, { data, timestamp: Date.now() });
      return data;
    } catch (error: any) {
      // Handle RLS infinite recursion error in catch block too
      if (error?.code === '42P17') {
        console.error(
          'RLS Policy Error: Infinite recursion detected in profiles table policy.',
          'This is a database configuration issue. Please check Supabase RLS policies.',
          { profileId: id, error }
        );
        // Cache the error to prevent retries for this profile
        profileCache.set(id, { data: null, timestamp: Date.now() });
        return null;
      }
      console.error('Failed to fetch profile:', id, error);
      throw error;
    } finally {
      inFlightRequests.delete(id);
    }
  })();

  inFlightRequests.set(id, requestPromise);
  return requestPromise;
}

export async function updateProfile(id: string, input: ProfileUpdateInput): Promise<ProfileRow> {
  const parsed = profileUpdateSchema.parse(input);
  const dbPayload: ProfileUpdateDB = { ...(parsed as any), updated_at: new Date().toISOString() };
  const { data, error } = await (table('profiles') as any)
    .update(dbPayload as any)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;

  // Ensure subsequent reads don’t serve stale data
  invalidateProfileCache(id);
  if (data) {
    profileCache.set(id, { data: data as ProfileRow, timestamp: Date.now() });
  }

  return data as ProfileRow;
}
