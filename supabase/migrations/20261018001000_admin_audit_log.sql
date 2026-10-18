-- Admin Control Panel — unified admin audit log (who did what: prices, tickets, roles).
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  action text NOT NULL CHECK (length(action) BETWEEN 2 AND 80),
  entity_type text NOT NULL CHECK (entity_type IN ('product','ticket','profile','machine')),
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
CREATE INDEX admin_audit_log_entity_idx ON public.admin_audit_log(entity_type, entity_id);
CREATE INDEX admin_audit_log_actor_idx ON public.admin_audit_log(actor_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

-- Only admins may read the audit trail.
CREATE POLICY admin_audit_read_admin ON public.admin_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));

-- Only admins may append entries.
CREATE POLICY admin_audit_insert_admin ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'));
