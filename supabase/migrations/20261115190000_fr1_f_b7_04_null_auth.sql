-- FR-1 packaging of F-B7-04 (null-safe revoke/escalate). Apply before F-B7-03.
-- No B1–B7 workflow dependencies.

-- F-B7-04: Null-safe auth on share revoke + ticket escalate.
-- PL/pgSQL `IF NOT (a OR col = uid)` is poisoned when col IS NULL: the OR
-- becomes NULL, IF NULL never raises, and unassigned tickets become open.
-- Use deny-by-default `IS DISTINCT FROM` arms (same pattern as assignment
-- guards elsewhere). Staging-only; no production. #155 frozen; #156 draft.
--
-- Apply this before F-B7-03. The F-B7-03 rewrite tip carries the same
-- null-safe revoke gate so apply never re-blesses the bypass.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.revoke_ticket_share(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
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
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Share not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_share
  FROM public.ticket_shares
  WHERE token = p_token
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = v_share.ticket_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  -- Deny-by-default: NULL assignee / created_by must not open the gate.
  IF v_role IS DISTINCT FROM 'admin'
     AND v_role IS DISTINCT FROM 'support'
     AND v_ticket.user_id IS DISTINCT FROM v_uid
     AND v_ticket.assigned_to IS DISTINCT FROM v_uid
     AND v_share.created_by IS DISTINCT FROM v_uid
  THEN
    RAISE EXCEPTION 'Not permitted to revoke this share' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ticket_shares
  SET revoked_at = now(), revoked_by = v_uid
  WHERE id = v_share.id AND revoked_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_ticket_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_ticket_share(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.govern_ticket_set_escalated(
  p_ticket_id uuid,
  p_escalated boolean,
  p_actor_id uuid
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text;
  v_ticket public.service_tickets%ROWTYPE;
  v_next public.service_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    IF NOT admin_private.is_service_role_request() THEN
      RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;
    IF p_actor_id IS NULL THEN
      RAISE EXCEPTION 'Actor required for service-role governance' USING ERRCODE = '22023';
    END IF;
    v_uid := p_actor_id;
  ELSIF p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Actor impersonation not permitted' USING ERRCODE = '42501';
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_uid;

  SELECT * INTO v_ticket FROM public.service_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found' USING ERRCODE = 'P0002';
  END IF;

  -- Deny-by-default: unassigned tickets must not escalate for technicians.
  IF v_role IS DISTINCT FROM 'admin'
     AND v_role IS DISTINCT FROM 'support'
     AND NOT (
       v_role IS NOT DISTINCT FROM 'technician'
       AND v_ticket.assigned_to IS NOT DISTINCT FROM v_uid
     )
  THEN
    RAISE EXCEPTION 'Not permitted' USING ERRCODE = '42501';
  END IF;

  UPDATE public.service_tickets
  SET escalated = COALESCE(p_escalated, true),
      escalated_at = CASE WHEN COALESCE(p_escalated, true) THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_next;

  INSERT INTO public.ticket_governance_audit(
    ticket_id, actor_id, action, from_status, to_status, assigned_to, details
  ) VALUES (
    p_ticket_id, v_uid, 'escalation', v_ticket.status::text, v_next.status::text, v_next.assigned_to,
    jsonb_build_object('escalated', COALESCE(p_escalated, true))
  );

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.govern_ticket_set_escalated(uuid, boolean, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_set_escalated(uuid, boolean, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.govern_ticket_set_escalated(
  p_ticket_id uuid,
  p_escalated boolean DEFAULT true
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN public.govern_ticket_set_escalated(p_ticket_id, p_escalated, NULL::uuid);
END;
$$;
REVOKE ALL ON FUNCTION public.govern_ticket_set_escalated(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.govern_ticket_set_escalated(uuid, boolean)
  TO authenticated, service_role;

COMMIT;
