import { marketplaceRead } from '@/lib/marketplace/readRequest';
import { submissionIdentity } from '@/lib/marketplace/submissionIdentity';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

// Public listing shape returned by the API (snake_case, matching the DB row).
export type UsedMachineListing = Database['public']['Tables']['used_machine_listings']['Row'];

export interface CreateListingInput {
  title: string;
  price: number;
  currency: string;
  location: string;
  condition: string;
  category: string;
  year?: number | null;
  hours?: number | null;
  description: string;
  contactName: string;
  contactPhone: string;
  contactWhatsapp?: string;
  files: File[];
}

const BUCKET = 'used-machine-images';
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function whatsappLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('20') ? digits : `20${digits.replace(/^0/, '')}`;
  return `https://wa.me/${intl}`;
}

type ListingDatabase = {
  public: {
    Tables: Pick<Database['public']['Tables'], 'used_machine_listings'>;
    Views: Record<never, never>;
    Functions: Record<never, never>;
  };
};

// The full legacy schema is incompatible with the SDK's generic constraints.
// This table has complete metadata; scope inference to its existing contracts.
const db = supabase as unknown as SupabaseClient<ListingDatabase>;

export const UsedMachineService = {
  async listActiveListings(limit = 100): Promise<UsedMachineListing[]> {
    const { data, error } = await marketplaceRead(signal => db
      .from('used_machine_listings').select('*').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(limit).abortSignal(signal));
    if (error) throw error;
    return data ?? [];
  },

  async getListing(id: string): Promise<UsedMachineListing | null> {
    const { data, error } = await db
      .from('used_machine_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  async uploadImage(file: File): Promise<string> {
    if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.');
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Each image must be under 5MB.');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },

  async createListing(input: CreateListingInput): Promise<UsedMachineListing> {
    if (!input.files.length || input.files.length > MAX_IMAGES) {
      throw new Error(`Please add between 1 and ${MAX_IMAGES} photos.`);
    }
    for (const file of input.files) {
      if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.');
      if (file.size > MAX_IMAGE_BYTES) throw new Error('Each image must be under 5MB.');
    }
    const fields = {
      title: input.title.trim(), price: input.price, currency: input.currency,
      location: input.location.trim(), condition: input.condition, category: input.category.trim(),
      year: input.year ?? null, hours: input.hours ?? null, description: input.description.trim(),
      contact_name: input.contactName.trim(), contact_phone: sanitizePhone(input.contactPhone),
      contact_whatsapp: input.contactWhatsapp ? sanitizePhone(input.contactWhatsapp) : null,
    };
    // Stable across lost responses and reloads. The existing primary key enforces
    // uniqueness on the server; never retry an uncertain write with a fresh id.
    const { id, imageHashes } = await submissionIdentity(fields, input.files);
    const existing = await this.getListing(id);
    if (existing) return existing;
    const imageUrls: string[] = [];
    for (let index = 0; index < input.files.length; index++) {
      const file = input.files[index];
      const path = `${id}/${imageHashes[index]}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      // Content-addressed immutable paths make a retried upload safe. Never
      // overwrite another object or treat a general storage failure as success.
      const status = error && 'statusCode' in error ? String(error.statusCode) : '';
      if (error && status !== '409') throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      imageUrls.push(data.publicUrl);
    }
    const { data, error } = await db.from('used_machine_listings')
      .insert({ id, ...fields, images: imageUrls }).select().single();
    if (error) {
      // A concurrent retry can lose the insert race or the original response.
      // Read the same id; never overwrite, upsert, or return an unrelated row.
      const recovered = await this.getListing(id);
      if (recovered) return recovered;
      throw error;
    }
    return data;
  },
  async reportListing(id: string): Promise<void> {
    const { error } = await db
      .from('used_machine_listings')
      .update({ status: 'flagged' })
      .eq('id', id);
    if (error) throw error;
  },

  async markSold(id: string): Promise<void> {
    const { error } = await db
      .from('used_machine_listings')
      .update({ status: 'sold' })
      .eq('id', id);
    if (error) throw error;
  },

  // Admin-only: list every status (active, sold, flagged, removed). Relies on
  // the admin read policy granting admins full SELECT.
  async listAllListings(limit = 500): Promise<UsedMachineListing[]> {
    const { data, error } = await db
      .from('used_machine_listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  // Admin-only: hard delete a listing (reported/flagged or sold). Relies on the
  // admin delete policy.
  async deleteListing(id: string): Promise<void> {
    const { error } = await db.from('used_machine_listings').delete().eq('id', id);
    if (error) throw error;
  },

  async incrementViews(id: string): Promise<void> {
    const { data } = await db
      .from('used_machine_listings')
      .select('views')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      const views = data.views ?? 0;
      await db
        .from('used_machine_listings')
        .update({ views: views + 1 })
        .eq('id', id);
    }
  },

  whatsappLink,
  sanitizePhone,
};
