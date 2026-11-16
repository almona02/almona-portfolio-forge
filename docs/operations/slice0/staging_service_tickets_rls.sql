-- Slice 0 staging/prod RLS enablement package for service_tickets.
-- PREPARE ONLY — apply only after explicit environment approval.
-- Authorization is owner / assignee / admin|support — not every technician via profiles self-read.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.service_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_tickets_select_own_or_staff ON public.service_tickets;
CREATE POLICY service_tickets_select_own_or_staff ON public.service_tickets
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'support')
  )
);

-- Customers may insert their own tickets.
DROP POLICY IF EXISTS service_tickets_insert_own ON public.service_tickets;
CREATE POLICY service_tickets_insert_own ON public.service_tickets
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'support')
  )
);

-- Non-protected column updates only (status/assignee blocked by enforce_governed_ticket_columns).
DROP POLICY IF EXISTS service_tickets_update_scoped ON public.service_tickets;
CREATE POLICY service_tickets_update_scoped ON public.service_tickets
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'support')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'support')
  )
);

-- Messages: admin/support see all; assignees see all on assigned tickets;
-- owners see non-internal only. Does not grant every technician via role alone.
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS ticket_messages_select_scoped ON public.ticket_messages;
CREATE POLICY ticket_messages_select_scoped ON public.ticket_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_messages.ticket_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'support')
        )
        OR st.assigned_to = auth.uid()
        OR (
          st.user_id = auth.uid()
          AND COALESCE(ticket_messages.is_internal_note, false) = false
          AND COALESCE(ticket_messages.message_type, 'message') IS DISTINCT FROM 'internal_note'
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can insert ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS ticket_messages_insert_scoped ON public.ticket_messages;
CREATE POLICY ticket_messages_insert_scoped ON public.ticket_messages
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_messages.ticket_id
      AND (
        st.user_id = auth.uid()
        OR st.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'support')
        )
      )
  )
  AND (
    (
      COALESCE(ticket_messages.is_internal_note, false) = false
      AND COALESCE(ticket_messages.message_type, 'message') IS DISTINCT FROM 'internal_note'
    )
    OR public.st_assigned_or_staff(ticket_messages.ticket_id)
  )
);

REVOKE ALL ON TABLE public.service_tickets FROM anon;

COMMIT;
