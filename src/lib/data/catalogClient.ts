import { table, rpc } from './clientCore';
import type { Database } from '@/types/database';

export type ProductRow = Database['public']['Tables']['products']['Row'];
export type CategoryRow = Database['public']['Tables']['categories']['Row'];

export interface ProductFilters {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getProducts(filters?: ProductFilters): Promise<ProductRow[]> {
  let q = (table('products') as any)
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.category) q = q.eq('category', filters.category);
  if (filters?.search) q = q.or(`name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
  if (filters?.limit) q = q.limit(filters.limit);
  if (filters?.offset) q = q.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);

  const { data, error } = await q;
  if (error) throw error; return data as ProductRow[];
}

export async function getProduct(id: string): Promise<ProductRow | null> {
  const { data, error } = await (table('products') as any)
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error; return data as ProductRow | null;
}

export async function searchProducts(
  searchTerm: string,
  lang: 'ar' | 'en' = 'ar',
  filters?: { category?: string; minPrice?: number; maxPrice?: number; limit?: number; offset?: number }
) {
  const { data, error } = await rpc('search_products', {
    search_term: searchTerm,
    lang,
    category_filter: filters?.category,
    min_price: filters?.minPrice,
    max_price: filters?.maxPrice,
    limit_count: filters?.limit || 20,
    offset_count: filters?.offset || 0,
  } as any);
  if (error) throw error; return data;
}

export async function getProductRecommendations(userId: string, productId?: string, limit: number = 10) {
  const { data, error } = await rpc('get_product_recommendations', {
    user_id_param: userId,
    product_id_param: productId,
    limit_count: limit,
  } as any);
  if (error) throw error; return data;
}
