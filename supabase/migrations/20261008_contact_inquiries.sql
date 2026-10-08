-- Phase 6: public contact form persistence (local/prod via migration apply).
-- Insert-only for anon + authenticated; no public select.

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'web_contact',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_inquiries_insert_anon ON public.contact_inquiries;
CREATE POLICY contact_inquiries_insert_anon
  ON public.contact_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

REVOKE ALL ON public.contact_inquiries FROM PUBLIC;
GRANT INSERT ON public.contact_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_inquiries TO service_role;
