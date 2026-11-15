-- Staging fix: staff ticket SELECT/UPDATE must not query public.profiles under RLS.
-- profiles SELECT is admin-only (`admin_profiles_read_database_role`), so an EXISTS on
-- profiles makes support fail-closed for ticket reads despite intended admin|support scope.
-- Use SECURITY DEFINER admin_private.caller_role() instead. Scope unchanged.
-- Production unauthorized. #155 frozen; #156 draft.

BEGIN;
SET LOCAL lock_timeout = '5s';

DROP POLICY IF EXISTS service_tickets_select_own_or_staff ON public.service_tickets;
CREATE POLICY service_tickets_select_own_or_staff ON public.service_tickets
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR admin_private.caller_role() IN ('admin', 'support')
);

DROP POLICY IF EXISTS service_tickets_update_scoped ON public.service_tickets;
CREATE POLICY service_tickets_update_scoped ON public.service_tickets
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR admin_private.caller_role() IN ('admin', 'support')
)
WITH CHECK (
  user_id = auth.uid()
  OR assigned_to = auth.uid()
  OR admin_private.caller_role() IN ('admin', 'support')
);

DROP POLICY IF EXISTS ticket_messages_select_scoped ON public.ticket_messages;
CREATE POLICY ticket_messages_select_scoped ON public.ticket_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.service_tickets st
    WHERE st.id = ticket_messages.ticket_id
      AND (
        admin_private.caller_role() IN ('admin', 'support')
        OR st.assigned_to = auth.uid()
        OR (
          st.user_id = auth.uid()
          AND COALESCE(ticket_messages.is_internal_note, false) = false
          AND COALESCE(ticket_messages.message_type, 'message') IS DISTINCT FROM 'internal_note'
        )
      )
  )
);

COMMIT;
