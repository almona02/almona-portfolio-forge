-- Dynamic ticket messaging with photo evidence + shareable links for the YILMAZ
-- support team (read-only, expiring tokens). Fixes ticket_messages RLS to use
-- service_tickets (not the legacy `tickets` table).
BEGIN;
SET LOCAL lock_timeout = '5s';

-- Evidence-photo bucket for ticket messages.
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket-attachments', 'ticket-attachments', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ticket-attachments-public-read" ON storage.objects;
CREATE POLICY "ticket-attachments-public-read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "ticket-attachments-upload" ON storage.objects;
CREATE POLICY "ticket-attachments-upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ticket-attachments');

-- Ticket messages: owner (via service_tickets.user_id) or admin can read + insert.
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.service_tickets st WHERE st.id = ticket_messages.ticket_id AND st.user_id = auth.uid())
    OR admin_private.is_admin()
  );

DROP POLICY IF EXISTS "Users can insert ticket messages" ON public.ticket_messages;
CREATE POLICY "Users can insert ticket messages" ON public.ticket_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.service_tickets st WHERE st.id = ticket_messages.ticket_id AND st.user_id = auth.uid())
    OR admin_private.is_admin()
  );

-- Share tokens for the YILMAZ support team (read-only, optional expiry).
CREATE TABLE IF NOT EXISTS public.ticket_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_shares_token_idx ON public.ticket_shares(token);

ALTER TABLE public.ticket_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ticket_shares_manage ON public.ticket_shares;
CREATE POLICY ticket_shares_manage ON public.ticket_shares FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_tickets st WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR admin_private.is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_tickets st WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR admin_private.is_admin())));

-- SECURITY DEFINER: public read of a ticket + its messages for a valid token.
CREATE OR REPLACE FUNCTION public.get_shared_ticket(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket_id uuid;
  v_result jsonb;
BEGIN
  SELECT ticket_id INTO v_ticket_id FROM public.ticket_shares
  WHERE token = p_token AND (expires_at IS NULL OR expires_at > now());
  IF v_ticket_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired share link' USING ERRCODE = 'P0002'; END IF;

  SELECT jsonb_build_object(
    'ticket', row_to_json(t),
    'messages', COALESCE((SELECT jsonb_agg(row_to_json(m) ORDER BY m.created_at)
                          FROM public.ticket_messages m WHERE m.ticket_id = t.id), '[]'::jsonb)
  ) INTO v_result
  FROM public.service_tickets t WHERE t.id = v_ticket_id;

  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_shared_ticket(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_ticket(text) TO anon, authenticated;

COMMIT;
