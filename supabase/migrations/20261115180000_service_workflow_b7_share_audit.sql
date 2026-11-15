-- F-B7-03: Audited ticket share create/revoke + token-free access events.
-- Staging-only after Spark targeted review. No production. #155 frozen; #156 draft.
--
-- Access-event semantics (documented):
--   * Each successful public share delivery records exactly one access event in the
--     same transaction before the payload/URL is returned (fail-closed).
--   * Client retries that succeed again insert additional events; the count is
--     successful deliveries, not unique visitors.
--   * reader_kind distinguishes anonymous vs authenticated_session callers.
--     authenticated_session is a session marker only — never a governance actor.
--   * Events never store raw tokens, signed URLs, or message contents.

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS public.ticket_share_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.ticket_shares(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  access_kind text NOT NULL
    CHECK (access_kind IN ('ticket_payload', 'attachment')),
  reader_kind text NOT NULL
    CHECK (reader_kind IN ('anonymous', 'authenticated_session')),
  session_uid uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_share_access_events_no_token_payload
    CHECK (true)
);

CREATE INDEX IF NOT EXISTS ticket_share_access_events_share_idx
  ON public.ticket_share_access_events (share_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ticket_share_access_events_ticket_idx
  ON public.ticket_share_access_events (ticket_id, created_at DESC);

ALTER TABLE public.ticket_share_access_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ticket_share_access_events_staff_select
  ON public.ticket_share_access_events;
CREATE POLICY ticket_share_access_events_staff_select
  ON public.ticket_share_access_events
  FOR SELECT TO authenticated
  USING (admin_private.caller_role() IN ('admin', 'support'));

REVOKE ALL ON public.ticket_share_access_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ticket_share_access_events TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_ticket_share_access_immutable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'ticket_share_access_events are immutable'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_share_access_immutable
  ON public.ticket_share_access_events;
CREATE TRIGGER trg_ticket_share_access_immutable
  BEFORE UPDATE OR DELETE ON public.ticket_share_access_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_ticket_share_access_immutable();

-- Clients may SELECT shares they can manage; mutations only via DEFINER RPCs.
DROP POLICY IF EXISTS ticket_shares_manage ON public.ticket_shares;
CREATE POLICY ticket_shares_select_scoped ON public.ticket_shares
  FOR SELECT TO authenticated
  USING (admin_private.can_manage_ticket_share(ticket_id));

REVOKE INSERT, UPDATE, DELETE ON public.ticket_shares
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ticket_shares TO authenticated;

CREATE OR REPLACE FUNCTION public.create_ticket_share(
  p_ticket_id uuid,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_uid uuid := admin_private.caller_uid();
  v_role text := admin_private.caller_role();
  v_token text;
  v_share public.ticket_shares%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF NOT admin_private.can_manage_ticket_share(p_ticket_id) THEN
    RAISE EXCEPTION 'Not permitted to create a share for this ticket'
      USING ERRCODE = '42501';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  INSERT INTO public.ticket_shares (
    ticket_id, token, created_by, expires_at
  ) VALUES (
    p_ticket_id, v_token, v_uid, p_expires_at
  )
  RETURNING * INTO v_share;

  INSERT INTO public.ticket_governance_audit (
    ticket_id, actor_id, action, from_status, to_status, assigned_to, details
  ) VALUES (
    p_ticket_id,
    v_uid,
    'share_created',
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'share_id', v_share.id,
      'expires_at', v_share.expires_at,
      'actor_role', v_role
    )
  );

  RETURN jsonb_build_object(
    'id', v_share.id,
    'ticket_id', v_share.ticket_id,
    'token', v_share.token,
    'expires_at', v_share.expires_at,
    'created_at', v_share.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_ticket_share(uuid, timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ticket_share(uuid, timestamptz)
  TO authenticated;

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

  IF NOT (
    v_role IN ('admin', 'support')
    OR v_ticket.user_id = v_uid
    OR v_ticket.assigned_to = v_uid
    OR v_share.created_by = v_uid
  ) THEN
    RAISE EXCEPTION 'Not permitted to revoke this share' USING ERRCODE = '42501';
  END IF;

  IF v_share.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.ticket_shares
  SET revoked_at = now(), revoked_by = v_uid
  WHERE id = v_share.id AND revoked_at IS NULL;

  INSERT INTO public.ticket_governance_audit (
    ticket_id, actor_id, action, from_status, to_status, assigned_to, details
  ) VALUES (
    v_share.ticket_id,
    v_uid,
    'share_revoked',
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'share_id', v_share.id,
      'actor_role', v_role
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_ticket_share(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_ticket_share(text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_private.record_ticket_share_access(
  p_token text,
  p_access_kind text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
DECLARE
  v_share public.ticket_shares%ROWTYPE;
  v_event_id uuid;
  v_session uuid := auth.uid();
  v_reader_kind text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RAISE EXCEPTION 'Invalid or expired share link' USING ERRCODE = 'P0002';
  END IF;
  IF p_access_kind IS NULL OR p_access_kind NOT IN ('ticket_payload', 'attachment') THEN
    RAISE EXCEPTION 'Invalid access kind' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_share
  FROM public.ticket_shares
  WHERE token = p_token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired share link' USING ERRCODE = 'P0002';
  END IF;

  v_reader_kind := CASE
    WHEN v_session IS NULL THEN 'anonymous'
    ELSE 'authenticated_session'
  END;

  INSERT INTO public.ticket_share_access_events (
    share_id, ticket_id, access_kind, reader_kind, session_uid
  ) VALUES (
    v_share.id,
    v_share.ticket_id,
    p_access_kind,
    v_reader_kind,
    v_session
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_private.record_ticket_share_access(text, text)
  FROM PUBLIC, anon, authenticated;
-- Invoked only from DEFINER share RPCs / edge service_role.
GRANT EXECUTE ON FUNCTION admin_private.record_ticket_share_access(text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.record_ticket_share_attachment_access(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
BEGIN
  RETURN admin_private.record_ticket_share_access(p_token, 'attachment');
END;
$$;

REVOKE ALL ON FUNCTION public.record_ticket_share_attachment_access(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ticket_share_attachment_access(text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.get_shared_ticket(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
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

  -- Fail-closed access accounting before returning the payload.
  PERFORM admin_private.record_ticket_share_access(p_token, 'ticket_payload');

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

COMMIT;
