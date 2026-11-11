import { supabase } from '@/lib/supabase';
import { SERIAL_NORMALIZATION_VERSION, preserveRawSerial } from './serialCanonical';

export type CatalogLinkStatus = 'linked' | 'uncatalogued' | 'uncertain';

export type RegisterMachineIdentityInput = {
  name: string;
  model: string;
  serial_number?: string | null;
  brand?: string | null;
  catalog_model_id?: string | null;
  /** @deprecated Prefer catalog_link_status; retained for RPC compat. */
  catalog_uncertain?: boolean;
  catalog_link_status?: CatalogLinkStatus | null;
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
  catalog_link_status?: CatalogLinkStatus;
  provisional_asset_ref?: string | null;
  /** True only for authorized (own-record) review signals — never foreign matches. */
  needs_staff_review?: boolean;
  message?: string;
};

function resolveCatalogLinkStatus(input: RegisterMachineIdentityInput): CatalogLinkStatus {
  if (input.catalog_link_status) return input.catalog_link_status;
  if (input.catalog_model_id && !input.catalog_uncertain) return 'linked';
  if (input.catalog_uncertain) return 'uncertain';
  return 'uncatalogued';
}

/**
 * Preferred PR1 registration path — server-side idempotency + authz-safe duplicates.
 * Foreign matches create staff-only review cases; customer response does not disclose them.
 */
function hasPersistedPhotoEvidence(urls: string[] | null | undefined): boolean {
  return Boolean(urls?.some((url) => typeof url === 'string' && url.trim().length > 0));
}

export async function registerMachineIdentity(
  input: RegisterMachineIdentityInput,
): Promise<RegisterMachineIdentityResult> {
  const serial = preserveRawSerial(input.serial_number ?? null);
  if (!serial && !hasPersistedPhotoEvidence(input.photo_urls)) {
    throw new Error('plate_area_photo_evidence_required when serial is absent');
  }
  const catalog_link_status = resolveCatalogLinkStatus(input);
  const { data, error } = await supabase.rpc('register_machine_identity', {
    p_name: input.name,
    p_model: input.model,
    p_serial_raw: serial,
    p_brand: input.brand ?? null,
    p_catalog_model_id: catalog_link_status === 'linked' ? input.catalog_model_id ?? null : null,
    p_catalog_uncertain: catalog_link_status === 'uncertain',
    p_catalog_link_status: catalog_link_status,
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
