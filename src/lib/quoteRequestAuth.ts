import { supabase } from '@/lib/supabase';

export async function getQuoteRequestHeaders(
  expectedUserId?: string,
): Promise<Record<string, string>> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (expectedUserId && (!session?.access_token || session.user.id !== expectedUserId)) {
    throw new Error('Your session changed. Sign in again before submitting the quote.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return headers;
}
