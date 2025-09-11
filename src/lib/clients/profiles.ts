// Domain client: User Profiles
import { supabase } from '../supabase';
import { Database } from '@/types/database';

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (
  userId: string,
  updates: Database['public']['Tables']['profiles']['Update']
) => {
  const { data, error } = await (supabase
    .from('profiles') as any)
    .update(updates as any)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};
