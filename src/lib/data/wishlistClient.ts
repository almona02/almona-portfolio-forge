import { table } from './clientCore';

export async function addToWishlist(userId: string, productId: string) {
  const { data, error } = await (table('wishlists') as any)
    .upsert({ user_id: userId, product_id: productId } as any)
    .select('*')
    .single();
  if (error) throw error; return data;
}

export async function removeFromWishlist(userId: string, productId: string) {
  const { error } = await (table('wishlists') as any)
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}

export async function getUserWishlist(userId: string) {
  const { data, error } = await (table('wishlists') as any)
    .select(`*, products(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error; return data;
}
