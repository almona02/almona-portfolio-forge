import { table } from './clientCore';

export async function addToRecentlyViewed(userId: string, productId: string) {
  const { data, error } = await (table('recently_viewed') as any)
    .upsert({ user_id: userId, product_id: productId, viewed_at: new Date().toISOString() } as any, { onConflict: 'user_id,product_id' })
    .select('*')
    .single();
  if (error) throw error; return data;
}

export async function getUserRecentlyViewed(userId: string, limit = 10) {
  const { data, error } = await (table('recently_viewed') as any)
    .select('*, products(*)')
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(limit);
  if (error) throw error; return data;
}
