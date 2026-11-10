-- Slice 0: shared-ticket minimization, share revocation, private attachments,
-- governed status/assignment RPCs with atomic audit, and blocked direct mutation
-- of protected ticket columns.
-- PREPARE ONLY — do not apply to staging/production without separate env approval.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE SCHEMA IF NOT EXISTS admin_private;
REVOKE ALL ON SCHEMA admin_private FROM PUBLIC;
REVOKE ALL ON SCHEMA admin_private FROM anon, authenticated;

CREATE OR REPLACE FUNCTION admin_private.caller_uid()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT NULLIF(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
$$;
REVOKE ALL ON FUNCTION admin_private.caller_uid() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION admin_private.caller_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT p.role::text
  FROM public.profiles p
  WHERE p.id = admin_private.caller_uid();
$$;
REVOKE ALL ON FUNCTION admin_private.caller_role() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_valid_ticket_status_transition(p_from text, p_to text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
BEGIN
  IF p_from IS NOT DISTINCT FROM p_to THEN
    RETURN TRUE;
  END IF;
  RETURN CASE p_from
    WHEN 'open' THEN p_to IN ('assigned', 'cancelled')
    WHEN 'assigned' THEN p_to IN ('in_progress', 'awaiting_parts', 'cancelled')
    WHEN 'in_progress' THEN p_to IN ('awaiting_parts', 'awaiting_customer', 'resolved')
    WHEN 'awaiting_parts' THEN p_to IN ('in_progress', 'cancelled')
    WHEN 'awaiting_customer' THEN p_to IN ('in_progress', 'resolved')
    WHEN 'resolved' THEN p_to IN ('closed')
    WHEN 'closed' THEN FALSE
    WHEN 'cancelled' THEN FALSE
    ELSE FALSE
  END;
END;
$$;
REVOKE ALL ON FUNCTION public.is_valid_ticket_status_transition(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_ticket_status_transition(text, text) TO authenticated;

ALTER TABLE public.ticket_shares
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.revoke_ticket_share(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text := admin_private.caller_role();
  v_share public.ticket_shares%ROWTYPE;
  v_ticket public.service_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_share FROM public.ticket_shares WHERE token = p_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = v_share.ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    v_role = 'admin'
    OR v_ticket.user_id = v_uid
    OR v_ticket.assigned_to = v_uid
    OR v_share.created_by = v_uid
  ) THEN
    RAISE EXCEPTION 'Not permitted to revoke this share' USING ERRCODE = '42501';
  END IF;
  UPDATE public.ticket_shares
  SET revoked_at = now(), revoked_by = v_uid
  WHERE id = v_share.id AND revoked_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_ticket_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_ticket_share(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_shared_ticket(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_ticket_id uuid;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Invalid or expired share link' USING ERRCODE = 'P0002';
  END IF;

  SELECT s.ticket_id INTO v_ticket_id
  FROM public.ticket_shares s
  WHERE s.token = p_token
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now());

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share link' USING ERRCODE = 'P0002';
  END IF;

  SELECT jsonb_build_object(
    'ticket', jsonb_build_object(
      'id', t.id,
      'ticket_number', t.ticket_number,
      'title', t.title,
      'description', t.description,
      'status', t.status,
      'priority', t.priority,
      'type', t.type,
      'machine_serial_number', t.machine_serial_number,
      'machine_model', t.machine_model,
      'site_location', t.site_location,
      'created_at', t.created_at,
      'updated_at', t.updated_at
    ),
    'messages', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'message', m.message,
          'message_type', m.message_type,
          'created_at', m.created_at,
          'attachments', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'filename', COALESCE(att->>'filename', att->>'name', 'attachment'),
                'size', NULLIF(att->>'size', '')::bigint,
                'type', att->>'type',
                'storage_path', COALESCE(
                  nullif(att->>'storage_path', ''),
                  nullif(substring(att->>'url' from '/ticket-attachments/(.+)$'), ''),
                  nullif(substring(att->>'url' from 'ticket-attachments/(.+)$'), '')
                )
              )
            )
            FROM jsonb_array_elements(COALESCE(m.attachments, '[]'::jsonb)) att
          ), '[]'::jsonb)
        )
        ORDER BY m.created_at
      )
      FROM public.ticket_messages m
      WHERE m.ticket_id = t.id
        AND COALESCE(m.is_internal_note, false) = false
        AND COALESCE(m.message_type, 'message') IS DISTINCT FROM 'internal_note'
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.service_tickets t
  WHERE t.id = v_ticket_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired share link' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_shared_ticket(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_ticket(text) TO anon, authenticated;

UPDATE storage.buckets
SET public = false
WHERE id = 'ticket-attachments';

