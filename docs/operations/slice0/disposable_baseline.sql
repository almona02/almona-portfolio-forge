-- Representative pre-Slice-0 baseline for disposable local verification.
-- Mimics production ticket/share/attachment shape without customer data.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
$$;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY
);

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('customer', 'admin', 'sales_rep', 'technician', 'support');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  role public.user_role NOT NULL DEFAULT 'customer'
);

CREATE TABLE public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  assigned_at timestamptz,
  assigned_by uuid,
  sla_response_due timestamptz,
  sla_resolution_due timestamptz,
  first_response_at timestamptz,
  sla_breached boolean NOT NULL DEFAULT false,
  escalated boolean NOT NULL DEFAULT false,
  escalated_at timestamptz,
  contact_phone text,
  contact_email text,
  preferred_contact_method text,
  site_location text,
  machine_serial_number text,
  machine_model text,
  resolution_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'message',
  is_internal_note boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  spare_parts_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ticket_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid
);
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_to_array(name, '/');
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Pre-Slice-0 vulnerable share function (full row + all messages)
CREATE OR REPLACE FUNCTION public.get_shared_ticket(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
GRANT EXECUTE ON FUNCTION public.get_shared_ticket(text) TO PUBLIC;

-- Broad grants mimicking dangerous cloud defaults before remediation
GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public, storage, auth TO anon, authenticated, service_role;

-- Synthetic fixtures (no real customer data)
INSERT INTO auth.users(id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444');

INSERT INTO public.profiles(id, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Customer A', 'customer'),
  ('22222222-2222-2222-2222-222222222222', 'Customer B', 'customer'),
  ('33333333-3333-3333-3333-333333333333', 'Tech Assigned', 'technician'),
  ('44444444-4444-4444-4444-444444444444', 'Admin User', 'admin');

INSERT INTO public.service_tickets(
  id, ticket_number, user_id, title, description, status, priority, type,
  assigned_to, contact_phone, contact_email, site_location, machine_serial_number
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'ST-SLICE0-1',
  '11111111-1111-1111-1111-111111111111',
  'Saw blade jam',
  'Customer-visible description',
  'assigned',
  'high',
  'technical',
  '33333333-3333-3333-3333-333333333333',
  '+201111111111',
  'customer-a@example.test',
  'Cairo shop',
  'YM-TEST-001'
);

INSERT INTO public.ticket_messages(id, ticket_id, author_id, message, message_type, is_internal_note, attachments) VALUES
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Public customer note with photo',
  'message',
  false,
  '[{"filename":"jam.jpg","url":"https://example.test/storage/v1/object/public/ticket-attachments/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/jam.jpg","size":12,"type":"image/jpeg"}]'::jsonb
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '33333333-3333-3333-3333-333333333333',
  'INTERNAL: customer credit card ending 4242',
  'internal_note',
  true,
  '[]'::jsonb
);

INSERT INTO public.ticket_shares(ticket_id, token, created_by, expires_at) VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'validsharetoken00001111222233334444555566667777',
  '44444444-4444-4444-4444-444444444444',
  now() + interval '7 days'
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'expiredsharetoken000011112222333344445555666677',
  '44444444-4444-4444-4444-444444444444',
  now() - interval '1 day'
);

INSERT INTO storage.objects(bucket_id, name, owner) VALUES
(
  'ticket-attachments',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/jam.jpg',
  '11111111-1111-1111-1111-111111111111'
);

COMMIT;
