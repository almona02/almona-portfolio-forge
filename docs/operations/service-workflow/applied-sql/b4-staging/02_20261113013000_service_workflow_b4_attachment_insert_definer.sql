-- B4 corrective (STAGING-B4-01): ticket-attachments INSERT must not depend on
-- caller-visible service_tickets rows. Job technicians (and historical visit
-- attendees) are invisible under service_tickets_select_own_or_staff, so the
-- inline EXISTS WITH CHECK always failed for permitted technicians while ticket
-- owners still passed.
-- Also extend workflow/attachment read helpers so historical attending techs
-- retain report evidence + getter reachability after job reassignment (R4-05).
-- Staging-only apply after Spark review of the tip SHA. No production. No B5.

BEGIN;

CREATE OR REPLACE FUNCTION admin_private.is_ticket_visit_attending_technician(
  p_ticket_id uuid,
  p_uid uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_jobs j
    JOIN public.service_job_visits v ON v.job_id = j.id
    WHERE j.ticket_id = p_ticket_id
      AND v.attending_technician_id = p_uid
      AND v.state = 'completed'
      AND j.state NOT IN ('cancelled', 'waived')
  );
$$;
REVOKE ALL ON FUNCTION admin_private.is_ticket_visit_attending_technician(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.is_ticket_visit_attending_technician(uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION admin_private.can_insert_ticket_attachment(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT CASE
    WHEN admin_private.caller_uid() IS NULL THEN false
    WHEN (storage.foldername(object_name))[1] = admin_private.caller_uid()::text THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.service_tickets st
      WHERE st.id::text = (storage.foldername(object_name))[1]
        AND (
          st.user_id = admin_private.caller_uid()
          OR st.assigned_to = admin_private.caller_uid()
          OR admin_private.caller_role() IN ('admin', 'support')
          OR admin_private.is_ticket_job_technician(st.id, admin_private.caller_uid())
          OR admin_private.is_ticket_visit_attending_technician(st.id, admin_private.caller_uid())
        )
    ) THEN true
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION admin_private.can_insert_ticket_attachment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.can_insert_ticket_attachment(text) TO authenticated;

DROP POLICY IF EXISTS ticket_attachments_insert ON storage.objects;
CREATE POLICY ticket_attachments_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND admin_private.can_insert_ticket_attachment(name)
);

-- Align private read helpers with the same technician predicates (DEFINER).
CREATE OR REPLACE FUNCTION admin_private.can_read_ticket_attachment(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT CASE
    WHEN admin_private.caller_uid() IS NULL THEN false
    WHEN admin_private.caller_role() IN ('admin', 'support') THEN true
    WHEN (storage.foldername(object_name))[1] = admin_private.caller_uid()::text THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.service_tickets st
      WHERE st.id::text = (storage.foldername(object_name))[1]
        AND (
          st.assigned_to = admin_private.caller_uid()
          OR admin_private.is_ticket_job_technician(st.id, admin_private.caller_uid())
          OR admin_private.is_ticket_visit_attending_technician(st.id, admin_private.caller_uid())
        )
    ) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.ticket_messages m
      JOIN public.service_tickets st ON st.id = m.ticket_id
      WHERE st.id::text = (storage.foldername(object_name))[1]
        AND st.user_id = admin_private.caller_uid()
        AND COALESCE(m.is_internal_note, false) = false
        AND COALESCE(m.message_type, 'message') IS DISTINCT FROM 'internal_note'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(m.attachments, '[]'::jsonb)) att
          WHERE COALESCE(
            nullif(att->>'storage_path', ''),
            nullif(substring(att->>'url' from 'ticket-attachments/(.+)$'), '')
          ) = object_name
        )
    )
  END;
$$;
REVOKE ALL ON FUNCTION admin_private.can_read_ticket_attachment(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.can_read_ticket_attachment(text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_private.actor_can_read_ticket_attachment(
  p_object_name text,
  p_actor_uid uuid,
  p_actor_role text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT CASE
    WHEN p_actor_uid IS NULL THEN false
    WHEN p_actor_role IN ('admin', 'support') THEN true
    WHEN (storage.foldername(p_object_name))[1] = p_actor_uid::text THEN true
    WHEN EXISTS (
      SELECT 1
      FROM public.service_tickets st
      WHERE st.id::text = (storage.foldername(p_object_name))[1]
        AND (
          st.assigned_to = p_actor_uid
          OR admin_private.is_ticket_job_technician(st.id, p_actor_uid)
          OR admin_private.is_ticket_visit_attending_technician(st.id, p_actor_uid)
        )
    ) THEN true
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION admin_private.actor_can_read_ticket_attachment(text, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_private.actor_can_read_ticket_attachment(text, uuid, text)
  TO authenticated, service_role;

-- Historical attending retains workflow SELECT (jobs/visits/getter) after reassignment.
CREATE OR REPLACE FUNCTION admin_private.can_read_ticket_workflow(p_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, admin_private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id
      AND (
        t.user_id = admin_private.caller_uid()
        OR t.assigned_to = admin_private.caller_uid()
        OR admin_private.caller_role() IN ('admin', 'support')
        OR (
          admin_private.caller_role() = 'technician'
          AND (
            EXISTS (
              SELECT 1 FROM public.service_jobs j
              WHERE j.ticket_id = t.id
                AND j.assigned_technician_id = admin_private.caller_uid()
            )
            OR admin_private.is_ticket_visit_attending_technician(
              t.id, admin_private.caller_uid()
            )
          )
        )
      )
  );
$$;

COMMIT;
