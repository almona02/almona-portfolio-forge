import { supabase } from '@/lib/supabase';

// Public listing shape returned by the API (snake_case, matching the DB row).
export interface UsedMachineListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  location: string;
  condition: string;
  category: string;
  year: number | null;
  hours: number | null;
  description: string;
  contact_name: string;
  contact_phone: string;
  contact_whatsapp: string | null;
  images: string[];
  status: string;
  views: number;
  created_at: string;
}

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
  const digits = sanitizePhone(phone);
  const intl = digits.startsWith('20') ? digits : `20${digits.replace(/^0/, '')}`;
  return `https://wa.me/${intl}`;
}

// The manually-maintained Database type occasionally disagrees with supabase-js generic
// inference; a narrow `any` alias keeps the write calls (insert/update) unblocked.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const UsedMachineService = {
  async listActiveListings(limit = 100): Promise<UsedMachineListing[]> {
    const { data, error } = await supabase
      .from('used_machine_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as UsedMachineListing[];
  },

  async getListing(id: string): Promise<UsedMachineListing | null> {
    const { data, error } = await supabase
      .from('used_machine_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as UsedMachineListing | null) ?? null;
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
    const imageUrls: string[] = [];
    for (const file of input.files.slice(0, MAX_IMAGES)) {
      imageUrls.push(await this.uploadImage(file));
    }

    const whatsapp = input.contactWhatsapp ? sanitizePhone(input.contactWhatsapp) : null;
    const { data, error } = await db
      .from('used_machine_listings')
      .insert({
        title: input.title.trim(),
        price: input.price,
        currency: input.currency,
        location: input.location.trim(),
        condition: input.condition,
        category: input.category.trim(),
        year: input.year ?? null,
        hours: input.hours ?? null,
        description: input.description.trim(),
        contact_name: input.contactName.trim(),
        contact_phone: sanitizePhone(input.contactPhone),
        contact_whatsapp: whatsapp,
        images: imageUrls,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw error;
    return data as UsedMachineListing;
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

  async incrementViews(id: string): Promise<void> {
    const { data } = await supabase
      .from('used_machine_listings')
      .select('views')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      const views = (data as { views?: number }).views ?? 0;
      await db
        .from('used_machine_listings')
        .update({ views: views + 1 })
        .eq('id', id);
    }
  },

  whatsappLink,
  sanitizePhone,
};
