// Domain client: Categories
import { supabase } from '../supabase';

export interface CategoryFilters {
  parentId?: string;
  isActive?: boolean;
}

export const getCategories = async (filters?: CategoryFilters) => {
  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (filters?.parentId !== undefined) {
    query = query.eq('parent_id', filters.parentId);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};
