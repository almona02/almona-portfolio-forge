// Domain client: Products & Variants
// Provides product-related data access separated from generic supabase bootstrap.
import { supabase } from '../supabase';

export interface ProductFilter {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const getProducts = async (filters?: ProductFilter) => {
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.search) {
    // search in arabic, english names and sku
    query = query.or(`name_ar.ilike.%${filters.search}%,name_en.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getProduct = async (id: string) => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();
  if (error) throw error;
  return data;
};

export const getProductVariants = async (productId: string) => {
  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};