DROP POLICY IF EXISTS "ticket-attachments-public-read" ON storage.objects;
DROP POLICY IF EXISTS "ticket-attachments-upload" ON storage.objects;
DROP POLICY IF EXISTS ticket_attachments_select ON storage.objects;
DROP POLICY IF EXISTS ticket_attachments_insert ON storage.objects;

CREATE POLICY ticket_attachments_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    admin_private.caller_role() IN ('admin', 'technician', 'support')
    OR (storage.foldername(name))[1] = admin_private.caller_uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.service_tickets st
      WHERE st.id::text = (storage.foldername(name))[1]
        AND (st.user_id = admin_private.caller_uid() OR st.assigned_to = admin_private.caller_uid())
    )
  )
);

CREATE POLICY ticket_attachments_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND admin_private.caller_uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = admin_private.caller_uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.service_tickets st
      WHERE st.id::text = (storage.foldername(name))[1]
        AND (
          st.user_id = admin_private.caller_uid()
          OR st.assigned_to = admin_private.caller_uid()
          OR admin_private.caller_role() IN ('admin', 'technician', 'support')
        )
    )
  )
);

CREATE TABLE IF NOT EXISTS public.ticket_governance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  from_status text,
  to_status text,
  assigned_to uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_governance_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ticket_governance_audit_staff_read ON public.ticket_governance_audit;
