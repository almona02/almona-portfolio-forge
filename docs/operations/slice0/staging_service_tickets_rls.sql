-- Slice 0 staging/prod RLS enablement package for service_tickets.
-- PREPARE ONLY — apply only after explicit environment approval.
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
      AND p.role::text IN ('admin', 'support', 'technician', 'sales_rep')
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
      AND p.role::text IN ('admin', 'support', 'technician')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('admin', 'support', 'technician')
  )
);

-- Tighten ticket_messages so assignees can participate without exposing cross-customer rows.
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
CREATE POLICY ticket_messages_select_scoped ON public.ticket_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.service_tickets st
    WHERE st.id = ticket_messages.ticket_id
      AND (
        st.user_id = auth.uid()
        OR st.assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'support', 'technician')
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can insert ticket messages" ON public.ticket_messages;
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
          WHERE p.id = auth.uid() AND p.role::text IN ('admin', 'support', 'technician')
        )
      )
  )
);

REVOKE ALL ON TABLE public.service_tickets FROM anon;

COMMIT;
