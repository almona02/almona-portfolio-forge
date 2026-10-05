import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import type { Database } from '@/types/database';

// The legacy Database Tables omit Relationships, so current supabase-js cannot
// infer the schema. Keep this RPC boundary narrow and validate its receipt.
const consultationClient = supabase as unknown as {
  rpc(name: 'submit_fabrication_consultation', args: Database['public']['Functions']['submit_fabrication_consultation']['Args']): PromiseLike<{ data: unknown; error: unknown }>;
};

export const consultationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^\+20\d{10}$/, 'Use +20 followed by 10 digits.'),
  projectType: z.enum(['new-home', 'renovation', 'commercial', 'extension', 'replacement']),
  system: z.enum(['upvc', 'aluminum']),
  message: z.string().trim().max(2000),
});

export async function submitFabricationConsultation(input: z.infer<typeof consultationSchema>): Promise<string> {
  const value = consultationSchema.parse(input);
  const { data, error } = await consultationClient.rpc('submit_fabrication_consultation', {
    p_name: value.name, p_phone: value.phone, p_project_type: value.projectType,
    p_system: value.system, p_message: value.message,
  });
  if (error) throw new Error('Your request was not acknowledged. Please retry or contact us directly.');
  if (typeof data !== 'string' || !z.string().uuid().safeParse(data).success) throw new Error('No valid consultation receipt was returned.');
  return data;
}