CREATE POLICY ticket_governance_audit_staff_read ON public.ticket_governance_audit
FOR SELECT TO authenticated
USING (admin_private.caller_role() IN ('admin', 'technician', 'support'));
REVOKE INSERT, UPDATE, DELETE ON public.ticket_governance_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_governed_ticket_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF COALESCE(current_setting('service_tickets.governed', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
     OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
     OR NEW.escalated IS DISTINCT FROM OLD.escalated
     OR NEW.escalated_at IS DISTINCT FROM OLD.escalated_at
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
     OR NEW.resolution_summary IS DISTINCT FROM OLD.resolution_summary
     OR NEW.first_response_at IS DISTINCT FROM OLD.first_response_at
     OR NEW.sla_response_due IS DISTINCT FROM OLD.sla_response_due
     OR NEW.sla_resolution_due IS DISTINCT FROM OLD.sla_resolution_due
     OR NEW.sla_breached IS DISTINCT FROM OLD.sla_breached
  THEN
    RAISE EXCEPTION 'Protected ticket fields require govern_ticket_* RPC'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_governed_ticket_columns_trigger ON public.service_tickets;
CREATE TRIGGER enforce_governed_ticket_columns_trigger
  BEFORE UPDATE ON public.service_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_governed_ticket_columns();

REVOKE ALL ON TABLE public.service_tickets FROM PUBLIC;
REVOKE ALL ON TABLE public.service_tickets FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_tickets TO authenticated;

CREATE OR REPLACE FUNCTION public.govern_ticket_transition(
  p_ticket_id uuid,
  p_to_status text,
  p_rationale text DEFAULT NULL,
  p_resolution_summary text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text := admin_private.caller_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_next public.service_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_to_status IS NULL OR p_to_status = 'pending_approval' THEN
    RAISE EXCEPTION 'Status not permitted' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_valid_ticket_status_transition(v_ticket.status::text, p_to_status) THEN
    RAISE EXCEPTION 'Invalid ticket status transition: % -> %', v_ticket.status, p_to_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_role IN ('admin', 'support') THEN
    NULL;
  ELSIF v_role = 'technician' THEN
    IF v_ticket.assigned_to IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Technician may only transition assigned tickets' USING ERRCODE = '42501';
    END IF;
    IF NOT (
      (v_ticket.status::text = 'assigned' AND p_to_status IN ('in_progress', 'awaiting_parts', 'cancelled'))
      OR (v_ticket.status::text = 'in_progress' AND p_to_status IN ('awaiting_parts', 'awaiting_customer', 'resolved'))
      OR (v_ticket.status::text = 'awaiting_parts' AND p_to_status IN ('in_progress', 'cancelled'))
      OR (v_ticket.status::text = 'awaiting_customer' AND p_to_status IN ('in_progress', 'resolved'))
    ) THEN
      RAISE EXCEPTION 'Technician transition not permitted' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('service_tickets.governed', '1', true);

  UPDATE public.service_tickets t
  SET
    status = p_to_status,
    updated_at = now(),
    resolution_summary = CASE
      WHEN p_to_status IN ('resolved', 'closed') THEN COALESCE(p_resolution_summary, t.resolution_summary)
      ELSE t.resolution_summary
    END,
    resolved_at = CASE WHEN p_to_status = 'resolved' THEN now() ELSE t.resolved_at END,
    closed_at = CASE WHEN p_to_status = 'closed' THEN now() ELSE t.closed_at END,
    first_response_at = CASE
      WHEN t.first_response_at IS NULL AND t.status::text = 'open' AND p_to_status IN ('assigned', 'in_progress')
        THEN now()
      ELSE t.first_response_at
    END,
    assigned_to = CASE
      WHEN p_to_status = 'cancelled' AND t.status::text = 'assigned' AND v_role = 'technician'
        THEN NULL
      ELSE t.assigned_to
    END
  WHERE t.id = p_ticket_id
  RETURNING * INTO v_next;

  INSERT INTO public.ticket_governance_audit(ticket_id, actor_id, action, from_status, to_status, assigned_to, details)
  VALUES (
    p_ticket_id,
    v_uid,
    'status_transition',
    v_ticket.status::text,
    p_to_status,
    v_next.assigned_to,
    jsonb_build_object('rationale', p_rationale, 'role', v_role)
  );

  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.govern_ticket_transition(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_transition(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.govern_ticket_assign(
  p_ticket_id uuid,
  p_assignee_id uuid,
  p_rationale text DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text := admin_private.caller_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_next public.service_tickets%ROWTYPE;
  v_to_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'support' THEN
    RAISE EXCEPTION 'Only admin/support may assign tickets' USING ERRCODE = '42501';
  END IF;
  IF p_assignee_id IS NULL THEN
    RAISE EXCEPTION 'Assignee required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  v_to_status := CASE WHEN v_ticket.status::text = 'open' THEN 'assigned' ELSE v_ticket.status::text END;

  PERFORM set_config('service_tickets.governed', '1', true);

  UPDATE public.service_tickets t
  SET
    assigned_to = p_assignee_id,
    assigned_by = v_uid,
    assigned_at = now(),
    status = v_to_status,
    updated_at = now(),
    first_response_at = COALESCE(
      t.first_response_at,
      CASE WHEN v_ticket.status::text = 'open' THEN now() ELSE t.first_response_at END
    )
  WHERE t.id = p_ticket_id
  RETURNING * INTO v_next;

  INSERT INTO public.ticket_governance_audit(ticket_id, actor_id, action, from_status, to_status, assigned_to, details)
  VALUES (
    p_ticket_id,
    v_uid,
    'assign',
    v_ticket.status::text,
    v_next.status::text,
    p_assignee_id,
    jsonb_build_object('rationale', p_rationale, 'role', v_role)
  );

  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.govern_ticket_assign(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_assign(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.govern_ticket_bulk_assign(
  p_ticket_ids uuid[],
  p_assignee_id uuid,
  p_rationale text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id uuid;
  v_succeeded uuid[] := ARRAY[]::uuid[];
  v_failed jsonb := '[]'::jsonb;
  v_row public.service_tickets%ROWTYPE;
BEGIN
  -- Partial-failure: each id is isolated; successes and audits persist with this call.
  IF admin_private.caller_uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF admin_private.caller_role() IS DISTINCT FROM 'admin'
     AND admin_private.caller_role() IS DISTINCT FROM 'support' THEN
    RAISE EXCEPTION 'Only admin/support may bulk-assign' USING ERRCODE = '42501';
  END IF;

  FOREACH v_id IN ARRAY COALESCE(p_ticket_ids, ARRAY[]::uuid[]) LOOP
    BEGIN
      v_row := public.govern_ticket_assign(v_id, p_assignee_id, p_rationale);
      v_succeeded := array_append(v_succeeded, v_row.id);
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed || jsonb_build_array(jsonb_build_object('ticket_id', v_id, 'error', SQLERRM));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'succeeded', to_jsonb(v_succeeded),
    'failed', v_failed,
    'partial', jsonb_array_length(v_failed) > 0 AND cardinality(v_succeeded) > 0
  );
END;
$$;
REVOKE ALL ON FUNCTION public.govern_ticket_bulk_assign(uuid[], uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_bulk_assign(uuid[], uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.govern_ticket_set_escalated(p_ticket_id uuid, p_escalated boolean DEFAULT true)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text := admin_private.caller_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_next public.service_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT (
    v_role IN ('admin', 'support')
    OR (v_role = 'technician' AND v_ticket.assigned_to = v_uid)
  ) THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('service_tickets.governed', '1', true);
  UPDATE public.service_tickets
  SET escalated = COALESCE(p_escalated, true),
      escalated_at = CASE WHEN COALESCE(p_escalated, true) THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_next;

  INSERT INTO public.ticket_governance_audit(ticket_id, actor_id, action, from_status, to_status, assigned_to, details)
  VALUES (
    p_ticket_id, v_uid, 'escalation', v_ticket.status::text, v_next.status::text, v_next.assigned_to,
    jsonb_build_object('escalated', COALESCE(p_escalated, true))
  );

  RETURN v_next;
END;
$$;
REVOKE ALL ON FUNCTION public.govern_ticket_set_escalated(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_set_escalated(uuid, boolean) TO authenticated;

COMMIT;
