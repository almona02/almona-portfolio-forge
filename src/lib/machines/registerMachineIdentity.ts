import { supabase } from '@/lib/supabase';
import { SERIAL_NORMALIZATION_VERSION, preserveRawSerial } from './serialCanonical';

export type RegisterMachineIdentityInput = {
  name: string;
  model: string;
  serial_number?: string | null;
  brand?: string | null;
  catalog_model_id?: string | null;
  catalog_uncertain?: boolean;
  installation_date?: string | null;
  warranty_valid?: boolean | null;
  photo_urls?: string[] | null;
  idempotency_key?: string | null;
  registration_source?: string;
  site_label?: string | null;
  missing_serial_reason?: string | null;
};

export type RegisterMachineIdentityResult = {
  machine_id: string;
  idempotent: boolean;
  identity_review_status: string;
  identity_confidence: string;
  provisional_asset_ref?: string | null;
  needs_staff_review?: boolean;
  message?: string;
};

/**
 * Preferred PR1 registration path — server-side idempotency + authz-safe duplicates.
 * Does not reveal whether another customer owns a matching serial.
 */
export async function registerMachineIdentity(
  input: RegisterMachineIdentityInput,
): Promise<RegisterMachineIdentityResult> {
  const serial = preserveRawSerial(input.serial_number ?? null);
  const { data, error } = await supabase.rpc('register_machine_identity', {
    p_name: input.name,
    p_model: input.model,
    p_serial_raw: serial,
    p_brand: input.brand ?? null,
    p_catalog_model_id: input.catalog_model_id ?? null,
    p_catalog_uncertain: input.catalog_uncertain ?? !input.catalog_model_id,
    p_installation_date: input.installation_date ?? null,
    p_warranty_valid: input.warranty_valid ?? null,
    p_photo_urls: input.photo_urls ?? null,
    p_idempotency_key: input.idempotency_key ?? null,
    p_registration_source: input.registration_source ?? 'web_registration',
    p_site_label: input.site_label ?? null,
    p_missing_serial_reason: input.missing_serial_reason ?? null,
  });

  if (error) {
    throw new Error(error.message || 'Failed to register machine');
  }

  return data as RegisterMachineIdentityResult;
}

export async function detectMachineDuplicates(serial: string, brand?: string | null) {
  const { data, error } = await supabase.rpc('machine_duplicate_detect', {
    p_serial_raw: preserveRawSerial(serial),
    p_brand: brand ?? null,
  });
  if (error) throw new Error(error.message || 'Duplicate detect failed');
  return data;
}

export async function linkTicketMachine(ticketId: string, machineId: string) {
  const { data, error } = await supabase.rpc('link_ticket_machine', {
    p_ticket_id: ticketId,
    p_machine_id: machineId,
  });
  if (error) throw new Error(error.message || 'Ticket machine link denied');
  return data;
}

export const machineIdentityMeta = {
  serialNormalizationVersion: SERIAL_NORMALIZATION_VERSION,
} as const;
