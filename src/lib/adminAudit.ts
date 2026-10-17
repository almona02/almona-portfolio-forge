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

/**
 * Append an admin action to the audit trail. Best-effort: never throws,
 * so auditing can never block the underlying business action.
 */
export async function logAdminAction(params: {
  action: string;
  entityType: 'product' | 'ticket' | 'profile' | 'machine';
  entityId?: string;
  details?: Record<string, unknown>;
  actorId?: string;
  actorName?: string;
}): Promise<void> {
  try {
    await (supabase as unknown as { from: (t: string) => any })
      .from('admin_audit_log')
      .insert({
        actor_id: params.actorId ?? null,
        actor_name: params.actorName ?? null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId ?? null,
        details: params.details ?? {},
      });
  } catch (e) {
    console.warn('[adminAudit] failed to write audit entry', e);
  }
}

export async function listAuditLog(limit = 200): Promise<AdminAuditEntry[]> {
  const { data, error } = await (supabase as unknown as { from: (t: string) => any })
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAuditEntry[];
}
