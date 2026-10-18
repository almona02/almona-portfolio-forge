import { supabase } from '@/lib/supabase';

export interface AdminAuditEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// Records are written by database triggers and the service-only role RPC.
// Browser clients have read-only access and cannot forge actor identities.
type AuditClient = { from: (name: string) => { select: (columns: string) => { order: (column: string, options: { ascending: boolean }) => { limit: (limit: number) => Promise<{ data: AdminAuditEntry[] | null; error: { message: string } | null }> } } } }

export async function listAuditLog(limit = 200): Promise<AdminAuditEntry[]> {
  const { data, error } = await (supabase as unknown as AuditClient)
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}
