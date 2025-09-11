import { z } from 'zod';
import type { Database } from '@/types/database';
import { table, rpc } from './clientCore';

// Schemas
export const warrantyRegistrationSchema = z.object({
  machine_serial_number: z.string().min(3),
  plan_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  order_id: z.string().uuid().optional().nullable(),
  duration_months: z.number().int().positive().max(120).optional().nullable(),
  meta: z.record(z.unknown()).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type WarrantyRegistrationInput = z.infer<typeof warrantyRegistrationSchema>;

type WarrantyRow = Database['public']['Tables']['warranty_registrations']['Row'];

export async function createWarrantyRegistration(input: WarrantyRegistrationInput): Promise<WarrantyRow> {
  const parsed = warrantyRegistrationSchema.parse(input);
  const { data, error } = await (table('warranty_registrations') as any)
    .insert(parsed as any)
    .select('*')
    .single();
  if (error) throw error; return data as WarrantyRow;
}

export async function listWarranties(filters?: { status?: string; serial?: string; customer_id?: string }): Promise<WarrantyRow[]> {
  let q = (table('warranty_registrations') as any).select('*');
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.serial) q = q.ilike('machine_serial_number', `%${filters.serial}%`);
  if (filters?.customer_id) q = q.eq('customer_id', filters.customer_id);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error; return data as WarrantyRow[];
}

export async function confirmWarrantySale(warrantyId: string, serial: string, durationOverride?: number) {
  const { data, error } = await rpc('confirm_warranty_sale', {
    _warranty_id: warrantyId,
    _serial: serial,
    _duration_override: durationOverride ?? null,
  } as any);
  if (error) throw error; return data;
}

export interface ValidatedWarranty {
  warranty_code: string
  machine_serial_number: string
  status: 'pending' | 'active' | 'expired' | 'void'
  warranty_start_date: string | null
  warranty_end_date: string | null
  days_remaining: number
  plan_name: string | null
  coverage: Record<string, unknown> | null
}

export async function validateWarranty(serial: string): Promise<ValidatedWarranty[]> {
  const { data, error } = await rpc('validate_warranty', { _serial: serial } as any);
  if (error) throw error; return data as ValidatedWarranty[];
}
