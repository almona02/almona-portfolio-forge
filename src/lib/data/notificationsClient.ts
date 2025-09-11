import { table } from './clientCore';
import { supabase } from '../supabase';

export async function getUserNotifications(userId: string, unreadOnly = false) {
  let q = (table('notifications') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (unreadOnly) q = q.eq('is_read', false);
  const { data, error } = await q;
  if (error) throw error; return data;
}

export async function markNotificationAsRead(notificationId: string) {
  const { data, error } = await (table('notifications') as any)
    .update({ is_read: true } as any)
    .eq('id', notificationId)
    .select('*')
    .single();
  if (error) throw error; return data;
}

export interface NotificationPayload { id: string; user_id: string | null; is_read: boolean }

export function subscribeToNotifications(userId: string, cb: (p: NotificationPayload) => void) {
  return (supabase as any)
    .channel('notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, cb as any)
    .subscribe();
}
