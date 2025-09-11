import { z } from 'zod';
import type { Database } from '@/types/database';
import { table } from './clientCore';

export const reviewCreateSchema = z.object({
  product_id: z.string().uuid(),
  user_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional().nullable(),
  review_text: z.string().max(2000).optional().nullable(),
  is_verified_purchase: z.boolean().optional(),
  is_approved: z.boolean().optional(),
});

export type ReviewCreateInput = z.infer<typeof reviewCreateSchema>;

type ReviewRow = Database['public']['Tables']['product_reviews']['Row'];

export async function createReview(input: ReviewCreateInput): Promise<ReviewRow> {
  const parsed = reviewCreateSchema.parse(input);
  const { data, error } = await (table('product_reviews') as any)
    .insert(parsed as any)
    .select('*')
    .single();
  if (error) throw error; return data as ReviewRow;
}

export async function listReviews(productId: string, isApproved?: boolean, limit?: number) {
  let q = (table('product_reviews') as any)
    .select('*, profiles(full_name, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (isApproved !== undefined) q = q.eq('is_approved', isApproved);
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error; return data as ReviewRow[];
}
