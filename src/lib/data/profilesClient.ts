// Domain: Profiles (strict typing enabled)
import { z } from 'zod';
import type { Database, Address, SectorType, UserRole, UserPreferences } from '@/types/database';
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

export async function getProfileById(id: string): Promise<ProfileRow | null> {
  const { data, error } = await table('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
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
  return data as ProfileRow;
}
