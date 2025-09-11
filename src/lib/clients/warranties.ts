// Domain client: Warranties & Warranty Registrations
import { supabase } from '../supabase';

export const createWarrantyRegistration = async (payload: {
  machine_serial_number: string;
  plan_id?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  duration_months?: number | null;
  meta?: Record<string, unknown>;
  notes?: string | null;
}) => {
  const { data, error } = await (supabase
    .from('warranty_registrations') as any)
    .insert(payload as any)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const confirmWarrantySale = async (warrantyId: string, serial: string, durationOverride?: number) => {
  const { data, error } = await (supabase as any).rpc('confirm_warranty_sale', {
    _warranty_id: warrantyId,
    _serial: serial,
    _duration_override: durationOverride ?? null,
  });
  if (error) throw error;
  return data;
};

export interface ValidatedWarranty {
  warranty_code: string;
  machine_serial_number: string;
  status: 'pending' | 'active' | 'expired' | 'void';
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  days_remaining: number;
  plan_name: string | null;
  coverage: Record<string, unknown> | null;
}

export const validateWarranty = async (serial: string): Promise<ValidatedWarranty[]> => {
  const { data, error } = await (supabase as any).rpc('validate_warranty', { _serial: serial });
  if (error) throw error;
  return data as ValidatedWarranty[];
};

export const listMyWarranties = async () => {
  const { data, error } = await (supabase
    .from('warranty_registrations') as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const listWarranties = async (filters?: { status?: string; serial?: string; customer_id?: string }) => {
  let query = (supabase.from('warranty_registrations') as any).select('*');
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.serial) query = query.ilike('machine_serial_number', `%${filters.serial}%`);
  if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};
